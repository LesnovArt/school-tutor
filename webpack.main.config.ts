import type { Configuration } from 'webpack';

const config: Configuration = {
  entry: './src/main/index.ts',
  module: {
    rules: [
      { test: /\.ts$/, include: /src/, use: 'ts-loader' },
    ],
  },
  resolve: { extensions: ['.ts', '.js'] },
  // Forge's Webpack plugin strips node_modules from the app copy. Keep this
  // native package external and let Electron Packager retain production deps.
  externals: { 'better-sqlite3': 'commonjs2 better-sqlite3' },
};

export default config;
