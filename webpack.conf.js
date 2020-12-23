const path = require('path');

const config = {
  entry: {
    common: './index.js'
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          path.resolve(__dirname, 'node_modules')
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  output: {
    chunkFilename: 'index.js',
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist')
  },
  target: 'node'
};

module.exports = config;
