/* NanoMine REST server */
const axios = require('axios')
const util = require('util')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const FormData = require('form-data')
const config = require('config').get('nanomine')
const winston = require('winston')
const moment = require('moment')
const datauri = require('data-uri-to-buffer')
const qs = require('qs')
const fs = require('fs')
const mongoose = require('mongoose')
const templateFiller = require('es6-dynamic-template')

// TODO calling next(err) results in error page rather than error code in json

const ObjectId = mongoose.Types.ObjectId

let logger = configureLogger()
logger.info('NanoMine REST server version ' + config.version + ' starting')

let nmWebFilesRoot = process.env['NM_WEBFILES_ROOT']
let nmJobDataDir = process.env['NM_JOB_DATA']

try {
  fs.mkdirSync(nmJobDataDir) // Sync used during startup
} catch (err) {
  logger.error('mkdir nmJobDataDir failed: ' + err)
}

let app = express()
app.use(cookieParser())

let dataSizeLimit = config.rest.dataSizeLimit // probably needs to be at least 50mb
app.use(bodyParser.raw({'limit': dataSizeLimit}))
app.use(bodyParser.json({'limit': dataSizeLimit}))

app.use('/files', express.static(nmWebFilesRoot, {
  dotfiles: 'ignore',
  index: false,
  redirect: false
}))

let shortUUID = require('short-uuid')() // https://github.com/oculus42/short-uuid (npm i --save short-uuid)
function inspect (theObj) {
  return util.inspect(theObj, {showHidden: true, depth: 2})
}

let db = mongoose.connection
let dbUri = process.env['NM_MONGO_URI']
mongoose.connect(dbUri, {keepAlive: true, keepAliveInitialDelay: 300000})
db.on('error', function (err) {
  logger.error('db error: ' + err)
})
db.once('open', function () {
  logger.info('database opened successfully.')
})

/*
Mongoose schemas and models -- begin
  TODO move to separate module
  Schemas/Models:
    version
    dataset
    xmldata
    template (the xsd schema) -- we'll call it xsdSchema internally instead of template
    template_version (tracker for template versions and deactivated templates)
*/

// let versionSchema = new mongoose.Schema({
//   major: Number, /* SEMVER versioning for the overall MGI db schema represented by the db. NM base was MDCS 1.3 */
//   minor: Number, /* http://semver.org */
//   patch: Number,
//   label: String /* major.minor.patch-label when formatted */
// }, {collection: 'version'})

// let datasetSchema = new mongoose.Schema({
//   seq: Number, /* Unique index constraint, but not forced to monotonic -- required field (set by create) */
//   title: String, /* Name of study, book, article, paper, etc -- required field */
//   authors: [String], /* Authors, first is primary */
//   type: String, /* study, book, article, paper -- fixed set -- required field */
//   doi: String /* DOI or other unique assigned handle -- can be missing or null */
// }, {collection: 'dataset'})

let xmlDataSchema = new mongoose.Schema({ // maps the mongo xmldata collection
  schemaId: String, /* !!! NOTE: had to rename 'schema' field name in restored data from MDCS to schemaId because of mongoose name conflict
                       To convert the field after restore from MDCS, use mongocli which loads nanomongo.js. At the mongo command line
                       type 'swizzleForMongoose()' to change all the xmldata document fields named schema to schemaId.
                    */
  title: String,
  content: mongoose.Schema.Types.Mixed, /* !!! NOTE: MDCS stores the XML content as a BSON object parsed into the individual fields.
                      Moving forward NanoMine will not use this approach, so the data was downloaded as text via the MDCS rest interface
                      as a string and re-loaded into the xml_str string.  This is another reason why a dump of MDCS mongo will not restore
                      and run with the new app directly. bluedevil-oit/nanomine-tools project has code to update the field. */
  xml_str: String,
  iduser: String, /* numeric reference to user (probably in sqlite) */
  ispublished: Boolean /* In the current db, these are all false */
}, {collection: 'xmldata'})

let xsdSchema = new mongoose.Schema({ // maps the mongo template collection
  title: String, // the name of the schema does not need to be unique
  filename: String, // not unique and is like 'PNC_schema_112916.xsd'
  content: String, // definitely a string containing the XSD file
  templateVersion: String, // string _id of the template version info in template_version (xsdVersionSchema)
  version: Number, // relative version number for this schema/template within the xsdVersionSchema with templateVersion id
  hash: String, // MDCS calculates MD5 hash of schema, we'll do something similar. Data restores from MDCS will be OK, but not portable back into MDCS
  dependencies: [], // Optional and will not be used
  exporters: [], // optional and will not be used
  XSLTFiles: [] // optional and will not be used
}, {collection: 'template'})

