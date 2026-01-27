const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/pb.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'pb.min.js',
    library: {
      name: 'pb',
      type: 'window',
      export: 'default',
    },
    clean: true, // Clean dist folder before build
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false, // Keep console for debugging
            pure_funcs: ['console.debug'], // Remove only debug logs
            passes: 2,
          },
          mangle: {
            reserved: ['pb'], // Don't mangle the global 'pb' namespace
          },
          format: {
            comments: false, // Remove all comments
            preamble: '/* pbjs_engine Publisher Wrapper v1.0.0 | (c) 2024 */',
          },
        },
        extractComments: false,
      }),
    ],
  },
  devtool: 'source-map', // Generate source maps for debugging
};
