/*
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
const validateXml = require('xmllint').validateXML

// const validSchemas = [ // really should come from the database, but no time now TODO
// //  {name: 'PNC_schema_060718.xsd', id: '5b1ebeb9e74a1d61fc43654d'},
// //  {name: 'PNC_schema_072618.xsd', id: '5b6da9b0e74a1d213baf41cb'},
//   {name: 'PNC_schema_081218.xsd', id: '5b71eb00e74a1d7c81bec6c7'}
// ]

let schemaInfo = [
]

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

const versionOriginal = { // NanoMine Django RC1 or thereabouts i.e. the data currently in production as of 2018/09/10
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
let dbVer = versionOriginal
let versionColNm = 'mgi_version'
let datasetColNm = 'dataset'
let xmldataColNm = 'xmdata'

// const mongoUri = 'mongodb://mgi:mydevmongoapipw@localhost:27017/mgi'
const dbName = 'mgi'
const mongoUrl = 'mongodb://localhost:27017/' + dbName
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
        if (v !== '#text') { xml += (' '.repeat(indent) + '<' + v + '>') }
        j2x(o[v], o, indent + indentIncr)
        if (v !== '#text') { xml += (' '.repeat(indent) + '</' + v + '>') }
      } else {
        jArray2x(v, o[v], indent + indentIncr)
      }
    })
  } else {
    xml += (' '.repeat(indent) + o) // Element text
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
    setTimeout(function () {
      msg = ' id: ' + id + ' using xml of length: ' + xml.length
      let xmldata = db.collection('xmldata')
      xmldata.findOneAndUpdate({'_id': {$eq: id}},
        {$set: {'xml_str': xml, // write xml
          'schemaId': schemaId, // create schemaId field using schema
          'dsSeq': parseInt(dsSeq), // Sequence of the associated dataset
          'entityState': 'EditedValid', // initial entity state shows validated by editor,  requiring back-end validation
          'curateState': 'Edit'
        }}, {}, function (err, result) {
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
function updateOrAddDatasetForNmSpDev1 (dsrec) {
  let p = new Promise(function (resolve, reject) {
    setTimeout(function () {
      logInfo('updating dsrec seq: ' + dsrec.seq)
      resolve()
      msg = ' seq: ' + dsrec.seq
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
        $set: {'majorVer': majorVer,
          'minorVer': minorVer,
          'patchVer': patchVer,
          'labelVer': labelVer}}, {upsert: true}, function (err, result) {
        if (err) {
          logError(func + ' - error updating mgi_version collection. Error: ' + err)
          reject(err)
        } else {
          logError(func + ' - Successfully updated mgi_version collection. Result: ' + result)
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
              if (datasets[seq] === undefined && isValidSchema) {
                let ds = _.get(json, 'PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields', null)
                if (ds !== null) {
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
                    'language': ds.Language
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
                  logDebug('created dataset reference - seq: ' + seq + ' - ' + inspect(datasets[seq]) + '\n\n')
                } else {
                  logInfo('cannot find key path in BSON object to build dataset info: ' + seq + ' for schema: ' + xmldoc.schema + ' title: ' + xmldoc.title)
                }
              }
              logDebug(inspect(json))
              xml = xmlHeader // initialize xml
              logDebug(j2x(json, null, indent))
              let xsd = getSchemaInfo(xmldoc.schema)
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
              resolve(msg)
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
  { 'from': versionOriginal, 'to': versionSpDev1, 'use': migrateToNmSpDev1 }
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
    db.listCollections({'name': 'version'}).hasNext()
      .then(function (hasVersionCol) { // boolean value true or false
        dbVer = {}
        if (hasVersionCol === true) {
          logError(func + ' cannot handle reading version collection yet.') // TODO handle reading version colection
          reject(false)
        } else {
          dbVer = versionOriginal
          resolve(dbVer)
        }
        // msg = func + ' - db.collections.then handler'
        // logDebug(msg)
        // dbCollections.forEach(function (v) {
        //   // logDebug(inspect(v))
        //   try {
        //     if (v.s.name === 'version') {
        //       dbVer = {}
        //       // msg = func + ' - calling findOne()'
        //       // logDebug(msg)
        //       v.findOne({})
        //         .then(function (r) {
        //           dbVer.majorVer = r.majorVer
        //           dbVer.minorVer = r.minorVer
        //           dbVer.patchVer = r.patchVer
        //           dbVer.labelVer = r.labelVer
        //           msg = func + ' - found version info in db. Setting version to: ' + JSON.stringify(dbVer)
        //           logDebug(msg)
        //           // no resolve here. let the end of loop check handle it
        //         })
        //         .catch(function (err) {
        //           msg = func + ' - unable to no version info exists in db. Setting default version.'
        //           dbVer = versionOriginal
        //           logDebug(msg)
        //           // no resolve/reject here. let the end of loop check handle it
        //         })
        //       // } else {
        //       //   logDebug(v.s.name + ' collection name is not version')
        //     }
        //   } catch (err) {
        //     msg = func + ' - error checking collection names. err: ' + err
        //     logError(msg)
        //     dbVer = null
        //     reject(msg)
        //   }
        // })
        // if (dbVer !== null) {
        //   logInfo('dbVer is: ' + JSON.stringify(dbVer))
        //   resolve(dbVer)
        // }
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
          let cur = xsdVersions.find({}).forEach((xsdVer) => { // iterator callback
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
          } else {
            let fromVer = migrationTable[idx]['from']
            let toVer = migrationTable[idx]['to']
            logDebug(func + ' - getCurrentDbVersion.then idx: ' + idx + ' - fromVer: ' + JSON.stringify(fromVer) + ' toVer: ' + JSON.stringify(toVer))
            migrationTable[idx]['use'].apply(null, [fromVer, toVer])
              .then(function (v) {
                createDatasetsCollection()
                  .finally(function () { // node --harmony-promise-finally migrate.js
                    console.log('createDatasetCollection finally function called')
                    updateOrAddDatasets() // writePromises already has xmldata updates, be sure to call this before waiting on promises.all
                    Promise.all(writePromises)
                      .then(function () {
                        logInfo(' migration result: ' + v)
                      })
                      .catch(function (err) {
                        logInfo('Failure waiting for all updates. Error: ' + err)
                      })
                      .finally(function () {
                        // set the version into the version collection
                        createUpdateMgiVersionCollection(toVer)
                          .finally(function () {
                            dbClose()
                          })
                      })
                  })
                  .catch(function (err) {
                    let msg = func + ' - error returned from migration step:  ' + err
                    logError(msg)
                    dbClose()
                  })
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
