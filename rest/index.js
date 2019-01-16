/* NanoMine REST server */
// NOTE the following is ONLY for testing and reject unauthorized should not be disabled in general.
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

const axios = require('axios')
const https = require('https')
const util = require('util')
const pathModule = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const mimetypes = require('mime-types')
const FormData = require('form-data')
const config = require('config').get('nanomine')
const winston = require('winston')
const moment = require('moment')
const datauri = require('data-uri-to-buffer')
const stream = require('stream')
const qs = require('qs')
const fs = require('fs')
const mongoose = require('mongoose')
const ObjectId = require('mongodb').ObjectId
const templateFiller = require('es6-dynamic-template')
const _ = require('lodash')
const nodemailer = require('nodemailer')
const jwtBase = require('jsonwebtoken')
const jwt = require('express-jwt')
const authGate = require('express-jwt-permissions')
const shortUUID = require('short-uuid')() // https://github.com/oculus42/short-uuid (npm i --save short-uuid)
const groupMgr = require('./modules/groupMgr').groupmgr
const s2a = require('stream-to-array')
// const session = require('cookie-session')

// TODO calling next(err) results in error page rather than error code in json

// TODO runAsUser in jwt if possible

// TODO datasets with xml_data records where no xml_data records have been converted to latest schema creates an issue that searching by
//    dataset id can result in a query with no records for xml_data if only looking for those with latest schemaid.
//    Work-around is to mark datasets with a flag - 'latestSchema' and use that to filter dataset lists.
//      Will need to keep the latestSchema updated when schemas are added and xml_data records are converted which will
//      require that dataset evaluation occur as each record is converted to the new schema and invalidation of latestSchema
//      occurs across the board for all xml_data records until they're converted. This probably means that all records being brought
//      forward should probably be done offline and done enmasse.

// const ObjectId = mongoose.Types.ObjectId

let logger = configureLogger()
logger.info('NanoMine REST server version ' + config.version + ' starting')

let datasetBucketName = 'curateinput'

let sendEmails = (process.env['NM_SMTP_TEST'] !== 'true')
let emailHost = process.env['NM_SMTP_SERVER']
let emailPort = process.env['NM_SMTP_PORT']
let emailUser = process.env['NM_SMTP_AUTH_USER']
let emailPwd = process.env['NM_SMTP_AUTH_PWD']
let emailTestAddr = process.env['NM_SMTP_TEST_ADDR']
let emailAdminAddr = process.env['NM_SMTP_ADMIN_ADDR']
let nmWebFilesRoot = process.env['NM_WEBFILES_ROOT']
let nmWebBaseUri = process.env['NM_WEB_BASE_URI']
let nmJobDataDir = process.env['NM_JOB_DATA']
let nmLocalRestBase = process.env['NM_LOCAL_REST_BASE']
let nmAuthUserHeader = process.env['NM_AUTH_USER_HEADER']
let nmAuthGivenNameHeader = process.env['NM_AUTH_GIVEN_NAME_HEADER']
let nmAuthDisplayNameHeader = process.env['NM_AUTH_DISPLAYNAME_HEADER']
let nmAuthSurNameHeader = process.env['NM_AUTH_SURNAME_HEADER']
let nmAuthAnonUserId = process.env['NM_AUTH_ANON_USER_ID']

let nmAuthEmailHeader = process.env['NM_AUTH_EMAIL_HEADER']
let nmAuthSessionExpirationHeader = process.env['NM_AUTH_SESSION_EXPIRATION_HEADER']
let nmAuthSecret = process.env['NM_AUTH_SECRET']
let nmAuthSystemToken = process.env['NM_AUTH_SYSTEM_TOKEN']
// let nmSessionSecret = process.env['NM_SESSION_SECRET']
// let nmAuthEnabled = process.env['NM_AUTH_ENABLED'].toLowerCase() === 'yes'
let nmAuthType = process.env['NM_AUTH_TYPE']
let nmAuthTestUser = process.env['NM_AUTH_TEST_USER']
let nmAuthAdminGroupName = process.env['NM_AUTH_ADMIN_GROUP_NAME']
let nmAuthLogoutUrl = process.env['NM_AUTH_LOGOUT_URL']

let APIACCESS_APITOKEN_PART = 0
let APIACCESS_REFRESHTOKEN_PART = 1
let APIACCESS_ACCESSTOKEN_PART = 2
let APIACCESS_EXPIRATION_PART = 3

let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
  host: 'localhost',
  port: '443',
  // path: '/',
  path: '/sparql',
  rejectUnauthorized: false
}
let httpsAgent = new https.Agent(httpsAgentOptions)

let smtpTransport = null
let transportParams = {
  'port': emailPort,
  'host': emailHost,
  'secure': false,
  'auth': {
    'user': emailUser,
    'pass': emailPwd
  },
  'opportunisticTLS': true
}
if (!emailUser || !emailPwd || emailUser.length === 0 || emailPwd.length === 0) {
  logger.error('WARNING: smtp login is not set. Login to SMTP will fail if user credentials are required.')
  delete transportParams.auth
}
if (sendEmails) {
  smtpTransport = nodemailer.createTransport(transportParams)
}

function inspect (theObj) {
  return util.inspect(theObj, {showHidden: true, depth: 5})
}

try {
  fs.mkdirSync(nmWebFilesRoot) // Sync used during startup
} catch (err) {
  logger.error('mkdir nmWebFilesRoot failed: ' + err)
  logger.error('NOTE: if the error above is EXISTS, the error can be ignored.')
}

try {
  fs.mkdirSync(nmJobDataDir) // Sync used during startup
} catch (err) {
  logger.error('mkdir nmJobDataDir failed: ' + err)
  logger.error('NOTE: if the error above is EXISTS, the error can be ignored.')
}

let app = express()
app.set('x-powered-by', false)
app.set('trust proxy', true)

app.use(cookieParser())

let dataSizeLimit = config.rest.dataSizeLimit // probably needs to be at least 50mb
app.use(bodyParser.raw({'limit': dataSizeLimit}))
app.use(bodyParser.json({'limit': dataSizeLimit}))

app.use('/files', express.static(nmWebFilesRoot, {
  dotfiles: 'ignore',
  index: false,
  redirect: false
}))

// app.use(session({
//   name: 'session',
//   secret: [ nmSessionSecret ],
//   maxAge: 24 * 60 * 60 * 1000 // 24 hrs for now, but really gated by underlying shib/jwt
// }
// ))

app.use(jwt({
  secret: nmAuthSecret,
  credentialsRequired: false
}))

/* BEGIN Api Authorization */

let authOptions = {
  protect: [
    // path is req.path, loginAuth is whether logged in users(jwtToken via cookie) have access and apiAuth allows access using api tokens
    //   loginAuth also forces group membership check if membership is set - empty membership === any or no group OK
    // not yet    { path: '/curate', loginAuth: false, membership: [], apiAuth: true, apiGroup: 'curate' },
    // not yet    { path: '/dataset/create', loginAuth: false, membership: [], apiAuth: true, apiGroup: 'curate' },
    { path: '/datasets', loginAuth: true, membership: [], apiAuth: true, apiGroup: 'curate' },
    { path: '/jobemail', loginAuth: false, membership: [], apiAuth: true, apiGroup: 'email' },
    { path: '/jobsubmit', loginAuth: true, membership: [], apiAuth: true, apiGroup: 'jobs' },
    { path: '/users', loginAuth: true, membership: ['admin'], apiAuth: true, apiGroup: 'admin' },
    { path: '/user', loginAuth: false, membership: ['admin'], apiAuth: true, apiGroup: 'admin' }
  ]
}

function getBearerTokenInfo (bearerToken) {
  let func = 'getBearerTokenInfo'
  return new Promise(function (resolve, reject) {
    // resolve tokenInfo
    let tokenInfo = {
      bearer: bearerToken,
      userId: null,
      apiToken: null,
      refreshToken: null,
      expiration: null
    }
    let found = 0
    Users.find({}).cursor()
      .on('data', function (userDoc) {
        let userid = userDoc.userid
        userDoc.apiAccess.forEach(function (apiInfo) {
          let parts = apiInfo.split(' ')
          let apiToken = parts[APIACCESS_APITOKEN_PART]
          let refreshToken = parts[APIACCESS_REFRESHTOKEN_PART]
          let accessToken = parts[APIACCESS_ACCESSTOKEN_PART]
          let expiration = parts[APIACCESS_EXPIRATION_PART]
          logger.debug(func + ' - checking bearer token: ' + bearerToken + ' against access token: ' + accessToken)
          if (bearerToken === accessToken) {
            tokenInfo.userId = userid
            tokenInfo.apiToken = apiToken
            tokenInfo.refreshToken = refreshToken
            tokenInfo.expiration = expiration
            ++found
            logger.debug(func + ' - found bearer token information for (access token): ' + bearerToken + ' occurrences: ' + found)
            resolve(tokenInfo)
          }
        })
      })
      .on('end', function () {
        if (found === 0) {
          resolve(null)
        } else if (found > 1) {
          let msg = func + ' - found more than 1 occurrence of the bearerToken(access token):  ' + bearerToken + ' found: ' + found
          logger.error(msg)
          reject(new Error(func + ' - found more than 1 occurrence of the bearerToken(access token):  ' + bearerToken + ' found: ' + found))
        }
      })
  })
}

function getTokenDataFromReq (req) {
  let func = 'getTokenFromReq'
  let token = req.cookies['token']
  let decoded = null
  if (token) {
    try {
      decoded = jwtBase.verify(token, nmAuthSecret)
      logger.debug(func + ' - user: ' + decoded.sub + ' accessing: ' + req.path)
    } catch (err) {
      logger.error(func + ' - check jwt token failed. err: ' + err)
    }
  } else {
    logger.error(func + ' - no jwt token found in cookie.')
  }
  return decoded
}

