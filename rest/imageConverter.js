#!/usr/bin/env node

const axios = require('axios')
const https = require('https')
const mongoose = require('mongoose')
const moment = require('moment')
const ObjectId = mongoose.ObjectId
const {createLogger, format, transports} = require('winston')
const { combine, label, printf, prettyPrint } = format
const config = require('config').get('nanomine')
const curateFormat = printf(({level, message, label}) => {
  let now = moment().format('YYYY-MM-DD-HH:mm:ssSSS')
  return `${now} [${label}] ${level}: ${message}`
})

function configureLogger () { // logger is not properly configured yet. This config is for an earlier version of Winston
  let logger = createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
    levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
    format: combine(
      label({label: 'image-converter'}),
      prettyPrint(),
      curateFormat
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

const logger = configureLogger()
const db = mongoose.connection

function connected (){
  const dbUri = process.env['NM_MONGO_URI']
  return new Promise(function (resolve, reject) {
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
} 

/** 
 * @param { string } schemaPath Returns mongoDB schema path
*/
const schemaPath = './modules/mongo/schema'

/** 
 * @param { mongoschema } Schemas Returns needed mongoDB schemas
*/
const dataset = require(schemaPath + '/datasets')

const fsfilesSchema = require(schemaPath + '/fsfiles')(mongoose)
FsFiles = mongoose.model('files', fsfilesSchema)

const xmls = require(schemaPath + '/xmldata')

/** 
 * @param { testing | convert } string This function returns file chunks from mongoDB
*/
function selectFsFiles(arg){
  if(arg == 'testing'){
    return new Promise(function(resolve, reject){
      FsFiles.find({"filename": {$regex : ".tif"}}).limit(2).exec(function(err, items){
        if(err){
          logger.error('running' + err)
          reject(err)
        } else {
          resolve(items)
        }
      });
    })
  } else if(arg == 'convert') {
    return new Promise(function(resolve, reject){
      FsFiles.find({"filename": {$regex : ".tif"}}).exec(function(err, items){
        if(err){
          logger.error('running' + err)
          reject(err)
        } else {
          resolve(items)
        }
      });
    })
  }
  return;
}

const converter = function(){
  const jobType = process.argv.pop()
  const connect = connected()
  if(jobType === 'testing'){
    connect.then(function(){
      return selectFsFiles(jobType)
    }).then(function(numReceived){
      logger.info(numReceived)
    }).catch(function(err){
      logger.error(err)
    }).finally(function(){
      // db.close()
    })
  } else if(jobType === 'convert') {
    
  }
  // return db.close()
}

converter()


