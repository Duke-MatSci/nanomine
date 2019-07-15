/*

run with this command "node --harmony-promise-finally migrate.js"

migrate.js - handle migration from app version to app version
  NOTE:
    Originally, the mongodb came from MDCS 1.3 (really old now) and did not have an mgi.version collection
    containing a version number, so the implied version number for an mgi db with no version collection
    is 1.3.0 with no label.
    Unfortunately, the strategy we'll use for now is not really SEMVER based since the new NanoMine is really
    a different product from MDCS/CDCS. However, there is some possibility that we may be able to re-merge the db with the MDCS
    stream at some point, so we'll pin the major, minor, patch versions at 1.3.0 respectively and use the label
    component to drive release migrations for NanoMine.
    So, this module will drive the overall migration by detecting the current db version and calling the correct
    module to move to the next version for the data.

    For now the migration functions are contained here, but that could change to allow externally loaded migration
    functions for clarity.

    NOTE: Actual process for migration is outlined in comments below the code.
 */
const util = require('util')
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')
const he = require('he')
const fs = require('fs')
const xmljs = require('xml-js')
// const validateXml = require('xmllint').validateXML
const nmWebBaseUri = process.env['NM_WEB_BASE_URI']
let shortUUID = require('short-uuid')() // https://github.com/oculus42/short-uuid (npm i --save short-uuid)

let nanomineUser = {'userid': '9999999999', 'givenName': 'nanomine', 'surName': 'test', 'displayName': 'NanoMine Test', 'email': 'testuser@nodomain.org', 'apiAccess': []}
let curateRestApi = {'name': 'curate', 'desc': 'api for curation', 'token': shortUUID.new()}
let emailRestApi = {'name': 'email', 'desc': 'api to send email', 'token': shortUUID.new()}
let jobsRestApi = {'name': 'jobs', 'desc': 'api for job submission/management', 'token': shortUUID.new()}
let adminRestApi = {'name': 'admin', 'desc': 'api for administration', 'token': shortUUID.new()}

function logTrace (msg) { // Placeholders logging functions
  console.log(msg)
}

function logDebug (msg) {
  // console.log(msg)
}

function logInfo (msg) {
  console.log(msg)
}

function logWarn (msg) {
  console.log(msg)
}

function logError (msg) {
  console.log(msg)
}

let schemaInfo = []

function getSchemaInfo (schemaId) {
  let func = 'getSchemaInfo'
  let rv = null
  logDebug(func + ' looking for: ' + schemaId)
  schemaInfo.forEach((v) => {
    logDebug(func + ' checking input schemaId: ' + schemaId + ' against: ' + v.schemaId)
    if (schemaId === v.schemaId) {
      logDebug('setting return value for schemaId: ' + schemaId)
      rv = v
    }
  })
  return rv
}

let schemasSorted = false