function authMiddleware (authOptions) {
  // TODO review this code
  return function (req, res, next) {
    let func = 'authMiddleWare(' + req.path + ')'
    let pathProtected = false
    let loginAuth = false
    let loginMembership = []
    let apiAuth = false
    let apiGroup = null
    let loginUserId = null
    let isAdmin = false
    // let runAsUserId = null // Allow admins to set runAsUserId
    // let apiUserId = null
    let jsonResp = {'error': null, 'data': null}
    authOptions.protect.forEach(function (v) {
      if (v.path === req.path) {
        pathProtected = true
        loginAuth = v.loginAuth
        loginMembership = v.membership
        apiAuth = v.apiAuth
        apiGroup = v.apiGroup
      }
    })
    let token = req.cookies['token']
    if (token) {
      try {
        let decoded = jwtBase.verify(token, nmAuthSecret)
        loginUserId = decoded.sub // subject
        isAdmin = decoded.isAdmin
        logger.debug(func + ' - user: ' + loginUserId + ' accessing: ' + req.path)
        req.headers['nmLoginUserId'] = decoded.sub
      } catch (err) {
        logger.error(func + ' - check jwt token failed. err: ' + err)
      }
    } else {
      logger.error(func + ' - no jwt token found in cookie.')
    }

    if (pathProtected) {
      logger.error('protected path: ' + req.path)
      let authFailed = true
      let groupCheckFailed = false // TODO recheck this logic related to loginUserId
      if (loginAuth) {
        loginMembership.forEach(function (v) { // TODO update for memberships other than admin i.e. make dynamic
          if (v === 'admin') {
            if (!isAdmin) {
              groupCheckFailed = true
            }
          }
        })
        if (loginUserId !== null && groupCheckFailed === false) {
          authFailed = false
        }
      }
      let apiAuthPromise = null
      if (apiAuth && authFailed) {
        let authHeader = req.get('Authentication')
        let bearerToken = null
        if (authHeader) {
          let btParts = authHeader.split(' ')
          if (btParts[0] === 'Bearer' && btParts[1] && btParts[1].length > 0) {
            bearerToken = btParts[1]
          }
          if (bearerToken) {
            // Look up bearer token in users
            apiAuthPromise = new Promise(function (resolve, reject) {
              getBearerTokenInfo(bearerToken)
                .then(function (tokenInfo) {
                  if (tokenInfo !== null) {
                    // may be expired
                    let now = moment().unix()
                    let expired = (+(tokenInfo.expiration) < now)
                    if (!expired) {
                      logger.debug(func + ' - bearer: ' + bearerToken + ' success. Token info: ' + JSON.stringify(tokenInfo) + ' accessing: ' + req.path)
                      resolve(tokenInfo)
                    } else {
                      logger.debug(func + ' - bearer: ' + bearerToken + ' access token expired: ' + JSON.stringify(tokenInfo) + ' accessing: ' + req.path)
                      resolve(null)
                    }
                  } else {
                    logger.debug(func + ' - bearer: ' + bearerToken + ' FAILED. Token info not found accessing: ' + req.path)
                    resolve(null)
                  }
                })
                .catch(function (err) {
                  logger.error(func + ' - could not obtain info for bearer token: ' + bearerToken + ' err: ' + err)
                  reject(err)
                })
            })
          } else {
            logger.error(func + ' - No bearer token specified')
          }
          // if found, the record will hold the associated api token
          // get the api definition from the target api
          // set nmApiUserId into header
        } else {
          logger.error(func + ' - api authentication failed for bearer token: ' + bearerToken)
        }
      } else if (loginAuth && authFailed) {
        logger.error(func + ' - login auth failed for userid: ' + loginUserId)
      }

      if (!apiAuthPromise) { // TODO evaluate whether these return values should differ depending on protocol (get vs post)
        if (!authFailed) {
          next()
        } else {
          jsonResp.error = 'not authorized'
          return res.status(403).json(jsonResp)
        }
      } else {
        apiAuthPromise
          .then(function (tokenInfo) {
            if (tokenInfo) {
              req.headers['nmLoginUserId'] = tokenInfo.userId
              next()
            } else {
              jsonResp.error = 'invalid token'
              return res.status(403).json(jsonResp)
            }
          })
          .catch(function (err) {
            jsonResp.error = err
            return res.status(403).json(jsonResp)
          })
      }
    } else {
      logger.error('non-protected path: ' + req.path)
      next()
    }
  }
}
app.use(authMiddleware(authOptions))
/* END Api Authorization */

let fourHours = 4 * 60 * 60 * 1000 // TODO test rest API behavior with short LOCAL timeout
function handleLogin (req, res) {
  let func = 'handleLogin'
  let remoteUser = null
  let givenName = null
  let displayName = null
  let surName = null
  let emailAddr = null
  let sessionExpiration = null
  let userExists = false
  if (nmAuthType === 'local') {
    remoteUser = nmAuthTestUser
    givenName = nmAuthTestUser
    displayName = nmAuthTestUser
    surName = nmAuthTestUser
    emailAddr = emailTestAddr
    sessionExpiration = moment().unix() + fourHours
  } else {
    remoteUser = req.headers[nmAuthUserHeader] // OneLink users do not have NetIDs, but all have dudukeids
    givenName = req.headers[nmAuthGivenNameHeader]
    displayName = req.headers[nmAuthDisplayNameHeader]
    surName = req.headers[nmAuthSurNameHeader]
    emailAddr = req.headers[nmAuthEmailHeader]
    sessionExpiration = +(req.headers[nmAuthSessionExpirationHeader])
  }
  logger.debug(func + ' - headers: ' + JSON.stringify(req.headers))
  logger.debug(`${func} - user info: remoteUser=${remoteUser} givenName=${givenName} displayName=${displayName} surName=${surName} email=${emailAddr} sessionExpiration=${sessionExpiration}`)
  let token = req.cookies['token']
  if (token) {
    logger.debug('found session token: ' + token)
    try {
      let decoded = jwtBase.verify(token, nmAuthSecret)
      if (remoteUser === decoded.sub) { // don't set userExists unless remoteUser and subject of the token are the same
      //                                   -- Sometimes, on session timeout, the token might not get cleared and login occurs for another user
        userExists = decoded.userExists
      }
      logger.debug(`${func} - current token values: ` + JSON.stringify(decoded))
    } catch (err) {
      let decoded = jwtBase.decode(token) // timed out or improperly signed version -- possible fake
      logger.error('unable to verify token. Possible forgery or token timeout. data: ' + JSON.stringify(decoded))
    }
  }
  // TODO enforce forged token check - logout should remove cookie
  // find the user
  let userFindCreatePromise = new Promise(function (resolve, reject) {
    if (userExists) {
      logger.debug('User exists flag set in cookie, so will not look up user info.')
      resolve()
    } else {
      Users.findOne({'userid': remoteUser}, function (err, userDoc) {
        if (err) {
          reject(err)
        } else {
          if (userDoc) { // TODO possible issue if user changes email address upstream -- try not to check every time though (ctr for userExists)
            if (userDoc.email !== emailAddr || userDoc.givenName !== givenName) {
              // TODO - Users.findOneAndUpdate({'userid': remoteUser},{'upsert': true}, function (err, )
              logger.error('WARNING: user email address or given name has changed!')
            }
            userExists = true
            resolve()
          } else {
            Users.create({
              'userid': remoteUser,
              'email': emailAddr,
              'givenName': givenName,
              'surName': surName,
              'displayName': displayName,
              'apiAccess': []
            }, function (err, newDoc) {
              if (err) {
                reject(err)
              } else {
                userExists = true
                resolve()
              }
            })
          }
        }
      })
    }
  })

  // check admin status by looking up group
  return new Promise(function (resolve, reject) {
    userFindCreatePromise.then(function () {
      groupMgr.isGroupMember(logger, nmAuthAdminGroupName, remoteUser)
        .then(function (isMember) {
          let isAdmin = isMember
          let isUser = true // for now everyone is a user
          let isAnonymous = (givenName === 'Anon' && surName === 'Nanomine')
          // let logoutUrl = nmAuthLogoutUrl
          let jwToken = jwtBase.sign({
            'sub': remoteUser,
            'givenName': givenName,
            'sn': surName,
            'displayName': displayName,
            'isTestUser': (nmAuthType === 'local'),
            'exp': sessionExpiration,
            'isAdmin': isAdmin,
            'isUser': isUser,
            'mail': emailAddr,
            'isAnonymous': isAnonymous,
            // 'logoutUrl': logoutUrl,
            'userExists': userExists
          }, nmAuthSecret)
          logger.info('jwToken: ' + jwToken)
          logger.debug('emailAddr: ' + emailAddr)
          res.cookie('token', jwToken) // always override
          resolve(res)
        })
        .catch(function (err) {
          reject(err)
        })
    })
      .catch(function (err) {
        reject(err)
      })
  })
}
// app.use('/nm', express.static('../dist'))
app.get('/nm', function (req, res) {
  let idx = '../dist/index.html'
  // console.log('headers: ' + JSON.stringify(req.headers))
  // handleLogin(req.headers)
  // NOTE: For now, login is required to get to the site. TODO change login so that it is optional to access protected functions
  // let remoteUser = req.headers['remote_user'] // this only works with NetIDs and will not work with OneLink
  handleLogin(req, res)
    .then(function (res) {
      try {
        fs.readFile(idx, 'utf8', function (err, data) { // TODO Cache this
          if (err) {
            return res.status(400).send('cannot open index')
          } else {
            return res.send(data)
          }
        })
      } catch (err) {
        return res.status(404).send(err)
      }
    })
    .catch(function (err) {
      logger.error('login error caught from handleLogin: ' + err)
      return res.status(500).send('login error occurred: ' + err)
    })
})
app.get('/logout', function (req, res) {
  return res.status(200).json({error: null, data: {logoutUrl: nmAuthLogoutUrl}})
})

let db = mongoose.connection
let dbUri = process.env['NM_MONGO_URI']
mongoose.connect(dbUri, {keepAlive: true, keepAliveInitialDelay: 300000})
db.on('error', function (err) {
  logger.error('db error: ' + err)
})
db.once('open', function () {
  logger.info('database opened successfully via mongoose connect.')
})

/*
Mongoose schemas and models -- begin
  TODO move to separate module
  Schemas/Models:
    mgiversion
    datasets
    xmldata
    template (the xsd schema) -- we'll call it xsdSchema internally instead of template
    template_version (tracker for template versions and deactivated templates)
*/

let mgiVersionSchema = new mongoose.Schema({
  majorVer: Number, /* SEMVER versioning for the overall MGI db schema represented by the db. NM base was MDCS 1.3 */
  minorVer: Number, /* http://semver.org */
  patchVer: Number,
  labelVer: String /* major.minor.patch-label when formatted */
}, {collection: 'mgi_version'}) /* Latest is 1.3.0-nm-sp-dev-1 */
let MgiVersion = mongoose.model('mgiversion', mgiVersionSchema)

let datasetsSchema = new mongoose.Schema({
  citationType: String, /* study, book, article, paper -- fixed set -- required field */
  publication: String, /* Journal name, book name, etc */
  title: String, /* Name of study, book, article, paper, etc -- required field */
  author: [String], /* Authors, first is primary */
  keyword: [String], /* Keywords. NOTE: some are multi-word */
  publisher: String, /* publisher */
  publicationYear: Number, /* 2005, etc. */
  doi: String, /* DOI or other unique assigned handle -- must be unique */
  volume: Number, /* 1-12 for monthly, could be others for weekly, semi-monthly, etc */
  url: String, /* Best url to access paper, book, etc */
  language: String, /* English, etc */
  location: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields.Location */
  dateOfCitation: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields.DateOfCitation */
  issn: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CitationType.Journal.ISSN */
  issue: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CitationType.Journal.Issue */
  seq: Number, /* Unique index constraint, but not forced to monotonic -- required field (set by create) */
  ispublished: Boolean, /* could use this to flag actually published */
  isPublic: Boolean, /* available to everyone */
  latestSchema: Boolean, /* Has associated xml_data recs for latest schema. If not, then lookups of xmls for latest schema using this dsSeq will fail */
  userid: String /* creator's user id */
}, {collection: 'datasets'})
let Datasets = mongoose.model('datasets', datasetsSchema)

let usersSchema = new mongoose.Schema({
  alias: String, // random unless overridden by user - not used for attribution, only display
  userid: String,
  givenName: String, // first name
  surName: String, // last name
  displayName: String, // full name
  email: String,
  apiAccess: [String] // api token | refresh token | accessToken:expiration
}, {collection: 'users'})
let Users = mongoose.model('users', usersSchema)

let apiSchema = new mongoose.Schema({
  name: String, // Name of the API
  desc: String, // Description of the API
  token: String // random token representing api that can be changed if necessary
}, {collection: 'api'})
let Api = mongoose.model('api', apiSchema)

let xmlDataSchema = new mongoose.Schema({ // maps the mongo xmldata collection
  schemaId: String, /* !!! NOTE: had to rename 'schema' field name in restored data from MDCS to schemaId because of mongoose name conflict.
                       The change is being made in the migration script -- migrate.js.
                       OLD INFO: To convert the field after restore from MDCS, use mongocli which loads nanomongo.js. At the mongo command line
                       type 'swizzleForMongoose()' to change all the xmldata document fields named schema to schemaId.
                    */
  title: String,
  content: mongoose.Schema.Types.Mixed, /* !!! NOTE: MDCS stores the XML content as a BSON object parsed into the individual fields.
                      Moving forward NanoMine will not use this approach, so the data was downloaded as text via the MDCS rest interface
                      as a string and re-loaded into the xml_str string.  This is another reason why a dump of MDCS mongo will not restore
                      and run with the new app directly.
                      The migration tool will convert the 1.3.0 (no mgi_version collection) content field data and put a copy into xml_str.
                      The content field is left alone. Note that for really old XMLdata records or ones where the title is not in the
                      correct format, the conversion will not occur.
                      bluedevil-oit/nanomine-tools project has (PRELIMINARY) code to update the field. */
  xml_str: String,
  iduser: String, /* numeric reference to user (probably in sqlite) - Original MDCS name for userid */
  ispublished: Boolean, /* In the current db, these are all false */
  isPublic: Boolean, /* Set this to true to make available to everyone */
  curateState: String, /* currently values are Edit, Review, Curated */
  entityState: String, /* currently values are EditedNotValid, EditedValid, Valid, NotValid, Ingesting, IngestFailed, IngestSuccess */
  dsSeq: Number /* Sequence number of the associated dataset (datasetSchema) */
}, {collection: 'xmldata'})
let XmlData = mongoose.model('xmlData', xmlDataSchema)

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
let XsdSchema = mongoose.model('xsdData', xsdSchema)