let xsdVersionSchema = new mongoose.Schema({ // maps the mongo template_version collection
  versions: [String], // Array of xsdSchema ids as stings
  deletedVersions: [String], // deleted versions array of xsdSchema ids
  nbVersions: Number, // current count of versions
  isDeleted: Boolean, // this schema is not to be shown/used at all and all xmls based on schema are deprecated
  current: String // current schema version id
}, {collection: 'template_version'})

// let Dataset = mongoose.model('dataset', datasetSchema)
let XmlData = mongoose.model('xmlData', xmlDataSchema)
let XsdSchema = mongoose.model('xsdData', xsdSchema)
let XsdVersionSchema = mongoose.model('xsdVersionData', xsdVersionSchema)

// Sniff test for xmlData schema access via model
// XmlData.findById('58587c6fe74a1d205f4ea5cf').exec(function (err, xmlRec) {
//   if (err) {
//     console.log('error looking up known object in database.')
//   } else {
//     console.log(xmlRec._id + ' schemaId: ' + xmlRec.schemaId)
//   }
// })

/* Mongoose schemas and models -- end */

/* rest services related to XMLs and Schemas -- begin */

function validQueryParam (p) {
  let rv = false
  if (p && p !== null && p.length > 0) {
    rv = true
  }
  return rv
}

app.get('/templates/select/all', function (req, res) { // it's preferable to read only the current non deleted schemas rather than all
  let jsonResp = {'error': null, 'data': null}
  XsdSchema.find().exec(function (err, schemas) {
    if (err) {
      jsonResp.error = err
      res.status(400).json(jsonResp)
    } else if (schemas == null || schemas.length <= 0) {
      jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
      res.status(404).json(jsonResp)
    } else {
      jsonResp.data = schemas
      res.json(jsonResp)
    }
  })
})

app.get('/templates/versions/select/all', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  XsdVersionSchema.find().exec(function (err, versions) {
    if (err) {
      jsonResp.error = err
      res.status(400).json(jsonResp)
    } else if (versions == null || versions.length <= 0) {
      jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
      res.status(404).json(jsonResp)
    } else {
      jsonResp.data = versions
      res.json(jsonResp)
    }
  })
})

app.get('/templates/versions/select/allactive', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  XsdVersionSchema.find({isDeleted: {$eq: false}}).exec(function (err, versions) {
    if (err) {
      jsonResp.error = err
      res.status(400).json(jsonResp)
    } else if (versions == null || versions.length <= 0) {
      jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
      res.status(404).json(jsonResp)
    } else {
      jsonResp.data = versions
      res.json(jsonResp)
    }
  })
})

app.get('/templates/select', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  let id = req.query.id
  // for all qfields except id - which is a single record query on its own,
  //   attempt to build the query in a loop
  let qfields = [{'filename': req.query.filename}, {'content': req.query.content}, {'title': req.query.title},
    {'version': req.query.version}, {'templateVersion': req.query.templateVersion}, {'hash': req.query.hash}]
  // not supporting data format at this time -- always returns xml for now
  let dataformat = req.query.dataformat
  let query = {}
  if (validQueryParam(id)) {
    XsdSchema.findById(id).exec(function (err, xsdRec) {
      if (err) {
        jsonResp.error = err
        res.status(400).json(jsonResp)
      } else if (xsdRec == null) {
        jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
        res.status(404).json(jsonResp)
      } else {
        jsonResp.data = xsdRec
        console.log(xsdRec._id)
        res.json(jsonResp)
      }
    })
  } else {
    let qcomponents = [] // query components
    qfields.forEach(function (v) { /* Unfortunately, this is a bit hard to read, but it's better than repeating the code 6 times.
                                    Probably needs factoring though
                                    */
      let qfld = Object.keys(v)[0]
      let qval = v[qfld]
      if (validQueryParam(qval)) {
        if (qval.slice(0, 1) === '/' && qval.slice(-1) === '/') {
          qval = qval.replace(/(^[/]|[/]$)/g, '')
          let tmp = {}
          tmp[qfld] = { '$regex': qval }
          qcomponents.push(tmp)
        } else {
          let tmp = {}
          tmp[qfld] = { '$eq': qval }
          qcomponents.push(tmp)
        }
      }
    })
    if (qcomponents.length > 1) {
      query = {
        '$and': qcomponents
      }
    } else {
      query = qcomponents[0]
    }
    XsdSchema.find(query).exec(function (err, xsdRecs) {
      if (err) {
        jsonResp.error = err
        logger.info('' + req.path + ' query=' + JSON.stringify(query) + ' returned: ' + JSON.stringify(jsonResp))
        res.status(400).json(jsonResp)
      } else if (xsdRecs == null || xsdRecs.length < 1) {
        jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
        logger.info('' + req.path + ' query=' + JSON.stringify(query) + ' returned: ' + JSON.stringify(jsonResp))
        res.status(404).json(jsonResp)
      } else {
        jsonResp.data = xsdRecs
        logger.info('' + req.path + ' query=' + JSON.stringify(query) + ' returned: ' + jsonResp.data.length + ' records.')
        res.json(jsonResp)
      }
    })
  }
})

