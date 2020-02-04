const moment = require('moment')
const {createLogger, format, transports} = require('winston')
const libxmljs = require('libxmljs2')
const he = require('he') // for encoding text element named character entities into decimal encoding (rdf requires this downstream for ingest)
const util = require('util')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')
const { combine, label, printf, prettyPrint } = format
// const datasetsSchema = require('./modules/mongo/schema/datasets')(mongoose)
// const Datasets = mongoose.model('datasets', datasetsSchema)
let trace = false
function setTrace (_trace) {
  trace = _trace
}
function logTrace (msg) {
  if (trace) {
    console.log(msg)
  }
}
function inspect (theObj) {
  return util.inspect(theObj, {showHidden: true, depth: 5})
}
const logFormat = printf(({ level, message, label}) => {
  let now = moment().format('YYYYMMDDHHmmssSSS')
  return `${now} [${label}] ${level}: ${message}`
})
let configureLogger = function (config, logLabel) {
  let loggerLabel = logLabel
  if (!loggerLabel) {
    loggerLabel = 'default'
  }
  let logger = createLogger({
    levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
    format: combine(
      label({label: loggerLabel}),
      // moment().format('YYYYMMDDHHmmss'),
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

let getEnv = function () {
  return {
    sendEmails: process.env['NM_SMTP_TEST'] !== 'true',
    emailHost: process.env['NM_SMTP_SERVER'],
    emailPort: process.env['NM_SMTP_PORT'],
    emailUser: process.env['NM_SMTP_AUTH_USER'],
    emailPwd: process.env['NM_SMTP_AUTH_PWD'],
    emailTestAddr: process.env['NM_SMTP_TEST_ADDR'],
    emailAdminAddr: process.env['NM_SMTP_ADMIN_ADDR'],
    nmWebFilesRoot: process.env['NM_WEBFILES_ROOT'],
    nmWebBaseUri: process.env['NM_WEB_BASE_URI'],
    nmRdfLodPrefix: process.env['NM_RDF_LOD_PREFIX'],
    nmRdfUriBase: process.env['NM_RDF_URI_BASE'],
    nmJobDataDir: process.env['NM_JOB_DATA'],
    nmLocalRestBase: process.env['NM_LOCAL_REST_BASE'],
    nmAuthUserHeader: process.env['NM_AUTH_USER_HEADER'],
    nmAuthGivenNameHeader: process.env['NM_AUTH_GIVEN_NAME_HEADER'],
    nmAuthDisplayNameHeader: process.env['NM_AUTH_DISPLAYNAME_HEADER'],
    nmAuthSurNameHeader: process.env['NM_AUTH_SURNAME_HEADER'],
    nmAuthAnonUserId: process.env['NM_AUTH_ANON_USER_ID'],
    nmAuthSystemUserId: process.env['NM_AUTH_SYSTEM_USER_ID'],

    nmAuthEmailHeader: process.env['NM_AUTH_EMAIL_HEADER'],
    nmAuthSessionExpirationHeader: process.env['NM_AUTH_SESSION_EXPIRATION_HEADER'],
    nmAuthSecret: process.env['NM_AUTH_SECRET'],
    nmAuthSystemToken: process.env['NM_AUTH_SYSTEM_TOKEN'],
    nmAuthApiTokenCurate: process.env['NM_AUTH_API_TOKEN_CURATE'],
    nmAuthApiRefreshCurate: process.env['NM_AUTH_API_REFRESH_CURATE'],
    nmAuthApiTokenEmail: process.env['NM_AUTH_API_TOKEN_EMAIL'],
    nmAuthApiRefreshEmail: process.env['NM_AUTH_API_REFRESH_EMAIL'],
    nmAuthApiTokenJobs: process.env['NM_AUTH_API_TOKEN_JOBS'],
    nmAuthApiRefreshJobs: process.env['NM_AUTH_API_REFRESH_JOBS'],
    nmAuthApiTokenAdmin: process.env['NM_AUTH_API_TOKEN_ADMIN'],
    nmAuthApiRefreshAdmin: process.env['NM_AUTH_API_REFRESH_ADMIN'],
    // nmSessionSecret : process.env['NM_SESSION_SECRET'],`
    // nmAuthEnabled : process.env['NM_AUTH_ENABLED'].toLowerCase() === 'yes'
    nmAuthType: process.env['NM_AUTH_TYPE'],
    nmAuthTestUser: process.env['NM_AUTH_TEST_USER'],
    nmAuthAdminGroupName: process.env['NM_AUTH_ADMIN_GROUP_NAME'],
    nmAuthLogoutUrl: process.env['NM_AUTH_LOGOUT_URL'],
    nmAutostartCurator: (process.env['NM_AUTOSTART_CURATOR'] === 'yes')
  }
}
let datasetBucketName = 'curateinput'

function matchValidXmlTitle (title) {
  let rv = title.match(/^[A-Z]([0-9]+)[_][S]([0-9]+)[_]([\S]+)[_](\d{4})([.][Xx][Mm][Ll])?$/) // e.g. L183_S12_Poetschke_2003.xml
  return rv
}

function getDatasetXmlFileList (mongoose, logger, xmlTitle) { // XML should contain DatasetID and SchemaID
  let func = 'getDatasetXmlFileList'
  logger.info(func + ' is deprecated.')
  return getXmlFileList(mongoose, logger, xmlTitle)
}

function getXmlFileList (mongoose, logger, xmlTitle) {
  let func = 'getXmlFileList'
  let bucketName = datasetBucketName
  let validTitle = matchValidXmlTitle(xmlTitle)
  // TODO obtain schemaId and dataset_id from xml
  let options = {
    'bucketName': bucketName // TODO change use standard blob approach and list in dataset results BSON record
  }
  return new Promise(function (resolve, reject) { // TODO this code needs rework based on above TODOs
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, options)
    let files = []
    if (validTitle) {
      // let dsId = validTitle[1]
      let findParam = {filename: {$regex: schemaId + '[/]' + xmlTitle.replace(/\.xml$/, '') + '[/].*'}}
      logger.debug(func + ' looking for files like: ' + JSON.stringify(findParam))
      bucket.find(findParam).sort({uploadDate: -1, filename: 1})
        .on('data', (data) => {
          data.basename = data.filename.split('/').pop()
          let found = false
          files.forEach(function (v) {
            if (found === false) {
              found = (v.filename === data.filename)
            }
          })
          if (found === false) {
            files.push(data)
          }
        })
        .on('end', (err) => {
          if (err) {
            reject(err)
          } else {
            resolve(files)
          }
        })
    } else {
      reject(new Error(func + ' - invalid xmlTitle format: ' + xmlTitle))
    }
  })
}
function updateOrCreateXmlData (xmlData, logger, creatorId, xmlDoc, schemaId, datasetId) {
  // XMlData is the mongoose model instance
  // xmlDoc is an xml document parsed by libxmljs
  let func = 'utils.updateOrCreateXmlData'
  return new Promise(function (resolve, reject) {
    // let err = new Error(func + ' - wow! This didn\'t work!. How could that be? schemaId: ' + schemaId + ' xml: ' + xmlDoc.find('//ID')[0].text())
    // logger.error(err)
    // reject(err)
    let id = xmlDoc.find('//ID')[0].text()
    let doi = xmlDoc.find('//DOI')[0].text()
    let published = true
    if (doi.indexOf('unpublished') !== -1) {
      published = false
    }
    let xml = xmlDoc.toString(false) // false 'should' turn off pretty printing, but it doesn't seem to work
    let dsSeq = -1
    let m = matchValidXmlTitle(id)
    if (m) {
      dsSeq = parseInt(m[1])
    }
    let filename = id + '.xml'
    let msg = ' id: ' + id + ' using xml of length: ' + xml.length
    let dttmNow = Math.floor(Date.now() / 1000)
    xmlData.findOneAndUpdate({$and: [{'title': {$eq: filename}}, {'schemaId': {$eq: schemaId}}, {'datasetId': {$eq: datasetId}}]},
      {
        $set: {
          'xml_str': xml, // write xml
          'dttm_updated': dttmNow,
          'datasetId': datasetId,
          'schemaId': schemaId, // create schemaId field using schema (note: field was schema in MDCS, but name is incompatible with Mongoose)
          'dsSeq': dsSeq, // Sequence of the associated dataset
          'entityState': 'EditedValid', // initial entity state shows validated by prior processing NOTE: 'Valid' would kick off rdf upload
          'curateState': 'Edit',
          'isPublic': false, // all of the original data is intended to be public
          'ispublished': published, // all of the original data came from published papers
          'iduser': creatorId,
          'title': filename
          // 'content': null
        }
      }, function (err, doc) {
        if (err) {
          logger.error(func + ' - Update failed: ' + msg + ' error: ' + err)
          reject(err)
        } else {
          if (doc !== null) {
            logger.info(func + ' - Update successful: ' + msg)
            logger.debug(func + ' doc found: ' + doc)
            resolve(doc)
          } else {
            let newDoc = {
              'xml_str': xml, // write xml
              'dttm_created': dttmNow,
              'dttm_updated': dttmNow,
              'datasetId': datasetId,
              'schemaId': schemaId, // create schemaId field using schema (note: field was schema in MDCS, but name is incompatible with Mongoose)
              'dsSeq': dsSeq, // Sequence of the associated dataset
              'entityState': 'EditedValid', // initial entity state shows validated by prior processing NOTE: 'Valid' would kick off rdf upload
              'curateState': 'Edit',
              'isPublic': false, // all of the original data is intended to be public
              'ispublished': published, // all of the original data came from published papers
              'iduser': creatorId,
              'title': filename,
              'content': null // not used anymore - MDCS used this for BSON representation of XML
            }
            xmlData.create(newDoc, function (err, doc) {
              if (err) {
                logger.error(func + ' - create failed: ' + msg + ' error: ' + err)
                reject(err)
              } else {
                logger.info(func + ' - new xml created: ' + msg)
                resolve(doc)
              }
            })
          }
        }
      })
  })
}

function updateDataset (Datasets, logger, dsInfo) {
  // NOTE: requires schemaId and seq for update and create
  //   If the record exists, it will be updated. If it does not, it will be created as
  //   opposed to createDataset which always selects a non-used sequence (still requires schemaId).
  let func = 'utils.updateDataset'
  let status = {'statusCode': 201, 'error': null, 'data': null}
  return new Promise(function (resolve, reject) {
    dsInfo.dttm_updated = Math.floor(Date.now() / 1000)
    Datasets.findByIdAndUpdate(
      dsInfo.datasetId,
      {$set: dsInfo},
      {upsert: true}, function (err, result) {
        if (err) {
          console.log(func + ' : error - ' + err)
          status.error = err
          status.statusCode = 500
          status.data = null
          reject(status)
        } else {
          console.log('datataset/update: success - old document is: ' + JSON.stringify(result))
          let doc = result // promise based result only returns old document and for create it's null
          if (doc) {
            status.statusCode = 200
          } else {
            status.statusCode = 201
          }
          status.error = null
          status.data = dsInfo // return input doc to be compatible with return from createDataset
          resolve(status)
        }
      })
  })
}
function createDataset (Datasets, logger, dsInfo) { // creates the dataset using the dsInfo, new seq is returned with updated dsInfo in result.data
  let func = 'utils.createDataset'
  return new Promise(function (resolve, reject) {
    let status = {'statusCode': 201, 'error': null, 'data': null}
    // 1. create a new dataset, get the _id and set it into the dsInfo.datasetId field
    // 2. If the seq of the dsInfo is set, use it. TODO - Otherwise initialize it to one more than the greatest seq of all the datasets
    //      datasets.findOne().sort('-seq').exec(function err, item){}) - if there are none, set to 101
    if (dsInfo && dsInfo.seq && dsInfo.seq > 0) {
      logger.debug(func + ' - Seq: ' + dsInfo.seq + ' dsInfo: ' + inspect(dsInfo))
      dsInfo.isDeleted = false
      dsInfo.dttm_created = Math.floor(Date.now() / 1000)
      dsInfo.dttm_updated = Math.floor(Date.now() / 1000)
      Datasets.create(dsInfo, function (err, doc) {
        if (err) {
          logger.error(func + ' - datasets create error: ' + err)
          status.error = err
          status.data = null
          status.statusCode = 500
          reject(status)
        } else {
          doc.datasetId = doc._id.toString()
          doc.dttm_updated = Math.floor(Date.now() / 1000)
          Datasets.findByIdAndUpdate(doc._id, doc, function (err, olddoc) {
            if (err) {
              logger.error(func + ' - dataset created, but could not update datasetId: ' + err)
              status.error = err
              status.data = null
              status.statusCode = 500
              reject(status)
            } else {
              status.error = null
              status.data = doc
              status.statusCode = 201
              logger.debug(func + ' - dataset created successfully. _id is: ' + doc._id.toString() + ' datasetId is: ' + doc.datasetId + ' Sequence is: ' + dsInfo.seq)
              resolve(status)
            }
          })
        }
      })
    } else {
      let err = 'Dataset information not supplied or seq field not set'
      logger.error(func + ' - datasets create error: ' + err)
      status.error = err
      status.data = null
      status.statusCode = 400
      reject(status)
    }
  })
}

function sortSchemas (allActive) { // sort by date descending and choose first
  allActive.sort((a, b) => { // Sort in reverse order
    let rv = 0
    let rea = a.currentRef[0].title.match(/(\d{2})(\d{2})(\d{2})/)
    let reb = b.currentRef[0].title.match(/(\d{2})(\d{2})(\d{2})/)
    let yra = parseInt(rea[3])
    let yrb = parseInt(reb[3])
    let moa = parseInt(rea[1])
    let mob = parseInt(reb[1])
    let dya = parseInt(rea[2])
    let dyb = parseInt(reb[2])
    if (yrb > yra) {
      rv = 1 // reverse sort
    } else if (yrb < yra) {
      rv = -1
    }
    if (rv === 0 && mob > moa) {
      rv = 1
    } else if (rv === 0 && moa > mob) {
      rv = -1
    }
    if (rv === 0 && dyb > dya) {
      rv = 1
    } else if (rv === 0 && dya > dyb) {
      rv = -1
    }
    return rv
  })
}

function getLatestSchemas (xsdVersionSchema, xsdSchema, logger) { // duplicate of getCurrentSchemas!! TODO
  let func = 'getLatestSchemas'
  let msg = func + ' - entry'
  logTrace(msg)
  return new Promise(function (resolve, reject) {
    msg = func + ' - just before call to xsdVersionSchema.find'
    logTrace(msg)
    debugger
    try {
      xsdVersionSchema.find({isDeleted: {$eq: false}}).populate('currentRef').exec(function (err, versions) {
        if (err) {
          msg = func + ' - rejecting with error ' + err
          logger.error(msg)
          logTrace(msg)
          reject(err)
        } else if (versions == null || versions.length <= 0) {
          msg = func + ' - resolving with null - no versions.'
          logTrace(msg)
          resolve(null) // not found
        } else {
          try {
            sortSchemas(versions) /* In-place sort by title i.e. 081218 will date sort to top relative to 060717 (reverse sort) so that
                                 client can assume latest schema is first
                                 */
            msg = func + ' - resolving with ' + versions.length + ' versions.'
            logTrace(msg)
            resolve(versions)
          } catch (err) {
            msg = func + ' - schema sort reverse by date failed :( - error' + err
            logTrace(msg)
            logger.error(msg)
            reject(err)
          }
        }
      })
    } catch (err) {
      msg = func + ' - caught error attempting to call xsdVersionSchema.find. Error: ' + err
      logTrace(msg)
      logger.error(msg)
      reject(err)
    }
  })
}
// function initialzeDatasetInfo(logger, datasetComment, userid) {
//   let datasetInfo = {}
//   datasetInfo.author = []
//   datasetInfo.chapter = null
//   datasetInfo.citationType = null
//   datasetInfo.datasetComment = datasetComment
//   datasetInfo.dateOfCitation = null
//   datasetInfo.doi = null
//   datasetInfo.edition = null
//   datasetInfo.editor = null
//   datasetInfo.isDeleted = false
//   datasetInfo.isPublic = false
//   datasetInfo.ispublished = false
//   datasetInfo.isbn = null
//   datasetInfo.issn = null
//   datasetInfo.issue = null
//   datasetInfo.keyword = []
//   datasetInfo.language = null
//   datasetInfo.location = null
//   datasetInfo.publication = null
//   datasetInfo.publicationYear = null
//   datasetInfo.publisher = null
//   datasetInfo.relatedDoi = []
//   datasetInfo.results = []
//   datasetInfo.seq = -1
//   datasetInfo.title = null
//   datasetInfo.url = null
//   datasetInfo.userid = userid
//   datasetInfo.volume = null
//
//   return datasetInfo
// }

function mergeDatasetInfoFromXml (logger, datasetInfo, xmlDocument) {
  // Caller should parse the XML into a document before calling this function

  // NOTE: this code does not yet pull out all the fields of the XMLs needed.  It's specific to one set of
  //    data for which upload was needed quickly and the data was unpublished.
  //    TODO fix this code so that it pull out all the needed dataset information
  // checks xml for dataset information in DATA_SOURCE and merges into datasetInfo provided if the source field
  // exists and is not empty/null
  // currently 21 fields + _id
  //   isDeleted: boolean
  //   'author': [],
  //   'citationType': ds.CitationType,
  //   'dateOfCitation': ds.DateOfCitation,
  //   'doi': ds.DOI,
  //   'isPublic': true, // all of the original datasets are public
  //   'ispublished': true // all of the original datasets came from published papers
  //   'issue': issue,
  //   'issn': issn,
  //   'keyword': [],
  //   'language': ds.Language,
  //   'location': ds.Location,
  //   'publication': ds.Publication,
  //   'publisher': ds.Publisher,
  //   'publicationYear': ds.PublicationYear,
  //   'relatedDoi': ds.relatedDOI,  // array of related DOIs
  //   'seq': ds.seq, NOTE: seq should already be in datasetInfo when called or will be assigned
  //   'title': ds.Title,
  //   'volume': ds.Volume,
  //   'url': ds.URL,
  //   'userid': nanomineUser.userid,
  //   'results': [ bson ] - an array of BSON records one for each result associated with the dataset

  let commonFields = xmlDocument.get('//CommonFields')
  if (!datasetInfo.author) {
    datasetInfo.author = []
  }
  if (!datasetInfo.citationType) {
    datasetInfo.citationType = null
  }
  if (!datasetInfo.dateOfCitation) {
    datasetInfo.dateOfCitation = null
  }
  if (!datasetInfo.doi) {
    datasetInfo.doi = null
  }
  if (!datasetInfo.isPublic) {
    datasetInfo.isPublic = false
  }
  if (!datasetInfo.ispublished) {
    datasetInfo.ispublished = false
  }
  if (!datasetInfo.issue) {
    datasetInfo.issue = null
  }
  if (!datasetInfo.issn) {
    datasetInfo.issn = null
  }
  if (!datasetInfo.chapter) {
    datasetInfo.chapter = null
  }
  if (!datasetInfo.edition) {
    datasetInfo.edition = null
  }
  if (!datasetInfo.editor) {
    datasetInfo.editor = null
  }
  if (!datasetInfo.isbn) {
    datasetInfo.isbn = null
  }
  if (!datasetInfo.keyword) {
    datasetInfo.keyword = []
  }
  if (!datasetInfo.language) {
    datasetInfo.language = null
  }
  if (!datasetInfo.location) {
    datasetInfo.location = null
  }
  if (!datasetInfo.publication) {
    datasetInfo.publication = null
  }
  if (!datasetInfo.publisher) {
    datasetInfo.publisher = null
  }
  if (!datasetInfo.publicationYear) {
    datasetInfo.publicationYear = null
  }
  if (!datasetInfo.relatedDoi) {
    datasetInfo.relatedDoi = []
  }

  // if (!datasetInfo.seq) { // incoming should always have seq
  //   datasetInfo.seq = -1
  // }

  if (!datasetInfo.title) {
    datasetInfo.title = null
  }
  if (!datasetInfo.volume) {
    datasetInfo.volume = null
  }
  if (!datasetInfo.url) {
    datasetInfo.url = null
  }
  if (!datasetInfo.userid) {
    datasetInfo.userid = null
  }

  function setDsInfoCommonFieldTxt (dsInfo, commonFields, xmlPath, dsFldName) {
    let fld = commonFields.get(xmlPath)
    let fldNm = dsFldName
    if (fld) {
      if (!dsInfo[fldNm] || dsInfo[fldNm].length < 1) {
        let txt = fld.text()
        if (txt && txt.length > 0) {
          dsInfo[fldNm] = txt
        }
      }
    }
  }
  function setDsInfoCommonFieldArray (dsInfo, commonFields, xmlPath, dsFldName) {
    let fld = commonFields.find(xmlPath)
    if (fld && fld.length > 0) { // find always returns array
      fld.forEach((v, idx) => {
        let txt = v.text()
        if (!dsInfo[dsFldName].includes(txt)) {
          dsInfo[dsFldName].push(txt)
        }
      })
    }
  }

  if (commonFields) {
    setDsInfoCommonFieldArray(datasetInfo, commonFields, '//Author', 'author')

    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//CitationType', 'citationType')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//DateOfCitation', 'dateOfCitation')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//CitationType/Journal/ISSN', 'issn')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//CitationType/Journal/Issue', 'issue')

    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//CitationType/Book/Chapter', 'chapter')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//CitationType/Book/Edition', 'edition')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//CitationType/Book/Editor', 'editor')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//CitationType/Book/ISBN', 'isbn')

    setDsInfoCommonFieldArray(datasetInfo, commonFields, '//Keyword', 'keyword')

    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//Language', 'language')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//Location', 'location')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//Publication', 'publication')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//PublicationYear', 'publicationYear')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//Publisher', 'publisher')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//Title', 'title')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//Volume', 'volume')
    setDsInfoCommonFieldTxt(datasetInfo, commonFields, '//URL', 'url')
  }

  let relatedDOI = xmlDocument.find('//DATA_SOURCE/LabGenerated/relatedDOI')
  if (relatedDOI) {
    relatedDOI.forEach(function (v, idx) {
      let rdoi = v.text()
      if (!datasetInfo.relatedDoi.includes(rdoi)) {
        datasetInfo.relatedDoi.push(rdoi)
      }
    })
  }

  let doi = xmlDocument.find('/PolymerNanocomposite/DATA_SOURCE/Citation/CommonFields/DOI')
  if (doi) {
    datasetInfo.doi = doi[0].text()
  }
  return false
}

function replaceXmlSeqIdInTitle (logger, id, newDsid) {
  // given an id of the regex form .[0-9]{n}_S[0-9]{n}_AUTHOR_YYYY replace the dsid component (first set of number)
  let newId = null
  let m = matchValidXmlTitle(id)
  if (m) {
    let oldDsid = m[1]
    newId = id[0] + newDsid + '_S' + m[2] + '_' + m[3] + '_' + m[4]
    logger.debug('oldId: ' + id + ' old dsid: ' + oldDsid + ' new id: ' + newId)
  }
  return newId
}

function updateMicrostructureImageFileLocations (logger, xmlDoc, restServerBaseUri) {
  let func = 'updateMicrostructureImageFileLocations'
  let blobs = xmlDoc.find('//MICROSTRUCTURE/ImageFile/File')
  let blobArray = []
  blobs.forEach((v, idx) => {
    let blob = v.text()
    let m = blob.match(/blob\?id=([A-Fa-f0-9]*)/)
    if (m) {
      let blobId = m[1]
      blobArray.push({'type': 'blob', 'id': blobId})
      let newBlob = restServerBaseUri + '/blob?id=' + blobId
      v.text(newBlob)
      logger.debug(func + ' - updated blob location from: ' + blob + ' to: ' + newBlob)
    }
  })
  return blobArray
}

function xmlEnsurePathExists (xmlDoc, path, after) { // after may be undefined but is a list of element names (in order, same level) that this new path must come after
  // ensure path exists and create nodes if necessary.
  // returns new document containing path
  // Expects root node and at least one node to ensure exists as path i.e. /PolymerNanocomposite/ID
  let rv = null
  let func = 'xmlEnsurePathExists'
  let nodes = path.replace(/^\/*/, '').split('/') // strip leading slashes and split by path separator
  let subPath = ''
  let goodSubNode = null
  let newDoc = null
  console.log(func + ' - ' + 'Path: ' + path + ' After: ' + JSON.stringify(after))
  nodes.forEach(function (v) {
    subPath += '/' + v
    let subNode = xmlDoc.find(subPath)
    if (subNode && subNode.length > 0) {
      // console.log(func + ' - ' + 'found subPath: ' + subPath)
      goodSubNode = subNode
    } else {
      // console.log('subPath: ' + subPath + ' NOT FOUND')
      if (goodSubNode && goodSubNode.length > 0) {
        // create new element node at subPath + nodes[idx]
        // console.log(func + ' - ' + 'goodSubNode: ' + dump(goodSubNode))
        // console.log(func + ' - ' + 'goodSubNode: ' + goodSubNode.toString())
        // console.log(func + ' - ' + 'goodSubNode[0]: ' + goodSubNode[0].toString())
        // console.log(func + ' - ' + 'goodSubNode.type(): ' + goodSubNode[0].type())
        let newNode = null
        if (after) {
          let _after = _.clone(after)
          let possibles = []
          let children = goodSubNode[0].childNodes()
          let idx = 0
          children.forEach((v1) => {
            let nm = v1.name()
            console.log('Looking for possible spot for new node: ' + v + ' Cur: ' + nm + ' target after is: ' + after.slice(-1))
            if (_after && _after.length > 0 && nm === _after[0]) {
              possibles.push({nm: nm, idx: idx})
              _after.shift()
              console.log(func + ' - ' + 'found possible: ' + JSON.stringify(possibles))
            }
            // if (nm === after.slice(-1)) {
            //   newNode = v1.addNextSibling(new libxmljs.Element(xmlDoc, v))
            // }
            ++idx
          })
          try {
            if (possibles.length > 0) {
              let afterChild = null // children[possibles.slice(-1).idx]
              idx = 0
              goodSubNode[0].childNodes().forEach((c) => {
                let possible = possibles.slice(-1)[0]
                let pidx = possible['idx']
                console.log('possible at end of array: ' + JSON.stringify(possible))
                if (idx === pidx) {
                  afterChild = c
                  console.log(func + ' - ' + 'adding node: ' + v + ' under: ' + afterChild.name())
                } else {
                  console.log(func + ' - ' + 'checked child at index: ' + idx + ' vs. possible idx: ' + pidx)
                }
                ++idx
              })
              newNode = afterChild.addNextSibling(new libxmljs.Element(xmlDoc, v))
            }
          } catch (err) {
            console.log(func + ' - ' + 'error searching for possibles: ' + err.message)
            console.log(err.stack)
            throw (err)
          }
          if (newNode === null) {
            let afterChild = goodSubNode[0].child(0)
            if (afterChild) {
              newNode = afterChild.addNextSibling(new libxmljs.Element(xmlDoc, v))
            } else {
              newNode = goodSubNode[0].addChild(new libxmljs.Element(xmlDoc, v))
            }
          }
        } else {
          newNode = goodSubNode[0].node(v, null)
        }
        // console.log(func + ' - ' + 'newNode: ' + newNode.toString())
        newDoc = newNode.doc()
        goodSubNode = newNode
      } else if (goodSubNode) {
        // console.log(func + ' - ' + 'goodSubNode is not null, but length <= 0')
        // console.log(func + ' - ' + 'goodSubNode.toString() = ' + goodSubNode.toString())
        // console.log(func + ' - ' + 'goodSubNode.type() = ' + goodSubNode.type())
        let newNode = goodSubNode.node(v, null)
        goodSubNode = newNode
        newDoc = newNode.doc()
        // console.log(func + ' - ' + 'added child: ' + newNode.toString())
        // console.log(func + ' - ' + 'new doc string: ' + newDoc.toString())
      } else {
        console.log(func + ' - ' + 'goodSubNode is null')
      }
    }
  })
  rv = newDoc
  return rv
}

module.exports = {
  'configureLogger': configureLogger,
  'matchValidXmlTitle': matchValidXmlTitle,
  'getEnv': getEnv,
  'datasetBucketName': datasetBucketName,
  'getDatasetXmlFileList': getDatasetXmlFileList, // deprecated
  'getXmlFileList': getXmlFileList, // replacement for getDatasetXmlFileList
  'getLatestSchemas': getLatestSchemas,
  'updateDataset': updateDataset,
  'createDataset': createDataset,
  'sortSchemas': sortSchemas,
  'mergeDatasetInfoFromXml': mergeDatasetInfoFromXml,
  'xmlEnsurePathExists': xmlEnsurePathExists,
  'replaceXmlSeqIdInTitle': replaceXmlSeqIdInTitle,
  'updateMicrostructureImageFileLocations': updateMicrostructureImageFileLocations,
  'updateOrCreateXmlData': updateOrCreateXmlData,
  'logTrace': logTrace,
  'setTrace': setTrace,
  'inspect': inspect
}