let xsdVersionSchema = new mongoose.Schema({ // maps the mongo template_version collection
  versions: [String], // Array of xsdSchema ids as stings
  deletedVersions: [String], // deleted versions array of xsdSchema ids
  nbVersions: Number, // current count of versions
  isDeleted: Boolean, // this schema is not to be shown/used at all and all xmls based on schema are deprecated
  current: String, // current schema version id
  currentRef: [{type: mongoose.Schema.Types.ObjectId, ref: 'xsdData'}]
}, {collection: 'template_version'})
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

/* BEGIN general utility functions */

function setDatasetLatestSchemaFlag (dsSeq, bv) {
  let func = 'setDatasetLatestSchemaFlag'
  // Datasets.updateOne({'seq': +(dsSeq)}, {'$set': {'latestSchema': bv}}, {'upsert': true}).cursor()
  Datasets.findOneAndUpdate({'seq': +(dsSeq)}, {$set: {'latestSchema': true}}).exec()
    .then(function (doc) {
      logger.debug(func + ' - updated dataset: ' + dsSeq + ' latestSchema:' + bv + ' doc: ' + doc.latestSchema)
    })
    .catch(function (err) {
      logger.debug(func + ' - updated datasets: done. Error: ' + err)
    })
}

function updateDatasetLatestSchema () { // Mark datasets denoting whether each has associated xml_data records for the latest schema
  // find all the xmls for the latest schema ordered by dataset sequence and build list of sequence numbers
  // update all the datasets to reset the latestSchema flag
  // loop through the sequence number list and for each set the associated dataset's latestSchema flag to true
  // NOTE: this is probably a HACK and not too well thought out at the last minute.
  let func = 'updateDatasetLatestSchema'
  let validDatasets = {}
  getCurrentSchemas()
    .then(function (versions) {
      let schemaId = versions[0].currentRef[0]._id
      // logger.debug(func + ' -- ' + JSON.stringify(versions[0]))
      // logger.debug(func + ' - latest schemaId is: ' + schemaId)
      XmlData.find({'schemaId': {'$eq': schemaId}}, null, {'sort': {'dsSeq': 1}}).cursor()
        .on('data', function (data) {
          // logger.debug(func + ' - dataset: ' + data.dsSeq + ' latestSchema hash updated to true for data: ' + data.title + ' ' + data.schemaId)
          validDatasets[data.dsSeq] = true // they'll all wind up as true, but it prevents searching (let js do it)
        })
        .on('end', function () {
          // logger.debug(func + ' - on end called for XmlData.find')
          Datasets.updateMany({}, {'latestSchema': false}).exec()
            .then(function (data) {
              // logger.debug(func + ' - dataset updateMany initial update all to false for: ' + data.seq)
              // logger.debug(func + ' - dataset updateMany: success. Continuing to update latestSchema flag.')
              let keys = Object.keys(validDatasets)
              keys.forEach(function (v) {
                // logger.debug(func + ' - will update dataset key ' + v + ' latestSchema to true.')
                setDatasetLatestSchemaFlag(+(v), true)
              })
            })
            .catch(function (err) {
              logger.error(func + ' - dataset updateMany failed: ' + err)
            })
        })
        // .catch(function (err) {
        //   logger.error(func + ' - XmlData find error: ' + err)
        // })
    })
    .catch(function (err) {
      logger.error(func + ' - getCurrentSchemas: ' + err)
    })
}
// ... and run at startup
setTimeout(function () {
  updateDatasetLatestSchema()
}, 15000)

function getUserInfo (userid) {
  let func = 'getUserInfo'
  return new Promise(function (resolve, reject) {
    let found = 0
    Users.find({'userid': {'$eq': userid}}).cursor()
      .on('data', function (userDoc) {
        resolve(userDoc)
      })
      .on('end', function () {
        if (found === 0) {
          resolve(null)
        } else if (found > 1) {
          let msg = func + ' - found more than 1 occurrence of the user:  ' + userid + ' found: ' + found
          logger.error(msg)
          reject(new Error(msg))
        }
      })
  })
}

function createUser (userid, emailAddr, givenName, surName, displayName) {
  // promise resolved with new document or rejects with error
  return new Promise(function (resolve, reject) {
    Users.create({
      'userid': userid,
      'email': emailAddr,
      'givenName': givenName,
      'surName': surName,
      'displayName': displayName,
      'apiAccess': []
    }, function (err, newDoc) {
      if (err) {
        reject(err)
      } else {
        resolve(newDoc)
      }
    })
  })
}

function getCurrentSchemas () { // returns promise resolved with sorted list of current schemas -- latest is first
  return new Promise(function (resolve, reject) {
    XsdVersionSchema.find({isDeleted: {$eq: false}}).populate('currentRef').exec(function (err, versions) {
      if (err) {
        reject(err)
      } else if (versions == null || versions.length <= 0) {
        resolve(null)
      } else {
        try {
          sortSchemas(versions) /* In-place sort by title i.e. 081218 will date sort to top relative to 060717 (reverse sort) so that
                                 client can assume latest schema is first
                                 */
        } catch (err) {
          logger.error('schema sort reverse by date failed :( - error' + err)
        }
        resolve(versions) // NOTE: to get the latest schemaId it's versions[0].currentRef[0]._id -- _id is the schemaId (content is the xsd, filename is the name.xsd, title recently is name, but older ones have 'polymer nanocomposite')
      }
    })
  })
}

function str2b64 (string) {
  let b64 = null
  try {
    b64 = Buffer.from(string).toString('base64')
  } catch (err) {
    logger.error('str2b64: error thrown converting string: ' + err)
  }
  return b64
}

function createOutboundJwt (userInfo) {
  let jwToken = jwtBase.sign({
    'sub': userInfo.userid,
    'givenName': userInfo.givenName,
    'sn': userInfo.surName,
    'displayName': userInfo.displayName,
    'isTestUser': (nmAuthType === 'local'),
    'exp': Date.now() / 1000 + 3600,
    'isAdmin': true,
    'isUser': true,
    'mail': userInfo.email,
    'isAnonymous': false,
    // 'logoutUrl': logoutUrl,
    'userExists': true
  }, nmAuthSecret)
  logger.info('jwToken: ' + jwToken)
  logger.debug('emailAddr: ' + userInfo.email)
  return `token=${jwToken}`
}

function datasetXmlFileList (xmlTitle) { // returns promise that when fulfilled contains list of file info objects related to XML
  let func = 'datasetXmlFileList'
  let bucketName = datasetBucketName
  let validTitle = matchValidXmlTitle(xmlTitle)
  let dsId = validTitle[1]
  let options = {
    'bucketName': bucketName
  }
  return new Promise(function (resolve, reject) {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, options)
    let files = []
    if (validTitle) {
      let dsId = validTitle[1]
      let findParam = {filename: {$regex: dsId + '[/]' + xmlTitle.replace(/\.xml$/, '') + '[/].*'}}
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
      reject(new Error('invalid xmlTitle format'))
    }
  })
}
function getMongoFileData (bucketName, id, fileName) {
  let func = 'getMongoFileData'
  // let fileName = null // only supporting id for this right now
  return new Promise(function (resolve, reject) {
    let options = {}
    if (bucketName && typeof bucketName === 'string') {
      options.bucketName = bucketName
    }
    // At least id or filename is required
    if ((id && !fileName) || (fileName && !id)) {
      let dlStream = null
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, options)
      if (id) {
        try {
          dlStream = bucket.openDownloadStream(ObjectId.createFromHexString(id), {})
          s2a(dlStream, function (err, a) {
            if (err) {
              let msg = func + ' - stream to array (id) returned error: ' + err
              logger.error(msg)
              reject(err)
            } else {
              let buffers = a.map(a => Buffer.isBuffer(a) ? a : Buffer.from(a))
              resolve(Buffer.concat(buffers))
            }
          })
        } catch (err) {
          let msg = func + ' - opening bucket(id) returned error: ' + err
          logger.error(msg)
          reject(err)
        }
      } else {
        try {
          dlStream = bucket.openDownloadStreamByName(fileName, {})
          s2a(dlStream, function (err, a) {
            if (err) {
              let msg = func + ' - stream to array (fileName) returned error: ' + err
              logger.error(msg)
              reject(err)
            } else {
              let buffers = a.map(a => Buffer.isBuffer(a) ? a : Buffer.from(a))
              resolve(Buffer.concat(buffers))
            }
          })
        } catch (err) {
          let msg = func + ' - opening bucket(fileName) returned error: ' + err
          logger.error(msg)
          reject(err)
        }
      }
    } else {
      let err = new Error(func + ' - requires either id or filename, but not both (supply null for one)')
      logger.error(err)
      reject(err)
    }
  })
}

// setTimeout(function () {
//   console.log('calling getMongoFileData')
//   getMongoFileData('curateinput', null, '108/L108_S1_Rishi_2019/G\'\'_S1_125C.xlsx')
//     .then(function (buffer) {
//       let msg = 'Got data length: ' + buffer.length
//       fs.writeFileSync('test.out', buffer, 'utf8')
//       logger.error(msg)
//       console.log(msg)
//     })
//     .catch(function (err) {
//       let msg = 'error getting data: ' + err
//       logger.error(msg)
//       console.log(msg)
//     })
// }, 18000)

/* END general utility functions */