app.get('/explore/select', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  let id = req.query.id
  let schema = req.query.schema
  let title = req.query.title
  // not supporting data format at this time -- always returns xml for now
  let dataformat = req.query.dataformat
  let query = {}
  if (validQueryParam(id)) {
    XmlData.findById(id).exec(function (err, xmlRec) {
      if (err) {
        jsonResp.error = err
        res.status(400).json(jsonResp)
      } else if (xmlRec == null) {
        jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
        res.status(404).json(jsonResp)
      } else {
        jsonResp.data = {
          _id: xmlRec._id,
          schema: xmlRec.schemaId,
          content: xmlRec.xml_str,
          title: xmlRec.title
        }
        console.log(xmlRec._id + ' schemaId: ' + xmlRec.schemaId)
        res.json(jsonResp)
      }
    })
  } else {
    let titleQuery = null
    let schemaQuery = null
    if (validQueryParam(title)) {
      if (title.slice(0, 1) === '/' && title.slice(-1) === '/') {
        title = title.replace(/(^[/]|[/]$)/g, '')
        titleQuery = {'title': { '$regex': title }}
      } else {
        titleQuery = {'title': {'$eq': title}}
      }
    }
    if (validQueryParam(schema)) {
      if (schema.slice(0, 1) === '/' && schema.slice(-1) === '/') {
        schema = schema.replace(/(^[/]|[/]$)/g, '')
        schemaQuery = {'schemaId': { '$regex': schema }}
      } else {
        schemaQuery = {'schemaId': {'$eq': schema}}
      }
    }
    if (titleQuery && schemaQuery) {
      query = {
        '$and': [titleQuery, schemaQuery]
      }
    } else if (titleQuery) {
      query = titleQuery
    } else {
      query = schemaQuery
    }
    XmlData.find(query, '_id schemaId title xml_str').exec(function (err, xmlRecs) {
      if (err) {
        jsonResp.error = err
        logger.info('/explore/select query=' + JSON.stringify(query) + ' returned: ' + JSON.stringify(jsonResp))
        res.status(400).json(jsonResp)
      } else if (xmlRecs == null || xmlRecs.length < 1) {
        jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
        logger.info('/explore/select query=' + JSON.stringify(query) + ' returned: ' + JSON.stringify(jsonResp))
        res.status(404).json(jsonResp)
      } else {
        jsonResp.data = [] // TODO fix db so the expensive swizzling is not necessary
        xmlRecs.forEach(function (v) { // swizzle the output
          jsonResp.data.push({'_id': v._id, 'schema': v.schemaId, 'title': v.title, 'content': v.xml_str })
        })
        logger.info('/explore/select query=' + JSON.stringify(query) + ' returned: ' + jsonResp.data.length + ' records.')
        res.json(jsonResp)
      }
    })
  }
})

app.post('/curate', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  let title = req.body.title
  let schema = req.body.schema
  let content = req.body.content
  let editorStatus = req.body.editorStatus // editedFailedVerify, editedPassedVerify (not trusted), triggers system validation
  // ensure schema id exists
  // set validationState to value specified by editor.  Background task will validate and update db status.
  res.json(jsonResp)
})
/* rest services related to XMLs and Schemas -- end */

