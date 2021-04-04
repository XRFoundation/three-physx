module.exports = {
  mode: 'development',
  cache: {
    type: 'filesystem'
  },
  /* config options here */
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
    const experiments = config.experiments || {};
    config.experiments = {...experiments, asyncWebAssembly: true};
    config.externals.push({ xmlhttprequest: 'xmlhttprequest', fs: 'fs' })
    // config.output.publicPath = `/_next/`;
    config.output.chunkFilename = isServer
      ? `${dev ? "[name]" : "[name].[fullhash]"}.js`
      : `static/chunks/${dev ? "[name]" : "[name].[fullhash]"}.js`;
    // config.module.rules.push({
    //   test: /\.wasm/,
    //   type: 'asset/resource',
    // })
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
              // happyPackMode: true
            },
          }]
      },
    )
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'javascript/auto',
      use: ['cache-loader',  {
        loader: 'file-loader',
        options: {
          outputPath: '/',
          name: '/[name]'
        }
      },
      ]
    })
    //   {
    //     test: /\.m?js$/,
    //     use: ['cache-loader',  {
    //       loader: 'babel-loader',
    //       options: {
    //         presets: [
    //           'next/babel'
    //         ]
    //       }
    //     }]
    //   })
    // config.module.rules.push({
    //   test: /\.wasm$/,
    //   type: 'javascript/auto',
    //   use: ['cache-loader',  {
    //     loader: 'file-loader',
    //     options: {
    //       path: 'wasm',
    //       name: '[name]-[hash].[ext]'
    //     }
    //   },
    //   ]
    // })
    return config
  }
}