/* BEGIN Outbound requests to whyis */
function publishFiles (userid, xmlTitle, cb) { // xmlText, schemaName, filesInfo, cb) {
  let func = 'publishFiles'
  let url = nmLocalRestBase + '/wi/pub'
  let match = matchValidXmlTitle(xmlTitle)
  if (match) {
    let dsSeq = match[1]
    let xmlId = xmlTitle.replace(/\.xml$/, '')
    let whyisId = shortUUID.new()

    // get latest schema/schemaId
    getLatestSchemas()
      .then(function (schemas) {
        if (schemas && schemas.length > 0) {
          // logger.error('xmlText: ' + xmlText)
          let latestSchema = schemas[0].currentRef[0] // getLatestSchemas
          let schemaId = latestSchema._id
          let schemaName = latestSchema.title

          // read xmldata for latest schema
          let query = {'$and': [{'$eq': {'title': xmlTitle}}, {'$eq': {'schemaId': schemaId}}]}
          XmlData.find(query).exec(function (err, xmlRecs) {
            if (err) {
              cb(err, null)
            } else if (xmlRecs == null || xmlRecs.length < 1) {
              cb(new Error('Not found'), null)
            } else {
              // XML found
              let xmlRec = xmlRecs[0]
              let b64XmlData = str2b64(xmlRec.xmlStr)
              // logger.error('xml-b64: ' + b64XmlData)

              // get list of files (with basename) for
              datasetXmlFileList(xmlTitle)
                .then(function (filesInfo) {
                  let filesDataLD = ''
                  let foundParameters = false
                  filesInfo.forEach(function (fInfo) {
                    let contentType = mimetypes.lookup(fInfo.basename)
                    getDatasetXmlFileData()
                    if (fInfo.basename === 'job_parameters.json') {
                      foundParameters = true
                    }

                    let b64Data = '' // get the file data and b64 encode it
                    filesDataLD += `,
                      {
                      "@id" : "dataset/${dsSeq}/${xmlId}/${fInfo.basename}",
                      "@type": [ "schema:DataDownload", "mt:${contentType}"],
                      "whyis:hasContent" : "data:${contentType};charset=UTF-8;base64,${b64Data}"
                      }
                    `
                  })

                  let fileListLD = ''
                  filesInfo.forEach(function (fInfo) {
                    fileListLD += `,
                      {"@id" : "dataset/${dsSeq}/${xmlId}/${fInfo.basename}"}
                    `
                  })
                  // NOTE NOTE NOTE
                  //   FYI - Part of the JsonLD below is built above and added below dynamically
                  let data = `
                    {
                      "@context": {
                        "@base" : "${nmWebBaseUri}",
                        "schema": "http://schema.org/",
                        "xsd": "http://www.w3.org/2001/XMLSchema#",
                        "whyis": "http://vocab.rpi.edu/whyis/",
                        "np": "http://www.nanopub.org/nschema#",
                        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
                        "sio": "http://semanticscience.org/resource/",
                        "dc": "http://purl.org/dc/terms/",
                        "prov": "http://www.w3.org/ns/prov#",
                        "mt" : "https://www.iana.org/assignments/media-types/"
                      },
                      "@id": "urn:${whyisId}",
                      "@graph": {
                        "@id": "urn:${whyisId}",
                        "@type": "np:Nanopublication",
                        "np:hasAssertion": {
                          "@id": "urn:${whyisId}_assertion",
                          "@type": "np:Assertion",
                          "@graph": [
                            {
                              "@id" : "nmr/xml/${xmlId}",
                              "@type": [ "schema:DataDownload", "mt:text/xml", ,"http://nanomine.org/ns/NanomineXMLFile"],
                              "whyis:hasContent" : "data:text/xml;charset=UTF-8;base64,${b64XmlData}",
                              "prov:wasDerivedFrom" : [{"@id" : "dataset/${dsSeq}/${xmlId}/${xlsInputFile}"}],
                              "dc:conformsTo" : {"@id" : "nmr/schema/${schemaName}"}
                            }
                            ${filesDataLD}
                            ,{
                              "@id" : "nmr/dataset/{{dataset_id}}",
                              "@type" : "schema:Dataset",
                              "schema:distribution" : [
                                {"@id" : "nmr/xml/${xmlId}"},
                                {"@id" : "dataset/${dsSeq}/${xmlId}/${xlsInputFile}"}
                                ${fileListLD}
                              ]
                            }
                          ]
                        }
                      }
                    }`
                  getUserInfo(userid)
                    .then(function (userinfo) {
                      let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
                        host: 'localhost',
                        port: '443',
                        method: 'POST',
                        path: '/wi/pub',
                        // path: '/sparql',
                        rejectUnauthorized: false
                      }
                      let httpsAgent = new https.Agent(httpsAgentOptions)
                      let cookieValue = createOutboundJwt(userinfo)
                      logger.error(func + ' cookie to send: ' + cookieValue + ' request data: ' + data)
                      return axios({
                        'method': 'post',
                        'url': url,
                        'data': data,
                        'httpsAgent': httpsAgent,
                        'headers': {'Content-Type': 'application/ld+json', 'Cookie': cookieValue}
                      })
                        .then(function (response) {
                          logger.error(func + ' data: ' + inspect(response))
                          cb(null, response)
                        })
                        .catch(function (err) {
                          logger.error(func + ' error: ' + inspect(err))
                          cb(err, null)
                        })
                    })
                    .catch(function (err) {
                      logger.error(func + ' error getting user info for userid: ' + userid)
                      cb(err, null)
                    })
                })
                .catch(function (err) { // datasetXmlFileList
                  logger.error(func + ' -  error getting file list associated with xml. Error: ' + err)
                  cb(err, null)
                })
            }
          })
        } else {
          let msg = func + ' - error obtaining latest schemas'
          let err = new Error(msg)
          logger.error(msg)
          cb(err, null)
        }
      })
      .catch(function (err) { // getLatestSchemas
        logger.error(func + ' - error obtaining latest schemas.')
        cb(err, null)
      })
  } else { // the title was not formatted properly
    let err = new Error('Title format is not valid')
    cb(err, null)
  }
}

function publishXml (userid, xmlTitle, xmlText, schemaName, cb) {
  let func = 'publishXml'
  let url = nmLocalRestBase + '/wi/pub'
  let whyisId = shortUUID.new()
  let dsSeq = matchValidXmlTitle(xmlTitle)[1]
  // logger.error('xmlText: ' + xmlText)
  let b64XmlData = str2b64(xmlText)
  // logger.error('xml-b64: ' + b64XmlData)
  let data = `
    {
      "@context": {
        "@base" : "${nmWebBaseUri}",
        "schema": "http://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "whyis": "http://vocab.rpi.edu/whyis/",
        "np": "http://www.nanopub.org/nschema#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "sio": "http://semanticscience.org/resource/",
        "dc": "http://purl.org/dc/terms/",
        "prov": "http://www.w3.org/ns/prov#",
        "mt" : "https://www.iana.org/assignments/media-types/"
      },
      "@id": "urn:${whyisId}",
      "@graph": {
        "@id": "urn:${whyisId}",
        "@type": "np:Nanopublication",
        "np:hasAssertion": {
          "@id": "urn:${whyisId}_assertion",
          "@type": "np:Assertion",
          "@graph": [
            {
              "@id" : "${nmWebBaseUri}/nmr/xml/${xmlTitle}",
              "@type": [ "mt:text/xml", "http://www.w3.org/2001/XMLSchema" ],
              "whyis:hasContent" : "data:text/xml;charset=UTF-8;base64,${b64XmlData}",
              "dc:conformsTo" : {"@id" : "${nmWebBaseUri}/nmr/schema/${schemaName}"}
            },
            {
              "@id" : "${nmWebBaseUri}/nmr/dataset/${dsSeq}",
              "@type" : "schema:Dataset",
              "schema:distribution" : [ {"@id" : "${nmWebBaseUri}/nmr/xml/${xmlTitle}"} ]
            }            
          ]
        }
      }
    }`
  getUserInfo(userid)
    .then(function (userinfo) {
      let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
        host: 'localhost',
        port: '443',
        method: 'POST',
        path: '/wi/pub',
        // path: '/sparql',
        rejectUnauthorized: false
      }
      let httpsAgent = new https.Agent(httpsAgentOptions)
      let cookieValue = createOutboundJwt(userinfo)
      logger.error(func + ' cookie to send: ' + cookieValue + ' request data: ' + data)
      return axios({
        'method': 'post',
        'url': url,
        'data': data,
        'httpsAgent': httpsAgent,
        'headers': {'Content-Type': 'application/ld+json', 'Cookie': cookieValue}
      })
        .then(function (response) {
          logger.error(func + ' data: ' + inspect(response))
          cb(null, response)
        })
        .catch(function (err) {
          logger.error(func + ' error: ' + inspect(err))
          cb(err, null)
        })
    })
    .catch(function (err) {
      logger.error(func + ' error getting user info for userid: ' + userid)
      cb(err, null)
    })
}

function publishLatestSchema (userid, cb) {
  // TODO: there will be a target user (jwt in token cookie for whyis)
  let func = 'publishLatestSchema'
  let url = nmLocalRestBase + '/wi/pub'
  // let jsonResp = {'error': null, 'data': null}
  getCurrentSchemas()
    .then(function (schemasArray) {
      if (schemasArray && schemasArray.length > 0) {
        let whyisId = shortUUID.new()
        let schemaName = schemasArray[0].currentRef[0].title // .replace(/[_]/g, '.')
        let schemaText = schemasArray[0].currentRef[0].content.replace(/[\n]/g, '')
        // logger.error('schemaText: ' + schemaText)
        let b64SchemaData = str2b64(schemaText)
        // logger.error('schema-b64: ' + b64SchemaData)
        // url += '/' + schemaName
        let data = `
          {
            "@context": {
              "@base" : "${nmWebBaseUri}",
              "schema": "http://schema.org/",
              "xsd": "http://www.w3.org/2001/XMLSchema#",
              "whyis": "http://vocab.rpi.edu/whyis/",
              "np": "http://www.nanopub.org/nschema#",
              "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
              "sio": "http://semanticscience.org/resource/",
              "dc": "http://purl.org/dc/terms/",
              "prov": "http://www.w3.org/ns/prov#",
              "mt" : "https://www.iana.org/assignments/media-types/"
            },
            "@id": "urn:${whyisId}",
            "@graph": {
              "@id": "urn:${whyisId}",
              "@type": "np:Nanopublication",
              "np:hasAssertion": {
                "@id": "urn:${whyisId}_assertion",
                "@type": "np:Assertion",
                "@graph": [
                  {
                    "@id" : "${nmWebBaseUri}/nmr/schema/${schemaName}",
                    "@type": [ "mt:text/xml", "http://www.w3.org/2001/XMLSchema" ],
                    "whyis:hasContent" : "data:text/xml;charset=UTF-8;base64,${b64SchemaData}"
                  }
                ]
              }
            }
          }`
        getUserInfo(userid)
          .then(function (userinfo) {
            let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
              host: 'localhost',
              port: '443',
              method: 'POST',
              path: '/wi/pub',
              // path: '/sparql',
              rejectUnauthorized: false
            }
            let httpsAgent = new https.Agent(httpsAgentOptions)
            let cookieValue = createOutboundJwt(userinfo)
            logger.error(func + ' cookie to send: ' + cookieValue + ' request data: ' + data)
            return axios({
              'method': 'post',
              'url': url,
              'data': data,
              'httpsAgent': httpsAgent,
              'headers': {'Content-Type': 'application/ld+json', 'Cookie': cookieValue}
            })
              .then(function (response) {
                logger.error(func + ' data: ' + inspect(response))
                cb(null, response)
              })
              .catch(function (err) {
                logger.error(func + ' error: ' + inspect(err))
                cb(err, null)
              })
          })
          .catch(function (err) {
            logger.error(func + ' error getting user info for userid: ' + userid)
            cb(err, null)
          })
      } else {
        let err = new Error(func + ' - unable to locate latest schema in database to publish.')
        logger.error(err)
        cb(err, null)
      }
    })
    .catch(function (err) {
      logger.error(func + ' error: ' + err)
      cb(err, null)
    })
}
// Test publishLatestSchema
app.get('/testpubschema', function (req, res) {
  setTimeout(function () {
    publishLatestSchema(nmAuthAnonUserId, function cb (err, response) { // user is Anon Nanomine
      if (err) {
        logger.error('publishLatestSchema test failed: ' + err)
      } else {
        logger.error('publishLatestSchema success!!!')
      }
    })
  }, 100)
  res.send('invoked schema publish. Check log to see what happened.')
})
// End Test publishLatestSchema
// Begin test publishXml
app.get('/testpubxml', function (req, res) { // L183_S12_Poetschke_2003.xml
  setTimeout(function () {
    let xmlText = '<xml><test>' + Date.now() + '</test></xml>'
    let schemaName = 'PNC_schema_0812118'
    publishXml(nmAuthAnonUserId, 'X999_S40_Anon_2019.xml', xmlText, schemaName, function cb (err, response) { // user is Anon Nanomine
      if (err) {
        logger.error('publishXml test failed: ' + err)
      } else {
        logger.error('publishXml success!!!')
      }
    })
  }, 100)
  res.send('invoked XML publish. Check log to see what happened.')
})
// End test publishXml

/* END Outbound requests to whyis */

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

function getLatestSchemas () { // duplicate of getCurrentSchemas!! TODO
  return new Promise(function (resolve, reject) {
    XsdVersionSchema.find({isDeleted: {$eq: false}}).populate('currentRef').exec(function (err, versions) {
      if (err) {
        reject(err)
      } else if (versions == null || versions.length <= 0) {
        resolve(null) // not found
      } else {
        try {
          sortSchemas(versions) /* In-place sort by title i.e. 081218 will date sort to top relative to 060717 (reverse sort) so that
                                 client can assume latest schema is first
                                 */
          resolve(versions)
        } catch (err) {
          logger.error('schema sort reverse by date failed :( - error' + err)
          reject(err)
        }
      }
    })
  })
}

