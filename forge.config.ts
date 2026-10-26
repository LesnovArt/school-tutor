import type { ForgeConfig } from '@electron-forge/shared-types';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import mainConfig from './webpack.main.config';
import rendererConfig from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'School Tutor',
    // The Webpack plugin builds into a clean staging directory, so Packager
    // cannot discover/prune external dependencies from that directory. The
    // packageAfterCopy hook below copies only production runtime dependencies.
    prune: false,
  },
  rebuildConfig: { force: true },
  makers: [
    { name: '@electron-forge/maker-zip', config: {}, platforms: ['darwin', 'win32'] },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'SchoolTutor',
        // NuGet requires a non-empty authors value; package.json has no author.
        authors: 'School Tutor',
        exe: 'School Tutor.exe',
        setupExe: 'SchoolTutorSetup.exe',
        description: 'A local maths tutor for a family',
        noMsi: true,
      },
      platforms: ['win32'],
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      port: 3000,
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            name: 'main_window',
            html: './src/renderer/index.html',
            js: './src/renderer/index.tsx',
            preload: { js: './src/preload/index.ts' },
          },
        ],
      },
    }),
  ],
  hooks: {
    // Forge's Webpack plugin omits node_modules from the app copy. Modules
    // configured as Webpack externals must be copied back after that filter;
    // Electron Forge then rebuilds native modules for the target Electron ABI.
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      const nodeModulesPath = path.join(buildPath, 'node_modules');
      await mkdir(nodeModulesPath, { recursive: true });
      for (const dependency of ['better-sqlite3', 'node-addon-api']) {
        await cp(
          path.join(process.cwd(), 'node_modules', dependency),
          path.join(nodeModulesPath, dependency),
          { recursive: true },
        );
      }
    },
  },
};

export default config;
