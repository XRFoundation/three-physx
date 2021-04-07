const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");


module.exports = {
  mode: "production",
  entry: {
    main: "./src/index.ts",
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'build'),
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        use: ['cache-loader',
          {
            loader: 'babel-loader',
          }, {
            loader: 'ts-loader',
            options: {
              allowTsInNodeModules: true,
              transpileOnly: true,
            },
          }]
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "dist", to: "./" },
      ],
    }),
  ],
};