app.get('/templates/versions/select/allactive', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  getLatestSchemas()
    .then(function (schemas) {
      if (schemas && schemas.length > 0) {
        jsonResp.data = schemas
        res.json(jsonResp)
      } else {
        jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
        res.status(404).json(jsonResp)
      }
    })
    .catch(function (err) {
      jsonResp.error = err
      res.status(500).json(jsonResp)
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
  // let dataformat = req.query.dataformat
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
          let re = new RegExp(qval, 'i')

          let tmp = {}
          tmp[qfld] = { '$regex': re } // TODO test this again with fields mix -- winds up being {'fieldnm': { '$regex': /PATTERN/ }}
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

// NOTE: similar to /explore/select (actually started as a copy/modify) -- HOWEVER, it works differently and returns different data
// Data is returned for current schema only
app.get('/xml/:id?', function (req, res) { // currently only supports JWT style login (need to add a authRequired field to config for bearer support
  // checks to make sure:
  //   XML is public
  //   or user is owner/creator
  //   or user is admin
  let jsonResp = {'error': null, 'data': null}
  let id = req.params.id // may be null
  let dsSeq = req.query.dataset // may be null -- to get all xmls for a dataset (mutually exclusive of id)
  let userid = null
  let isAdmin = false
  let theQuery = {} // default find query
  let useridQuery = null
  let publicQuery = {'isPublic': {'$eq': true}}
  let dataQuery = null
  let secQuery = null
  let jwt = getTokenDataFromReq(req)
  if (jwt) {
    userid = jwt.sub
    isAdmin = jwt.isAdmin
  }
  if (isAdmin === false) { // admin has access to everything
    if (userid) {
      useridQuery = {'iduser': {'$eq': userid}} // it's iduser in the xml_data collection
      secQuery = {'$or': [useridQuery, publicQuery]}
    } else {
      secQuery = publicQuery
    }
  }
  if (id && dsSeq) {
    // error
    jsonResp.error = 'dataset and id are mutually exclusive parameters'
    return res.status(400).json(jsonResp)
  }
  getCurrentSchemas()
    .then(function (versions) {
      let schemaId = versions[0].currentRef[0]._id
      let schemaQuery = {'schemaId': {'$eq': schemaId}}
      if (id) {
        dataQuery = {'title': {'$eq': id}}
      } else if (dsSeq) {
        dataQuery = {'dsSeq': {$eq: dsSeq}}
      }
      if (secQuery && dataQuery) {
        theQuery = {'$and': [dataQuery, secQuery, schemaQuery]}
      } else if (secQuery) {
        theQuery = {'$and': [secQuery, schemaQuery]}
      } else if (dataQuery) {
        theQuery = {'$and': [dataQuery, schemaQuery]}
      }
      // TODO iduser should not be returned raw! Right now it's needed for client-side filtering. The returned value should be modified
      //   to something like, (iduser if (iduser === loginUser || iduser === runAsUser || iduser isAdmin) else return 0 to prevent leakage of userids
      XmlData.find(theQuery, '_id iduser schemaId title ispublished isPublic entityState curateState xml_str').exec(function (err, xmlRecs) {
        if (err) {
          jsonResp.error = err
          logger.info('/xml query=' + JSON.stringify(theQuery) + ' returned: ' + JSON.stringify(jsonResp))
          res.status(400).json(jsonResp)
        } else if (xmlRecs == null || xmlRecs.length < 1) {
          jsonResp.error = {'statusCode': 404, 'statusText': 'not found'}
          logger.info('/xml query=' + JSON.stringify(theQuery) + ' returned: ' + JSON.stringify(jsonResp))
          res.status(404).json(jsonResp)
        } else {
          jsonResp.data = xmlRecs // TODO this swizzling is not necessary here since we're returning xml_str directly (as opposed to /explore/select's mapping to content)
          // xmlRecs.forEach(function (v) { // swizzle the output
          //   jsonResp.data.push({
          //     '_id': v._id,
          //     'iduser': v.iduser,
          //     'schema': v.schemaId,
          //     'title': v.title,
          //     'ispublished': v.ispublished,
          //     'isPublic': v.isPublic,
          //     'entityState': v.entityState,
          //     'curateState': v.curateState,
          //     'xml_str': v.xml_str
          //   })
          // })
          logger.info('/xml query=' + JSON.stringify(theQuery) + ' returned: ' + jsonResp.data.length + ' records.')
          res.json(jsonResp)
        }
      })
    })
    .catch(function (err) {
      // error getting latest schema
      let msg = 'error getting latest schema for data query: ' + err
      logger.error(msg)
      jsonResp.error = msg
      return res.status(500).json(jsonResp)
    })
})

app.get('/explore/select', function (req, res) {
  console.log(req.path + '  user: ' + req.headers['remote_user'])
  // console.log(req.path + ' user: ' + JSON.stringify(req.user))
  // jwt.verify(token, 'shhhhh', function(err, decoded) {
  //   console.log(decoded.foo) // bar
  // })
  let jsonResp = {'error': null, 'data': null}
  let id = req.query.id
  let schema = req.query.schema
  let title = req.query.title
  let schemas = req.query.schemas // new parameter schema1,schema2,schema3,etc
  // not supporting data format at this time -- always returns xml for now
  // let dataformat = req.query.dataformat
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
    let schemasQuery = null
    if (validQueryParam(title)) {
      if (title.slice(0, 1) === '/' && title.slice(-1) === '/') {
        title = title.replace(/(^[/]|[/]$)/g, '')
        let re = new RegExp(title, 'i')
        titleQuery = {'title': { '$regex': re }}
        // logger.debug(req.path + ' by title: ' + JSON.stringify(titleQuery))
      } else {
        titleQuery = {'title': {'$eq': title}}
      }
    }
    if (validQueryParam(schema)) {
      if (schema.slice(0, 1) === '/' && schema.slice(-1) === '/') {
        schema = schema.replace(/(^[/]|[/]$)/g, '')
        let re = new RegExp(schema, 'i')
        schemaQuery = {'schemaId': { '$regex': re }}
      } else {
        schemaQuery = {'schemaId': {'$eq': schema}}
      }
    }
    if (validQueryParam(schemas)) {
      let schemaList = schemas.split(',')
      let schemasParams = []
      if (schemaList.length > 0) {
        schemaList.forEach(function (v) {
          schemasParams.push({'schemaId': {'$eq': v}})
        })
        schemasQuery = { '$or': schemasParams }
      }
      logger.debug(req.path + ' schemasQuery: ' + JSON.stringify(schemasQuery))
    }
    if (titleQuery && schemaQuery) {
      query = {
        '$and': [titleQuery, schemaQuery]
      }
    } else if (titleQuery && schemasQuery) {
      query = {
        '$and': [titleQuery, schemasQuery]
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
          jsonResp.data.push({ '_id': v._id, 'schema': v.schemaId, 'title': v.title, 'content': v.xml_str })
        })
        logger.info('/explore/select query=' + JSON.stringify(query) + ' returned: ' + jsonResp.data.length + ' records.')
        res.json(jsonResp)
      }
    })
  }
})

function validCuratedDataState (curatedDataState) {
  let validStates = ['EditedNotValid', 'EditedValid', 'Valid', 'NotValid', 'Ingest', 'IngestFailed', 'IngestSuccess']
  return validStates.includes(curatedDataState)
}

function matchValidXmlTitle (title) {
  let rv = title.match(/^[A-Z]([0-9]+)[_][S]([0-9]+)[_][\S]+[_]\d{4}([.][Xx][Mm][Ll])?$/) // e.g. L183_S12_Poetschke_2003.xml
  return rv
}

app.post('/curate', function (req, res) {
  let func = 'curate'
  let jsonResp = {'error': null, 'data': null}
  // TODO need to keep prior versions of XML by using a version number in the record
  let title = req.body.title
  let schemaId = req.body.schemaId
  let content = req.body.content
  let userid = req.body.userid
  let ispublished = req.body.ispublished || false // no camelcase
  let isPublic = req.body.isPublic || false
  if (!userid) {
    userid = req.headers['nmLoginUserId'] // set by auth middleware
  } else {
    // TODO verify that overriding user is admin and that the specified user exists (should be done in middleware)
  }
  logger.debug(func + ' -  title: ' + title + ' userid: ' + userid)
  // NOTE: setting curatedDataState to anything past editedPassedVerify requires admin level authority
  let curatedDataState = req.body.curatedDataState // editedFailedVerify, editedPassedVerify (not trusted), triggers system validation
  let curateState = 'Edit' // Insert/update xml always returns to edit for now - TODO authz may change that
  let msg = `/curate - title: ${title} schemaId: ${schemaId} `
  if (validCuratedDataState(curatedDataState)) { // TODO validCuratedDataState should be authz driven
    // check schema id
    let m = matchValidXmlTitle(title) // e.g. L183_S12_Poetschke_2003.xml
    if (m) {
      let dsSeq = m[1]
      // look up the dataset to ensure that it exists
      let dsQuery = {'seq': dsSeq}
      Datasets.find(dsQuery, function (err, docs) {
        if (err || docs.length === 0) {
          jsonResp.err = 'unable to find associated dataset: ' + dsSeq + ' err: ' + err
          console.log(msg + ' ' + jsonResp.err)
          return res.status(400).json(jsonResp)
        } else {
          // upsert the data to curate
          let xmlQuery = {'title': title, 'schemaId': schemaId}
          let theData = {
            'title': title,
            'schemaId': schemaId,
            'entityState': curatedDataState,
            'dsSeq': dsSeq,
            'ispublished': ispublished,
            'isPublic': isPublic,
            'iduser': userid,
            'curateState': curateState,
            'xml_str': content
          }
          XmlData.findOneAndUpdate(xmlQuery, theData, {'upsert': true}, function (err, doc) {
            if (err) {
              jsonResp.error = err
              return res.status(500).json(jsonResp)
            }
            return res.status(201).json(jsonResp)
          })
        }
      })
    } else {
      jsonResp.error = 'title does not meet standard: ' + title
      return res.status(400).json(jsonResp)
    }
  } else {
    jsonResp.error = 'error - curatedDataState: ' + curatedDataState + ' is not a valid state.'
    return res.status(400).json(jsonResp)
  }
})

app.post('/blob', function (req, res) {
  // save blob to gridfs
  let jsonResp = {'error': null, 'data': null}
  let bucketName = req.body.bucketName
  let filename = req.body.filename
  let dataUri = req.body.dataUri
  if (filename && typeof filename === 'string' && dataUri && typeof dataUri === 'string') {
    let options = {}
    if (bucketName && typeof bucketName === 'string') {
      options.bucketName = bucketName
    }
    let buffer = datauri(dataUri)
    // logger.info('blob dataUri buffer length: ' + buffer.length)
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, options)
    let bufferStream = new stream.PassThrough()
    // bufferStream.write(buffer)
    bufferStream.end(buffer)
    let uploadStream = bucket.openUploadStream(filename)
    bufferStream
      .pipe(uploadStream)
      .on('error', function (err) {
        jsonResp.error = new Error(err)
        return res.status(500).json(jsonResp)
      })
      .on('finish', function () {
        logger.info('wrote data to gridFSBucket : ' + (bucketName || 'default') + ' id is: ' + uploadStream.id)
        jsonResp.data = {'id': uploadStream.id}
        return res.status(201).json(jsonResp)
      })
    bufferStream.resume()
  } else {
    let msg = 'Target filename and data to post is required for file upload.'
    logger.error('post /blob: ' + msg)
    jsonResp.error = new Error(msg)
    return res.status(400).json(jsonResp)
  }
})