/* Job related rest services */
function updateJobStatus (statusFilePath, newStatus) {
  let statusFileName = statusFilePath + '/' + 'job_status.json'
  let statusObj = {
    'job_status': newStatus,
    'update_dttm': Date()
  }
  fs.writeFile(statusFileName, JSON.stringify(statusObj), {'encoding': 'utf8'}, function (err) {
    if (err) {
      logger.error('error creating job_status file: ' + statusFileName + ' err: ' + err)
    }
  }) // if it fails, it's OK
}
app.post('/jobcreate', function (req, res, next) {
  let jsonResp = {'error': null, 'data': null}
  let jobType = req.body.jobType
  let jobParams = req.body.jobParameters
  let jobId = jobType + '-' + shortUUID.new()
  let jobDir = nmJobDataDir + '/' + jobId
  let paramFileName = jobDir + '/' + 'job_parameters.json'
  logger.debug('job parameters: ' + JSON.stringify(jobParams))
  fs.mkdir(jobDir, function (err, data) {
    if (err) {
      logger.error('mkdir nmJobDataDir failed: ' + err)
      next(err)
    } else {
      fs.writeFile(paramFileName, JSON.stringify(jobParams), {'encoding': 'utf8'}, function (err, data) {
        if (err) {
          updateJobStatus(jobDir, 'preCreateError')
          next(err)
        } else {
          updateJobStatus(jobDir, 'created')
          jsonResp.data = {'jobId': jobId}
          res.json(jsonResp)
        }
      })
    }
  })
})

app.post('/jobpostfile', function (req, res, next) {
  let jsonResp = {'error': null, 'data': null}
  let jobId = req.body.jobId
  let jobType = req.body.jobType
  let jobFileName = req.body.jobFileInfo.fileName
  let jobFileUri = req.body.jobFileInfo.dataUri
  let jobDir = nmJobDataDir + '/' + jobId
  let outputName = jobDir + '/' + jobFileName
  // TODO decode dataurl of file into buffer and write it to the job's directory in the Apache tree
  //   It would be better to stream the file, but for now, just extract to buffer and write to file
  var buffer = datauri(jobFileUri)
  console.log('Job type: ' + jobType + ' file mime type: ' + buffer.fullType)
  let rcode = 201
  fs.writeFile(outputName, buffer, {'encoding': 'utf8'}, function (err, data) {
    if (err) {
      updateJobStatus(jobDir, 'postFileError' + '-' + outputName)
      logger.error('/jobpostfile write job file error - file: ' + outputName + ' err: ' + err)
      next(err)
    } else {
      updateJobStatus(jobDir, 'filePosted-' + outputName)
      res.status(rcode).json(jsonResp)
    }
  })
})

app.post('/jobsubmit', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  let jobId = req.body.jobId
  let jobType = req.body.jobType
  let jobDir = nmJobDataDir + '/' + jobId

  // execute the configured job in the background
  //   will do better later. At least client code on each side of the interface won't change
  let pgms = config.jobtypes
  let pgm = null
  let pgmdir = null
  pgms.forEach(function (v) {
    if (v.jobtype === jobType) {
      pgm = v.pgmname
      pgmdir = v.pgmdir
    }
  })
  if (pgm != null && pgmdir) {
    let jobPid = null
    // TODO track child status and output with events and then update job status, but for now, just kick it off
    let child = require('child_process').spawn(pgm, [jobType, jobId, jobDir], {'cwd': pgmdir})
    jobPid = child.pid
    updateJobStatus(jobDir, {'status': 'submitted', 'pid': jobPid})
    jsonResp.data = {'jobPid': jobPid}
    res.json(jsonResp)
  } else {
    updateJobStatus(jobDir, 'failed-no-pgm-defined')
    jsonResp.error = 'job type has program not defined'
    res.status(400).json(jsonResp)
  }
})
/* end job related rest services */

/* email related rest services - begin */
app.post('/jobemail', function (req, res, next) { // bearer auth
  let jsonResp = {'error':null, 'data': null}
  let jobtype = req.body.jobtype
  let jobid = req.body.jobid
  let emailtemplate = req.body.emailtemplatename
  let emailvars = req.body.emailvars
  emailvars.jobtype = jobtype
  emailvars.jobid = jobid
  // read the email template, merge with email vars

  fs.readFile('config/emailtemplates/' + jobtype + '/' + emailtemplate + '.etf', function (err, etfText) {
    if(err) {
      jsonResp.error = {'statusCode': 400, 'statusText': 'unable to find template file.'}
      return res.status(400).json(jsonResp)
    }
    let filled = null
    try {
      filled = templateFiller(etfText, emailvars)
    } catch(fillerr) {
      logger.error('error occurred filling out email template. jobtype: ' + jobtype + ' jobid: ' + jobid + ' template: ' + emailtemplate + ' vars: ' + JSON.stringify(emailvars))
    }
    logger.info(filled)
    return res.json(jsonResp)
  })
})
/* email related rest services - end */

