const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/pb.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: process.env.PUBLISHER_ID ? `pb-${process.env.PUBLISHER_ID}.min.js` : 'pb.min.js',
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
  plugins: [
    new webpack.DefinePlugin({
      __PUBLISHER_ID__: JSON.stringify(process.env.PUBLISHER_ID || undefined),
    }),
  ],
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