app.get('/dataset/filenames/:xmlId', function (req, res) {
  // TODO handle authorization
  // return list of fully qualified filenames for blobs associated with sample
  let jsonResp = {'error': null, 'data': null}
  let xmlId = req.params.xmlId
  let validTitle = matchValidXmlTitle(xmlId)
  if (validTitle) {
    datasetXmlFileList(xmlId)
      .then(function (files) {
        jsonResp.data = {'files': files}
        return res.status(200).json(jsonResp)
      })
      .catch(function (err) {
        jsonResp.error = 'error: ' + err
        return res.status(500).json(jsonResp)
      })
  } else {
    jsonResp.error = 'xmlTitle format not valid'
    return res.status(400).json(jsonResp)
  }
})
app.get('/dataset/file/:dsSeq/:xmlId/:filename', function (req, res) {
  let dsSeq = req.params.dsSeq
  let xmlId = req.params.xmlId
  let filename = req.params.filename
  let bucketName = datasetBucketName
  // Probably needs to look into default bucketname as well -- or ...
  //  1 - put all data into default bucket
  //  2 - put images into the default bucket as well as the curateinput bucket (might work best)
  // TODO ...
})

app.get('/blob', function (req, res) { // MDCS only supports get by id (since they save id in XML) and filename is almost superfluous
  //    for our purposes, get will support filename (expected to be schemaid/xml_title/filename), bucketname (optional) or id
  //    HOWEVER, existing file names (the ones converted from MDCS), so the id must be extracted from the xml and supplied as parameter
  //      since MDCS (1.3) filenames are not unique
  // get blob and send to client
  let jsonResp = {'error': null, 'data': null}
  let id = req.query.id // may be empty
  let bucketName = req.query.bucketname // may be empty
  let fileName = req.query.filename // may be empty
  let options = {}
  if (bucketName && typeof bucketName === 'string') {
    options.bucketName = bucketName
  }
  // At least id or filename is required
  if ((id && !fileName) || (fileName && !id)) {
    let dlStream = null
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, options)
    if (id) {
      try {
        dlStream = bucket.openDownloadStream(ObjectId.createFromHexString(id), {})
      } catch (err) {
        res.status(404).send('NOT FOUND: ' + id)
      }
      dlStream.on('file', function (fileRec) {
        let fn = fileRec.filename
        let mt = mimetypes.lookup(fn)
        res.set('Content-Type', mt)
        let fnc = fn.split('/')
        res.attachment(fnc.slice(-1)[0])
      })
      dlStream.on('error', function (err) {
        res.status(404).send('NOT FOUND: ' + id)
      })
      dlStream.on('data', function (data) {
        res.write(data)
      })
      dlStream.on('end', function () {
        // stream is done. Send response.
        res.end()
      })
    } else {
      try {
        dlStream = bucket.openDownloadStreamByName(fileName, {})
      } catch (err) {
        res.status(404).send('NOT FOUND: ' + fileName)
      }
      dlStream.on('file', function (fileRec) {
        let fn = fileRec.filename
        let mt = mimetypes.lookup(fn)
        res.set('Content-Type', mt)
        let fnc = fn.split('/')
        res.attachment(fnc.slice(-1)[0])
      })
      dlStream.on('error', function (err) {
        res.status(404).send('NOT FOUND: ' + id)
      })
      dlStream.on('data', function (data) {
        res.write(data)
      })
      dlStream.on('end', function () {
        // stream is done. Send response.
        res.end()
      })
    }
  } else {
    let err = new Error('get blob requires either id or filename')
    jsonResp.error = err
    return res.status(400).json(jsonResp)
  }
})

app.get('/dataset', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  let id = req.query.id
  let seq = req.query.seq
  let doi = req.query.doi
  if (validQueryParam(id)) {
    Datasets.findById(id, function (err, ds) {
      if (err) {
        jsonResp.error = err
        return res.status(500).json(jsonResp)
      } else {
        jsonResp.data = ds
        return res.json(jsonResp)
      }
    })
  } else if (validQueryParam(seq)) {
    Datasets.find({'seq': {'$eq': seq}}, function (err, doc) {
      if (err) {
        jsonResp.error = err
        return res.status(500).json(jsonResp)
      } else {
        jsonResp.data = doc
        return res.json(jsonResp)
      }
    })
  } else if (validQueryParam(doi)) {
    Datasets.find({'doi': {'$eq': doi}}, function (err, doc) {
      if (err) {
        jsonResp.error = err
        return res.status(500).json(jsonResp)
      } else {
        jsonResp.data = doc
        return res.json(jsonResp)
      }
    })
  } else {
    // return all datasets for now
    Datasets.find({}).sort({'seq': 1}).exec(function (err, docs) {
      if (err) {
        jsonResp.error = err
        return res.status(500).json(jsonResp)
      } else {
        jsonResp.data = docs
        return res.json(jsonResp)
      }
    })
  }
})

app.post('/dataset/update', function (req, res) {
  let jsonResp = {'error': null, 'data': null}
  let dsUpdate = req.body.dsUpdate
  let dsSeq = req.body.dsSeq
  console.log('datataset/update: doing update...' + JSON.stringify(dsUpdate))
  Datasets.findOneAndUpdate({'seq': dsSeq}, {$set: dsUpdate}, {}, function (err, oldDoc) {
    if (err) {
      jsonResp.error = err
      console.log('datataset/update: error - ' + err)
      return res.status(500).json(jsonResp)
    } else {
      jsonResp.data = oldDoc
      console.log('datataset/update: success - ' + oldDoc)
      return res.status(200).json(jsonResp)
    }
  })
})
app.post('/dataset/create', function (req, res) {
  // TODO dataset needs a unique index on seq to ensure there are no dups
  // TODO dataset also needs a unique index on DOI to ensure that DOIs are not dup'd
  let jsonResp = {'error': null, 'data': null}
  let dsInfo = req.body.dsInfo
  Datasets.find({}).sort({'seq': 1}).exec(function (err, docs) {
    if (err) {
      jsonResp.error = err
      return res.status(500).json(jsonResp)
    } else {
      let last = -1
      let newSeq = -1
      let done = false
      docs.forEach(function (v) {
        if (!done) {
          if (v.seq > (last + 1) && last >= 101) {
            newSeq = last + 1
            done = true
          }
          last = v.seq
        }
      })
      if (!done) {
        newSeq = last + 1
      }
      console.log('newSeq: ' + newSeq)
      jsonResp.data = {'seq': newSeq}
      dsInfo.seq = newSeq
      Datasets.create(dsInfo, function (err, doc) {
        if (err) {
          jsonResp.error = err
          return res.status(500).json(jsonResp)
        } else {
          jsonResp.data = doc
          return res.status(201).json(jsonResp)
        }
      })
    }
  })
})
/* END -- rest services related to XMLs, Schemas and datasets */

/* BEGIN -- User related services */
app.post('/user', function (req, res) {
  let func = 'userPostHandler'
  let jsonResp = {'error': null, 'data': null}
  let userid = req.body.userid
  let email = req.body.email
  let givenName = req.body.givenName
  let surName = req.body.surName
  let displayName = req.body.displayName
  getUserInfo(userid)
    .then(function (userDoc) {
      if (userDoc === null) {
        createUser(userid, email, givenName, surName, displayName)
          .then(function (newDoc) {
            jsonResp.data = JSON.stringify(newDoc)
            jsonResp.err = null
            logger.info(func + ' - created userid: ' + userid)
            return res.status(201).json(jsonResp)
          })
          .catch(function (err) {
            jsonResp.err = err
            return res.status(500).json(jsonResp)
          })
      } else { // user exists. Return 409 conflict, but return the user doc as well
        // TODO decide whether to actually return the apiAccess field since it contains privileged information
        delete userDoc.apiAccess // for now delete it completely since 0 len array may be more confusing
        jsonResp.data = JSON.stringify(userDoc)
        jsonResp.err = 'User already exists'
        return res.status(409).json(jsonResp)
      }
    })
    .catch(function (err) {
      jsonResp.err = err
      return res.status(500).json(jsonResp)
    })
})
app.get('/users', function (req, res) {
  let func = 'usersGetHandler'
  let jsonResp = {'error': null, 'data': null}
  let users = []
  Users.find({}).cursor()
    .on('data', function (userDoc) {
      logger.error(func + ' - userDoc: ' + JSON.stringify(userDoc))
      if (userDoc) {
        let user = {
          'userid': userDoc.userid,
          'givenName': userDoc.givenName,
          'surName': userDoc.surName,
          'displayName': userDoc.displayName,
          'email': userDoc.email
        }
        users.push(user)
      }
    })
    .on('end', function () {
      let msg = func + ' - returning ' + users.length + 'users'
      logger.info(msg)
      jsonResp.data = users
      res.status(200).json(jsonResp)
    })
})
/* END -- User related services */

