#!/usr/bin/env node
/*
  Use mongoose directly as much as possible to keep from banging on rest server
*/
process.env['NODE_CONFIG_DIR'] = __dirname + '/../../../rest/config'
// const axios = require('axios')
// const https = require('https')
const util = require('util')
const mongoose = require('mongoose')
// const ObjectId = mongoose.ObjectId
const moment = require('moment')
const nmutils = require('../../../rest/modules/utils')

const env = nmutils.getEnv()
const nmAuthSystemToken = env.nmAuthSystemToken
// const nmAuthApiTokenCurate = env.nmAuthApiTokenCurate
// const nmAuthApiRefreshCurate = env.nmAuthApiRefreshCurate

const getLatestSchemas = nmutils.getLatestSchemas
const {createLogger, format, transports} = require('winston')

const config = require('config').get('nanomine')
const { combine, label, printf, prettyPrint } = format

const printFormat = printf(({level, message, label}) => {
  let now = moment().format('YYYYMMDDHHmmssSSS')
  return `${now} [${label}] ${level}: ${message}`
})

let nextInterval = 0
let consecutiveFailureCount = 0

let logger = configureLogger()

function configureLogger () { // logger is not properly configured yet. This config is for an earlier version of Winston
  let logger = createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
    levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
    format: combine(
      label({label: 'generateSeoFiles'}),
      // moment().format('YYYYMMDDHHmmss'),
      prettyPrint(),
      printFormat
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

let db = mongoose.connection

let dbUri = process.env['NM_MONGO_URI']
let Datasets = null
let XsdVersionSchema = null

let connected = new Promise(function (resolve, reject) {
  mongoose.connect(dbUri, {keepAlive: true, keepAliveInitialDelay: 300000})
  db.on('error', function (err) {
    logger.error('db error: ' + err)
    resolve(err)
  })
  db.once('open', function () {
    logger.info('database opened successfully via mongoose connect.')
    resolve()
  })
})
connected
  .then(function () {
    let schemaPath = '../../../rest/modules/mongo/schema'

    let mgiVersionSchema = require(schemaPath + '/mgiVersion')(mongoose)
    MgiVersion = mongoose.model('mgiversion', mgiVersionSchema)

    let datasetsSchema = require(schemaPath + '/datasets')(mongoose)
    Datasets = mongoose.model('datasets', datasetsSchema)

    Users = require(schemaPath + '/users')
    Api = require(schemaPath + '/api')
    XmlData = require(schemaPath + '/xmldata')
    XsdSchema = require(schemaPath + '/xsd')
    let xsdVersionSchema = require(schemaPath + '/xsdVersion')(mongoose)
    XsdVersionSchema = mongoose.model('xsdVersionData', xsdVersionSchema)

    generator()
  })
  .catch(function (err) {
    logger.error('GenerateSeoFiles error detected. NOT RE-SCHEDULING. closing db. Error: ' + err)
    db.close()
  })

function inspect (theObj) {
  return util.inspect(theObj, {showHidden: true, depth: 5})
}

function getLatestSchema () {
  let func = 'getLatestSchema'
  return new Promise(function (resolve, reject) {
    getLatestSchemas(XsdVersionSchema, logger)
      .then(function (data) {
        // logger.error(inspect(response))
        let latestVersions = data
        let latestSchema = latestVersions[0].currentRef
        resolve(latestSchema)
      })
      .catch(function (err) {
        let msg = func + ' - an error occurred getting the latest schema. Error: ' + err
        logger.error(msg)
        reject(new Error(msg))
      })
  })
}

function handleGenerateSeoRunComplete (failed) {
  let func = 'handleGenerateSeoRunComplete'
  if (failed) {
    ++consecutiveFailureCount
  } else {
    consecutiveFailureCount = 0
  }
  if (failed) {
    logger.info('generate seo files run completed ' + (failed ? 'unsuccessfully.' : 'successfully.'))
  }
  nextInterval = 24 * 60 * 60 * 1000 // 24 hours as milliseconds
  if (consecutiveFailureCount < 5) {
    logger.trace(func + ' - rescheduling generate seo files. Failure count is below threshold. FailureCount: ' + consecutiveFailureCount)
    generator() // re-schedule self after run
  } else {
    logger.error(func + ' - not rescheduling seo generator since failure count is: ' + consecutiveFailureCount + '. Alerting administrator.')
    // TODO alert administrator and create ticket
  }
}

function generator () {
  let func = 'generator'
  setTimeout(function () {
    logger.trace('Generator run starting...')
    // 0. Get the latest schema id
    getLatestSchema()
      .then(function (schemaRec) { // not actually using schema yet, but dataset key will eventually include schemaid
        // TODO schemaRec._id should be part of datasets lookup key
        Datasets.find({}, function (err, docs) {
          if (err) {
            logger.error(func + ' - failure getting datasets. Error: ' + err)
            handleGenerateSeoRunComplete(true)
          } else {
            logger.info(func + ' - obtained ' + docs.length + ' datasets.')
            handleGenerateSeoRunComplete(false)
          }
        })
      })
      .catch(function (err) {
        logger.error(func + ' - failure getting latest schema. Error: ' + err)
        handleGenerateSeoRunComplete(true)
      })
  }, nextInterval)
}

// Do not initially run generator() inline. It's started by the db open handler above
