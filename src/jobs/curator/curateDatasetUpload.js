#!/usr/bin/env node
// NOTE: NODE_PATH env variable must be set BEFORE executing this script to point to the /apps/nanomine/rest/node_modules directory
const path = require('path')
process.env['NODE_CONFIG_DIR'] = path.join(__dirname, '/../../../rest/config')
console.log(process.argv[1] + ' - NODE_PATH = ' + process.env['NODE_PATH'])

// const axios = require('axios')
// const https = require('https')
// const util = require('util')

const mongoose = require('mongoose')
// const ObjectId = mongoose.ObjectId
const moment = require('moment')
const nmutils = require('../../../rest/modules/utils')
const shortUUID = require('short-uuid')()
const libxmljs = require('libxmljs2')
const fs = require('fs')
const env = nmutils.getEnv()
const nmWebBaseUri = env.nmWebBaseUri
// const nmAuthSystemToken = env.nmAuthSystemToken
// const nmAuthApiTokenEmail = env.nmAuthApiTokenEmail
// const nmAuthApiRefreshEmail = env.nmAuthApiRefreshEmail

// const getDatasetXmlFileList = nmutils.getDatasetXmlFileList
const getLatestSchemas = nmutils.getLatestSchemas
const inspect = nmutils.inspect
const matchValidXmlTitle = nmutils.matchValidXmlTitle
const xmlEnsurePathExists = nmutils.xmlEnsurePathExists
const mergeDatasetInfoFromXml = nmutils.mergeDatasetInfoFromXml
const createDataset = nmutils.createDataset
const updateOrCreateXmlData = nmutils.updateOrCreateXmlData
const updateMicrostructureImageFileLocations = nmutils.updateMicrostructureImageFileLocations
const replaceDatasetId = nmutils.replaceDatasetId
const setTrace = nmutils.setTrace
const logTrace = nmutils.logTrace

const {createLogger, format, transports} = require('winston')

const config = require('config').get('nanomine')
const { combine, label, printf, prettyPrint } = format

const curateFormat = printf(({level, message, label}) => {
  let now = moment().format('YYYYMMDDHHmmssSSS')
  return `${now} [${label}] ${level}: ${message}`
})

// let nextInterval = 0
// let consecutiveFailureCount = 0