/* BEGIN -- refresh token service */
function newAccessTokenAndExpiration () {
  let hr4 = 4 * 60 * 60 * 1000 // 4 hrs in seconds
  return {'accessToken': shortUUID.new(), 'expiration': (moment().unix() + hr4)}
}
function updateUserAccessToken (userid, apiToken, refreshToken, accessToken, expiration) {
  let func = 'updateUserAccessToken'
  logger.debug(func + ' - userid: ' + userid + ' apiToken: ' + apiToken + ' refreshToken: ' + refreshToken)
  let p = new Promise(function (resolve, reject) {
    Users.findOne({'userid': userid}, function (err, doc) {
      if (err) {
        logger.error(func + ' - error finding user to update by userid: ' + userid + ' err: ' + err)
        reject(new Error('cannot find user: ' + userid))
      } else {
        // first remove all entries with the refreshToken/apiToken (there should be only 1 -- report error if more than 1)
        let newTokens = []
        newTokens.push(`${apiToken} ${refreshToken} ${accessToken} ${expiration}`)
        doc.apiAccess.forEach(function (v) { // clear out occurrence(s) of apiToken
          let parts = v.split(' ')
          if (parts[APIACCESS_APITOKEN_PART] !== apiToken) { // each user should only have 1 occurrence of apiToken
            newTokens.push(v)
          }
        })
        doc.apiAccess = newTokens
        Users.findOneAndUpdate({'userid': userid}, doc)
          .then(function () {
            logger.debug(func + ' - successfully updated user refresh token for userid: ' + userid + ' apiToken: ' + apiToken)
            resolve()
          })
          .catch(function (err) {
            logger.error(func + ' - error updating user refresh token for userid: ' + userid + ' apiToken: ' + apiToken)
            reject(err)
          })
      }
    })
  })
  return p
}
app.post('/refreshtoken', function (req, res) {
  let func = 'refreshtoken'
  let jsonResp = {'error': null, 'data': null}
  let newToken = {'accessToken': null, 'expiration': 0}
  let systemToken = req.body.systemToken
  let apiToken = req.body.apiToken
  let refreshToken = req.body.refreshToken
  let userid = null
  if (systemToken === nmAuthSystemToken) {
    Api.findOne({'token': {'$eq': apiToken}}, function (err, apiDoc) {
      if (err) {
        logger.error(func + ' - invalid api token: ' + apiToken + ' json: ' + JSON.stringify(req.body) + ' err: ' + err)
        setTimeout(function () {
          jsonResp.error = 'invalid token'
          return res.status(401).json(jsonResp)
        }, 5000) // force 5s wait if sys token invalid
      } else {
        if (apiDoc && apiDoc !== null) {
          if (apiDoc.token === apiToken) { // redundant
            // TODO this is very inefficient -- need to re-structure the relationship between users and access tokens
            let found = 0
            let updated = []
            Users.find({}).cursor()
              .on('data', function (userDoc) {
                userDoc.apiAccess.forEach(function (v) { // token array in user record "refreshtoken apitoken accesstoken expiration"
                  let parts = v.split(' ') // components cannot contain spaces - short-UUID
                  if (parts[APIACCESS_REFRESHTOKEN_PART] === refreshToken && parts[APIACCESS_APITOKEN_PART] === apiToken) {
                    ++found
                    userid = userDoc.userid
                    if (parts[APIACCESS_ACCESSTOKEN_PART]) { // existing access token
                      if (parts[APIACCESS_EXPIRATION_PART] && !isNaN(+(parts[APIACCESS_EXPIRATION_PART]))) { // has it expired?
                        let exp = +(parts[APIACCESS_EXPIRATION_PART])
                        let hr = 60 * 60 * 1000 // seconds
                        let now = moment().unix() // unix timestamp
                        logger.debug(func + ' now: ' + now + ' 1 hr: ' + hr + ' exp: ' + exp + ' exp - hr: ' + (exp - hr) + ' (exp-hr)>now ' + ((exp - hr) > now))
                        if ((exp - hr) > now) { // expires in more than 1 hr, return current token
                          newToken.accessToken = parts[APIACCESS_ACCESSTOKEN_PART]
                          newToken.expiration = exp
                          logger.debug(func + ' returning current access token since it has not expired and has adequate time left. userid: ' + userDoc.userid)
                        } else { // allocate a new access token
                          logger.debug(func + ' allocating a new token since the current token expired or is near expiration. userid: ' + userDoc.userid)
                          newToken = newAccessTokenAndExpiration()
                          updated.push(userDoc)
                        }
                      } else { // formatting error, so allocate new access token (should not ever happen -- except as test)
                        logger.debug(func + ' allocating a new token since the expiration cannot be determined. exp: ' + parts[APIACCESS_EXPIRATION_PART] + ' userid: ' + userDoc.userid)
                        newToken = newAccessTokenAndExpiration()
                        updated.push(userDoc)
                      }
                    } else { // no current access token, so allocate one
                      logger.debug(func + ' no refresh token specified for api token record???. user: ' + userDoc.userid + ' parts: ' + v)
                    }
                  } else { // api token and refresh token do not match record
                    // nothing to do here. Below, if found==0 (no apiToken/refreshToken combo found) then 403 is generated
                  }
                })
              })
              .on('end', function () {
                if (found > 0) {
                  jsonResp.error = null
                  jsonResp.data = newToken
                  if (found > 1) {
                    logger.error(func + ' - refreshtoken found more than one (' + found + ') refreshtoken for an apitoken. This is an error.')
                  }
                  if (updated.length > 0) {
                    updateUserAccessToken(updated[0].userid, apiToken, refreshToken, newToken.accessToken, newToken.expiration)
                      .then(function () {
                        return res.status(201).json(jsonResp)
                      })
                      .catch(function (err) {
                        jsonResp.error = err
                        jsonResp.data = null
                        return res.status(500).json(jsonResp)
                      })
                  } else if (newToken.accessToken !== null) {
                    return res.status(200).json(jsonResp)
                  } else {
                    let msg = func + ' - failed to find/allocate access token. Server logic or configuration error.'
                    logger.error(msg + ' Returning failure(500) to client. ')
                    jsonResp.error = msg
                    jsonResp.data = null
                    return res.status(500).json(jsonResp)
                  }
                } else { // the user has no refresh token for the Api token requested
                  logger.debug(func + ' - api user supplied invalid refresh api/refresh token combo.')
                  jsonResp.error = 'invalid token'
                  jsonResp.data = null
                  return res.status(401).json(jsonResp)
                }
              })
          } else { // redundant
            logger.error(func + ' - invalid api token: ' + apiToken + ' json: ' + JSON.stringify(req.body))
            setTimeout(function () {
              jsonResp.error = 'invalid token'
              return res.status(403).json(jsonResp)
            }, 5000) // force 5s wait if api token invalid
          }
        } else {
          logger.error(func + ' - invalid api token: ' + apiToken + ' json: ' + JSON.stringify(req.body))
          setTimeout(function () {
            jsonResp.error = 'invalid token'
            return res.status(401).json(jsonResp)
          }, 5000) // force 5s wait if sys token invalid
        }
      }
    })
  } else {
    logger.error(func + ' - invalid system token: ' + systemToken + ' json: ' + JSON.stringify(req.body))
    setTimeout(function () {
      jsonResp.error = 'invalid token'
      return res.status(401).json(jsonResp)
    }, 5000) // force 15s wait if sys token invalid
  }
})
/* END -- refresh token service */