/* Visualization related requests - begin */
app.get('/visualization/fillerPropertyList', function (req, res) {
  let query = `
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
select distinct ?fillerProperty
where {
    ?filler sio:hasRole [a ns:Filler].
    ?filler sio:hasAttribute ?fillerAttribute .
    ?fillerAttribute a ?fillerProperty .
} order by ?fillerProperty  
`
  return postSparql(req.path, query, req, res)
})

app.get('/visualization/materialPropertyList', function (req, res) {
  let query = `
prefix sio:<http://semanticscience.org/resource/>
  prefix ns:<http://nanomine.tw.rpi.edu/ns/>
  select distinct ?materialProperty
  where {
     ?sample sio:hasComponentPart ?filler . 
     ?sample sio:hasAttribute ?sampleAttribute .
     ?sampleAttribute a ?materialProperty .
     ?filler sio:hasRole [a ns:Filler].
} order by ?materialProperty
`
  return postSparql(req.path, query, req, res)
})

app.get('/visualization/materialPropertiesForFillerProperty', function (req, res) {
  let fillerPropertyUri = req.query.fillerPropertyUri
  let query = `
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
select distinct ?materialProperty (count(?materialProperty) as ?count)
   where {
      ?sample sio:hasComponentPart ?filler .
      ?sample sio:hasAttribute ?sampleAttribute .
      ?sampleAttribute a ?materialProperty .
      ?filler sio:hasRole [a ns:Filler].
      ?filler sio:hasAttribute [a <${fillerPropertyUri}>]. 
   }
group by ?materialProperty order by desc(?count)
`
  return postSparql(req.path, query, req, res)
})
app.get('/visualization/fillerPropertyMaterialPropertyGraphData', function (req, res) {
  let fillerPropertyUri = req.query.fillerPropertyUri
  let materialPropertyUri = req.query.materialPropertyUri
  let query = `
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/> 
prefix np: <http://www.nanopub.org/nschema#> 
prefix dcterms: <http://purl.org/dc/terms/> 
select distinct ?sample ?x ?y ?xUnit ?yUnit ?matrixPolymer ?fillerPolymer ?doi ?title 
where { 
  ?nanopub np:hasAssertion ?ag. 
  graph ?ag { 
    ?sample sio:hasAttribute ?sampleAttribute .
    ?sampleAttribute a <${materialPropertyUri}> .
    ?sampleAttribute sio:hasValue ?y.
    optional{?sampleAttribute sio:hasUnit ?yUnit.}
    ?sample sio:hasComponentPart ?matrix .
    ?sample sio:hasComponentPart ?filler .
    ?matrix a ?matrixPolymer .
    ?filler a ?fillerPolymer .
    ?matrix sio:hasRole [a ns:Matrix].
    ?filler sio:hasRole [a ns:Filler].
    ?filler sio:hasAttribute ?fillerAttribute .
    ?fillerAttribute a <${fillerPropertyUri}> .
    ?fillerAttribute sio:hasValue ?x .
    optional{?fillerAttribute sio:hasUnit ?xUnit.}
  } 
  ?nanopub np:hasProvenance ?pg. 
  graph ?pg { 
    ?doi dcterms:isPartOf ?journal. 
    ?doi dcterms:title ?title. 
  } 
}
  `
  return postSparql(req.path, query, req, res)
})

/* Visualization related requests - end */

app.get('/', function (req, res) {
  let ID = 'TestData_' + shortUUID.new()
  let query = 'a query'
  let xml = `
    <PolymerNanocomposite>
     <ID>${ID}</ID>
    </PolymerNanocomposite>
    `
  xml = xml.trim()

  let jsonData = {
    xml: xml,
    xmlLen: xml.length,
    query: query,
    queryLen: query.length

  }
  console.log('session cookie: ' + req.cookies['session'])
  res.json(jsonData)
})

function postSparql (callerpath, query, req, res) {
  let url = '/sparql'
  let jsonResp = {'error': null, 'data': null}
  let data = qs.stringify({'query': query.trim().replace(/[\n]/g, ' ')})
  return axios({
    'method': 'post',
    'url': url,
    'data': data
    // 'headers': {'Content-type': 'application/json'},
  })
    .then(function (response) {
      jsonResp = response.data
      console.log('' + callerpath + ' data: ' + inspect(response))
      res.json(jsonResp)
    })
    .catch(function (err) {
      console.log('' + callerpath + ' error: ' + inspect(err))
      jsonResp.error = err.message
      jsonResp.data = err.data
      res.status(400).json(jsonResp)
    })
}
function postSparql2 (callerpath, query, req, res, cb) {
  let url = '/sparql'
  // let jsonResp = {'error': null, 'data': null}
  let data = qs.stringify({'query': query.trim().replace(/[\n]/g, ' ')})
  return axios({
    'method': 'post',
    'url': url,
    'data': data
    // 'headers': {'Content-type': 'application/json'},
  })
    .then(function (response) {
      // jsonResp = response.data
      console.log('' + callerpath + ' data: ' + inspect(response))
      // res.json(jsonResp)
      cb(null, response)
    })
    .catch(function (err) {
      console.log('' + callerpath + ' error: ' + inspect(err))
      // jsonResp.error = err.message
      // jsonResp.data = err.data
      // res.status(400).json(jsonResp)
      cb(err, null)
    })
}