function sortSchemas () { // sort by date descending and choose first
  schemaInfo.sort((a, b) => { // Sort in reverse order
    let rv = 0
    let rea = a.filename.match(/(\d{2})(\d{2})(\d{2})/)
    let reb = b.filename.match(/(\d{2})(\d{2})(\d{2})/)
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

function latestSchema () {
  if (schemasSorted === false) {
    sortSchemas()
    schemasSorted = true
  }
  let rv = schemaInfo[0]
  return rv
}

function fmtSchemas (showContent) {
  let rv = []
  schemaInfo.forEach(v => {
    let template
    if (showContent) {
      template = `\n\tschemaId: ${v.schemaId} isDeleted: ${v.isDeleted} title: ${v.title} filename: ${v.filename}  content: ${v.content}`
    } else {
      template = `\n\tschemaId: ${v.schemaId} isDeleted: ${v.isDeleted} title: ${v.title} filename: ${v.filename}`
    }
    rv.push(template)
  })
  let latest = latestSchema().schemaId
  rv.push(`latest schemaId: ${latest}`)
  return rv
}

function checkSchema (schema) {
  let rv = false
  schemaInfo.forEach(v => {
    if (v.schemaId === schema) {
      rv = true
    }
  })
  return rv
}

const versionOriginal = { // NanoMine Django RC1 or thereabouts i.e. the data was in production as of 2018/09/10 (until mid Feb 2019 shutdown)
  majorVer: 1,
  minorVer: 3,
  patchVer: 0,
  labelVer: null
}
const versionSpDev1 = { // NanoMine SP rewrite dev version 1
  majorVer: 1,
  minorVer: 3,
  patchVer: 0,
  labelVer: 'nm-sp-dev-1'
}

const versionSpDev2 = { // NanoMine SP rewrite dev version 2
  majorVer: 1,
  minorVer: 3,
  patchVer: 0,
  labelVer: 'nm-sp-dev-2'
}
const versionSpDev3 = { // NanoMine SP rewrite dev version 3
  majorVer: 1,
  minorVer: 3,
  patchVer: 0,
  labelVer: 'nm-sp-dev-3'
}

let dbVer = versionOriginal
let versionColNm = 'mgi_version'
let datasetColNm = 'dataset'
let xmldataColNm = 'xmdata'

// const mongoUri = 'mongodb://mgi:mydevmongoapipw@localhost:27017/mgi'
const dbName = 'mgi'
// const mongoUrl = 'mongodb://localhost:27017/' + dbName
const mongoUrl = process.env['NM_MONGO_URI']

let db = null
let mongoClient = null

function dbClose () {
  let func = 'dbClose'
  let p = new Promise((resolve, reject) => {
    mongoClient.close()
      .then(function () {
        let msg = func + ' - database successfully closed.'
        logInfo(msg)
        resolve(msg)
      })
      .catch(function (err) {
        let msg = func + ' - failed to close database successfully. Error: ' + err
        logError(msg)
        reject(msg)
      })
  })
  return p
}

function mapVersion (versionInfo) { // version info from mgi.version -- may be null from original production version
  let rv = -1
  if (versionInfo) {
    let majorVer = versionInfo['majorVer']
    let minorVer = versionInfo['minorVer']
    let patchVer = versionInfo['patchVer']
    let labelVer = versionInfo['labelVer']
    migrationTable.forEach((v, idx) => {
      if (labelVer === v.from.labelVer && majorVer === 1 && minorVer === 3 && patchVer === 0) {
        rv = idx
      }
    })
  }
  return rv
}

function inspect (obj, maxDepth) {
  let depth = 50
  if (maxDepth) {
    depth = maxDepth
  }
  return util.inspect(obj, {'showHidden': true, 'depth': depth})
}

let xmlHeader = '<?xml version="1.0" encoding="utf-8"?>'
let xml = xmlHeader

let indentIncr = 0
let indent = 0

function isSimple (o) {
  return !(_.isObject(o) || _.isArray(o))
}

function isArray (o) {
  return _.isArray(o)
}

function isObject (o) {
  return !_.isArray(o) && _.isObject(o)
}

function jArray2x (p, a, indent) {
  a.forEach((v) => {
    let attr = null
    let attrVal = null
    if (isObject(v) && _.keys(v)[0].slice(0, 1) === '@') {
      attr = _.keys(v)[0].slice(1)
      attrVal = v[_.keys(v)[0]]
      xml += (' '.repeat(indent) + '<' + p + ' ' + attr + '=' + '"' + attrVal + '">')
      _.unset(v, '@' + attr)
      j2x(v, null, indent + indentIncr)
    } else {
      xml += (' '.repeat(indent) + '<' + p + '>')
      j2x(v, null, indent + indentIncr)
    }
    xml += (' '.repeat(indent) + '</' + p + '>')
  })
}

function j2x (o, parent, indent) {
  if (isArray(o)) {
    o.forEach((e) => {
      j2x(e, o, indent + indentIncr)
    })
  } else if (isObject(o)) {
    _.keys(o).forEach((v) => {
      if (isSimple(o[v]) || isObject(o[v])) {
        if (v !== '#text') {
          xml += (' '.repeat(indent) + '<' + v + '>')
        }
        j2x(o[v], o, indent + indentIncr)
        if (v !== '#text') {
          xml += (' '.repeat(indent) + '</' + v + '>')
        }
      } else {
        jArray2x(v, o[v], indent + indentIncr)
      }
    })
  } else {
    let heo = o
    if (typeof o === 'string') {
      heo = he.decode(o) // decode any named character entities since they're not compatible with python rdflib
      heo = he.encode(heo, { // re-encode special entity characters using decimal (hex will not work) encoding for rdflib
        'useNamedReferences': false,
        'decimal': true
      })
    }
    xml += (' '.repeat(indent) + heo) // Element text
  }
  return xml
}

let datasets = {} // 'seq' is key
let writePromises = [] // promises for updating xml, inserting datasource docs, etc need to complete before progressing past
function updateXmlDataDocToNmSpDev1 (id, schemaId, dsSeq, xml) {
  // write xml to xmlddoc.xml_str
  // create schemaId field and save schema field there (Mongoose issue)
  // create and update entityState=EditedNotValid and curateState=Edit fields
  let p = new Promise(function (resolve, reject) {
    // this timeout is not a work-around, it's simply to allow other parts of the migration to occur inter-spersed
    setTimeout(function () {
      let msg = ' id: ' + id + ' using xml of length: ' + xml.length
      let xmldata = db.collection('xmldata')
      xmldata.findOneAndUpdate({'_id': {$eq: id}},
        {
          $set: {
            'xml_str': xml, // write xml
            'schemaId': schemaId, // create schemaId field using schema
            'dsSeq': parseInt(dsSeq), // Sequence of the associated dataset
            'entityState': 'EditedValid', // initial entity state shows validated by editor,  requiring back-end validation
            'curateState': 'Edit',
            'isPublic': true, // all of the original data is intended to be public
            'ispublished': true, // all of the original data came from published papers
            'iduser': nanomineUser.userid
          }
        }, {}, function (err, result) {
          if (err) {
            logInfo('Update failed: ' + msg + ' error: ' + err)
            reject(err)
          } else {
            logInfo('Update successful: ' + msg)
            resolve()
          }
        })
    }, (Math.floor(Math.random() * 20) + 10) * 1000)
  })
  return p
}

function updateTemplateVersionCurrentRef () {
  let func = 'updateTemplateVersionCurrentRef'
  let p = new Promise(function (resolve, reject) {
    let templateVersion = db.collection('template_version')
    templateVersion.find({}).forEach(function (doc) {
      templateVersion.updateOne({_id: doc._id}, {$set: {'currentRef': ObjectId.createFromHexString(doc.current)}}, {})
        .then(function (result) {
          logInfo(func + ' - updateTemplateVersionCurrentRef successful')
          resolve()
        })
        .catch(function (err) {
          logError(func + ' - updateTemplateVersionCurrentRef failed: ' + err)
          reject(err)
        })
    }, function (err) { // THIS IS NOT A CATCH! It's an iteration ended function and err MAY be null which is OK!
      if (err) {
        logError(func + ' - template_version iterator failure. Err: ' + err)
        reject(err)
      }
    })
  })
  return p
}

function updateOrAddDatasetForNmSpDev1 (dsrec) {
  let p = new Promise(function (resolve, reject) {
    setTimeout(function () {
      logInfo('updating dsrec seq: ' + dsrec.seq)
      // resolve()
      let msg = ' seq: ' + dsrec.seq
      let dscoll = db.collection('datasets')
      dscoll.replaceOne({'seq': {$eq: dsrec.seq}},
        dsrec, {'upsert': true}, function (err, result) {
          if (err) {
            logInfo('Insert/Update dataset failed: ' + msg + ' error: ' + err)
            reject(err)
          } else {
            logInfo('Insert/Update dataset successful: ' + msg)
            resolve()
          }
        })
    }, (Math.floor(Math.random() * 20) + 10) * 1000)
  })
  return p
}

function createUsersCollection () {
  let p = new Promise(function (resolve, reject) {
    db.createCollection('users', {})
      .then(function () {
        logInfo('create users Collection successful')
        resolve()
      })
      .catch(function (err) {
        logInfo('create users Collection failed. Error' + err)
        reject(err)
      })
  })
  return p
}

function createCollection (name) {
  let p = new Promise(function (resolve, reject) {
    db.createCollection(name, {})
      .then(function () {
        logInfo('create ' + name + ' Collection successful')
        resolve()
      })
      .catch(function (err) {
        logInfo('create ' + name + ' Collection failed. Error' + err)
        reject(err)
      })
  })
  return p
}

function createDatasetsCollection () {
  let p = new Promise(function (resolve, reject) {
    db.createCollection('datasets', {})
      .then(function () {
        logInfo('create datasets Collection successful')
        resolve()
      })
      .catch(function (err) {
        logInfo('create datasets Collection failed. Error' + err)
        reject(err)
      })
  })
  return p
}

function createUpdateMgiVersionCollection (versionInfo) {
  let func = 'createUpdateMgiVersionCollection'
  let p = new Promise(function (resolve, reject) {
    function writeVersionInfo (versionInfo, versionCollection, resolve, reject) {
      let majorVer = versionInfo['majorVer']
      let minorVer = versionInfo['minorVer']
      let patchVer = versionInfo['patchVer']
      let labelVer = versionInfo['labelVer']
      versionCollection.findOneAndUpdate({}, {
        $set: {
          'majorVer': majorVer,
          'minorVer': minorVer,
          'patchVer': patchVer,
          'labelVer': labelVer
        }
      }, {upsert: true}, function (err, result) {
        if (err) {
          logError(func + ' - error updating mgi_version collection. Error: ' + err)
          reject(err)
        } else {
          logError(func + ' - Successfully updated mgi_version collection. Result: ' + JSON.stringify(result))
          resolve(result)
        }
      })
    }

    db.collection(versionColNm, {}, function (err, mgiVersionCollection) {
      if (err) {
        db.createCollection(versionColNm, {})
          .then(function (mgiVersionCollection) {
            logError('create mgi_version Collection successful')
            writeVersionInfo(versionInfo, mgiVersionCollection, resolve, reject)
          })
          .catch(function (err) {
            logError('create mgi_version Collection failed. Error' + err)
            reject(err)
          })
      } else {
        writeVersionInfo(versionInfo, mgiVersionCollection, resolve, reject)
      }
    })
  })
  return p
}

function createOrUpdateUser (userRec) {
  let p = new Promise(function (resolve, reject) {
    setTimeout(function () {
      logInfo('add/update user: ' + userRec.userid)
      let msg = ' user: ' + userRec.userid + ' givenName: ' + userRec.givenName + ' email: ' + userRec.email
      let ucoll = db.collection('users')
      ucoll.replaceOne({'userid': {$eq: userRec.userid}},
        userRec, {'upsert': true}, function (err, result) {
          if (err) {
            logInfo('Insert/Update user failed: ' + msg + ' error: ' + err)
            reject(err)
          } else {
            logInfo('Insert/Update user successful: ' + msg)
            resolve()
          }
        })
    }, (Math.floor(Math.random() * 20) + 10) * 1000)
  })
  writePromises.push(p)
}

function createOrUpdateApi (apiRec) {
  let p = new Promise(function (resolve, reject) {
    setTimeout(function () {
      logInfo('add/update api: ' + apiRec.name)
      let msg = ' api: ' + apiRec.name + ' desc: ' + apiRec.desc + ' token: ' + apiRec.token
      let ucoll = db.collection('api')
      ucoll.replaceOne({'name': {$eq: apiRec.name}},
        apiRec, {'upsert': true}, function (err, result) {
          if (err) {
            logInfo('Insert/Update api failed: ' + msg + ' error: ' + err)
            reject(err)
          } else {
            logInfo('Insert/Update api successful: ' + msg)
            resolve()
          }
        })
    }, (Math.floor(Math.random() * 20) + 10) * 1000)
  })
  return p
}

function updateOrAddDatasets () {
  let dskeys = _.keys(datasets)
  logInfo('updateOrAddDatasets - keys: ' + JSON.stringify(dskeys))
  dskeys.forEach(function (k) {
    // add each as document with seq of key  (set key into doc as seq.key
    logInfo('adding writePromise for dataset: ' + k)
    let key = parseInt(k)
    datasets[k].seq = key
    writePromises.push(updateOrAddDatasetForNmSpDev1(datasets[k]))
  })
}

function updateXmlDataDocToNmSpDev2 (id, xml) {
  // write xml to xmlddoc.xml_str
  // create schemaId field and save schema field there (Mongoose issue)
  // create and update entityState=EditedNotValid and curateState=Edit fields
  let p = new Promise(function (resolve, reject) {
    // this timeout is not a work-around, it's simply to allow other parts of the migration to occur inter-spersed
    setTimeout(function () {
      let msg = ' id: ' + id + ' using xml of length: ' + xml.length
      let xmldata = db.collection('xmldata')
      logInfo('Updating: xmldata record: ' + id)
      xmldata.findOneAndUpdate({'_id': {$eq: id}},
        {
          $set: {
            'xml_str': xml // write xml
          }
        }, {}, function (err, result) {
          if (err) {
            logInfo('Update failed: ' + msg + ' error: ' + err)
            reject(err)
          } else {
            logInfo('Update successful: ' + msg)
            resolve()
          }
        })
    }, (Math.floor(Math.random() * 20) + 10) * 1000)
  })
  return p
}

function newImageFileValue (fileElem) {
  let rv = null
  let blobIdRegex = /blob\?id=([A-Fa-f0-9]*)/
  logInfo('found imageFile = ' + fileElem)
  let match = fileElem.match(blobIdRegex)
  if (match) {
    let blobId = match[1]
    rv = nmWebBaseUri + '/nmr/blob?id=' + blobId
    logInfo('  imageFile mached. New value: ' + rv)
  }
  return rv
}

function adjustImageBlob (json) {
  let imageFiles = _.get(json, 'PolymerNanocomposite.MICROSTRUCTURE.ImageFile', null)
  if (imageFiles) { // just use above to verify path exists
    if (!Array.isArray(imageFiles)) {
      let ov = json.PolymerNanocomposite.MICROSTRUCTURE.ImageFile.File
      let nv = newImageFileValue(ov)
      if (nv) {
        json.PolymerNanocomposite.MICROSTRUCTURE.ImageFile.File = nv
        logInfo('Replaced single imageFile value old: ' + ov + ' new: ' + nv)
      } else {
        logError('ERROR: Found single MICROSTRUCTURE image file, but was unable to update reference: ' + ov)
      }
    } else {
      imageFiles.forEach(function (imageFile, idx) {
        let ov = imageFile.File
        let nv = newImageFileValue(imageFile.File)
        if (nv) {
          logInfo('Replaced #' + idx + ' imageFile value old: ' + ov + ' new: ' + nv)
          json.PolymerNanocomposite.MICROSTRUCTURE.ImageFile[idx].File = nv
        } else {
          logError('Unable to replace #' + idx + ' imageFile value. Old value:: ' + ov)
        }
      })
    }
  }
  return json
}

function insertXmlData (doc2Insert) {
  let func = 'insertXmlData'
  let p = new Promise(function (resolve, reject) {
    let xmldata = db.collection('xmldata')
    xmldata.insertOne(doc2Insert, {})
      .then(function (mongoError, result) {
        if (result['ok'] === 1 && result['n'] === 1) {
          resolve()
        } else {
          let msg = func + ' - error inserting data for schema: ' + doc2Insert.schemaId + ' title: ' + doc2Insert.title + ' error: ' + mongoError
          reject(msg)
        }
      })
      .catch(function (err) {
        let msg = func + ' - error inserting data for schema: ' + doc2Insert.schemaId + ' title: ' + doc2Insert.title + ' error: ' + err
        reject(msg)
      })
  })
  return p
}

function copyXmlData2Schema (fromSchema, toSchema) {
  let func = 'copyXmlData2Schema'
  let p = new Promise(function (resolve, reject) {
    let xmldata = db.collection('xmldata')
    xmldata.find({'schemaId': {$eq: fromSchema}}, {}).forEach((xmldoc) => {
      let msg = func + ' - copy title: ' + xmldoc.title + ' schema: ' + xmldoc.schema + ' to new schemaid: ' + toSchema
      logDebug(msg)
      // !!! xmldoc.schemaId = xmldoc.schema // fix schema id name
      let doc2Insert = xmldoc
      doc2Insert.schema = toSchema // dup'd original schema id since 'schema' is mongoose keyword. Data can be there, but mongoose cannot access
      doc2Insert.schemaId = toSchema // so schemaId introduced for mongoose
      doc2Insert.entityState = 'EditedValid'
      doc2Insert.dsSeq = -1
      writePromises.push(insertXmlData(doc2Insert))
    }, (err) => { // err is null most of the time unless there was an iteration error
      if (err) {
        let msg = func + ' - error processing xmldata collection. error: ' + err
        reject(msg)
      } else {
        let msg = func + ' - done processing xmldata collection. Still waiting on inserts to complete.'
        logInfo(msg)
        Promise.all(writePromises)
          .then(function () {
            logInfo(func + ' successful.')
            writePromises = []
            resolve()
          })
          .catch(function (err) {
            let msg = 'Failure waiting for all inserts. Error: ' + err
            reject(msg)
          })
      }
    })
  })
  return p
}

function updateDatasetsObject (seq, ds, dsExt) {
  let issue = null
  let issn = null
  if (dsExt) {
    issue = dsExt.Issue
    issn = dsExt.ISSN
    logDebug('issue: ' + issue + ' issn: ' + issn)
  } else {
    // logError('title: ' + xmldoc.title + ' schema: ' + xmldoc.schema + ' - dsExt (journal info) is null or undefined for dataset seq: ' + seq)
    logError('dsExt (journal info) is null or undefined for dataset seq: ' + seq)
  }
  if (ds) {
    datasets[seq] = {
      'citationType': ds.CitationType,
      'publication': ds.Publication,
      'title': ds.Title,
      'author': [],
      'keyword': [],
      'publisher': ds.Publisher,
      'publicationYear': ds.PublicationYear,
      'doi': ds.DOI,
      'volume': ds.Volume,
      'url': ds.URL,
      'language': ds.Language,
      'dateOfCitation': ds.DateOfCitation,
      'location': ds.Location,
      'issue': issue,
      'issn': issn,
      'userid': nanomineUser.userid,
      'isPublic': true, // all of the original datasets are public
      'ispublished': true // all of the original datasets came from published papers
    }
    if (_.isArray(ds.Author)) {
      ds.Author.forEach((a) => {
        datasets[seq].author.push(a)
      })
    } else if (ds.Author && ds.Author.length > 0) {
      datasets[seq].author.push(ds.Author)
    }
    if (_.isArray(ds.Keyword)) {
      ds.Keyword.forEach((a) => {
        datasets[seq].keyword.push(a)
      })
    } else if (ds.Keyword && ds.Keyword.length > 0) {
      datasets[seq].keyword.push(ds.Keyword)
    }
    logInfo('created dataset reference - seq: ' + seq + ' - ' + inspect(datasets[seq]) + '\n\n')
  } else {
    // no dataset info passed
  }
}
// NOTE: this is a point in time migration for production data that's at SpDev2 that
//   removes the old data for the current schema (after a backup to a mock schema),
//   removes all datasets and re-creates the data from a set of data supplied on disk.
//   The datasets are also re-created from the data.
function migrateToNmSpDev3 (fromVer, toVer) {
  // requires that new versions of the xml files exist in /apps/xmlupdates
  // NOTE: this is less of a migration than it is a mass update
  let func = 'migrateToNmSpDev3'
  let p = new Promise(function (resolve, reject) {
    let msg = func + ' - Migrating from: ' + JSON.stringify(fromVer) + ' to: ' + JSON.stringify(toVer)
    logInfo(msg)
    // get list of '.xml' files in /apps/xmlupdates
    //   if directory does not exist or there are no files, fail migration step with reject(msg)
    let xmlfiles = fs.readdirSync('/apps/xmlupdates')
    //   Work-around to version current data:
    //     read schema information for PNC_schema_081218.xsd and create new template and template version
    //        for PNC_schema_081118.xsd and copy all current xml records for prior schemaid to entries
    //        with new schemaid.
    //   Copy all the xmldata records with prior schema id to new records with new schemaid.
    // Now, read all the xmlupdates, adjust microstructure refs, update xml_str or if new create dataset and xml_data record
    //
    const num2Process = 1708
    if (xmlfiles.length === num2Process) { // num2Process (sanity check)
      // read schema record for filename PNC_schema_081218.xsd
      // Create a new schema record for PNC_schema_081118.xsd and save object id
      //   copy all fields from original to new except objectid
      // Create a new template version record for new schema record
      //   set isDeleted=false, nbVersions=1, current=new schema id, versions[0]=newschemaid, currentRef=ObjectId(newschemaid)
      let tcol = db.collection('template')
      logInfo(func + ' - Reading: template/schema record for PNC_schema_081218.xsd')
      tcol.findOne({'filename': {$eq: 'PNC_schema_081218.xsd'}},
        { // nada
        }, {}, function (err, result) {
          if (err) {
            logInfo(func + ' - Find 081218 schema failed: ' + msg + ' error: ' + err)
            reject(err)
          } else {
            logInfo(func + ' - Find 081218 schema successful: ' + msg)
            let schemaRec = null
            if (Array.isArray(result)) {
              schemaRec = result[0]
            } else {
              schemaRec = result
            }
            let fromSchemaId = schemaRec.schemaId
            let toSchemaId = null
            schemaRec.filename = 'PNC_schema_081118.xsd' // back date it so it isn't current
            schemaRec.title = 'PNC_schema_081118'
            schemaRec.templateVersion = 'templateversion id str'
            tcol.insertOne(schemaRec)
              .then(function (mongoError, result) {
                if (result['ok'] === 1 && result['n'] === 1) {
                  let schemaId = result['insertedId']
                  toSchemaId = schemaId.toHexString()
                  // create a template_version referencing the new schema
                  let tcolv = db.collection('template_version')
                  let tvrec = {
                    versions: [schemaId.toHexString()],
                    deletedVersions: [],
                    nbVersions: 1,
                    isDeleted: false,
                    current: schemaId.toHexString(),
                    currentRef: schemaId
                  }
                  tcolv.insertOne(tvrec)
                    .then(function (mongoError, result) {
                      // update the new schema rec with the version ref,
                      if (result['ok'] === 1 && result['n'] === 1) {
                        schemaRec.templateVersion = result.insertedId.toHexString()
                        tcol.updateOne({filename: {$eq: schemaRec.filename}}, {
                          $set: {
                            'templateVersion': schemaRec.templateVersion
                          }
                        }, {})
                          .then(function (result) {
                            if (result['ok'] === 1 && result['n'] === 1) {
                              // copy all the existing data for the original schemaid to recs
                              //     ref'ing the new backup schemaid
                              copyXmlData2Schema(fromSchemaId, toSchemaId)
                                .then(function () {
                                  // all data sets need to be removed and re-created from new data later
                                  let datasets = db.collection('datasets')
                                  datasets.deleteMany({}, {})
                                    .then(function (mongoError, result) {
                                      if (mongoError) {
                                        let msg = func + ' - failed to remove all datasets  error: ' + mongoError
                                        reject(msg)
                                      } else {
                                        let msg = func + ' - deleted ' + result['n'] + ' dataset records.'
                                        logInfo(msg)
                                        let xmldata = db.collection('xmldata')
                                        // delete the xmldata records for the current schema
                                        xmldata.deleteMany({'schemaId': {$eq: fromSchemaId}}, {})
                                          .then(function (mongoError, result) {
                                            if (mongoError) {
                                              let msg = func + ' - failed to remove all xmldata records for current schema. Error: ' + mongoError
                                              reject(msg)
                                            } else {
                                              let msg = func + ' - deleted ' + result['n'] + ' xmldata records for schemaId: ' + fromSchemaId
                                              logInfo(msg)
                                              // insert xmldata record for each of the xml files in /apps/xmlupdates
                                              xmlfiles.forEach((f) => {
                                                let fullname = '/apps/xmlupdates/' + f
                                                let xml = fs.readFileSync(fullname, 'utf-8')
                                                let js = xmljs.xml2js(xml, {compact: false})
                                                let pnc = js.elements[0].elements
                                                pnc.forEach(function (e) {
                                                  if (e.name === 'MICROSTRUCTURE') {
                                                    if (Array.isArray(e.elements)) {
                                                      e.elements.forEach(function (me) {
                                                        //          console.log('Array: ' + JSON.stringify(me))
                                                        if (me.name === 'ImageFile') {
                                                          if (Array.isArray(me.elements)) {
                                                            me.elements.forEach((ie) => {
                                                              if (ie.name === 'File') {
                                                                // console.log(ie.elements[0].text)
                                                                ie.elements[0].text = newImageFileValue(ie.elements[0].text)
                                                              }
                                                            })
                                                          } else {
                                                            // console.log('simple: ' + me.elements.name)
                                                          }
                                                        }
                                                      })
                                                    } else if (e.elements) {
                                                      // console.log('non-Array: ' + JSON.stringify(e.elements))
                                                    }
                                                  }
                                                })
                                                xml = xmljs.js2xml(js, {})
                                                writePromises.push(insertXmlData({
                                                  schemaId: fromSchemaId,
                                                  schema: fromSchemaId,
                                                  title: f,
                                                  iduser: nanomineUser.userId,
                                                  ispublished: true,
                                                  curateState: 'Edit',
                                                  entityState: 'EditedValid',
                                                  dsSeq: -1,
                                                  isPublic: true,
                                                  mdcsUpdateState: 'none',
                                                  xml_str: xml
                                                }))
                                              })
                                              Promise.all(writePromises)
                                                .then(function () {
                                                  logInfo(func + ' successful.')
                                                  writePromises = []
                                                  resolve() // ???? NEED to create datasets
                                                })
                                                .catch(function (err) {
                                                  let msg = func + ' - failure waiting for all inserts. Error: ' + err
                                                  reject(msg)
                                                })
                                            }
                                          })
                                          .catch(function (err) {
                                            let msg = func + ' - failed to remove all xmldata records for current schema. Error: ' + err
                                            reject(msg)
                                          })
                                      }
                                    })
                                    .catch(function (err) {
                                      let msg = func + ' - failed to remove all datasets  error: ' + err
                                      reject(msg)
                                    })
                                })
                                .catch(function (err) {
                                  let msg = func + ' - failed to copy xmldata recs to new backup schema record: ' + toSchemaId + ' from: ' + fromSchemaId + ' error: ' + err
                                  reject(msg)
                                })
                            } else {
                              let msg = func + ' - cannot update templateVersion for new backup schema record: ' + JSON.stringify(schemaRec) + ' error: ' + new Error('n or ok not correct')
                              reject(msg)
                            }
                          })
                          .catch(function (err) {
                            let msg = func + ' - cannot update template version of new schema rec: ' + JSON.stringify(schemaRec) + ' error: ' + err
                            reject(msg)
                          })
                      } else {
                        let msg = func + ' - cannot insert new schema version record for backup schema: ' + JSON.stringify(tvrec) + ' error: ' + new Error('n or ok not correct - ' + mongoError)
                        reject(msg)
                      }
                    })
                    .catch(function (err) {
                      let msg = func + ' - cannot insert schema version record for backup schema: ' + JSON.stringify(tvrec) + ' error: ' + err
                      reject(msg)
                    })
                } else {
                  let msg = func + ' - cannot insert schema record for backup schema: ' + JSON.stringify(schemaRec) + ' error: ' + new Error('n or ok not correct - ' + mongoError)
                  reject(msg)
                }
              })
              .catch(function (err) {
                let msg = func + ' - cannot insert schema record for backup schema: ' + JSON.stringify(schemaRec) + ' error: ' + err
                reject(msg)
              })
          }
        })
    } else {
      let err = new Error(func + ' - invalid number of xml records to process. Expecting: ' + num2Process + ' found: ' + xmlfiles.length)
      reject(err)
    }
  })
  return p
}

function migrateToNmSpDev2 (fromVer, toVer) {
  let func = 'migrateToNmSpDev2'
  let p = new Promise(function (resolve, reject) {
    let msg = func + ' - Migrating from: ' + JSON.stringify(fromVer) + ' to: ' + JSON.stringify(toVer)
    logInfo(msg)
    let xmldata = db.collection('xmldata')
    if (xmldata && xmldata !== null) {
      logDebug('xmldata: ' + inspect(xmldata))
      let xmlcur = xmldata.find({}) // .sort([['title', 1]])
      let xmlrecs = 0
      // let skipped = []
      xmlcur.count()
        .then(function (xmlcount) {
          logDebug('count: ' + xmlcount)
          xmlcur.rewind()
          xmlcur.forEach((xmldoc) => {
            msg = func + ' - idx: ' + xmlrecs + ' title: ' + xmldoc.title + ' schema: ' + xmldoc.schema
            let match = xmldoc.title.match(/^[a-zA-Z](\d{3,})[_].*/)
            if (match) {
              logDebug('processing: ' + msg)
              // !!! xmldoc.schemaId = xmldoc.schema // fix schema id name
              let bson = xmldoc.content
              if (bson != null) {
                logInfo(func + ' - processing record')
                bson = adjustImageBlob(bson)
                logDebug(func + ' - translating bson to xml for: ' + xmldoc.title + ' ' + xmldoc.schema)
                xml = xmlHeader
                j2x(bson, null, indent) // appends global xml (crappy design that already wasted some time) TODO fix global xml
                logDebug(func + ' - done translating bson')
                writePromises.push(updateXmlDataDocToNmSpDev2(xmldoc._id, xml))
              } else {
                logInfo(msg + ' - skipping since there is no original content field in the xmldata rec.')
              }
            } else {
              logInfo(msg + ' - skipping since title field in the xmldata rec is poorly formed.')
            }
          }, (err) => { // err is null most of the time unless there was an iteration error
            if (err) {
              let msg = func + ' - error processing xmldata collection. error: ' + err
              reject(msg)
            } else {
              let msg = func + ' - done processing xmldata collection. Still waiting on updates to complete.'
              logInfo(msg)
              Promise.all(writePromises)
                .then(function () {
                  logInfo(' migration successful.')
                  resolve()
                })
                .catch(function (err) {
                  let msg = 'Failure waiting for all updates. Error: ' + err
                  reject(msg)
                })
            }
          })
        })
        .catch(function (err) {
          let msg = func + ' - error getting xml count. Error: ' + err
          logError(msg)
          reject(msg)
        })
    }
  })
  return p
}

function migrateToNmSpDev1 (fromVer, toVer) {
  let func = 'migrateToNmSpDev1'
  let msg = func + ' - Migrating from: ' + JSON.stringify(fromVer) + ' to: ' + JSON.stringify(toVer)
  logInfo(msg)

  // 1. rename the 'schema' field name to 'schemaId' -- the name schema is incompatible with the Mongoose library
  // 2. for each xmldata record, extract the BSON of the content field into json, build the XML string from the json
  //   and write the data to a new field in the record called 'xml_str'.
  // 3. create dataset collection and add records for each unique xmldata.content title $1 value in /[A-Za-z]([0-9]*)_.*/
  //      the dataset collection should have a unique index on the 'seq' field which is set to the above value as a number
  //      -- if #2 is done in order by title, then a dataset record can be created for each 'new' LNNN combo seen
  //    NOTE: one dataset record will cover multiple xmldata records
  //      and values from the PolymerNanocomposite->DATA_SOURCE->Citation->CommonFields section of the xmldata record
  //      should be placed into the dataset record (CitationType, Publication, Title, Author[], Keyword[], Publisher,
  //          PublicationYear, doi, Volume, URL, Language)
  // 4. create version collection for this version (at the end)
  let p = new Promise(function (resolve, reject) {
    let xmldata = db.collection('xmldata')
    if (xmldata && xmldata !== null) {
      logDebug('xmldata: ' + inspect(xmldata))
      let xmlcur = xmldata.find({}) // .sort([['title', 1]])
      let xmlrecs = 0
      let skipped = []
      xmlcur.count()
        .then(function (xmlcount) {
          logDebug('count: ' + xmlcount)
          xmlcur.rewind()
          xmlcur.forEach(function (xmldoc) {
            msg = func + ' - idx: ' + xmlrecs + ' title: ' + xmldoc.title + ' schema: ' + xmldoc.schema
            let match = xmldoc.title.match(/^[a-zA-Z](\d{3,})[_].*/)
            let seq = -1
            if (match) {
              logDebug('processing: ' + msg)
              // !!! xmldoc.schemaId = xmldoc.schema // fix schema id name
              let json = xmldoc.content
              // extract dataset fields and append to datasets array -- if not already there
              seq = match[1]
              let isValidSchema = checkSchema(xmldoc.schema) // TODO bad name. Just checks to see if schema is not deleted and current
              if (datasets[seq] === undefined) { // && isValidSchema && (xmldoc.schema === latestSchema().schemaId)) { // try to get latest data
                let ds = _.get(json, 'PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields', null)
                let dsExt = _.get(json, 'PolymerNanocomposite.DATA_SOURCE.Citation.CitationType.Journal', null)
                if (ds) {
                  updateDatasetsObject(seq, ds, dsExt)
                } else {
                  logInfo('cannot find key path in BSON object to build dataset info: ' + seq + ' for schema: ' + xmldoc.schema + ' title: ' + xmldoc.title)
                }
              } else {
                logInfo('no datasets entry created for: ' + seq + '. Type of datasets[seq]: ' + typeof datasets[seq] + ' isValidSchema: ' + isValidSchema + ' schemaInfo.length: ' + schemaInfo.length + ' checked for schema: ' + xmldoc.schema)
              }
              logDebug(inspect(json))
              xml = xmlHeader // initialize xml
              // Update any image references in the xml so that they're valid
              //  .//MICROSTRUCTURE/ImageFile/File
              adjustImageBlob(json)
              logDebug(j2x(json, null, indent))
              // let xsd = getSchemaInfo(xmldoc.schema)
              /* Cannot verify all xmls without process running out of memory. Need another way to verify.
              if (xsd) {
                let errors = validateXml({'xml': xml, 'schema': xsd.content, TOTAL_MEMORY:4194304})
                if (errors) {
                  logError(func + ' - validation of XML ' + 'schemaId:' + xmldoc.schema + ' title: ' + xmldoc.title + ' failed with errors: ' + JSON.stringify(errors))
                } else {
                  logInfo(func + ' - Successful validation of XML ' + 'schemaId:' + xmldoc.schema + ' title: ' + xmldoc.title)
                }
              } else {
                logInfo(func + ' - Unable to validate XML against schema (not current or deleted schema) - ' + 'schemaId:' + xmldoc.schema + ' title: ' + xmldoc.title)
              }
              */
            } else {
              xml = ''
              skipped.push('NOT PROCESSED: ' + msg)
            }
            writePromises.push(updateXmlDataDocToNmSpDev1(xmldoc._id, xmldoc.schema, seq, xml))
            ++xmlrecs
          })
            .then(function () {
              msg = func + ' - done processing ' + (xmlrecs - skipped.length) + ' of ' + xmlcount + ' xmldata records'
              logDebug(inspect(datasets))
              skipped.forEach(function (v) {
                logError(v)
              })
              // resolve(msg)
              updateTemplateVersionCurrentRef()
                .then(function () {
                  createCollection('api')
                    .then(function () {
                      createUsersCollection()
                        .then(function () {
                          createDatasetsCollection()
                            .finally(function () { // node --harmony-promise-finally migrate.js
                              logInfo('createDatasetCollection finally function called')
                              createOrUpdateUser(nanomineUser) // adds self to writePromises list to process
                              writePromises.push(createOrUpdateApi(curateRestApi))
                              writePromises.push(createOrUpdateApi(emailRestApi))
                              writePromises.push(createOrUpdateApi(jobsRestApi))
                              writePromises.push(createOrUpdateApi(adminRestApi))
                              updateOrAddDatasets() // writePromises already has xmldata updates, be sure to call this before waiting on promises.all
                              Promise.all(writePromises)
                                .then(function () {
                                  logInfo(' migration successful')
                                  // set the version into the version collection
                                  resolve('updates complete')
                                })
                                .catch(function (err) {
                                  let msg = func + ' - failure waiting for all updates. Error: ' + err
                                  logInfo(msg)
                                  reject(msg)
                                })
                            })
                        })
                        .catch(function (err) {
                          let msg = func + ' - error returned from createUsersCollection:  ' + err
                          logError(msg)
                          reject(msg)
                        })
                    })
                    .catch(function (err) {
                      let msg = func + ' - error returned from createCollection(api):  ' + err
                      logError(msg)
                      reject(msg)
                    })
                })

                .catch(function (err) {
                  let msg = func + ' - error returned from updateTemplateVersionCurrentRef:  ' + err
                  logError(msg)
                  reject(msg)
                })
            })
            .catch(function (err) {
              let msg = func + ' attempt to iterate xm records caught error: ' + err
              reject(msg)
            })
        })
    } else {
      msg = func + ' unable to open xmldata collection.'
      logDebug(msg)
      reject(msg)
    }
  })
  return p
}

const migrationTable = [ // Array of version to version conversion function mappings
  { 'from': versionOriginal, 'to': versionSpDev1, 'use': migrateToNmSpDev1 },
  { 'from': versionSpDev1, 'to': versionSpDev2, 'use': migrateToNmSpDev2 }
  // { 'from': versionSpDev2, 'to': versionSpDev3, 'use': migrateToNmSpDev3 }
]

function dbConnectAndOpen () {
  let func = 'dbConnectAndOpen'
  let msg = ''
  let p = new Promise(function (resolve, reject) {
    MongoClient.connect(mongoUrl, function (err, client) {
      logDebug(inspect(client, 5))
      mongoClient = client
      if (err) {
        msg = func + ' - error connecting to db: ' + mongoUrl + ' err: ' + err
        logInfo(msg)
        reject(msg)
      } else {
        msg = func + ' - successfully connected to db: ' + mongoUrl
        logInfo(msg)
        db = mongoClient.db(dbName)
        resolve(db)
      }
    })
  })
  return p
}

function getCurrentDbVersion () {
  let func = 'getCurrentDbVersion'
  let msg = ''
  let p = new Promise(function (resolve, reject) {
    // logDebug(inspect(db))
    db.listCollections({'name': versionColNm}).hasNext()
      .then(function (hasVersionCol) { // boolean value true or false
        dbVer = {}
        if (hasVersionCol === true) {
          //          logError(func + ' cannot handle reading version collection yet.') // TODO handle reading version colection
          //          reject(false)
          msg = func + ' - looking up current mgi version'
          logDebug(msg)
          dbVer = {}
          // console.log(db[versionColNm])
          let ver = db.collection(versionColNm)
          ver.findOne({}, function (err, r) {
            if (err) {
              msg = func + ' - no version info exists in db.  Error: ' + err
              dbVer = versionOriginal
              logError(msg)
              reject(msg)
            } else {
              dbVer.majorVer = r.majorVer
              dbVer.minorVer = r.minorVer
              dbVer.patchVer = r.patchVer
              dbVer.labelVer = r.labelVer
              msg = func + ' - found version info in db. Setting version to: ' + JSON.stringify(dbVer)
              logDebug(msg)
              resolve(dbVer)
            }
          })
        } else {
          dbVer = versionOriginal
          logInfo('Version collection: ' + versionColNm + ' not found. Returning original default for MDCS data: ' + JSON.stringify(dbVer))
          resolve(dbVer)
        }
      })
      .catch(function (err) {
        msg = func + ' - unable to get list of collections: ' + err
        reject(msg)
      })
  })
  return p
}

function loadSchemas () {
  // load template_version table for only isDeleted=false and get schemas for 'current'
  let func = 'loadSchemas'
  let msg = ''
  let p = new Promise(function (resolve, reject) {
    dbConnectAndOpen()
      .then(() => {
        let xsdVersions = db.collection('template_version')
        if (xsdVersions) {
          xsdVersions.find({}).forEach((xsdVer) => { // iterator callback
            logInfo('xsdVersion: ' + xsdVer.current + ' isDeleted: ' + xsdVer.isDeleted)
            schemaInfo.push({'schemaId': xsdVer.current, 'isDeleted': xsdVer.isDeleted})
          }, (err) => { // done iterating callback with possible error (weird Mongo stuff)
            if (err) {
              msg = func + ' error iterating template_version collection. Error: ' + err
              logError(msg)
              reject(msg)
            } else {
              let xsdDetail = db.collection('template')
              if (xsdDetail) {
                xsdDetail.find({}).forEach((xsd) => {
                  let schemaId = xsd._id.toHexString()
                  let xsdInfo = getSchemaInfo(schemaId)
                  if (xsdInfo) {
                    xsdInfo.title = xsd.title
                    xsdInfo.filename = xsd.filename
                    xsdInfo.content = xsd.content
                  } else {
                    logInfo(func + ' - ignoring non-current/isDeleted schemaId: ' + schemaId)
                  }
                }, (err) => {
                  if (err) {
                    msg = func + '- error iterating schemas (template) collection. Error: ' + err
                    logError(msg)
                    reject(msg)
                  } else {
                    sortSchemas()
                    msg = func + ' - completed loading schemas. Schema info: '
                    logInfo(msg)
                    let formatted = fmtSchemas(false)
                    formatted.forEach(v => {
                      logInfo(v)
                    })
                    resolve(true) // done with loadSchemas
                  }
                })
              } else {
                msg = func + ' - cannot load template (the xsd) collection.'
                logInfo(msg)
                reject(msg)
              }
            }
          })
        } else {
          msg = func + ' - cannot load template_version collection.'
          logInfo(msg)
          reject(msg)
        }
      })
      .catch(err => {
        msg = func + ' - load schemas err: ' + err
        logError(msg)
        reject(msg)
      })
  })
  return p
}

function migrate () {
  let func = 'migrate'
  loadSchemas()
    .then(function () {
      getCurrentDbVersion()
        .then(function (versionInfo) {
          logDebug(func + ' - getCurrentDbVersion.then with versioninfo')
          let idx = mapVersion(versionInfo)
          logDebug(func + ' - getCurrentDbVersion.then after mapVersion: ' + idx)
          let majorVer = versionInfo['majorVer']
          let minorVer = versionInfo['minorVer']
          let patchVer = versionInfo['patchVer']
          let labelVer = versionInfo['labelVer']
          if (idx === -1) {
            logInfo(func + ` - No conversion for version - major: ${majorVer} minor: ${minorVer} patch: ${patchVer} label: ${labelVer} found. Is it current?`)
            dbClose()
          } else {
            let fromVer = migrationTable[idx]['from']
            let toVer = migrationTable[idx]['to']
            logDebug(func + ' - getCurrentDbVersion.then idx: ' + idx + ' - fromVer: ' + JSON.stringify(fromVer) + ' toVer: ' + JSON.stringify(toVer))
            migrationTable[idx]['use'].apply(null, [fromVer, toVer])
              .then(function () {
                let msg = func + ' - migration from ' + JSON.stringify(fromVer) + ' to ' + JSON.stringify(toVer) + ' complete.'
                logInfo(msg)
                createUpdateMgiVersionCollection(toVer)
                  .finally(function () {
                    dbClose()
                  })
              })
              .catch(function (err) {
                let msg = func + ' - error returned from migration step:  ' + err
                logError(msg)
                dbClose()
              })
          }
        })
        .catch(function (err) {
          logError(func + ' - error obtaining current db version information. err: ' + err)
          dbClose()
        })
    })
    .catch(function (err) {
      logError(func + ' - error loading schemas. err: ' + err)
      dbClose()
    })
}

migrate()
/*
   1.3.0 -> 1.3.0-nm-sp-dev-1
      add datasets collection that breaks out the citation section of the XMLs into specific records
        There is a one-many relationship between a datasets document and xmldata records
        The xmldata document will be updated to contain a reference to the associated dataset doc (dsSeq)
        The title of each xmldata doc implicitly references the dsSeq as well
        The reason for adding the datasets collection was to have a way to group xmls together and provide a consistent
           way to add new groups i.e. new papers, such that it would be possible to (help) generate the correct title for
           each xml. Note that there is still an issue with the sample component of the title
      added mgi_version collection to contain a single record with the version information for later migrations
        Any mgi db without an mgi_version collection is assumed to be v 1.3.0
      Updated the template_version collection to contain a currentRef ObjectID field (same value as current, but
        ObjectId intead of string) to allow for a Mongoose reference relationship to the template collection
        so that obtaining current versions of templates also yields the XSD without having to make another DB call
      Added xml_str field to most xmldata (non-compliant titles are skipped) docs by parsing content and
        generating an xml string. The new editor uses the string version of the XML and not the BSON object
      Added dsSeq field (per above) to xmldata docs
      added curateState and entityState fields to xmldata docs to help drive curation workflows and xml entity
        processing (validation, whyis ingest, etc)
  1.3.0-mn-sp-dev-1 -> 1.3.0-nm-sp-dev-2
     update xmls so that entity values do not contain invalid characters like & without encoding
 */