/* BEGIN -- Job related rest services */
function updateJobStatus (statusFilePath, newStatus) {
  let statusFileName = statusFilePath + '/' + 'job_status.json'
  let statusObj = {
    'job_status': newStatus,
    'update_dttm': Date()
  }
  try {
    fs.writeFile(statusFileName, JSON.stringify(statusObj), {'encoding': 'utf8'}, function (err) {
      if (err) {
        logger.error('error creating job_status file: ' + statusFileName + ' err: ' + err)
      } else {
        logger.info('updated job status file: ' + statusFileName + ' new status: ' + JSON.stringify(statusObj))
      }
    }) // if it fails, it's OK
  } catch (err) {
    logger.error('try/catch driven for updating job status: ' + statusFileName + ' err: ' + err)
  }
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
      let msg = 'mkdir nmJobDataDir failed. jobDir: ' + jobDir + ' error: ' + err
      logger.error(msg)
      jsonResp.data = null
      jsonResp.error = msg
      res.status(400).json(jsonResp)
    } else {
      fs.writeFile(paramFileName, JSON.stringify(jobParams), {'encoding': 'utf8'}, function (err, data) {
        if (err) {
          updateJobStatus(jobDir, 'preCreateError')
          jsonResp.data = null
          jsonResp.error = 'error updating/creating job parameters file: ' + paramFileName
          res.status(400).json(jsonResp)
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
  // decode dataurl of file into buffer and write it to the job's directory in the Apache tree
  //   It would be better to stream the file, but for now, just extract to buffer and write to file
  let buffer = datauri(jobFileUri)
  console.log('Job type: ' + jobType + ' file mime type: ' + buffer.fullType)
  let rcode = 201
  fs.writeFile(outputName, buffer, {'encoding': 'utf8'}, function (err, data) {
    if (err) {
      updateJobStatus(jobDir, 'postFileError' + '-' + outputName)
      let msg = '/jobpostfile write job file error - file: ' + outputName + ' err: ' + err
      logger.error(msg)
      jsonResp.data = null
      jsonResp.error = msg
      res.status(400).json(jsonResp)
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
  let paramFileName = jobDir + '/' + 'job_parameters.json'

  // execute the configured job in the background
  //   will do better later. At least client code on each side of the interface won't change
  let pgms = config.jobtypes
  let pgm = null
  let pgmdir = null
  pgms.forEach(function (v) {
    if (v.jobtype === jobType) {
      pgmdir = v.pgmdir
      pgm = v.pgmname
    }
  })
  try {
    let jobParams = null
    fs.readFile(paramFileName, {encoding: 'utf8'}, function (err, jobParamsStr) {
      if (err) {
        updateJobStatus(jobDir, 'readParametersOnSubmitError' + '-' + paramFileName)
        let msg = '/jobsubmit write job file error - file: ' + paramFileName + ' err: ' + err
        logger.error(msg)
        jsonResp.data = null
        jsonResp.error = msg
        return res.status(500).json(jsonResp)
      } else {
        jobParams = JSON.parse(jobParamsStr)
        let token = getTokenDataFromReq(req)
        if (token) { // always update user in parameters to either current user or if current=admin same user spec'd in parms
          let userid = token.sub
          let newUser = null
          let oldUser = jobParams.user
          if (token.isAdmin && oldUser && oldUser.length > 0 && userid !== oldUser) { // allow admin to override runAs user
            newUser = oldUser
          } else {
            newUser = userid // set to user running job if not admin or override not requested
          }
          jobParams.user = newUser
          jobParams.submittingUser = userid
          jobParams.originalUser = oldUser
          fs.writeFile(paramFileName, JSON.stringify(jobParams), {'encoding': 'utf8'}, function (err, data) {
            if (err) {
              updateJobStatus(jobDir, 'updateUserOnSubmitError' + '-' + paramFileName)
              let msg = '/jobsubmit write job parameter file error - file: ' + paramFileName + ' err: ' + err
              logger.error(msg)
              jsonResp.data = null
              jsonResp.error = msg
              return res.status(500).json(jsonResp)
            } else {
              updateJobStatus(jobDir, 'userUpdatedOnSubmit-Old(' + oldUser + ')--New(' + newUser + ')')
              if (pgm != null && pgmdir) {
                let jobPid = null
                // TODO track child status and output with events and then update job status, but for now, just kick it off
                let cwd = process.cwd()
                let pgmpath = pathModule.join(cwd, pgmdir)
                pgm = pathModule.join(pgmpath, pgm)
                logger.info('executing: ' + pgm + ' in: ' + pgmpath)
                let localEnv = {'PYTHONPATH': pathModule.join(cwd, '../src/jobs/lib')}
                localEnv = _.merge(localEnv, process.env)
                let child = require('child_process').spawn(pgm, [jobType, jobId, jobDir], {'cwd': pgmpath, 'env': localEnv})
                jobPid = child.pid
                updateJobStatus(jobDir, {'status': 'submitted', 'pid': jobPid})
                jsonResp.data = {'jobPid': jobPid}
                return res.json(jsonResp)
              } else {
                updateJobStatus(jobDir, 'failed-no-pgm-defined')
                jsonResp.error = 'job type has program not defined'
                return res.status(400).json(jsonResp)
              }
            }
          })
        } else {
          let msg = 'Did not run job because proper userid was not set in JWT token. This should not happen since auth required to get here!'
          logger.error(msg + ' token: ' + JSON.stringify(token))
          jsonResp.error = msg
          return res.status(500).json(jsonResp)
        }
      }
    })
  } catch (err) {
    updateJobStatus(jobDir, 'failed-to-exec-' + err)
    jsonResp.error = 'job failed to exec: ' + err
    res.status(400).json(jsonResp)
  }
})
/* end job related rest services */

/* email related rest services - begin */
app.post('/jobemail', function (req, res, next) { // bearer auth
  let jsonResp = {'error': null, 'data': null}
  let jobtype = req.body.jobtype
  let jobid = req.body.jobid
  let userId = req.body.user
  let emailtemplate = req.body.emailtemplatename
  let emailvars = req.body.emailvars
  emailvars.jobtype = jobtype
  emailvars.jobid = jobid
  // read the email template, merge with email vars

  fs.readFile('config/emailtemplates/' + jobtype + '/' + emailtemplate + '.etf', function (err, etfText) {
    if (err) {
      jsonResp.error = {'statusCode': 400, 'statusText': 'unable to find template file.'}
      return res.status(400).json(jsonResp)
    }
    let filled = null
    try {
      filled = templateFiller(etfText, emailvars)
    } catch (fillerr) {
      logger.error('error occurred filling out email template. jobtype: ' + jobtype + ' jobid: ' + jobid + ' template: ' + emailtemplate + ' vars: ' + JSON.stringify(emailvars))
      jsonResp.error = 'error filling out email template for jobid: ' + jobid
      return res.status(400).json(jsonResp)
    }
    logger.debug('filled out email template: ' + filled)
    if (sendEmails) {
      let userEmailAddr = emailTestAddr
      let adminEmailAddr = emailAdminAddr
      let userPromise = new Promise(function (resolve, reject) {
        if (nmAuthType !== 'local') {
          // get user's email address from database
          Users.findOne({userid: {'$eq': userId}}, function (err, userDoc) {
            if (err) {
              reject(err)
            } else {
              userEmailAddr = userDoc.email
              resolve()
            }
          })
        } else {
          resolve()
        }
      })
      userPromise.then(function () {
        let message = {
          subject: 'NanoMine completion notification for job: ' + jobid,
          text: filled,
          html: filled,
          from: adminEmailAddr,
          to: userEmailAddr,
          envelope: {
            from: 'noreply <' + adminEmailAddr + '>',
            to: userEmailAddr
          }
        }
        smtpTransport.sendMail(message, function (err, info) {
          if (err) {
            jsonResp.error = err
            logger.error('sendMail error: ' + err)
            return res.status(400).json(jsonResp)
          }
          logger.info('smtp return info: ' + JSON.stringify(info))
          return res.json(jsonResp) // TODO interpret info object to determine if anything needs to be done
        })
      })
        .catch(function (err) {
          return res.status(400).send(err)
        })
    } else {
      return res.json(jsonResp)
    }
  })
})

app.post('/contact', function (req, res, next) { // bearer auth
  let func = 'contact'
  let jsonResp = {'error': null, 'data': null}
  let userId = ''
  let contactType = req.body.contactType
  let contactText = req.body.contactText
  let userEmailAddr = emailTestAddr
  let adminEmailAddr = emailAdminAddr
  let userGivenName = ''
  let userSurName = ''
  let userDisplayName = ''
  let token = req.cookies['token']
  if (token) {
    try {
      let decoded = jwtBase.verify(token, nmAuthSecret)
      userId = decoded.sub // subject
      logger.debug(func + ' - user: ' + userId + ' accessing: ' + req.path)
      userEmailAddr = decoded.mail
      userGivenName = decoded.givenName
      userSurName = decoded.sn
      userDisplayName = decoded.displayName
    } catch (err) {
      logger.error(func + ' - check jwt token failed. err: ' + err)
    }
  } else {
    logger.error(func + ' - no jwt token found in cookie.')
  }
  let emailText = `
      \nuser id: ${userId}
      \nuser email: ${userEmailAddr}
      \nuser givenName: ${userGivenName}
      \nuser surName: ${userSurName}
      \nuser fullName: ${userDisplayName}
      \ncontact type: ${contactType}
      \ntext: ${contactText} 
      `
  let emailHtml = emailText.replace(/[\n]/g, '<br/>')
  if (sendEmails) {
    logger.debug('email text: ' + emailText)
    let message = {
      subject: `NanoMine contact request. Type: ${contactType} from: ${userEmailAddr}`,
      text: emailText,
      html: emailHtml,
      from: adminEmailAddr,
      to: adminEmailAddr,
      envelope: {
        from: 'noreply <' + adminEmailAddr + '>',
        to: adminEmailAddr
      }
    }
    smtpTransport.sendMail(message, function (err, info) {
      if (err) {
        jsonResp.error = err
        logger.error('sendMail error: ' + err)
        return res.status(400).json(jsonResp)
      }
      logger.info('smtp return info: ' + JSON.stringify(info))
      return res.json(jsonResp) // TODO interpret info object to determine if anything needs to be done
    })
  } else {
    logger.error(func + ' - Not sending emails. : ' + emailText)
    return res.json(jsonResp)
  }
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

// app.get('/', function (req, res) {
//   let ID = 'TestData_' + shortUUID.new()
//   let query = 'a query'
//   let xml = `
//     <PolymerNanocomposite>
//      <ID>${ID}</ID>
//     </PolymerNanocomposite>
//     `
//   xml = xml.trim()
//
//   let jsonData = {
//     xml: xml,
//     xmlLen: xml.length,
//     query: query,
//     queryLen: query.length
//
//   }
//   console.log('session cookie: ' + req.cookies['session'])
//   res.json(jsonData)
// })

function postSparql (callerpath, query, req, res) {
  let url = nmLocalRestBase + '/sparql'
  let jsonResp = {'error': null, 'data': null}
  let data = qs.stringify({'query': query.trim().replace(/[\n]/g, ' ')})
  return axios({
    'method': 'post',
    'url': url,
    'data': data,
    'httpsAgent': httpsAgent
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
  let url = nmLocalRestBase + '/sparql'
  // let jsonResp = {'error': null, 'data': null}
  let data = qs.stringify({'query': query.trim().replace(/[\n]/g, ' ')})
  return axios({
    'method': 'post',
    'url': url,
    'data': data,
    'httpsAgent': httpsAgent
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

// app.post('/xml', function (req, res) { // initial testing of post xml file to nanopub -- ISSUE: result redirects to page with no JSON error
//   let jsonResp = {'error': null, 'data': null}
//   /*
//       expects:
//         {
//           "filetype": "sample", // eventually, more types will be supported. For now, it's just sample
//           "filename": "{sample_file_name}" // like L217_S1_Ash_2002.xml
//           "xml": "XML data as string"
//         }
//   */
//   let url = '/about?view=view&uri=http://localhost/'
//   // let url = '/about?view=view&uri=/'
//   let theType = req.body.filetype
//   let theName = req.body.filename
//
//   let form = new FormData()
//   let buffer = Buffer.from(req.body.xml)
//   form.append('upload_type', 'http://purl.org/net/provenance/ns#File')
//   form.append('contributor', 'erik')
//   form.append('file', buffer, {
//     'filename': theName,
//     'contentType': 'text/xml',
//     'knownLength': req.body.xml.length
//   })
//   let contentLen = form.getLengthSync()
//   console.log('session cookie: ' + req.cookies['session'])
//   let cookieHeader = 'session=' + req.cookies['session']
//   let headers = form.getHeaders() // {'Content-Type': form.getHeaders()['content-type']}
//   if (cookieHeader) {
//     headers.Cookie = cookieHeader
//   }
//   headers['Accept'] = 'text/html,application/xhtml+xml,application/xml,application/json, text/plain, */*'
//   headers['Content-Length'] = contentLen
//   url = url + theType + '/' + req.body.filename.replace(/['_']/g, '-').replace(/.xml$/, '').toLowerCase()
//   console.log('request info - outbound post url: ' + url + '  form data: ' + inspect(form))
//   if (false && theType && typeof theType === 'string' && theName && typeof theName === 'string') { // DISABLED! TODO remove this service
//     theName = theName.replace(/['_']/g, '-')
//     return axios({
//       'method': 'post',
//       'url': url,
//       'headers': headers,
//       'data': form
//     })
//       .then(function (resp) {
//         console.log('post to url: ' + url + ' did not throw an exception')
//         console.log('resp: ' + inspect(resp))
//         jsonResp.data = {}
//         res.json(jsonResp)
//       })
//       .catch(function (err) {
//         console.log('post to url: ' + url + ' DID throw exception -  err: ' + inspect(err))
//         jsonResp.error = err.message
//         res.status(err.response.status).json(jsonResp)
//       })
//   } else {
//     jsonResp.error = 'type and name parameters required. Valid types are: sample. A valid name can be any string'
//     res.status(400).json(jsonResp)
//   }
// })

// app.get('/test1', function (req, res) { // NOTE: Tg type obtained from material property cache map by name, Mass Fraction from filler property map
//   let query = `
// prefix sio:<http://semanticscience.org/resource/>
// prefix ns:<http://nanomine.tw.rpi.edu/ns/>
// prefix np: <http://www.nanopub.org/nschema#>
// prefix dcterms: <http://purl.org/dc/terms/>
// select distinct ?sample ?control ?x ?y ?doi ?title
// where {
//   ?nanopub np:hasAssertion ?ag.
//   graph ?ag {
//       ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
//       ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/FrequencyHz>; sio:hasValue ?x].
//       ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/DielectricLossTangent>; sio:hasValue ?y].
//       ?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/PolyDimethylSiloxane>] .
//       optional {?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/GrapheneOxide>].}
//       ?control sio:hasRole [a sio:ControlRole; sio:inRelationTo ?sample].
//   }
//   ?nanopub np:hasProvenance ?pg.
//   graph ?pg {
//      ?doi dcterms:isPartOf ?journal.
//      ?doi dcterms:title ?title.
//   }
// }
// `
//   return postSparql(req.path, query, req, res)
// })

// app.get('/sample/:id', function (req, res) {
//   let sampleID = req.params.id
//   let url = '/sample/' + sampleID
//   let jsonResp = {'error': null, 'data': null}
//   return axios({
//     'method': 'get',
//     'url': url
//     // 'headers': {'Content-type': 'application/json'},
//   })
//     .then(function (response) {
//       // jsonResp = response.data
//       console.log('' + req.path + ' data: ' + inspect(response))
//       // res.json(jsonResp)
//       jsonResp.data = {'mimeType': 'text/xml', 'xml': response.data}
//       res.json(jsonResp)
//     })
//     .catch(function (err) {
//       console.log('' + res.path + ' error: ' + inspect(err))
//       // jsonResp.error = err.message
//       // jsonResp.data = err.data
//       // res.status(400).json(jsonResp)
//       jsonResp.err = err
//       res.status(400).json(jsonResp)
//     })
// })

// app.get('/samples', function (req, res) {
//   let jsonResp = {'error': null, 'data': null}
//   let query = `
// prefix sio:<http://semanticscience.org/resource/>
// prefix ns:<http://nanomine.tw.rpi.edu/ns/>
// prefix np: <http://www.nanopub.org/nschema#>
// prefix dcterms: <http://purl.org/dc/terms/>
// select distinct ?nanopub
// where {
//   ?file a <http://purl.org/net/provenance/ns#File>.
//   ?nanopub a <https://www.iana.org/assignments/media-types/text/xml>
//
// }
// `
//   postSparql2(req.path, query, req, res, function cb (err, rsp) {
//     if (err != null) {
//       jsonResp.error = err
//       res.status(400).json(jsonResp)
//     } else {
//       let rdata = []
//       rsp.data.results.bindings.forEach(function (v) {
//         let r = v.nanopub.value
//         if (r.match(/['_']/) == null) { // todo xml_ingest bug creates PolymerNanocomposites with appended sub-elements so get rid of them
//           rdata.push(r)
//         }
//       })
//       jsonResp.data = rdata
//       res.json(jsonResp)
//     }
//   })
// })

// app.get('/fullgraph', function (req, res) { // for initial testing and will be removed
//   // get the nanopub graph
//   let query = `
// prefix sio:<http://semanticscience.org/resource/>
// prefix ns:<http://nanomine.tw.rpi.edu/ns/>
// prefix np: <http://www.nanopub.org/nschema#>
// prefix dcterms: <http://purl.org/dc/terms/>
// select distinct ?nanopub ?ag ?s ?p ?o
// where {
//   ?nanopub np:hasAssertion ?ag.
//   graph ?ag {
//     ?s ?p ?o.
//   }
// }
// `
//   return postSparql(req.path, query, req, res)
// })

// app.get('/xml/disk/:schema/:xmlfile', function (req, res) { // this entry point was for some initial testing and will be removed
//   // this is for testing only
//   let jsonResp = {'error': null, 'data': null}
//   let fs = require('fs')
//   let recs = []
//   let schema = req.params.schema // '5b1ebeb9e74a1d61fc43654d'
//   let xmlfile = req.params.xmlfile
//   let targetDir = '/apps/nanomine/rest/data/' + schema
//   let p = []
//   fs.readdir(targetDir, function (err, files) {
//     if (err == null) {
//       files.forEach(function (v) {
//         let mp = new Promise(function (resolve, reject) {
//           fs.readFile(targetDir + '/' + v, {encoding: 'utf-8'}, function (err, data) {
//             console.log('data: ' + data)
//             if (err == null) {
//               if (xmlfile && xmlfile === data.title) {
//                 recs.push({'title': v, 'schema': schema, '_id': shortUUID.new(), 'content': data}) // NOTE: xml ID not persisted, so it's not really useful
//               }
//               resolve()
//             } else {
//               reject(err)
//             }
//           })
//         })
//         p.push(mp)
//       })
//       Promise.all(p)
//         .then(function () {
//           /* */
//           jsonResp.error = null
//           jsonResp.data = recs
//           res.json(recs)
//         })
//         .catch(function (err) {
//           jsonResp.error = err
//           jsonResp.data = null
//           res.status(400).json(jsonResp)
//         })
//     } else {
//       jsonResp.error = err
//       jsonResp.data = err
//       res.status(400).json(jsonResp)
//     }
//   })
// })

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
