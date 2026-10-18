import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extractFile, listPackage } from '@electron/asar';

const appPath = path.resolve(
  process.argv[2] ??
    `out/School Tutor-${process.platform}-${process.arch}/School Tutor.app`,
);
const resourcesPath = path.join(appPath, 'Contents', 'Resources');
const archivePath = path.join(resourcesPath, 'app.asar');
const unpackedPath = `${archivePath}.unpacked`;
const entries = new Set(await listPackage(archivePath));

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
await access(nativeAddon);
const architecture = execFileSync('file', [nativeAddon], { encoding: 'utf8' });
const fileArchitecture = process.arch === 'x64' ? 'x86_64' : process.arch;
assert.match(architecture, new RegExp(`Mach-O 64-bit bundle ${fileArchitecture}`));

const appManifest = JSON.parse((await extractFile(archivePath, 'package.json')).toString());
assert(appManifest.dependencies?.['better-sqlite3']);
assert(typeof appManifest.main === 'string');
const packagedMainEntry = path.join(resourcesPath, 'app.asar', appManifest.main);
assert(entries.has(`/${appManifest.main}`), 'Packaged application main entry is missing');
const rendererHtml = (await extractFile(archivePath, '.webpack/renderer/main_window/index.html')).toString();
assert.match(rendererHtml, /connect-src 'none';/);
assert.doesNotMatch(rendererHtml, /localhost:/);

const executable = path.join(appPath, 'Contents', 'MacOS', 'School Tutor');
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
