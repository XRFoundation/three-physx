module.exports = {
  target: "serverless",
  mode: 'development',
  cache: {
    type: 'filesystem'
  },
  watchOptions: {
    ignored: /node_modules/
  },
  future: {
    excludeDefaultMomentLocales: true,
    webpack5: true
  },
  optimization: {
    usedExports: true,
    splitChunks: {
      chunks: 'all',
    },
    removeAvailableModules: true,
    runtimeChunk: 'multiple'
  },
  dir: './',
  distDir: './.next',
  webpack(config, { webpack, isServer, dev }) {
    console.log('Building client with webpack', webpack.version)
    config.externals.push({ xmlhttprequest: 'xmlhttprequest', fs: 'fs' })
    config.output.chunkFilename = isServer
      ? `${dev ? "[name]" : "[name].[fullhash]"}.js`
      : `static/chunks/${dev ? "[name]" : "[name].[fullhash]"}.js`;
    config.module.rules.push(
      {
        test: /\.ts(x?)$/,
        use: ['cache-loader',
          {
            loader: 'babel-loader',
            options: { "presets": ["next/babel"] }
          }, {
            loader: 'ts-loader',
            options: {
              allowTsInNodeModules: true,
              transpileOnly: true,
            },
          }]
      },
    )
    return config
  }
}
