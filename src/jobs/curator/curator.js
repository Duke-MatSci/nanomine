#!/usr/bin/env node
/*
  Use mongoose directly as much as possible to keep from banging on rest server
*/
process.env['NODE_CONFIG_DIR'] = __dirname + '/../../../rest/config'
const axios = require('axios')
const https = require('https')
const util = require('util')
const mongoose = require('mongoose')
const ObjectId = mongoose.ObjectId
const moment = require('moment')
const nmutils = require('../../../rest/modules/utils')
const env = nmutils.getEnv()
const getDatasetXmlFileList = nmutils.getDatasetXmlFileList

const {createLogger, format, transports} = require('winston')

const config = require('config').get('nanomine')
const { combine, label, printf, prettyPrint } = format

const curateFormat = printf(({ level, message, label}) => {
  let now = moment().format('YYYYMMDDHHmmssSSS')
  return `${now} [${label}] ${level}: ${message}`
})

let nextInterval = 0
let consecutiveFailureCount = 0

let logger = configureLogger()

function configureLogger () { // logger is not properly configured yet. This config is for an earlier version of Winston
  let logger = createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
    format: combine(
      label({label: 'curate'}),
      // moment().format('YYYYMMDDHHmmss'),
      prettyPrint(),
      curateFormat
    ),
    transports: [
      new (transports.File)({
        levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
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
let MgiVersion = null
let Datasets = null
let Users = null
let Api = null
let XmlData = null
let XsdSchema = null
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

    let usersSchema = require(schemaPath + '/users')(mongoose)
    Users = mongoose.model('users', usersSchema)

    let apiSchema = require(schemaPath + '/api')(mongoose)
    Api = mongoose.model('api', apiSchema)

    let xmlDataSchema = require(schemaPath + '/xmldata')(mongoose)
    XmlData = mongoose.model('xmlData', xmlDataSchema)

    let xsdSchema = require(schemaPath + '/xsd')(mongoose)
    XsdSchema = mongoose.model('xsdData', xsdSchema)

    let xsdVersionSchema = require(schemaPath + '/xsdVersion')(mongoose)
    XsdVersionSchema = mongoose.model('xsdVersionData', xsdVersionSchema)
    curator()
  })
  .catch(function (err) {
    logger.error('Curator error detected. NOT RE-SCHEDULING. closing db. Error: ' + err)
    db.close()
  })

function inspect (theObj) {
  return util.inspect(theObj, {showHidden: true, depth: 5})
}
function getLatestSchema () {
  let func = 'getLatestSchema'
  return new Promise(function (resolve, reject) {
    let url = env.nmLocalRestBase + '/nmr/templates/versions/select/allactive'
    let httpsAgentOptions = { // allow localhost https without knowledge of CA
      host: 'localhost',
      port: '443',
      path: '/',
      rejectUnauthorized: false
    }
    let httpsAgent = new https.Agent(httpsAgentOptions)
    // let data = {} // no post data
    axios({
      'method': 'get',
      'url': url,
      // 'data': data,
      'httpsAgent': httpsAgent,
      'headers': {'Content-Type': 'application/json'}
    })
      .then(function (data) {
        // logger.error(inspect(response))
        let latestVersions = data.data.data
        let latestSchema = latestVersions[0].currentRef[0]
        resolve(latestSchema)
      })
      .catch(function (err) {
        let msg = func + ' - an error occurred getting the latest schema. Error: ' + err
        logger.error(msg)
        reject(new Error(msg))
      })
  })
}
function getNextXmlDataRecordWithEntityStates (schemaId, queryStatesArray) {
  let func = 'getNextXmlDataRecordWithEntityStates'
  return new Promise(function (resolve, reject) {
    let query = {}
    let qsa = []
    queryStatesArray.forEach(function (v) {
      let tmp = {'entityState': {'$eq': v}}
      qsa.push(tmp)
    })
    if (queryStatesArray.length > 1) {
      query = {'$or': qsa}
    } else {
      query = qsa[0]
    }
    let idQuery = {'schemaId': {'$eq': schemaId}}
    query = {'$and': [idQuery, query]}
    XmlData.findOne(query, {}, function (err, xmlData) {
      if (err) {
        let msg = func + ' - error finding next xml data record for: ' + queryStatesArray + ' query: ' + inspect(query)
        reject(new Error(msg))
      } else {
        resolve(xmlData)
      }
    })
  })
}

function updateXmlDataRecordEntityState (doc, newEntityState) {
  let func = 'getNextXmlDataRecord'
  return new Promise(function (resolve, reject) {
    XmlData.findOneAndUpdate({'$and': [{'schemaId': {'$eq': doc.schemaId}}, {'_id': {'$eq': doc._id}}]}, {'entityState': newEntityState},
      function (err, oldDoc) {
        if (err) {
          let msg = func + ' - unable to update entityState for: ' + doc.title + ' schemaId: ' + doc.schemaId + ' error: ' + err
          reject(new Error(msg))
        } else {
          resolve()
        }
      })
  })
}

function handleCuratorRunComplete (failed) {
  let func = 'handleCuratorRunComplete'
  if (failed) {
    ++consecutiveFailureCount
  } else {
    consecutiveFailureCount = 0
  }
  logger.info('Curator run completed ' + (failed ? 'unsuccessfully.' : 'successfully.'))
  nextInterval = 5000
  if (consecutiveFailureCount < 5) {
    logger.info(func + ' - rescheduling curator. Failure count is below threshold. FailureCount: ' + consecutiveFailureCount)
    curator() // re-schedule self after run
  } else {
    logger.error(func + ' - not rescheduling curator since failure count is: ' + consecutiveFailureCount + '. Alerting administrator.')
    // TODO alert administrator and create ticket
  }
}

let entityStates = ['Unknown', 'EditedValid', 'EditedNotValid', 'Valid', 'NotValid', 'Ingesting', 'IngestFailed', 'IngestSuccess']
let editedValid = 1, editedNotValid = 2, valid = 3, notValid = 4, ingesting = 5, ingestFailed = 6, ingestSuccess = 7

function curator () {
  let func = 'curator'
  setTimeout(function () {
    logger.info('Curator run starting...')
    // 0. Get the latest schema id
    getLatestSchema()
      .then(function (schemaRec) {
        // 1. find all xmldata records with entity states of Valid or EditedValid since there's no editor
        getNextXmlDataRecordWithEntityStates(schemaRec._id, [entityStates[valid], entityStates[editedValid]])
          .then(function (xmlData) {
            logger.info(func + ' - processsing schema id: ' + xmlData.schemaId + ' title: ' + xmlData.title + ' entityState: ' + xmlData.entityState)
            // 2. Update state to ingesting
            updateXmlDataRecordEntityState(xmlData, entityStates[ingesting])
              .then(function () {
                // 3. upload associated data to rdf using USERID of user from xmldata record via nanomine rest service
                let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
                  host: 'localhost',
                  port: '443',
                  path: '/',
                  rejectUnauthorized: false
                }
                let httpsAgent = new https.Agent(httpsAgentOptions)
                // if xmldata has associated curated files (older xmls do not currently since their files are not in curateinput bucket
                getDatasetXmlFileList(mongoose, logger, xmlData.title)
                  .then(function (files) {
                    let url = null
                    let data = null
                    let trimmedTitle = xmlData.title.replace(/\.xml$/,'')
                    if (files && files.length > 0) { // has curated files
                      url = env.nmLocalRestBase + '/nmr/publishfiles2rdf'
                      data = {'xmltitle': trimmedTitle, 'userid': xmlData.iduser} // yes, in xmldata, it's iduser
                    } else { // does not have curated files, so just publish xml
                      url = env.nmLocalRestBase + '/nmr/publishxml2rdf'
                      data = {'xmltitle': trimmedTitle, 'xmltext': xmlData.xml_str, 'schemaname': schemaRec.title, 'userid': xmlData.iduser} // yes, in xmldata, it's iduser
                    }
                    axios({
                      'method': 'post',
                      'url': url,
                      'data': data,
                      'httpsAgent': httpsAgent,
                      'headers': {'Content-Type': 'application/json'}
                    })
                      .then(function (data) {
                        // 4. change state to IngestSuccess or IngestFailed
                        // logger.debug(func + ' - response data: ' + inspect(data))
                        if (data.status === 201) {
                          updateXmlDataRecordEntityState(xmlData, entityStates[ingestSuccess])
                            .then(function () {
                              handleCuratorRunComplete(false) // yay no error
                            })
                            .catch(function (err){
                              let msg = func + ' - publish was successful, but entityState update for: ' + xmlData.schemaId + '/' + xmlData.title + ' failed with error: ' + err
                              logger.error(msg)
                              handleCuratorRunComplete(true) // report error for failure to update state even though record was published
                            })
                        } else {
                          // 4b. change xml entity state to IngestFailed
                          let msg = func + ' - unexpected response posting data to rdf. status(200 is not OK-should be 201): ' + data.status
                          logger.error(msg)
                          updateXmlDataRecordEntityState(xmlData, entityStates[ingestFailed])
                            .then(function () {
                              handleCuratorRunComplete(true)
                            })
                            .catch(function (err){
                              let msg = func + ' - publish failed and entityState update for: ' + xmlData.schemaId + '/' + xmlData.title + ' failed with error: ' + err
                              logger.error(msg)
                              handleCuratorRunComplete(true) // report error for failure to update state even though record was published
                            })
                        }
                      })
                      .catch(function (err) {
                        // 4b. change xml entity state to IngestFailed
                        let msg = func + ' - error posting data to rdf. error: ' + err
                        logger.error(msg)
                        updateXmlDataRecordEntityState(xmlData, entityStates[ingestFailed])
                          .then(function () {
                            handleCuratorRunComplete(true)
                          })
                          .catch(function (err){
                            let msg = func + ' - publish failed and entityState update for: ' + xmlData.schemaId + '/' + xmlData.title + ' failed with error: ' + err
                            logger.error(msg)
                            handleCuratorRunComplete(true) // report error for failure to update state even though record was published
                          })
                      })
                  })
                  .catch(function (err) {
                    let msg = func + ' - error determining if xmlTitle: ' + xmlData.title + ' has associated curated files. Error: ' + err
                    logger.error(msg)
                    handleCuratorRunComplete(true)
                  })
              })
              .catch(function (err) {
                logger.error(func + ' - error updating state of xmldata to ingesting: ' + xmlData.schemaId + '/' + xmlData.title + ' error: ' + err)
                handleCuratorRunComplete(true)
              })
          })
          .catch(function (err) {
            logger.error(func + ' - failure getting xml data record. Error: ' + err)
            handleCuratorRunComplete(true)
          })
      })
      .catch(function (err) {
        logger.error(func + ' - failure getting latest schema. Error: ' + err)
        handleCuratorRunComplete(true)
      })
  }, nextInterval)
}

// Do not initially run curator() inline. It's started by the db open handler above
