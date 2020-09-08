/**
 * CENTRALIZING ERROR REPORTING HANDLER
 */
const moment = require('moment')
const {createLogger, format, transports} = require('winston')
const { combine, label, printf, prettyPrint } = format

const logFormat = printf(({level, message, label}) => {
  let now = moment().format('YYYYMMDDHHmmssSSS')
  return `${now} [${label}] ${level}: ${message}`
})

module.exports = (config) => { // logger is not properly configured yet. This config is for an earlier version of Winston
  let logger = createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
    levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
    format: combine(
      label({label: 'nm-rest'}),
      prettyPrint(),
      logFormat
    ),
    transports: [
      new (transports.File)({
        level: config.loglevel,
        filename: config.logfilename,
        maxfiles: config.maxlogfiles,
        maxsize: config.maxlogfilesize
      })
    ]
  })
  return logger
}