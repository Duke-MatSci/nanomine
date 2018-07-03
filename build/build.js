'use strict'
require('./check-versions')()

process.env.NODE_ENV = 'production'

const ora = require('ora')
const rm = require('rimraf')
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack')
const config = require('../config')
const webpackConfig = require('./webpack.prod.conf')
const cp = require('recursive-copy')

const spinner = ora('building for production...')
spinner.start()

rm(path.join(config.build.assetsRoot, config.build.assetsSubDirectory), err => {
  if (err) throw err
  webpack(webpackConfig, (err, stats) => {
    spinner.stop()
    if (err) throw err
    process.stdout.write(stats.toString({
      colors: true,
      modules: false,
      children: false, // If you are using ts-loader, setting this to true will make TypeScript errors show up during build.
      chunks: false,
      chunkModules: false
    }) + '\n\n')

    if (stats.hasErrors()) {
      console.log(chalk.red('  Build failed with errors.\n'))
      process.exit(1)
    }
    console.log(chalk.cyan('Copying ./dist/cdn directory to ./static for Whyis integration'))
    cp('./dist/cdn','./static', {'overwrite':true} )
      .then(function(results) {
        console.info('Copied ' + results.length + ' files')
        cp('./dist/nanomine.html','./templates/nanomine.html',{'overwrite':true})
          .then(function(results){
            console.log(chalk.cyan('  Build complete.\n'))
            console.log(chalk.yellow(
              '  Tip: built files are meant to be served over an HTTP server.\n' +
              '  Opening index.html over file:// won\'t work.\n'
            ))
          })
          .catch(function(error){
             console.log(chalk.red(' failed to copy nanomine.html to whyis ./templates directory'))
          })
      })
      .catch(function(error){
        console.error('Directory copy failed (Build is OK, but copy for Whyis failed): ' + error)
      })
  })
})