app.post('/xml', function (req, res) { // initial testing of post xml file to nanopub -- ISSUE: result redirects to page with no JSON error
  let jsonResp = {'error': null, 'data': null}
  /*
      expects:
        {
          "filetype": "sample", // eventually, more types will be supported. For now, it's just sample
          "filename": "{sample_file_name}" // like L217_S1_Ash_2002.xml
          "xml": "XML data as string"
        }
  */
  let url = '/about?view=view&uri=http://localhost/'
  // let url = '/about?view=view&uri=/'
  let theType = req.body.filetype
  let theName = req.body.filename

  let form = new FormData()
  let buffer = Buffer.from(req.body.xml)
  form.append('upload_type', 'http://purl.org/net/provenance/ns#File')
  form.append('contributor', 'erik')
  form.append('file', buffer, {
    'filename': theName,
    'contentType': 'text/xml',
    'knownLength': req.body.xml.length
  })
  let contentLen = form.getLengthSync()
  console.log('session cookie: ' + req.cookies['session'])
  let cookieHeader = 'session=' + req.cookies['session']
  let headers = form.getHeaders() // {'Content-Type': form.getHeaders()['content-type']}
  if (cookieHeader) {
    headers.Cookie = cookieHeader
  }
  headers['Accept'] = 'text/html,application/xhtml+xml,application/xml,application/json, text/plain, */*'
  headers['Content-Length'] = contentLen
  url = url + theType + '/' + req.body.filename.replace(/['_']/g, '-').replace(/.xml$/, '').toLowerCase()
  console.log('request info - outbound post url: ' + url + '  form data: ' + inspect(form))
  if (theType && typeof theType === 'string' && theName && typeof theName === 'string') {
    theName = theName.replace(/['_']/g, '-')
    return axios({
      'method': 'post',
      'url': url,
      'headers': headers,
      'data': form
    })
      .then(function (resp) {
        console.log('post to url: ' + url + ' did not throw an exception')
        console.log('resp: ' + inspect(resp))
        jsonResp.data = {}
        res.json(jsonResp)
      })
      .catch(function (err) {
        console.log('post to url: ' + url + ' DID throw exception -  err: ' + inspect(err))
        jsonResp.error = err.message
        res.status(err.response.status).json(jsonResp)
      })
  } else {
    jsonResp.error = 'type and name parameters required. Valid types are: sample. A valid name can be any string'
    res.status(400).json(jsonResp)
  }
})

app.get('/test1', function (req, res) { // NOTE: Tg type obtained from material property cache map by name, Mass Fraction from filler property map
  let query = `
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample ?control ?x ?y ?doi ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/FrequencyHz>; sio:hasValue ?x].
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/DielectricLossTangent>; sio:hasValue ?y].
      ?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/PolyDimethylSiloxane>] .
      optional {?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/GrapheneOxide>].}
      ?control sio:hasRole [a sio:ControlRole; sio:inRelationTo ?sample].
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
     ?doi dcterms:isPartOf ?journal.
     ?doi dcterms:title ?title.
  }
}
`
  return postSparql(req.path, query, req, res)
})
app.get('/sample/:id', function (req, res) {
  let sampleID = req.params.id
  let url = '/sample/' + sampleID
  let jsonResp = {'error': null, 'data': null}
  return axios({
    'method': 'get',
    'url': url
    // 'headers': {'Content-type': 'application/json'},
  })
    .then(function (response) {
      // jsonResp = response.data
      console.log('' + req.path + ' data: ' + inspect(response))
      // res.json(jsonResp)
      jsonResp.data = {'mimeType': 'text/xml', 'xml': response.data}
      res.json(jsonResp)
    })
    .catch(function (err) {
      console.log('' + res.path + ' error: ' + inspect(err))
      // jsonResp.error = err.message
      // jsonResp.data = err.data
      // res.status(400).json(jsonResp)
      jsonResp.err = err
      res.status(400).json(jsonResp)
    })
})

