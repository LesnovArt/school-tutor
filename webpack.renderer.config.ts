import { Compilation, sources, type Configuration } from 'webpack';

const config: Configuration = {
  // Forge defaults to eval-source-map in development, which strict script-src CSP blocks.
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.tsx?$/, include: /src/, use: 'ts-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  plugins: [{
    apply(compiler) {
      compiler.hooks.thisCompilation.tap('SchoolTutorProductionCspPlugin', (compilation) => {
        if (compiler.options.mode !== 'production') return;
        compilation.hooks.processAssets.tap({
          name: 'SchoolTutorProductionCspPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        }, () => {
          const assetName = 'main_window/index.html';
          const asset = compilation.getAsset(assetName);
          if (!asset) return;
          const html = asset.source.source().toString();
          const productionHtml = html.replace(
            "connect-src 'self' ws://localhost:3000;",
            "connect-src 'none';",
          );
          if (productionHtml === html) {
            compilation.errors.push(new Error('Could not apply the production renderer CSP.'));
            return;
          }
          compilation.updateAsset(assetName, new sources.RawSource(productionHtml));
        });
      });
    },
  }],
};

export default config;