let logger = configureLogger()
setTrace(true) // verbose tracing
function configureLogger () { // logger is not properly configured yet. This config is for an earlier version of Winston
  let logger = createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
    levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
    format: combine(
      label({label: 'curatedsupload'}),
      // moment().format('YYYYMMDDHHmmss'),
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

let db = mongoose.connection

let dbUri = process.env['NM_MONGO_URI']
// let MgiVersion = null
let datasetsSchema = null
let Datasets = null
// let Users = null
// let Api = null
let xmlDataSchema = null
let XmlData = null
let xsdSchema = null
let XsdSchema = null
let xsdVersionSchema = null
let XsdVersionSchema = null

process.on('uncaughtException', (err, origin) => {
  fs.writeSync(
    process.stderr.fd,
    `Caught exception: ${err}\n` +
    `Exception origin: ${origin}`
  )
})

let connected = new Promise(function (resolve, reject) {
  mongoose.connect(dbUri, {keepAlive: true, keepAliveInitialDelay: 300000})
  db.on('error', function (err) {
    logger.error('db error: ' + err)
    reject(err)
  })
  db.once('open', function () {
    logger.info('database opened successfully via mongoose connect.')
    resolve()
  })
})
connected
  .then(function () {
    logger.info('connected handler.')
    let schemaPath = '../../../rest/modules/mongo/schema'

    // let mgiVersionSchema = require(schemaPath + '/mgiVersion')(mongoose)
    // MgiVersion = mongoose.model('mgiversion', mgiVersionSchema)

    datasetsSchema = require(schemaPath + '/datasets')(mongoose)
    Datasets = mongoose.model('datasets', datasetsSchema)

    // let usersSchema = require(schemaPath + '/users')(mongoose)
    // Users = mongoose.model('users', usersSchema)

    // let apiSchema = require(schemaPath + '/api')(mongoose)
    // Api = mongoose.model('api', apiSchema)

    xmlDataSchema = require(schemaPath + '/xmldata')(mongoose)
    XmlData = mongoose.model('xmlData', xmlDataSchema)

    xsdSchema = require(schemaPath + '/xsd')(mongoose)
    XsdSchema = mongoose.model('xsdData', xsdSchema)

    xsdVersionSchema = require(schemaPath + '/xsdVersion')(mongoose)
    XsdVersionSchema = mongoose.model('xsdVersionData', xsdVersionSchema)
    logger.info('curateDatasetUpload: running main entry point.')
    let jobType = process.argv[2]
    let jobId = process.argv[3]
    let jobDir = process.argv[4]
    logger.info('Running curateDatasetUpload(' + jobType + ', ' + jobId + ', ' + jobDir + ')')
    try {
      curateDatasetUpload(jobType, jobId, jobDir)
        .then(function () {
          logTrace('Success!')
          writeOutputParameters(jobId, jobDir, {error: null, data: null})
          db.close()
        })
        .catch(function (err) {
          logger.error('unexpected error: ' + err)
          logger.error(err.stack)
          writeOutputParameters(jobId, jobDir, {error: err, data: null})
          db.close()
        })
    } catch (err) {
      logger.error('Error running curateDatasetUpload: ' + err)
      logger.error(err.stack)
      db.close()
    }
  })
  .catch(function (err) {
    logger.error('Unhandled error detected. Closing db since error occured. Error: ' + err)
    db.close()
  })

function readXmlFile (jobId, jobDir, filename) {
  let xmlData = null
  let fullname = path.join(jobDir, filename)
  try {
    xmlData = fs.readFileSync(fullname, 'utf8')
  } catch (err) {
    logger.error('job: ' + jobId + ' unable to read: ' + fullname)
  }
  return xmlData
}

function writeOutputParameters (jobId, jobDir, data) {
  fs.writeFileSync(path.join(jobDir, '/job_output_parameters.json'), JSON.stringify(data), 'utf8')
}
function fmtLogMsg (status, msg) {
  let formatted = 'curateDatasetUpload - status: ' + status + ' msg: ' + msg
  return formatted
}

function curateDatasetUpload (jobType, jobId, jobDir) {
  let func = 'curateDatasetUpload'
  // similar to curate, but takes multiple XMLs of the same dataset to process
  // if the remap flag is set, a new dataset definition will be created to link samples and all the data remapped to the
  //   new dataset id
  // All of the XMLs uploaded must be for the same dataset
  // NOTE: Microstructure images are assumed to exist on the system already and their URL will be adjusted to the
  //   correct value for the environment being uploaded using the blobid included in the microstructure definition

  // Read job parameters to get remapdataset flag value and files
  // do the updates
  // write status to job_output_parameters.json
  // send email to submitter
  return new Promise(function (resolve, reject) {
    let parametersFile = path.join(jobDir + '/job_parameters.json')
    let paramsStr = fs.readFileSync(parametersFile, 'utf8')
    let parameters = JSON.parse(paramsStr)
    let user = parameters.user // creator to use
    // let originalUser = parameters.originalUser
    // let submittingUser = parameters.submittingUser // send mail to this user
    let jsonResp = {'error': null, 'data': null}
    let remap = parameters.remapdataset
    let xmls = parameters.files
    logger.error(func + ' - parameters: ' + paramsStr)
    // let vm = this
    // verify that all the data is for the same dataset
    // if not, return 98 error - 'all data to upload should be from same dataset'
    // if remap is set, then create a new dataset
    //   loop through all the XMLs and set IDs, Control_IDs, filenames accordingly
    //   For XMLs that do not have DOIs, create temporary DOIs as unpublished/{SHORT-UUID}
    //     Ensure that the DOI is reflected in the dataset
    // Create the dataset (remap = true)
    //   create new XML records in Mongo for each XML record
    if (remap) {
      let datasetInfo = {}
      let resStatus = 0
      let resError = null
      let pct = 0
      let tempDoi = 'unpublished/doi-' + shortUUID.new() // EXPECTING TO DO ONE DATASET ONLY! DOI should apply to all XMLs to process
      getLatestSchemas(XsdVersionSchema, XsdSchema, logger)
        .then(function (schemas) {
          let latestSchema = schemas[0].currentRef[0] // getLatestSchemas
          let schemaId = latestSchema._id
          let schemaName = latestSchema.title
          let xsd = latestSchema.content
          let xsdDoc = null
          try { // TODO this try block is way too big and the error printed is incorrect
            xsdDoc = libxmljs.parseXmlString(xsd)
            let xmlDocs = []
            if (xmls && xmls.length > 0) {
              xmls.forEach((v, idx) => {
                logger.debug(func + ' - processing xml ' + (pct + 1) + ' of ' + xmls.length)
                let xml = readXmlFile(jobId, jobDir, v)
                let xmlDoc = null
                if (resError === null) {
                  try {
                    xmlDoc = libxmljs.parseXmlString(xml)
                    xmlDocs.push(xmlDoc) // save for later to prevent re-parse
                    let xmlValid = xmlDoc.validate(xsdDoc) // xmlDoc.validationErrors array contains list of error messages if xmlValid is false, otherwise len=0
                    if (!xmlValid) {
                      let docId = xmlDoc.find('//ID')[0]
                      docId = (docId ? docId.text() : null)
                      resError = 'Error validating XML against XSD: ' + schemaName + ' schemaID:' + schemaId
                      if (docId) {
                        resError += ' xml: ' + docId
                      }
                      logger.error(resError + ' validation errors: ' + inspect(xmlDoc.validationErrors))
                      resStatus = 98
                    } else {
                      let docId = xmlDoc.find('//ID')[0].text()
                      let controlId = xmlDoc.find('//Control_ID')[0].text()
                      if (docId && controlId && docId.length > 0 && controlId.length > 0 && matchValidXmlTitle(docId) && matchValidXmlTitle(controlId)) {
                        // TODO do some basic XML doc verification like same dataset for all incoming XMLs (requires ID which should ALWAYS be there)
                        let doiPath = '/PolymerNanocomposite/DATA_SOURCE/Citation/CommonFields/DOI'
                        let doi = xmlDoc.find(doiPath)
                        if (doi && doi.length > 0) {
                          logger.debug(func + ' - ' + docId + ' doi is ' + doi)
                        } else {
                          logger.debug(func + ' - ' + docId + ' no DOI found. Using unpublished temp id: ' + tempDoi)
                          xmlDoc = xmlEnsurePathExists(xmlDoc, doiPath) // NOTE: this resets the xmlDoc to the new xmlDoc with the possibly new path
                          let elem = xmlDoc.find(doiPath)
                          elem[0].text(tempDoi)
                        }
                        mergeDatasetInfoFromXml(logger, datasetInfo, xmlDoc)
                        ++pct
                      } else {
                        resError = func + ' - error verifying ID and/or control ID. ID: ' + docId + ' Control_ID: ' + controlId
                        logger.error(resError)
                        resStatus = 98
                      }
                    }
                  } catch (err) {
                    resError = 'error parsing xml at index: ' + idx + '. Error: ' + err
                    logger.error(func + ' - error caught: ')
                    logger.error(err.stack)
                    resStatus = 98
                  }
                }
              })
              datasetInfo.userid = user // obtained from job parameters
              datasetInfo.latestSchema = true // just validated all the XMLs against the latest schema
              logger.debug('datasetInfo after merging ' + pct + ' of ' + xmls.length + ' xmls: ' + inspect(datasetInfo))
              if (resStatus !== 0) {
                let rc = resStatus
                jsonResp.error = resError + ' rc: ' + rc
                writeOutputParameters(jobId, jobDir, jsonResp)
                logger.error(jsonResp.error)
                console.log(2)
                reject(new Error(rc))
              }
              // create the dataset
              let xmlPromises = []
              createDataset(Datasets, logger, datasetInfo)
                .then(function (result) {
                  // loop through the xmls and update the ID, Control_ID and create the xml entry using the current schema
                  let dsid = result.data.seq
                  logger.debug(func + ' - new dataset id is: ' + dsid)
                  xmlDocs.forEach((v, idx) => {
                    let xmlDoc = v

                    let docId = xmlDoc.get('//ID')
                    let docIdText = docId.text()
                    let controlId = xmlDoc.get('//Control_ID')
                    let controlIdText = controlId.text()

                    docIdText = replaceDatasetId(logger, docIdText, dsid)
                    controlIdText = replaceDatasetId(logger, controlIdText, dsid)
                    docId.text(docIdText)
                    controlId.text(controlIdText)
                    updateMicrostructureImageFileLocations(logger, xmlDoc, nmWebBaseUri + '/nmr')
                    // TODO take care of named character encodings in text elements
                    // logger.debug(func + ' - updated xml: ' + xmlDoc.toString())
                    xmlPromises.push(updateOrCreateXmlData(XmlData, logger, user, xmlDoc, schemaId))
                  })
                  jsonResp.error = null // TODO
                  jsonResp.data = result.data // from dataset create
                  Promise.all(xmlPromises)
                    .then(function (values) {
                      let rc = 0
                      let msg = 'Updated or created ' + xmlPromises.length + ' xml records. rc=' + rc
                      jsonResp.data.info_msg = msg
                      jsonResp.error = null
                      writeOutputParameters(jobId, jobDir, jsonResp)
                      logger.info(msg)
                      console.log(3)
                      resolve(rc)
                    })
                    .catch(function (err) {
                      jsonResp.error = err.message
                      let msg = jsonResp.error + '  **WARNING**: dataset ' + result.data.seq + ' created and XML create/update failed after possibly updating/creating xmlData records'
                      jsonResp.data = null
                      jsonResp.error = msg
                      let restStatus = 99
                      logger.error(fmtLogMsg(restStatus, msg))
                      writeOutputParameters(jobId, jobDir, jsonResp)
                      console.log(4)
                      reject(new Error(restStatus))
                    })
                })
                .catch(function (err) {
                  let rc = 99
                  let msg = 'upload error: ' + err.message
                  if (err.stack) {
                    msg += ' msg:' + err.stack
                  }
                  msg += ' rc: ' + rc
                  logger.error(msg)
                  jsonResp.error = msg
                  jsonResp.data = null
                  writeOutputParameters(jobId, jobDir, jsonResp)
                  reject(new Error(rc))
                })
            } else {
              let status = 98
              let msg = fmtLogMsg(status, 'No XMLs specified to process.')
              logger.error(msg)
              jsonResp.error = msg
              writeOutputParameters(jobId, jobDir, jsonResp)
              console.log(6)
              reject(new Error(status))
            }
          } catch (err) {
            jsonResp.error = err
            writeOutputParameters(jobId, jobDir, jsonResp)
            let rc = 99
            logger.error(jsonResp.error + ' rc: ' + rc)
            console.log(err.stack)
            reject(new Error(rc))
          }
        })
        .catch(function (err) {
          let status = 99
          let msg = 'unable to read latest schemas: ' + err + ' rc=' + status
          jsonResp.error = msg
          logger.error(msg)
          writeOutputParameters(jobId, jobDir, jsonResp)
          console.log(7)
          reject(new Error(status))
        })
    } else {
      let status = 98
      let msg = 'remap mode is required to be true a this time. rc=' + status
      jsonResp.error = msg
      logger.error(msg)
      writeOutputParameters(jobId, jobDir, jsonResp)
      console.log(8)
      process.exit(status)
    }
    //
    // let status = 99
    // let msg = 'Unexpected code execution point. rc=' + status
    // jsonResp.error = msg
    // logger.error(msg)
    // let err = new Error(msg)
    // console.log('unexpected error: ' + err)
    // console.log(err.stack)
    // writeOutputParameters(jobId, jobDir, jsonResp)
    // console.log(9);
    // process.exit(status)
  })
}