app.get('/samples', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  let query = `
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?nanopub
where {
  ?file a <http://purl.org/net/provenance/ns#File>.
  ?nanopub a <https://www.iana.org/assignments/media-types/text/xml>

}
`
  postSparql2(req.path, query, req, res, function cb (err, rsp) {
    if (err != null) {
      jsonResp.error = err
      res.status(400).json(jsonResp)
    } else {
      let rdata = []
      rsp.data.results.bindings.forEach(function (v) {
        let r = v.nanopub.value
        if (r.match(/['_']/) == null) { // todo xml_ingest bug creates PolymerNanocomposites with appended sub-elements so get rid of them
          rdata.push(r)
        }
      })
      jsonResp.data = rdata
      res.json(jsonResp)
    }
  })
})

app.get('/fullgraph', function (req, res) { // for initial testing and will be removed
  // get the nanopub graph
  let query = `
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?nanopub ?ag ?s ?p ?o
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
    ?s ?p ?o.
  }
}  
`
  return postSparql(req.path, query, req, res)
})

app.get('/xml/disk/:schema/:xmlfile', function (req, res) { // this entry point was for some initial testing and will be removed
  // this is for testing only
  let jsonResp = {'error': null, 'data': null}
  let fs = require('fs')
  let recs = []
  let schema = req.params.schema // '5b1ebeb9e74a1d61fc43654d'
  let xmlfile = req.params.xmlfile
  let targetDir = '/apps/nanomine/rest/data/' + schema
  let p = []
  fs.readdir(targetDir, function (err, files) {
    if (err == null) {
      files.forEach(function (v) {
        let mp = new Promise(function (resolve, reject) {
          fs.readFile(targetDir + '/' + v, {encoding: 'utf-8'}, function (err, data) {
            console.log('data: ' + data)
            if (err == null) {
              if (xmlfile && xmlfile === data.title) {
                recs.push({'title': v, 'schema': schema, '_id': shortUUID.new(), 'content': data}) // NOTE: xml ID not persisted, so it's not really useful
              }
              resolve()
            } else {
              reject(err)
            }
          })
        })
        p.push(mp)
      })
      Promise.all(p)
        .then(function () {
          /* */
          jsonResp.error = null
          jsonResp.data = recs
          res.json(recs)
        })
        .catch(function (err) {
          jsonResp.error = err
          jsonResp.data = err
          res.status(400).json(jsonResp)
        })
    } else {
      jsonResp.error = err
      jsonResp.data = err
      res.status(400).json(jsonResp)
    }
  })
})

function configureLogger () { // logger is not properly configured yet. This config is for an earlier version of Winston
  let logger = winston.createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
    transports: [
      new (winston.transports.File)({
        levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5 },
        level: config.loglevel,
        timestamps: true,
        zippedArchive: true,
        filename: config.logfilename,
        maxfiles: config.maxlogfiles,
        maxsize: config.maxlogfilesize,
        json: false,
        formatter: function (data) {
          let dt = moment().format('YYYYMMDDHHmmss')
          return (dt + ' ' + data.level + ' ' + data.message)
        }
      })
    ]
  })
  return logger
}
app.listen(3000)

