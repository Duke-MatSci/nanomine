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
const libxmljs = require('libxmljs')
const mimetypes = require('mime-types')
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
const replaceXmlSampleNumberInTitle = nmutils.replaceXmlSampleNumberInTitle
const xmlEnsurePathExists = nmutils.xmlEnsurePathExists
const mergeDatasetInfoFromXml = nmutils.mergeDatasetInfoFromXml
// const createDataset = nmutils.createDataset
const updateOrCreateXmlData = nmutils.updateOrCreateXmlData
const updateDataset = nmutils.updateDataset
const updateMicrostructureImageFileLocations = nmutils.updateMicrostructureImageFileLocations
// const replaceXmlSeqInTitle = nmutils.replaceXmlSeqInTitle
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
let schemaPath = '../../../rest/modules/mongo/schema'
let datasetsModule = require(schemaPath + '/datasets')
let datasetsSchema = null
let FsFiles = null // fsfiles.js schema
let Datasets = null
// let datasetAddOrOverwriteFileInfo = datasetsModule.datasetAddOrOverwriteFileInfo
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
  mongoose.connect(dbUri, {
    poolSize: 10,
    bufferMaxEntries: 0,
    reconnectTries: 5000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    keepAlive: true,
    keepAliveInitialDelay: 30000})
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

    // let mgiVersionSchema = require(schemaPath + '/mgiVersion')(mongoose)
    // MgiVersion = mongoose.model('mgiversion', mgiVersionSchema)

    datasetsSchema = datasetsModule.datasets(mongoose)
    Datasets = mongoose.model('datasets', datasetsSchema)
    // let usersSchema = require(schemaPath + '/users')(mongoose)
    // Users = mongoose.model('users', usersSchema)

    // let apiSchema = require(schemaPath + '/api')(mongoose)
    // Api = mongoose.model('api', apiSchema)

    let fsfilesSchema = require(schemaPath + '/fsfiles')(mongoose)
    FsFiles = mongoose.model('api', fsfilesSchema)

    XmlData = require('../../../rest/modules/mongo/schema/xmldata')
    XsdSchema = require('../../../rest/modules/mongo/schema/xsd')

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
          logger.error('unexpected error: ' + inspect(err))
          logger.error(inspect(err.stack))
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
  let func = 'readXmlFile'
  let xmlData = null
  let fullname = path.join(jobDir, filename)
  // logger.debug(func + ' - ' + 'reading xml: ' + fullname)
  try {
    xmlData = fs.readFileSync(fullname, 'utf8')
    xmlData = xmlData.replace(/>\s*</g, '><')
    // logger.debug(func + ' - ' + 'read xml: ' + fullname + ' length: ' + xmlData.length)
  } catch (err) {
    logger.error(func + ' - job: ' + jobId + ' unable to read: ' + fullname)
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

function updateFileInfoMetadataFromBlob (fileInfo) {
  let func = 'updateFileInfoFromBlob'
  return new Promise(function (resolve, reject) {
    if (fileInfo.type === 'blob') {
      FsFiles.findOne({_id: fileInfo.id}, function (err, fsFilesDoc) {
        if (err) {
          logger.error(func + ' - error reading fs.info for blob id: ' + fileInfo.id + ' Error: ' + err.message)
          reject(err)
        } else {
          if (fsFilesDoc) {
            let metadata = {
              'filename': fsFilesDoc.filename,
              'contentType': mimetypes.lookup(fsFilesDoc.filename)
            }
            fileInfo.metadata = metadata
            resolve(fileInfo)
          } else {
            logger.error(func + ' - oops blob not found: ' + fileInfo.id + ' invalid blob id.')
            resolve(null)
          }
        }
      })
    } else {
      let err = new Error('fileInfo type is not "blob".')
      reject(err)
    }
  })
}
function curateDatasetUpload (jobType, jobId, jobDir) {
  let func = 'curateDatasetUpload'
  // similar to curate, but takes multiple XMLs of the same dataset to process
  // All of the XMLs uploaded must be for the same dataset
  // NOTE: Microstructure images are assumed to exist on the system already and their URL will be adjusted to the
  //   correct value for the environment being uploaded using the blobid included in the microstructure definition

  // Read job parameters to get dataset id of the dataset created/selected by the user that ran the job
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
    let validParameters = true
    let remap = false
    let useId = false
    let datasetId = null
    if (parameters.datasetCreateOrUpdateType && parameters.datasetId) {
      switch (parameters.datasetCreateOrUpdateType.toLowerCase()) {
        // case 'remap': // Forces new dataset creation for the set of XMLs and remaps id/control id to new number
        //  remap = true // DEPRECATED
        //  break
        case 'useid': // uses id of xml to create and update dataset
          useId = true
          break
        default:
          validParameters = false
      }
      datasetId = parameters.datasetId
    } else {
      validParameters = false
    }
    let xmls = parameters.files
    logger.info(func + ' - parameters: ' + paramsStr)
    let validXmlNames = true
    let dsSeq = -1
    xmls.forEach((v, i) => {
      let rv = matchValidXmlTitle(v)
      if (rv) {
        let xmlds = +(rv[1]) // dataset seq is first slot of name
        if (dsSeq === -1) {
          dsSeq = xmlds
        }
        if (dsSeq !== xmlds) {
          validXmlNames = false
        }
      }
    })
    // let vm = this
    // verify that all the data is for the same dataset
    // if not, return 98 error - 'all data to upload should be from same dataset'
    // if remap is set, then create a new dataset
    //   loop through all the XMLs and set IDs, Control_IDs, filenames accordingly
    //   For XMLs that do not have DOIs, create temporary DOIs as unpublished/{SHORT-UUID}
    //     Ensure that the DOI is reflected in the dataset
    // Create the dataset (remap = true)
    //   create new XML records in Mongo for each XML record
    if (!validParameters || !validXmlNames) {
      let rc = 97
      let errors = []
      if (!validParameters) {
        errors.push('datasetCreateOrUpdate query parameter must be either "remap" or "useid" and datasetId must be set')
      }
      if (!validXmlNames) {
        errors.push('all XMLs must be for same dataset.')
      }

      jsonResp.error = 'rc: ' + rc + ' Error message(s): ' + errors.join(' and ')
      writeOutputParameters(jobId, jobDir, jsonResp)
      logger.error(jsonResp.error)
      reject(new Error(jsonResp))
    } else {
      let datasetInfo = {}
      let resStatus = 0
      let resError = null
      let pct = 0
      let blobPromises = []
      let tempDoi = 'unpublished/doi-' + shortUUID.new() // EXPECTING TO DO ONE DATASET ONLY! DOI should apply to all XMLs to process
      getLatestSchemas(XsdVersionSchema, XsdSchema, logger)
        .then(function (schemas) {
          let latestSchema = schemas[0].currentRef // getLatestSchemas
          let schemaId = latestSchema._id
          let schemaName = latestSchema.title
          let xsd = latestSchema.content
          let xsdDoc = null
          try { // TODO this try block is way too big
            xsdDoc = libxmljs.parseXmlString(xsd)
            let xmlDocs = []
            if (xmls && xmls.length > 0) {
              xmls.forEach((v, idx) => {
                let xml = readXmlFile(jobId, jobDir, v)
                logger.debug(func + ' - processing xml - filename: ' + v + ' number: ' + (pct + 1) + ' of ' + xmls.length)
                // logger.debug('filename: ' + v + ' xml: ' + xml + ' xml len: ' + xml.length)
                // logger.debug('---')
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
                      let controlIdPath = '/PolymerNanocomposite/Control_ID'
                      let controlId = xmlDoc.find(controlIdPath)
                      if (controlId && controlId.length > 0) {
                        controlId = controlId[0]
                        if (controlId) {
                          controlId = controlId.text()
                        } else {
                          controlId = null
                        }
                      } else {
                        // copy the docId as controlId and update the sample number to 1 and update the document
                        controlId = replaceXmlSampleNumberInTitle(logger, docId, 1)
                        let after = ['ID']
                        xmlDoc = xmlEnsurePathExists(xmlDoc, controlIdPath, after)
                        if (xmlDoc) {
                          let cid = xmlDoc.find(controlIdPath)
                          if (cid && cid.length > 0) {
                            cid[0].text(controlId)
                          } else {
                            logger.debug(func + ' - ' + ' path for Control_ID is supposed to exist, but cannot be set. node is: ' + JSON.stringify(cid))
                          }
                        } else {
                          logger.error('No ControlID was found for: ' + docId + ' and adding a control id failed. Attempted to set as: ' + controlId)
                        }
                      }
                      logger.debug(func + ' - ' + 'Processing xml ID: ' + docId + ' control ID: ' + controlId)
                      let schemaVersionPath = '/PolymerNanocomposite/SchemaVersion'
                      let schemaIdPath = '/PolymerNanocomposite/SchemaID'
                      let datasetIdPath = '/PolymerNanocomposite/DatasetID'
                      let after = ['ID', 'Control_ID']
                      xmlDoc = xmlEnsurePathExists(xmlDoc, schemaVersionPath, after)
                      after.push('SchemaVersion')
                      xmlDoc = xmlEnsurePathExists(xmlDoc, schemaIdPath, after)
                      after.push('SchemaId')
                      xmlDoc = xmlEnsurePathExists(xmlDoc, datasetIdPath, after)
                      let n = xmlDoc.find(schemaVersionPath)
                      if (n && n[0]) { // find returns an array, which in this case is always length 1 based on the schema
                        n[0].text(schemaName)
                      } else { logger.debug(func + ' - ' + 'Unable to set schemaName into XML') }
                      n = xmlDoc.find(schemaIdPath)
                      if (n && n[0]) {
                        n[0].text(schemaId)
                      } else { logger.debug(func + ' - ' + 'Unable to set schemaId into XML') }
                      n = xmlDoc.find(datasetIdPath)
                      if (n && n[0]) {
                        n[0].text(datasetId)
                      } else { logger.debug(func + ' - ' + 'Unable to set datasetId into XML') }
                      if (docId && docId.length > 0/* && controlId && controlId.length > 0 */ && matchValidXmlTitle(docId)/* && matchValidXmlTitle(controlId) */) {
                        // TODO do some basic XML doc verification like same dataset for all incoming XMLs (requires ID which should ALWAYS be there)
                        let doiPath = '/PolymerNanocomposite/DATA_SOURCE/Citation/CommonFields/DOI'
                        let doi = xmlDoc.get(doiPath)
                        if (doi) {
                          doi = doi.text()
                        }
                        if (doi && doi.length > 0) {
                          logger.debug(func + ' - ' + docId + ' doi is ' + doi)
                        } else {
                          logger.debug(func + ' - ' + docId + ' no DOI found. Using unpublished temp id: ' + tempDoi)
                          let after = ['CitationType', 'Publication', 'Title', 'Author', 'Keyword', 'Publisher', 'PublicationYear']
                          xmlDoc = xmlEnsurePathExists(xmlDoc, doiPath, after) // NOTE: this resets the xmlDoc to the new xmlDoc with the possibly new path
                          if (xmlDoc) {
                            let elem = xmlDoc.find(doiPath)
                            elem[0].text(tempDoi)
                          } else {
                            resStatus = 95
                            resError = func + ' - xmlEnsurePathExists(xmlDoc, ' + doiPath + ') returned a null document. Status: ' + resStatus
                            logger.error(resError)
                            throw new Error(resError)
                          }
                        }
                        mergeDatasetInfoFromXml(logger, datasetInfo, xmlDoc)
                        logger.debug(func + ' - ' + 'merged incoming xml info into dataset info.')
                        if (useId) {
                          datasetInfo.seq = +(matchValidXmlTitle(docId)[1])
                        }
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
              datasetInfo.datasetId = datasetId
              datasetInfo.seq = dsSeq
              datasetInfo.userid = user // obtained from job parameters
              datasetInfo.datasetComment = 'created for upload of xmls - seq: ' + dsSeq
              // deprecated datasetInfo.latestSchema = true // just validated all the XMLs against the latest schema
              // datasetInfo.schemaId = schemaId -- abandoned this idea
              logger.debug('datasetInfo after merging ' + pct + ' of ' + xmls.length + ' xmls: ' + inspect(datasetInfo))
              if (resStatus !== 0) {
                let rc = resStatus
                jsonResp.error = resError + ' rc: ' + rc
                writeOutputParameters(jobId, jobDir, jsonResp)
                logger.error(jsonResp.error)
                console.log(2)
                reject(new Error(rc))
              } else {
                // create/update the dataset
                let xmlPromises = []
                let datasetFiles = []
                // loop through the xmls and update the ID, Control_ID and create the xml entry using the current schema
                // let newDsSeq = result.data.seq (was needed for remap scenario)
                logger.debug(func + ' - dataset id is: ' + datasetInfo.seq + ' remap: ' + remap)
                xmlDocs.forEach((v, idx) => {
                  let xmlDoc = v
                  let docId = xmlDoc.find('//ID')[0].text()
                  // if (remap) {
                  //   let docIdText = docId.text()
                  //   let controlId = xmlDoc.get('//Control_ID')
                  //   let controlIdText = controlId.text()
                  //   docIdText = replaceDatasetId(logger, docIdText, dsid)
                  //   controlIdText = replaceDatasetId(logger, controlIdText, dsid)
                  //   docId.text(docIdText)
                  //   controlId.text(controlIdText)
                  // }
                  let files = updateMicrostructureImageFileLocations(logger, xmlDoc, nmWebBaseUri + '/nmr')
                  // create a fileset for this sample in the dataset and add the microstructure files to the fileset as blobs
                  let filesetName = (docId || 'result_' + (Math.floor(Math.random() * 1000)))
                  if (files && files.length > 0) {
                    datasetFiles.push({fileset: filesetName, files: files})
                  }
                  xmlPromises.push(updateOrCreateXmlData(XmlData, logger, user, xmlDoc, schemaId, datasetId))
                  // TODO take care of named character encodings in text elements
                })
                // Promise.all(datasetFilesPromises)
                //   .then(function (dfpValues) {
                //     logger.debug('count of xmls in create list: ' + xmlUpdateList.length)
                //     xmlUpdateList.forEach((v, idx) => {
                //       xmlPromises.push(updateOrCreateXmlData.apply(this, v))
                //     })
                Promise.all(xmlPromises)
                  .then(function (values) {
                    let rc = 0
                    let msg = 'Updated or created ' + xmlPromises.length + ' xml records. rc=' + rc
                    jsonResp.data = {info_msg: msg}
                    jsonResp.error = null
                    writeOutputParameters(jobId, jobDir, jsonResp)
                    logger.info(msg)
                    console.log(3)
                    // add xml record ids to file list(s) TODO
                    values.forEach((v, idx) => {
                      let filesetName = v.title.replace(/\.[Xx][Mm][Ll]$/, '') // same as docId, but could have .xml appended
                      let files = [{'type': 'xmldata', 'id': v._id.toString(), 'metadata': {'contentType': 'application/xml', 'filename': v.title}}] // TODO improve the flow above so that this update is not required
                      // let p = datasetsAddFiles(Datasets, logger, datasetId, filesetName, files)
                      let dsfFound = false
                      datasetFiles.forEach((dsf, idx) => {
                        if (dsf.fileset === filesetName) {
                          logger.debug(func + ' - ' + 'found filesetName: ' + filesetName + ' in datasetFiles list. files: ' + JSON.stringify(datasetFiles[idx].files))
                          files.forEach((f, fx) => {
                            datasetFiles[idx].files.push(f)
                          })
                          logger.debug(func + ' - ' + 'after appending xmldata info: ' + JSON.stringify(datasetFiles[idx]))
                          dsfFound = true
                        }
                      })
                      if (!dsfFound) {
                        datasetFiles.push({fileset: filesetName, files: files})
                      }
                    })
                    datasetInfo.filesets = datasetFiles
                    let datasetFilesets = datasetFiles // really, it's filesets
                    // loop through the filesets and update the file metadata for microstructure blobs within the dataset to set filename, contentType
                    datasetFilesets.forEach((aFileset, fsIdx) => {
                      // in this situation, if the type is a blob, then the metadata is filename and contentType
                      aFileset.files.forEach((f, fIdx) => {
                        if (f.type === 'blob') {
                          blobPromises.push(updateFileInfoMetadataFromBlob(f))
                        }
                      })
                    })
                    logger.debug(func + ' - ' + 'Dataset update for: ' + datasetId + ' datasetInfo: ' + JSON.stringify(datasetInfo))
                    Promise.all(blobPromises)
                      .then(function (bvalues) {
                        blobPromises.forEach((bv) => {
                          if (bv === null) {
                            logger.error(func + ' - WARNING (non-fatal error): blob not found for an xml in dataset: ' + datasetId + ' filename in metadata was not updated.')
                          }
                        })
                        updateDataset(Datasets, logger, datasetInfo)
                          .then(function (result) {
                            resolve(rc)
                          })
                          .catch(function (err) {
                            jsonResp.error = err.message
                            let msg = jsonResp.error + '  **WARNING**: dataset ' + datasetId + ' created, but update failed. After XML create/update possibly updating/creating xmlData records'
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
                        let msg = 'An error occurred updating dataset file metadata. Err: ' + err.message
                        logger.error(msg)
                        jsonResp.data = null
                        jsonResp.error = msg
                        writeOutputParameters(jobId, jobDir, jsonResp)
                        let restStatus = 95
                        reject(new Error(restStatus))
                      })
                  })
                  .catch(function (err) {
                    let rc = 99
                    let msg = 'upload error: ' + err.message
                    msg += ' rc: ' + rc
                    logger.error(msg)
                    jsonResp.error = msg
                    jsonResp.data = null
                    writeOutputParameters(jobId, jobDir, jsonResp)
                    reject(new Error(rc))
                  })
              }
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
    }
  })
}