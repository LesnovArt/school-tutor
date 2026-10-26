import assert from 'node:assert/strict';
import { mkdtemp, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extractFile, listPackage } from '@electron/asar';

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
assert(isWindows || isMac, `Unsupported platform for the packaged runtime smoke check: ${process.platform}`);
const packageDirectory = `out/School Tutor-${process.platform}-${process.arch}`;
const appPath = path.resolve(
  process.argv[2] ?? (isMac ? `${packageDirectory}/School Tutor.app` : packageDirectory),
);
const resourcesPath = isMac ? path.join(appPath, 'Contents', 'Resources') : path.join(appPath, 'resources');
const archivePath = path.join(resourcesPath, 'app.asar');
const unpackedPath = `${archivePath}.unpacked`;
// asar builds entries with path.join, so they use backslashes on Windows.
// asar's lookups split on path.sep, so extraction paths must use the native separator.
const extractPackaged = async (file) => extractFile(archivePath, path.normalize(file));
const entries = new Set((await listPackage(archivePath)).map((entry) => entry.replaceAll('\\', '/')));

for (const entry of [
  '/node_modules/better-sqlite3/lib/index.js',
  '/node_modules/better-sqlite3/lib/database.js',
  '/node_modules/node-addon-api/index.js',
]) {
  assert(entries.has(entry), `Packaged runtime is missing ${entry}`);
}

const nativeAddon = path.join(
  unpackedPath,
  `node_modules/better-sqlite3/prebuilds/${process.platform}-${process.arch}.node`,
);
// Mach-O CPU types and PE machine types for the architectures Electron ships.
const MACHO_CPU = { x64: 0x01000007, arm64: 0x0100000c };
const PE_MACHINE = { x64: 0x8664, arm64: 0xaa64 };
async function readBinaryArchitecture(file) {
  const handle = await open(file, 'r');
  try {
    const header = Buffer.alloc(4096);
    await handle.read(header, 0, header.length, 0);
    if (header.readUInt32LE(0) === 0xfeedfacf) return { format: 'macho', id: header.readUInt32LE(4) };
    if (header.toString('latin1', 0, 2) === 'MZ') {
      const peOffset = header.readUInt32LE(0x3c);
      assert(header.toString('latin1', peOffset, peOffset + 4) === 'PE\0\0', `${file} is not a PE binary`);
      return { format: 'pe', id: header.readUInt16LE(peOffset + 4) };
    }
    return { format: 'unknown', id: 0 };
  } finally {
    await handle.close();
  }
}
const binary = await readBinaryArchitecture(nativeAddon);
const expected = isMac ? { format: 'macho', id: MACHO_CPU[process.arch] } : { format: 'pe', id: PE_MACHINE[process.arch] };
assert.deepEqual(binary, expected, `Native SQLite addon does not match ${process.platform}-${process.arch}`);

const appManifest = JSON.parse((await extractPackaged('package.json')).toString());
assert(appManifest.dependencies?.['better-sqlite3']);
assert(typeof appManifest.main === 'string');
const packagedMainEntry = path.join(resourcesPath, 'app.asar', appManifest.main);
assert(entries.has(`/${appManifest.main}`), 'Packaged application main entry is missing');
const rendererHtml = (await extractPackaged('.webpack/renderer/main_window/index.html')).toString();
assert.match(rendererHtml, /connect-src 'none';/);
assert.doesNotMatch(rendererHtml, /localhost:/);

const executable = isMac
  ? path.join(appPath, 'Contents', 'MacOS', 'School Tutor')
  : path.join(appPath, 'School Tutor.exe');
const smokeDirectory = await mkdtemp(path.join(tmpdir(), 'school-tutor-packaged-smoke-'));
const databasePath = path.join(smokeDirectory, 'profile-smoke.sqlite3');
function createRuntimeEnvironment(source) {
  const environment = { ...source, ELECTRON_RUN_AS_NODE: '1' };
  delete environment.NODE_PATH;
  delete environment.NODE_OPTIONS;
  return environment;
}
const isolatedEnvironment = createRuntimeEnvironment({
  PATH: '/usr/bin',
  NODE_PATH: '/repository/node_modules',
  NODE_OPTIONS: '--require=/repository/dev-hook.cjs',
});
assert.deepEqual(isolatedEnvironment, { PATH: '/usr/bin', ELECTRON_RUN_AS_NODE: '1' });
const runtimeEnvironment = createRuntimeEnvironment(process.env);
function runInPackagedRuntime(script) {
  const result = spawnSync(executable, ['-e', script], {
    encoding: 'utf8',
    env: runtimeEnvironment,
    cwd: smokeDirectory,
    timeout: 30_000,
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr || 'Packaged Electron runtime smoke failed');
}

const requireFromPackagedMain = `require('node:module').createRequire(${JSON.stringify(packagedMainEntry)})`;
try {
  runInPackagedRuntime(`
    const Database = ${requireFromPackagedMain}('better-sqlite3');
    const db = new Database(${JSON.stringify(databasePath)});
    db.exec('CREATE TABLE profiles (id TEXT PRIMARY KEY, display_name TEXT NOT NULL); CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    db.prepare('INSERT INTO profiles VALUES (?, ?)').run('smoke-profile', 'Smoke Profile');
    db.prepare('INSERT INTO settings VALUES (?, ?)').run('ui_language', 'bg');
    db.close();
  `);
  runInPackagedRuntime(`
    const assert = require('node:assert/strict');
    const Database = ${requireFromPackagedMain}('better-sqlite3');
    const db = new Database(${JSON.stringify(databasePath)}, { readonly: true });
    assert.deepEqual(db.prepare('SELECT id, display_name AS displayName FROM profiles').get(), { id: 'smoke-profile', displayName: 'Smoke Profile' });
    assert.equal(db.prepare('SELECT value FROM settings WHERE key = ?').get('ui_language').value, 'bg');
    db.close();
  `);
} finally {
  await rm(smokeDirectory, { recursive: true, force: true });
}

console.log('Packaged SQLite module loads in Electron, and profile/language data survives a runtime restart.');