/*
prefix dataset: <https://hbgd.tw.rpi.edu/dataset/>
prefix sio:     <http://semanticscience.org/resource/>
prefix chear:   <http://hadatac.org/ont/chear#>
prefix skos:    <http://www.w3.org/2004/02/skos/core#>
prefix dcterms: <http://purl.org/dc/terms/>
prefix prov:    <http://www.w3.org/ns/prov#>
prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
prefix doi:     <http://dx.doi.org/>
prefix nanomine: <http://nanomine.tw.rpi.edu/ns/>
prefix unit: <http://nanomine.tw.rpi.edu/ns/unit/>
prefix author: <http://nanomine.tw.rpi.edu/author/>
prefix publication: <http://nanomine.tw.rpi.edu/publication/>
prefix bibo: <http://purl.org/ontology/bibo/>
prefix foaf: <http://xmlns.com/foaf/0.1/>
prefix nanopub: <http://www.nanopub.org/nschema#>
prefix entry: <http://nanomine.tw.rpi.edu/entry/>
prefix sample: <http://nanomine.tw.rpi.edu/sample/>
prefix article: <http://nanomine.tw.rpi.edu/article/>
prefix compound: <http://nanomine.tw.rpi.edu/compound/>
prefix location: <http://nanomine.tw.rpi.edu/location/>
prefix lang: <http://nanomine.tw.rpi.edu/language/>
prefix void: <http://rdfs.org/ns/void#>
prefix dcat: <http://www.w3.org/ns/dcat#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>

select *
where {
 ?p ?s ?o. FILTER regex(?o,".*png.*","i")
}

select *
where {
  ?p ?s ?o FILTER ( strstarts(str(?p), "http://nanomine.tw.rpi.edu/unit/") )
}

SELECT * WHERE {
  ?s ?p ?o
  FILTER( regex(str(?p), "^(?http://nanomine.tw.rpi.edu/entry/).+"))
}
https://stackoverflow.com/questions/24180387/filtering-based-on-a-uri-in-sparql
https://stackoverflow.com/questions/19044871/exclude-results-from-dbpedia-sparql-query-based-on-uri-prefix

prefix sio: <http://semanticscience.org/resource/>
prefix ns: <http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>

select distinct ?sample ?x ?y ?xUnit ?yUnit ?matrixPolymer ?fillerPolymer ?fillerProperty ?fillerPropertyValue ?fillerPropertyUnit ?doi ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
    ?sample sio:hasAttribute ?sampleAttribute1 .
    ?sampleAttribute1 a <http://nanomine.tw.rpi.edu/ns/GlassTransitionTemperature> .
    ?sampleAttribute1 sio:hasValue ?x.
    optional { ?sampleAttribute1 sio:hasUnit ?xUnit . }
    ?sample sio:hasAttribute ?sampleAttribute2 .
    ?sampleAttribute2 a <http://nanomine.tw.rpi.edu/ns/MassFraction>.
    ?sampleAttribute2 sio:hasValue ?y.
    optional { ?sampleAttribute2 sio:hasUnit ?yUnit . }
    ?sample sio:hasComponentPart ?matrix .
    ?sample sio:hasComponentPart ?filler .
    ?matrix a ?matrixPolymer .
    ?filler a ?fillerPolymer .
    ?matrix sio:hasRole [a ns:Matrix].
    ?filler sio:hasRole [a ns:Filler].
    ?filler sio:hasAttribute ?fillerAttribute .
    ?fillerAttribute a ?fillerProperty .
    ?fillerAttribute sio:hasValue ?fillerPropertyValue .
    optional { ?fillerAttribute sio:hasUnit ?fillerPropertyUnit . }
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
    ?doi dcterms:isPartOf ?journal.
    ?doi dcterms:title ?title.
  }
}

-- simplest sparql to get sample id (#1) -- effectively gets all samples
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
  }
}

-- this adds journal name and title to sample id in #1 above (#2)
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample ?journal ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
     ?doi dcterms:isPartOf ?journal.
     ?doi dcterms:title ?title.
  }
}

--- #1 and #2 above can be extended to this (#3)
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample ?control ?x ?y ?doi ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/FrequencyHz>; sio:hasValue ?x].
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/DielectricLossTangent>; sio:hasValue ?y].
      ?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/PolyDimethylSiloxane>] .
      optional {?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/GrapheneOxide>].}
      ?control sio:hasRole [a sio:ControlRole; sio:inRelationTo ?sample].
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
     ?doi dcterms:isPartOf ?journal.
     ?doi dcterms:title ?title.
  }
}

---- Interesting one that looks for nanopubs and returns the trees (for ~ 320 samples this result is ~ 240,000 triples)
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?nanopub ?ag ?s ?p ?o
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
    ?s ?p ?o.
  }
}

--query to retire nanopubs
select ?np ?assertion ?provenance ?pubinfo where {
    hint:Query hint:optimizer "Runtime" .
    ?np (np:hasAssertion/prov:wasDerivedFrom+/^np:hasAssertion)? ?retiree.
    ?np np:hasAssertion ?assertion;
        np:hasPublicationInfo ?pubinfo;
        np:hasProvenance ?provenance.
}

--This returns sample names along with a few other things (the others look like a punt)
--    ex: correct -
--       http://nanomine.tw.rpi.edu/sample/l217-s4-ash-2002
--    ex: incorrect - not really a PolymerNanocomposite
--        http://nanomine.tw.rpi.edu/sample/l217-s4-ash-2002_nanomine-tensileloadingprofile_0
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?nanopub
where {
  ?nanopub a <http://nanomine.tw.rpi.edu/ns/PolymerNanocomposite>.
}

-- Select nanopubs of type #File that are Xmls
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?nanopub
where {
  ?file a <http://purl.org/net/provenance/ns#File>.
  ?nanopub a <https://www.iana.org/assignments/media-types/text/xml>
}

*/
