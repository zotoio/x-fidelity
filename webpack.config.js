const path = require('path');

module.exports = {
  entry: './src/index.ts', // Update with your entry point
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.json$/,
        type: 'json',
        exclude: /node_modules/,
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  output: {
    filename: 'bundle.js', // Update with your desired output filename
    path: path.resolve(__dirname, 'dist'),
  },
};
