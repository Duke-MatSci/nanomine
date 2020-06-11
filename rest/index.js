/* NanoMine REST server */
// NOTE the following is ONLY for testing and reject unauthorized should not be disabled in general.
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

/*
 NOTE: there are posts and gets to localhost:/${XXXX} intended for RDF that will need to change to localhost:/wi/${XXXX} at some point
 */

const axios = require('axios')
const https = require('https')
const util = require('util')
const pathModule = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const mimetypes = require('mime-types')
// was used for posting to rdf - const FormData = require('form-data')
const config = require('config').get('nanomine')

const {createLogger, format, transports} = require('winston')
const { combine, label, printf, prettyPrint } = format
const logFormat = printf(({level, message, label}) => {
  let now = moment().format('YYYYMMDDHHmmssSSS')
  return `${now} [${label}] ${level}: ${message}`
})
const hasha = require('hasha')
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
// not currently used - const authGate = require('express-jwt-permissions')
const shortUUID = require('short-uuid')() // https://github.com/oculus42/short-uuid (npm i --save short-uuid)
const groupMgr = require('./modules/groupMgr').groupmgr
const s2a = require('stream-to-array')
const libxml = require('libxmljs')
const nanomineUtils = require('./modules/utils')
let matchValidXmlTitle = nanomineUtils.matchValidXmlTitle
let env = nanomineUtils.getEnv()
// const getDatasetXmlFileList = nanomineUtils.getDatasetXmlFileList
const getXmlFileList = nanomineUtils.getDatasetXmlFileList
const createDataset = nanomineUtils.createDataset
const updateDataset = nanomineUtils.updateDataset
const getLatestSchemas = nanomineUtils.getLatestSchemas
const sortSchemas = nanomineUtils.sortSchemas
/** Import for Chart Visualization */
const chartRoutes = require('./routes/chartBackup')
// TODO calling next(err) results in error page rather than error code in json

// TODO runAsUser in jwt if possible

// TODO - Revisit the following TODO after upload of renumbered data
// TODO datasets with xml_data records where no xml_data records have been converted to latest schema creates an issue that searching by
//    dataset id can result in a query with no records for xml_data if only looking for those with latest schemaid.
//    Work-around is to mark datasets with a flag - 'latestSchema' and use that to filter dataset lists.
//      Will need to keep the latestSchema updated when schemas are added and xml_data records are converted which will
//      require that dataset evaluation occur as each record is converted to the new schema and invalidation of latestSchema
//      occurs across the board for all xml_data records until they're converted. This probably means that all records being brought
//      forward should probably be done offline and done en mass.

// const ObjectId = mongoose.Types.ObjectId

let logger = configureLogger()
logger.info('NanoMine REST server version ' + config.version + ' starting')

// let datasetBucketName = nanomineUtils.datasetBucketName

let sendEmails = env.sendEmails
let emailHost = env.emailHost
let emailPort = env.emailPort
let emailUser = env.emailUser
let emailPwd = env.emailPwd
let emailTestAddr = env.emailTestAddr
let emailAdminAddr = env.emailAdminAddr
let nmDatasetInitialDoi = env.nmDatasetInitialDoi
let nmWebFilesRoot = env.nmWebFilesRoot
// let nmWebBaseUri = env.nmWebBaseUri
let nmRdfLodPrefix = env.nmRdfLodPrefix
let nmRdfUriBase = env.nmRdfUriBase
let nmJobDataDir = env.nmJobDataDir
let nmLocalRestBase = env.nmLocalRestBase
let nmAutostartCurator = env.nmAutostartCurator
let nmAuthUserHeader = env.nmAuthUserHeader
let nmAuthGivenNameHeader = env.nmAuthGivenNameHeader
let nmAuthDisplayNameHeader = env.nmAuthDisplayNameHeader
let nmAuthSurNameHeader = env.nmAuthSurNameHeader
let nmAuthAnonUserId = env.nmAuthAnonUserId
let nmAuthSystemUserId = env.nmAuthSystemUserId

let nmAuthEmailHeader = env.nmAuthEmailHeader
let nmAuthSessionExpirationHeader = env.nmAuthSessionExpirationHeader
let nmAuthSecret = env.nmAuthSecret
let nmAuthSystemToken = env.nmAuthSystemToken
// let nmSessionSecret = process.env['NM_SESSION_SECRET']
// let nmAuthEnabled = process.env['NM_AUTH_ENABLED'].toLowerCase() === 'yes'
let nmAuthType = env.nmAuthType
let nmAuthTestUser = env.nmAuthTestUser
let nmAuthAdminGroupName = env.nmAuthAdminGroupName
let nmAuthLogoutUrl = env.nmAuthLogoutUrl

let nmStaticDir = '../dist/nmstatic'
let nmStaticImageDir = nmStaticDir + '/img'

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

/* Mongoose schemas re-factored start */
let db = mongoose.connection
let dbUri = process.env['NM_MONGO_URI']
let dbPromise = new Promise(function (resolve, reject) {
  db.on('error', function (err) {
    logger.error('db error: ' + err)
    reject(err)
  })
  db.once('open', function () {
    logger.info('database opened successfully via mongoose connect.')
    resolve()
  })
})
mongoose.connect(dbUri, {keepAlive: true, keepAliveInitialDelay: 300000})

// let mgiVersionSchema = require('./modules/mongo/schema/mgiVersion')(mongoose)
// let MgiVersion = mongoose.model('mgiversion', mgiVersionSchema)

let datasetsSchema = require('./modules/mongo/schema/datasets').datasets(mongoose)
let Datasets = mongoose.model('datasets', datasetsSchema)

let usersSchema = require('./modules/mongo/schema/users')(mongoose)
let Users = mongoose.model('users', usersSchema)

let apiSchema = require('./modules/mongo/schema/api')(mongoose)
let Api = mongoose.model('api', apiSchema)

let sequencesSchema = require('./modules/mongo/schema/sequences').sequences(mongoose)
let Sequences = mongoose.model('sequences', sequencesSchema)

let xmlDataSchema = require('./modules/mongo/schema/xmldata')(mongoose)
let XmlData = mongoose.model('xmlData', xmlDataSchema)

let xsdSchema = require('./modules/mongo/schema/xsd')(mongoose)
let XsdSchema = mongoose.model('xsdData', xsdSchema)

let xsdVersionSchema = require('./modules/mongo/schema/xsdVersion')(mongoose)
let XsdVersionSchema = mongoose.model('xsdVersionData', xsdVersionSchema)

/* Mongoose schemas re-factored end */

try {
  fs.mkdirSync(nmWebFilesRoot) // Sync used during startup
} catch (err) {
  logger.error('mkdir nmWebFilesRoot failed: ' + err)
  logger.error('NOTE: if the error above is EEXISTS, the error can be ignored.')
}

try {
  fs.mkdirSync(nmJobDataDir) // Sync used during startup
} catch (err) {
  logger.error('mkdir nmJobDataDir failed: ' + err)
  logger.error('NOTE: if the error above is EEXISTS, the error can be ignored.')
}

let app = express()
app.set('x-powered-by', false)
app.set('trust proxy', true)

app.use(cookieParser())

let dataSizeLimit = config.rest.dataSizeLimit // probably needs to be at least 50mb
app.use(bodyParser.raw({'limit': dataSizeLimit}))
app.use(bodyParser.json({'limit': dataSizeLimit}))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if(req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use('/chart', chartRoutes)

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
  
  app.use((error, req, res, next) => {
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({error:message})
  })

/* BEGIN Api Authorization */
let allMethods = ['connect', 'delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace']
let authOptions = {
  protect: [
    // path is req.path, loginAuth is whether logged in users(jwtToken via cookie) have access and apiAuth allows access using api tokens
    //   loginAuth also forces group membership check if membership is set - empty membership === any or no group OK
    // NOTE: need to add applicable methods for a path and associate different rules for a path with multiple method filters
    //    If a method is not listed, then the path is NOT protected for that method
    //    The set of all path+methodlist entries should cover all possible combinations for which security is required
    // NOTE: endpoints with 'usesAcls: true' are protected by query code in the handler and require login information if available
    //    but are not required to be authenticated (at this time)
    {path: '/blob/create', loginAuth: true, membership: [], apiAuth: true, apiGroup: 'curate'},
    {path: '/curate', loginAuth: false, membership: [], apiAuth: true, apiGroup: 'curate'},
    {path: '/dataset', usesAcls: true, loginAuth: true, membership: [], apiAuth: true, apiGroup: 'curate'},
    {path: '/dataset/create', loginAuth: true, membership: [], apiAuth: true, apiGroup: 'curate'},
    // /dataset/update sets the verifyOwner flag to true, so it can be called from the GUI (not from the API)
    {path: '/dataset/update', loginAuth: true, membership: [], apiAuth: false, apiGroup: 'curate'},
    // /dataset/updateEx does not set the verifyOwner flag and cannot be called from the GUI. It requires admin group access when called from API
    {path: '/dataset/updateEx', loginAuth: false, membership: ['admin'], apiAuth: true, apiGroup: 'curate'},
    {path: '/jobemail', loginAuth: false, membership: [], apiAuth: true, apiGroup: 'email'},
    {path: '/jobcreate', loginAuth: true, membership: [], apiAuth: true, apiGroup: 'jobs'},
    {path: '/jobpostfile', loginAuth: true, membership: [], apiAuth: true, apiGroup: 'jobs'},
    {path: '/jobsubmit', loginAuth: true, membership: [], apiAuth: true, apiGroup: 'jobs'},
    {path: '/publishfiles2rdf', loginAuth: false, membership: ['admin'], apiAuth: true, apiGroup: 'curate'},
    {path: '/publishxml2rdf', loginAuth: false, membership: ['admin'], apiAuth: true, apiGroup: 'curate'},
    {path: '/sessiontest', loginAuth: true, membership: [], apiAuth: false, apiGroup: 'none'},
    {path: '/schema', loginAuth: true, membership: ['admin'], apiAuth: false, apiGroup: 'none'},
    {path: '/testpubfiles2rdf', loginAuth: true, membership: ['admin'], apiAuth: true, apiGroup: 'curate'},
    {path: '/testpubschema2rdf', loginAuth: true, membership: ['admin'], apiAuth: true, apiGroup: 'curate'},
    {path: '/testpubxml2rdf', loginAuth: true, membership: ['admin'], apiAuth: true, apiGroup: 'curate'},
    {path: '/users', loginAuth: true, membership: ['admin'], apiAuth: true, apiGroup: 'admin'},
    {path: '/user', loginAuth: false, membership: ['admin'], apiAuth: true, apiGroup: 'admin'}
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
            logger.debug(func + ' - found bearer token information for (access token): ' + bearerToken + ' occurrences: ' + found + ' tokenInfo: ' + inspect(tokenInfo))
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
    logger.trace(func + ' - no jwt token found in cookie.')
  }
  return decoded
}

function setNmLoginUserIdHeaderValue (req, userid) {
  let func = 'setNmLoginUserIdHeaderValue'
  // used by middleware to set the userid from the jwt token into the req for use in the request handler
  logger.debug(func + ' -  setting userid into nmLoginUserId header. Userid: ' + userid)
  req.headers['nmLoginUserId'] = userid
}

function getNmLoginUserIdHeaderValue (req) {
  // will return null if the header is not set i.e. the user is not logged in via shibboleth
  let func = 'getNmLoginUserIdFromHeader'
  let rv = req.headers['nmLoginUserId']
  logger.debug(func + ' -  initial value: ' + rv)
  if (!(rv && typeof rv === 'string' && rv.length > 0)) {
    rv = null
  }
  logger.debug(func + ' - final return value: ' + rv)
  if (rv === null) {
    let msg = func + ' returning null value.'
    logger.error(msg)
    // let err = new Error(msg)
    // logger.error(err.message + ' - trace: ' + err.stack)
  }
  return rv
}

function authMiddleware (authOptions) {
  // TODO review this code
  return function (req, res, next) {
    let func = 'authMiddleWare(' + req.path + ')'
    let jsonResp = {'error': null, 'data': null}
    try {
      logger.debug(func + ' - function entry')
      let pathProtected = false
      let usesAcls = false // end point uses acl type controls with custom queries
      let loginAuth = false
      let loginMembership = []
      let apiAuth = false
      // let apiGroup = null
      let loginUserId = null
      let isAdmin = false
      // let runAsUserId = null // Allow admins to set runAsUserId
      // let apiUserId = null
      authOptions.protect.forEach(function (v) {
        if (v.path === req.path) {
          if (v.usesAcls && v.usesAcls === true) {
            usesAcls = true
          }
          pathProtected = true
          loginAuth = v.loginAuth
          loginMembership = v.membership
          apiAuth = v.apiAuth
          // apiGroup = v.apiGroup
        }
      })
      let token = req.cookies['token']
      if (token) {
        try {
          let decoded = jwtBase.verify(token, nmAuthSecret)
          loginUserId = decoded.sub // subject
          isAdmin = decoded.isAdmin
          logger.debug(func + ' - user: ' + loginUserId + ' accessing: ' + req.path)
          setNmLoginUserIdHeaderValue(req, decoded.sub)
        } catch (err) {
          logger.error(func + ' - check jwt token failed. err: ' + err)
        }
      } else {
        logger.trace(func + ' - no jwt token found in cookie.')
      }

      if (pathProtected) {
        // logger.error('protected path: ' + req.path)
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
          if (!authHeader) {
            authHeader = req.get('Authorization') // Authorization is the correct header, BTW
          }
          logger.debug(func + ' - authHeader is: ' + authHeader)
          let bearerToken = null
          if (authHeader) {
            let btParts = authHeader.split(' ')
            if (btParts[0] === 'Bearer' && btParts[1] && btParts[1].length > 0) {
              bearerToken = btParts[1]
            }
            if (bearerToken) {
              logger.debug(func + ' - found bearer token')
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
            if (usesAcls) {
              next() // let endpoint code handle returned data even though login verification may have failed
            } else {
              jsonResp.error = 'not authorized'
              return res.status(403).json(jsonResp)
            }
          }
        } else {
          apiAuthPromise
            .then(function (tokenInfo) {
              if (tokenInfo) {
                setNmLoginUserIdHeaderValue(req, tokenInfo.userId)
                getUserAndAdminInfo(tokenInfo.userId)
                  .then(function (userAndAdminInfo) {
                    if (userAndAdminInfo) {
                      let hasRequiredGroupAccess = true // in case there are no groups
                      loginMembership.forEach(function (v) { // TODO update for memberships other than admin i.e. make dynamic
                        if (v === 'admin') {
                          if (userAndAdminInfo.isAdmin === true) {
                            hasRequiredGroupAccess = true
                          } else {
                            hasRequiredGroupAccess = false
                          }
                        }
                      })
                      if (hasRequiredGroupAccess === true) {
                        next()
                      } else {
                        if (usesAcls) {
                          next()
                        } else {
                          jsonResp.error = 'invalid token'
                          logger.error(func + ' - access requires group access for: ' + tokenInfo.userId + '. Required group access not found.')
                          return res.status(403).json(jsonResp)
                        }
                      }
                    } else {
                      if (usesAcls) {
                        next()
                      } else {
                        jsonResp.error = 'invalid token'
                        logger.error(func + ' - Error getting user and group info for: ' + tokenInfo.userId + ' returned info is null.')
                        return res.status(403).json(jsonResp)
                      }
                    }
                  })
                  .catch(function (err) {
                    if (usesAcls) {
                      next()
                    } else {
                      jsonResp.error = 'failed user lookup'
                      logger.error(func + ' - Failed to getUserAndAdminInfo for: ' + tokenInfo.userId + '. Error: ' + err.message)
                      return res.status(500).json(jsonResp)
                    }
                  })
              } else {
                if (usesAcls) {
                  next()
                } else {
                  jsonResp.error = 'invalid token'
                  return res.status(403).json(jsonResp)
                }
              }
            })
            .catch(function (err) {
              if (usesAcls) {
                next()
              } else {
                jsonResp.error = err
                return res.status(403).json(jsonResp)
              }
            })
        }
      } else {
        logger.trace('non-protected path: ' + req.path)
        next()
      }
    } catch (err) {
      let msg = func + ' - exception in authMiddleware. Unable to process user request for ' + req.path + 'Error: ' + err
      logger.error(msg)
      jsonResp.error = err
      return res.status(401).json(jsonResp)
    }
  }
}

app.use(authMiddleware(authOptions))
/* END Api Authorization */
app.use('/nmstatic', express.static(nmStaticDir))

let oneHour = 60 * 60 // in seconds. TODO test rest API behavior with short LOCAL timeout
let tokenTTL = 4 * oneHour
function handleLogin (req, res) {
  let func = 'handleLogin'
  let remoteUser = null
  let givenName = null
  let displayName = null
  let surName = null
  let emailAddr = null
  let sessionExpiration = null
  let isAnonymous = false
  let userExists = false
  if (nmAuthType === 'local') {
    remoteUser = nmAuthTestUser
    givenName = nmAuthTestUser
    displayName = nmAuthTestUser
    surName = nmAuthTestUser
    emailAddr = emailTestAddr
    sessionExpiration = moment().unix() + tokenTTL
  } else {
    remoteUser = req.headers[nmAuthUserHeader] // OneLink users do not have NetIDs, but all have dudukeids
    givenName = req.headers[nmAuthGivenNameHeader]
    displayName = req.headers[nmAuthDisplayNameHeader]
    surName = req.headers[nmAuthSurNameHeader]
    emailAddr = req.headers[nmAuthEmailHeader]
    sessionExpiration = +(req.headers[nmAuthSessionExpirationHeader])
    if (remoteUser === undefined) {
      isAnonymous = true
      remoteUser = 'anonymous'
      givenName = 'anonymous'
      displayName = 'anonymous user'
      surName = 'anonymous'
      emailAddr = 'anonymous@nodomain.edu'
      sessionExpiration = Math.floor(Date.now() / 1000) + (20 * 60)
    }
  }
  logger.debug(func + ' - headers: ' + JSON.stringify(req.headers))
  logger.debug(`${func} - user info: isAnonymous=${isAnonymous} remoteUser=${remoteUser} givenName=${givenName} displayName=${displayName} surName=${surName} email=${emailAddr} sessionExpiration=${sessionExpiration}`)
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
      res.clearCookie('session', {'httpOnly': true, 'path': '/'})
      res.clearCookie('token', {})
    }
  }
  // TODO enforce forged token check - logout should remove cookie
  // find the user
  let userFindCreatePromise = new Promise(function (resolve, reject) {
    let func = 'userFindCreatePromise'
    if (userExists) {
      logger.debug('User exists flag set in cookie, so will not look up user info.')
      resolve()
    } else {
      getUserAndAdminInfo(remoteUser)
        .then(function (userAndAdminInfo) {
          if (userAndAdminInfo.userInfo) {
            let userDoc = userAndAdminInfo.userInfo
            // let isAdmin = userAndAdminInfo.isAdmin
            if (userDoc.email !== emailAddr || userDoc.givenName !== givenName) {
              // TODO - Users.findOneAndUpdate({'userid': remoteUser},{'upsert': true}, function (err, )
              logger.error('WARNING: user email address or given name has changed!')
            }
            ensureRdfUser(userDoc, userAndAdminInfo.isAdmin)
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
                ensureRdfUser(newDoc, userAndAdminInfo.isAdmin)
                userExists = true
                resolve()
              }
            })
          }
        })
        .catch(function (err) {
          let msg = func + ' - getUserAndAdminInfo failed. Error: ' + err
          logger.error(msg)
          reject(err)
        })
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
                ensureRdfUser(newDoc)
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
          // let isAnonymous = (givenName === 'Anon' && surName === 'Nanomine')
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
          logger.error(func + ' - groupMgr.isGroupMember rejected with error: ' + err)
          reject(err)
        })
    })
      .catch(function (err) {
        logger.error(func + ' - userFindCreatePromise rejected with error: ' + err)
        reject(err)
      })
  })
}

app.get('/secure', function (req, res, next) {
  let func = '/secure handler'
  logger.debug(func + ' - headers: ' + inspect(req.headers))
  handleLogin(req, res)
    .then(function (res) {
      res.redirect('/nm')
    })
    .catch(function (err) {
      logger.error('login error caught from handleLogin: ' + err)
      return res.status(500).send('login error occurred: ' + err)
    })
})

function handleLocalUserIfNecessary (req, res) {
  if (nmAuthType === 'local') {
    return handleLogin(req, res)
  } else {
    return new Promise(function (resolve, reject) {
      resolve()
    })
  }
}

app.get('/nmdevlogin', function (req, res) {
  handleLocalUserIfNecessary(req, res)
    .then(function (res) {
      logger.debug('/nmdevlogin - cookie: ' + inspect(res))
      res.redirect('/nm')
    })
    .catch(function (err) {
      logger.error('/nmdev handleLocalUserIfNecessary returned an error. Error: ' + err.message)
      res.status(500).send('local login error occurred')
    })
})

app.get('/nm', function (req, res) {
  let idx = '../dist/index.html'
  logger.debug('cookies: ' + inspect(req.cookies))
  handleLocalUserIfNecessary(req, res)
    .then(function () {
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
      return res.status(404).send(err)
    })
})

app.get('/logout', function (req, res) {
  let func = '/logout'
  let jsonResp = {error: null, data: {logoutUrl: nmAuthLogoutUrl}}
  logger.debug(func + ' returning status 200 with data: ' + JSON.stringify(jsonResp))
  return res.status(200).json(jsonResp)
})

app.get('/doLogout', function (req, res) {
  let func = '/doLogout'
  res.clearCookie('session', {'httpOnly': true, 'path': '/'})
  res.clearCookie('token', {})
  if (nmAuthType === 'local') {
    res.clearCookie('token', null)
    logger.debug(func + ' - (local auth) redirecting to: /nm')
    res.redirect('/nm')
  } else {
    logger.debug(func + ' - (non-local auth) redirecting to loguout url: ' + nmAuthLogoutUrl)
    res.redirect(nmAuthLogoutUrl) // This redirects to the shibboleth logout url to ensure that the session is cleaned up.
  }
})

/* BEGIN general utility functions */

function ensureRdfUser (userInfo, isAdmin) {
  let func = 'ensureRdfUser'
  return new Promise(function (resolve, reject) {
    // let httpsAgent = new https.Agent(httpsAgentOptions)
    let cookieValue = createOutboundJwt({'userInfo': userInfo, 'isAdmin': isAdmin})
    logger.error(func + ' cookie to send: ' + cookieValue)
    let httpsAgent = {
      host: 'localhost',
      port: '443',
      // path: '/',
      path: '/ensure',
      rejectUnauthorized: false
    }
    return axios({
      'method': 'get',
      'url': nmLocalRestBase + '/ensure',
      // 'params': {ID: 12345},
      'httpsAgent': new https.Agent(httpsAgent),
      'headers': {'Content-Type': 'text/html', 'Cookie': cookieValue}
    })
      .then(function (response) {
        logger.debug(func + ' created rdf user successfully. data: ' + inspect(response))
        resolve(response)
      })
      .catch(function (err) {
        logger.error(func + ' error creating rdf user: ' + inspect(err))
        reject(err)
      })
  })
}

// The following code *should* no longer be needed since we now have datasets by schemaid
// function setDatasetLatestSchemaFlag (dsSeq, bv) {
//   let func = 'setDatasetLatestSchemaFlag'
//   // Datasets.updateOne({'seq': +(dsSeq)}, {'$set': {'latestSchema': bv}}, {'upsert': true}).cursor()
//   Datasets.updateOne({'seq': {'$eq': +(dsSeq)}}, {$set: {'latestSchema': bv}}, function (err, raw) {
//     if (err) {
//       logger.debug(func + ' - updated datasets: done. Error: ' + err)
//     } else {
//       if (raw) {
//         logger.debug(func + ' - updated dataset: ' + dsSeq + ' latestSchema:' + bv + ' raw: ' + JSON.stringify(raw))
//       } else {
//         logger.debug(func + ' - updated dataset: ' + dsSeq + ' latestSchema:' + bv + ' NO RESPONSE FROM MONGO via MONGOOSE?')
//       }
//     }
//   })
// }
//
// function updateDatasetLatestSchema () { // Mark datasets denoting whether each has associated xml_data records for the latest schema
//   // find all the xmls for the latest schema ordered by dataset sequence and build list of sequence numbers
//   // update all the datasets to reset the latestSchema flag
//   // loop through the sequence number list and for each set the associated dataset's latestSchema flag to true
//   // NOTE: this is probably a HACK and not too well thought out at the last minute.
//   let func = 'updateDatasetLatestSchema'
//   let validDatasets = {}
//   getCurrentSchemas()
//     .then(function (versions) {
//       let schemaId = versions[0].currentRef._id
//       // logger.debug(func + ' -- ' + JSON.stringify(versions[0]))
//       // logger.debug(func + ' - latest schemaId is: ' + schemaId)
//       new Promise(function (resolve, reject) { // now requires index on dsSeq for the sort or sort fails
//         XmlData.find({'schemaId': {'$eq': schemaId}}, null, {'sort': {'dsSeq': 1}}).cursor()
//           .on('data', function (data) {
//             // logger.debug(func + ' - dataset: ' + data.dsSeq + ' latestSchema hash updated to true for data: ' + data.title + ' ' + data.schemaId)
//             validDatasets[data.dsSeq] = true // they'll all wind up as true, but it prevents searching (let js do it)
//           })
//           .on('end', function () {
//             // logger.debug(func + ' - on end called for XmlData.find')
//             let len = Object.keys(validDatasets).length
//             if (len > 0) {
//               logger.debug(func + ' - valid dataset count: ' + len)
//               resolve(validDatasets)
//             } else {
//               reject(new Error('no valid datasets'))
//             }
//           })
//       })
//         .then(function (validDatasets) {
//           new Promise(function (resolve, reject) {
//             Datasets.update({}, {'$set': {'latestSchema': false}}, {'multi': true}, function (err, raw) {
//               if (err) {
//                 logger.error(func + ' - update (multi) failed. Error: ' + err)
//                 reject(err)
//               } else {
//                 resolve(validDatasets)
//                 logger.debug(func + ' - dataset update (multi) done:  ' + JSON.stringify(raw))
//               }
//             })
//           })
//             .then(function (validDatasets) {
//               let keys = Object.keys(validDatasets)
//               keys.forEach(function (v) {
//                 // logger.debug(func + ' - will update dataset key ' + v + ' latestSchema to true.')
//                 setDatasetLatestSchemaFlag(+(v), true)
//               })
//             })
//             .catch(function (err) {
//               logger.error(func + ' - XmlData.find error: ' + err)
//             })
//         })
//         .catch(function (err) {
//           logger.error(func + ' - XmlData.find error: ' + err)
//         })
//     })
//     .catch(function (err) {
//       logger.error(func + ' - getCurrentSchemas: ' + err)
//     })
// }
//
// // ... and run at startup
// dbPromise.then(function () {
//   console.log('db opened successfully. Updating datasets.')
//   updateDatasetLatestSchema()
// })

function getUserInfo (userid) {
  let func = 'getUserInfo'
  return new Promise(function (resolve, reject) {
    let found = 0
    Users.find({'userid': {'$eq': userid}}).cursor()
      .on('data', function (userDoc) {
        ++found
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

function getUserAndAdminInfo (userid) { // convenience version that sets isAdmin flag
  let func = 'getUserAndAdminInfo'
  return new Promise(function (resolve, reject) {
    // NOTE: a user can be an admin, but not in the user database yet since our db is not directly coupled to IDM or group mgr
    groupMgr.isGroupMember(logger, nmAuthAdminGroupName, userid)
      .then(function (isAdmin) {
        if (userid === nmAuthSystemUserId) { // Override for grouper (prodQA) scenario, since this user cannot be assigned system, but is used internally
          isAdmin = true
        }
        getUserInfo(userid)
          .then(function (userDoc) {
            if (userDoc) {
              resolve({userInfo: userDoc, 'isAdmin': isAdmin})
            } else { // for Clarity since userDoc may be null
              logger.error(func + ' - WARNING: DB userinfo was null for ' + userid + ' - ensure this was the user create scenario.')
              resolve({userInfo: null, 'isAdmin': isAdmin})
            }
          })
          .catch(function (err) {
            logger.error(func + ' - getUserInfo threw error: ' + err)
            reject(err)
          })
      })
      .catch(function (err) {
        let msg = func + ' - getUserAndAdminInfo failed. Error: ' + err
        logger.error(msg)
        reject(err)
      })
    // getUserInfo(userid)
    //   .then(function (userDoc) {
    //     if (userDoc) {
    //       groupMgr.isGroupMember(logger, nmAuthAdminGroupName, userid)
    //         .then(function (isAdmin){
    //           resolve({userInfo: userDoc, 'isAdmin': isAdmin})
    //         })
    //         .catch(function (err) {
    //           let msg = func + ' - getUserAndAdminInfo failed. Error: ' + err
    //           logger.error(msg) // ERROR
    //         })
    //     } else {
    //       resolve(null)
    //     }
    //   })
    //   .catch(function (err) {
    //     logger.error(func + ' - getUserInfo threw error: ' + err)
    //     reject(err)
    //   })
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

function getCurrentSchemas () { // returns promise resolved with sorted list of current schemas -- latest is first TODO dup of utils.getLatestSchemas
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
        resolve(versions) // NOTE: to get the latest schemaId it's versions[0].currentRef._id -- _id is the schemaId (content is the xsd, filename is the name.xsd, title recently is name, but older ones have 'polymer nanocomposite')
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

function createOutboundJwt (userAndAdminInfo) {
  let userInfo = userAndAdminInfo.userInfo
  let isAdmin = userAndAdminInfo.isAdmin
  let jwToken = jwtBase.sign({
    'sub': userInfo.userid,
    'givenName': userInfo.givenName,
    'sn': userInfo.surName,
    'displayName': userInfo.displayName,
    'isTestUser': (nmAuthType === 'local'),
    'exp': Date.now() / 1000 + 3600,
    'isAdmin': typeof isAdmin === 'boolean' ? isAdmin : false,
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

function datasetXmlFileList (xmlTitle, schemaId) { // returns promise that when fulfilled contains list of file info objects related to XML
  return getXmlFileList(mongoose, logger, xmlTitle, schemaId) // post refactor, but client not changed
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
  let url = nmLocalRestBase + nmRdfUriBase + '/pub'
  let match = matchValidXmlTitle(xmlTitle)
  if (match) {
    let dsSeq = match[1]
    let xmlId = xmlTitle.replace(/\.xml$/, '')
    let whyisId = shortUUID.new()
    // Overall steps:
    //   get latest schema to get name of schema and its ID
    //   Query to get the xml text using the xmlTitle and schema Id
    //   Convert the xml to b64 to prepare it for its part of the JsonLD
    //   Get the list of associated files for the xml (input XLS, associated XLSs, images and processing related files)
    //   Ensure that the job_parameters.json is read to get the input XLS name since it's ref'd specifically in the JsonLD
    //   Encode each associated file as B64, obtain its MimeType and encode them into the appropriate section of the JsonLD
    //   Add each file's name to the section in the JsonLD that lists the file as related to the dataset (fileListLD)

    // get latest schema/schemaId
    getLatestSchemas(XsdVersionSchema, XsdSchema, logger)
      .then(function (schemas) {
        if (schemas && schemas.length > 0) {
          // logger.error('xmlText: ' + xmlText)
          let latestSchema = schemas[0].currentRef // getLatestSchemas
          let schemaId = latestSchema._id
          let schemaName = latestSchema.title
          logger.debug(func + ' - latest schemaId: ' + schemaId + ' name: ' + schemaName)
          // read xmldata for latest schema
          if (xmlTitle.match(/.*\.xml$/) === null) {
            xmlTitle += '.xml' // actual title field of xml data record has .xml appended. Lookup will fail if it's not there.
          }
          let query = {'$and': [{'title': {'$eq': xmlTitle}}, {'schemaId': {'$eq': schemaId}}]}
          XmlData.find(query).exec(function (err, xmlRecs) {
            if (err) {
              cb(err, null)
            } else if (xmlRecs == null || xmlRecs.length < 1) {
              logger.error(func + ' - no xmlRecs found for query: ' + JSON.stringify(query))
              cb(new Error('Not found'), null) // << source of error? Why is xmlrecs null or less than 1?
            } else {
              // XML found
              let xmlRec = xmlRecs[0]
              let b64XmlData = str2b64(xmlRec.xml_str)
              // logger.error('xml-b64: ' + b64XmlData)

              let filePromises = []
              // get list of files (with basename)
              datasetXmlFileList(xmlTitle)
                .then(function (filesInfo) {
                  let filesDataLD = ''
                  let xlsInputFile = 'NOT-KNOWN-DIRECT-XML'
                  let fileListLD = ''
                  filesInfo.forEach(function (fInfo) { // go ahead and fill out the related files section
                    fileListLD += `,
                      {"@id" : "dataset/${dsSeq}/${xmlId}/${fInfo.basename}"}
                    `
                  })
                  filesInfo.forEach(function (fInfo) { // now fill out the data for each file and when all are complete, continue with submit
                    filePromises.push(new Promise(function (resolve, reject) {
                      getMongoFileData('curateinput', null, fInfo.filename)
                        .then(function (buffer) {
                          let msg = 'getMongoFileData("curateinput", ' + fInfo.filename + ') Got data length: ' + buffer.length
                          logger.debug(msg)
                          if (fInfo.basename === 'job_parameters.json') {
                            let params = JSON.parse(buffer.toString('utf8'))
                            xlsInputFile = params.templateName
                          }
                          resolve({'filename': fInfo.filename, 'basename': fInfo.basename, 'buffer': buffer})
                        })
                        .catch(function (err) {
                          let msg = 'error getting data (getMongoFileData) for: ' + fInfo.filename + ' error: ' + err
                          logger.error(msg)
                          console.log(msg)
                          reject(msg)
                        })
                    }))
                  })
                  Promise.all(filePromises)
                    .then(function (valuesArray) {
                      // carry on...
                      valuesArray.forEach(function (v) {
                        let contentType = mimetypes.lookup(v.basename)
                        // convert the file to base64
                        let b64Data = v.buffer.toString('base64') // get the file data and b64 encode it
                        filesDataLD += `,
                            {
                            "@id" : "dataset/${dsSeq}/${xmlId}/${v.basename}",
                            "@type": [ "schema:DataDownload", "mt:${contentType}"],
                            "whyis:hasContent" : "data:${contentType};charset=UTF-8;base64,${b64Data}"
                            }
                        `
                      })
                      // NOTE NOTE NOTE
                      //   FYI - Part of the JsonLD below is built above and added below dynamically
                      let data = `
                        {
                          "@context": {
                            "@base" : "${nmRdfLodPrefix}",
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
                                  "@id" : "/nmr/xml/${xmlId}",
                                  "@type": [ "schema:DataDownload", "mt:text/xml", "http://nanomine.org/ns/NanomineXMLFile"],
                                  "whyis:hasContent" : "data:text/xml;charset=UTF-8;base64,${b64XmlData}",
                                  "prov:wasDerivedFrom" : [{"@id" : "/nmr/dataset/${dsSeq}/${xmlId}/${xlsInputFile}"}],
                                  "dc:conformsTo" : {"@id" : "/nmr/schema/${schemaName}"}
                                }
                                ${filesDataLD}
                                ,{
                                  "@id" : "nmr/dataset/${dsSeq}",
                                  "@type" : "schema:Dataset",
                                  "schema:distribution" : [
                                    {"@id" : "/nmr/xml/${xmlId}"},
                                    {"@id" : "/nmr/dataset/${dsSeq}/${xmlId}/${xlsInputFile}"}
                                    ${fileListLD}
                                  ]
                                }
                              ]
                            }
                          }
                        }`
                      try {
                        let testObject = JSON.parse(data)
                        if (testObject) {
                          logger.debug(func + ' - test object created from generated JSON parsed fine. data context: ' + JSON.stringify(testObject['@context']))
                        }
                      } catch (err) {
                        logger.error(func + ' - unable to parse generated JSON object. Error: ' + err)
                      }
                      getUserAndAdminInfo(userid)
                        .then(function (userAndAdminInfo) {
                          // let userinfo = userAndAdminInfo.userInfo
                          // let isAdmin = userAndAdminInfo.isAdmin
                          let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
                            host: 'localhost',
                            port: '443',
                            method: 'POST',
                            path: nmRdfUriBase + '/pub',
                            rejectUnauthorized: false
                          }
                          let httpsAgent = new https.Agent(httpsAgentOptions)
                          let cookieValue = createOutboundJwt(userAndAdminInfo)
                          logger.debug(func + ' cookie to send: ' + cookieValue)
                          logger.trace(func + ' request data: ' + data)
                          return axios({
                            'method': 'post',
                            'url': url,
                            'data': data,
                            'maxRedirects': 0,
                            // 'validateStatus': null,
                            'httpsAgent': httpsAgent,
                            'headers': {'Content-Type': 'application/ld+json', 'Cookie': cookieValue}
                          })
                            .then(function (response) {
                              logger.trace(func + ' response url was: ' + response.request.res.responseUrl + ' data: ' + inspect(response))
                              logger.debug(func + ' response status: ' + response.status)
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
                    .catch(function (err) {
                      let msg = func + ' - error occurred obtaining file data from mongo: ' + err
                      logger.error(msg)
                      cb(err, null)
                    })
                })
                .catch(function (err) {
                  let msg = func + ' -  error getting file list associated with xml. Error: ' + err
                  logger.error(msg)
                  cb(err, null)
                })
              // No call to callback needed -- everything handled by promise thens/catches
            } // else leg OK handler after error check no additional else or catch needed
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
  let url = nmLocalRestBase + nmRdfUriBase + '/pub'
  let whyisId = shortUUID.new()
  let dsSeq = matchValidXmlTitle(xmlTitle)[1]
  // logger.error('xmlText: ' + xmlText)
  let b64XmlData = str2b64(xmlText)
  // logger.error('xml-b64: ' + b64XmlData)
  let data = `
    {
      "@context": {
        "@base" : "${nmRdfLodPrefix}",
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
              "@id" : "${nmRdfLodPrefix}/nmr/xml/${xmlTitle}?format=xml",
              "@type": [ "schema:DataDownload", "mt:text/xml", "http://nanomine.org/ns/NanomineXMLFile"],
              "whyis:hasContent" : "data:text/xml;charset=UTF-8;base64,${b64XmlData}",
              "dc:conformsTo" : {"@id" : "${nmRdfLodPrefix}/nmr/schema/${schemaName}"}
            },
            {
              "@id" : "${nmRdfLodPrefix}/nmr/dataset/${dsSeq}",
              "@type" : "schema:Dataset",
              "schema:distribution" : [ {"@id" : "${nmRdfLodPrefix}/nmr/xml/${xmlTitle}"} ]
            }
          ]
        }
      }
    }`
  getUserAndAdminInfo(userid)
    .then(function (userAndAdminInfo) {
      // let userinfo = userAndAdminInfo.userInfo
      // let isAdmin = userAndAdminInfo.isAdmin
      let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
        host: 'localhost',
        port: '443',
        method: 'POST',
        path: nmRdfUriBase + '/pub',
        // path: '/sparql',
        rejectUnauthorized: false
      }
      let httpsAgent = new https.Agent(httpsAgentOptions)
      let cookieValue = createOutboundJwt(userAndAdminInfo)
      logger.trace(func + ' cookie to send: ' + cookieValue + ' request data: ' + data)
      return axios({
        'method': 'post',
        'url': url,
        'data': data,
        'maxRedirects': 0,
        // 'validateStatus': null,
        'httpsAgent': httpsAgent,
        'headers': {'Content-Type': 'application/ld+json', 'Cookie': cookieValue}
      })
        .then(function (response) {
          logger.trace(func + ' data: ' + inspect(response) + ' response url was: ' + response.request.res.responseUrl)
          cb(null, response)
        })
        .catch(function (err) {
          logger.trace(func + ' data: ' + inspect(err.response) + ' response url was: ' + err.response.request.res.responseUrl)
          logger.error(func + ' error: ' + err)
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
  let url = nmLocalRestBase + nmRdfUriBase + '/pub'
  // let jsonResp = {'error': null, 'data': null}
  getCurrentSchemas()
    .then(function (schemasArray) {
      if (schemasArray && schemasArray.length > 0) {
        let whyisId = shortUUID.new()
        let schemaName = schemasArray[0].currentRef.title // .replace(/[_]/g, '.')
        let schemaText = schemasArray[0].currentRef.content.replace(/[\n]/g, '')
        // logger.error('schemaText: ' + schemaText)
        let b64SchemaData = str2b64(schemaText)
        // logger.error('schema-b64: ' + b64SchemaData)
        // url += '/' + schemaName
        let data = `
          {
            "@context": {
              "@base" : "${nmRdfLodPrefix}",
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
                    "@id" : "${nmRdfLodPrefix}/nmr/schema/${schemaName}",
                    "@type": [ "mt:text/xml", "http://www.w3.org/2001/XMLSchema" ],
                    "whyis:hasContent" : "data:text/xml;charset=UTF-8;base64,${b64SchemaData}"
                  }
                ]
              }
            }
          }`
        getUserAndAdminInfo(userid)
          .then(function (userAndAdminInfo) {
            // let userinfo = userAndAdminInfo.userInfo
            // let isAdmin = userAndAdminInfo.isAdmin
            let httpsAgentOptions = { // allow localhost https without knowledge of CA TODO - install ca cert on node - low priority
              host: 'localhost',
              port: '443',
              method: 'POST',
              path: nmRdfUriBase + '/pub',
              // path: '/sparql',
              rejectUnauthorized: false
            }
            let httpsAgent = new https.Agent(httpsAgentOptions)
            let cookieValue = createOutboundJwt(userAndAdminInfo)
            logger.error(func + ' cookie to send: ' + cookieValue + ' request data: ' + data)
            return axios({
              'method': 'post',
              'url': url,
              'data': data,
              maxRedirects: 0,
              // validateStatus: null,
              'httpsAgent': httpsAgent,
              'headers': {'Content-Type': 'application/ld+json', 'Cookie': cookieValue}
            })
              .then(function (response) {
                logger.trace(func + ' data: ' + inspect(response) + ' response url was: ' + response.request.res.responseUrl) // detect redirect
                logger.debug(func + ' - response: ' + response.status)
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
app.post('/publishfiles2rdf', function (req, res) {
  let func = 'publishfiles2rdf'
  logger.debug(func + ' - function entry')
  let xmlTitle = req.body.xmltitle // {title: title, userid: userid}
  let targetUserid = req.body.userid
  let jsonResp = {error: null, data: null}
  if (xmlTitle && matchValidXmlTitle(xmlTitle)) {
    publishFiles(targetUserid, xmlTitle, function cb (err, response) {
      if (err) {
        let msg = func + ' failed: ' + err
        logger.error(msg)
        jsonResp.error = msg
        res.status(500).json(jsonResp)
      } else {
        let msg = func + ' success!!!'
        logger.info(msg)
        res.status(201).json(jsonResp)
      }
    })
  } else {
    jsonResp.error = 'invalid xml title'
    res.status(400).json(jsonResp)
  }
})
app.post('/publishxml2rdf', function (req, res) {
  let func = 'publishxml2rdf'
  logger.debug(func + ' - function entry')
  let xmlTitle = req.body.xmltitle // {title: title, userid: userid}
  let xmlText = req.body.xmltext
  let schemaName = req.body.schemaname
  let targetUserid = req.body.userid
  let jsonResp = {error: null, data: null}
  if (xmlTitle && matchValidXmlTitle(xmlTitle)) {
    publishXml(targetUserid, xmlTitle, xmlText, schemaName, function cb (err, response) {
      if (err) {
        let msg = func + ' failed: ' + err
        logger.error(msg)
        jsonResp.error = msg
        res.status(500).json(jsonResp)
      } else {
        let msg = func + ' success!!!'
        logger.info(msg)
        res.status(201).json(jsonResp) // TODO rdf is funky. errors can occur that cause a redirect, so need to handle that error condition by parsing response
      }
    })
  } else {
    jsonResp.error = 'invalid xml title: ' + xmlTitle
    res.status(400).json(jsonResp)
  }
})
app.get('/sessiontest', function (req, res) {
  res.status(200).send('OK')
})

let png = null
app.get('/static.png', function (req, res) {
  let url = req.query.u
  let referrer = req.query.r
  let query = req.query.q
  if (!url) {
    url = '-'
  }
  if (!referrer) {
    referrer = '-'
  }
  if (!query) {
    query = ''
  }
  let fwd = req.get('x-forwarded-for')
  let ip = '-'
  if (fwd) {
    ip = fwd.split(',')[0]
  }
  let ua = req.get('User-Agent')
  if (!ua) {
    ua = '-'
  }
  let datetime = moment().format('DD/MMM/YYYY:HH:mm:ss ZZ') // Apache log date/time format
  let msg = `${ip} - - [${datetime}] "GET ${url} HTTP/1.1" 200 - "${referrer}" "${ua}"\n`
  fs.appendFile('analytics.log', msg, {encoding: 'utf8'}, function (err, data) {
    if (err) {
      res.status(500).send('error: ' + err)
    } else {
      if (png) {
        res.set('Content-Type', 'image/png')
        res.send(png)
      } else {
        fs.readFile(nmStaticImageDir + '/static.png', function (err, data) {
          if (err) {
            res.status(404).send('NOTFND')
          } else {
            png = data
            res.set('Content-Type', 'image/png')
            res.send(png)
          }
        })
      }
    }
  })
})

app.post('/analytics', function (req, res) {
  let data = req.body.data
  let fwd = req.get('x-forwarded-for')
  let ip = '-'
  if (fwd) {
    ip = fwd.split(',')[0]
  }
  let ua = req.get('User-Agent')
  if (!ua) {
    ua = '-'
  }
  let datetime = moment().format('DD/MMM/YYYY:HH:mm:ss ZZ') // Apache log date/time format
  let msg = `${ip} - - [${datetime}] "GET ${data.url} HTTP/1.1" 200 - "${data.referrer}" "${ua}"\n`
  fs.appendFile('analytics.log', msg, {encoding: 'utf8'}, function (err, data) {
    if (err) {
      res.status(500).json({'error': err, 'data': null})
    } else {
      res.status(201).json({'error': null, 'data': null})
    }
  })
})

// Test publishFiles (xml, and datafiles pushed to rdf
app.get('/testpubfiles2rdf', function (req, res) {
  let xmlTitle = req.query.xmltitle
  if (xmlTitle && matchValidXmlTitle(xmlTitle)) {
    setTimeout(function () {
      publishFiles(nmAuthAnonUserId, xmlTitle, function cb (err, response) { // user is Anon Nanomine
        if (err) {
          logger.error('publishFiles test failed: ' + err)
        } else {
          logger.error('publishFiles success!!!')
        }
      })
    }, 100)
    res.send('invoked files publish for: ' + xmlTitle + '. Check log to see what happened.')
  } else {
    res.status(400).send('invalid xml title')
  }
})

// Test publishLatestSchema
app.get('/testpubschema2rdf', function (req, res) {
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
app.get('/testpubxml2rdf', function (req, res) { // L183_S12_Poetschke_2003.xml
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

function saveSchema (filename, xsd) {
  let func = 'saveSchema'
  return new Promise(function (resolve, reject) {
    let filenameErr = '' + filename + ' does not fit accepted format of alphanumeric characters followed by MMDDYY and .xsd e.g. PNC_schema_081218.xsd'
    let m = filename.match(/(.*)(\.[Xx][Ss][Sd]$|\.[Xx][Mm][Ll]$)/)
    if (m) {
      let schemaTitle = (m !== null ? m[1] : filename) // m might be null if not .xsd or .xml - need to move this inside promise
      let dt = filename.match(/(\d{2})(\d{2})(\d{2})/) // MM DD YY
      if (dt && dt[1] && dt[2] && dt[3] && (+(dt[1]) <= 12) && (+(dt[1]) >= 1) && (+(dt[2]) <= 31) && (+(dt[2]) >= 1) && (+(dt[3]) <= 99) && (+(dt[3]) >= 15)) {
        // save new version of schema and mark this version as the latest
        getLatestSchemas(XsdVersionSchema, XsdSchema, logger)
          .then(function (versions) {
            // spin through list to see if filename is already used
            let isUsed = -1
            let newHash = hasha(xsd, {'algorithm': 'sha1'})
            if (versions) { // if there are no versions, then handle as new
              versions.forEach(function (v, idx) {
                if (v.currentRef.filename === filename) {
                  let curHash = v.currentRef.hash
                  isUsed = idx
                  if (curHash !== newHash) {
                    //   if the filename is used by a template version, then
                    //     x check the md5 hash against the current version to ensure that it has not already been uploaded
                    //     use the template version id to create a new schema (template) record using the template version id in the schema rec
                    //     add the new schema id to the versions array of the template version
                    //     set the schema version field to the array position in the template record + 1
                    //     update the template version current id string to the stringified object id of the schema
                    //     set the template version currentRef to the ObjectId of the new schema
                    //     update number of versions in template version record
                    let templateVerId = v._id.toHexString()
                    let xsdDoc = {
                      'title': schemaTitle,
                      'filename': filename,
                      'content': xsd,
                      'templateVersion': templateVerId,
                      'version': v.nbVersions + 1,
                      'hash': hasha(xsd, {'algorithm': 'sha1'}),
                      'dependencies': [],
                      'exporters': [],
                      'XSLTFiles': []
                    }
                    logger.debug(func + '- schema create for existing version record')
                    XsdSchema.create(xsdDoc)
                      .then(function (newXsdDoc) {
                        logger.debug(func + '- create isArray: ' + Array.isArray(newXsdDoc))
                        let xsdId = newXsdDoc._id
                        v.nbVersions += 1
                        v.versions.push(xsdId.toHexString())
                        v.current = xsdId.toHexString()
                        logger.debug(func + ' - about to set objectid')
                        v.currentRef = xsdId // mongoose populate reference
                        logger.debug(func + ' - got past setting objectid')
                        XsdVersionSchema.findByIdAndUpdate(v._id, v).exec()
                          .then(function (opResult) {
                            logger.debug(func + ' - opResult: ' + inspect(opResult))
                            resolve('added schema id: ' + xsdId + ' for version: ' + v.nbVersions + ' to versions id: ' + templateVerId)
                          })
                          .catch(function (err) {
                            let msg = func + ' - find and update - ' + err
                            reject(new Error(msg))
                          })
                      })
                      .catch(function (err) {
                        let msg = func + ' - create schema - ' + err
                        reject(new Error(msg))
                      })
                  } else {
                    let msg = func + ' - create schema - duplicates current version'
                    reject(new Error(msg))
                  }
                }
              })
            }
            if (isUsed === -1) {
              //   if the filename is not used
              //     create a new template version record with 0 versions and save the id
              //     create a new schema (template) record with the template version record id and the version field set to 1
              //     add the new schema id to the array of versions
              //     add the new schema id to the versions array of the template version
              //     update the template version current id string to the stringified object id of the schema
              //     set template versions record nbVersions field to 1
              let versionDoc = {
                'versions': [],
                'deletedVersions': [],
                'nbVersions': 0,
                'isDeleted': false,
                'current': '',
                'currentRef': null
              }

              let xsdDoc = {
                'title': schemaTitle,
                'filename': filename,
                'content': xsd,
                'templateVersion': '',
                'version': 1,
                'hash': newHash,
                'dependencies': [],
                'exporters': [],
                'XSLTFiles': []
              }
              logger.debug(func + '- schema create for new version record')
              XsdSchema.create(xsdDoc)
                .then(function (newXsdDoc) {
                  logger.debug(func + '- create isArray: ' + Array.isArray(newXsdDoc))
                  let xsdId = newXsdDoc._id
                  versionDoc.nbVersions += 1
                  versionDoc.versions.push(xsdId.toHexString())
                  versionDoc.current = xsdId.toHexString()
                  logger.debug(func + ' - about to set objectid')
                  versionDoc.currentRef = xsdId // mongoose populate reference
                  logger.debug(func + ' - got past setting objectid')
                  XsdVersionSchema.create(versionDoc)
                    .then(function (newVersion) {
                      logger.debug(func + ' - create version result: ' + inspect(newVersion))
                      let versionId = newVersion._id
                      let versionIdStr = versionId.toHexString()
                      newXsdDoc.templateVersion = versionIdStr
                      XsdSchema.findByIdAndUpdate(newXsdDoc._id, newXsdDoc).exec()
                        .then(function (oldDoc) {
                          logger.debug(func + ' - update doc with new version result (old): ' + inspect(oldDoc) + ' (new):' + inspect(newXsdDoc))
                          let msg = func + ' - Created new XsdVersionSchema (template version) id: ' + versionIdStr + ' for new schema filename ' + filename + ' new schemaId: ' + xsdId.toHexString()
                          resolve(msg)
                        })
                        .catch(function (err) {
                          let msg = func + ' - update version info failed: ' + err
                          reject(new Error(msg))
                        })
                    })
                    .catch(function (err) {
                      let msg = func + ' - find and update - ' + err
                      reject(new Error(msg))
                    })
                })
                .catch(function (err) {
                  let msg = func + ' - create new schema - ' + err
                  reject(new Error(msg))
                })
            }
          })
          .catch(function (err) {
            let msg = 'get latest schema - ' + err
            reject(new Error(msg))
          })
      } else {
        reject(new Error(filenameErr))
      }
    } else {
      reject(new Error(filenameErr))
    }
  })
}

app.post('/schema', function (req, res, next) {
  let jsonResp = {'error': null, 'data': null}
  let filename = req.body.filename
  let xsd = req.body.xsd
  if (xsd && xsd.length > 0 && filename && filename.length > 0) {
    // eslint-disable-next-line no-unused-vars
    let xsdDoc = null
    try {
      xsdDoc = libxml.parseXml(xsd)
      saveSchema(filename, xsd)
        .then(function (resp) {
          jsonResp.data = resp
          return res.status(201).json(jsonResp)
        })
        .catch(function (err) {
          jsonResp.error = '' + err
          return res.status(500).json(jsonResp)
        })
    } catch (err) {
      jsonResp.error = 'Unable to translate schema -- ' + err
      return res.status(400).json(jsonResp)
    }
  } else {
    let msg = 'both filename and text of schema are required.'
    jsonResp.error = msg
    return res.status(400).json(jsonResp)
  }
})

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
  getLatestSchemas(XsdVersionSchema, XsdSchema, logger)
    .then(function (schemas) { // schemas[0].currentRef is latest schema
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
  // Hey, don't use quotes around qfield values in the browser query!
  //  The line should look like http://ubuntu.local/nmr/templates/select?filename=/PNC_schema_081218.xsd/
  //                                                                                ^^ RegEx /
  //  This was built according to the way MDCS does it :(
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
          tmp[qfld] = {'$regex': re} // TODO test this again with fields mix -- winds up being {'fieldnm': { '$regex': /PATTERN/ }}
          qcomponents.push(tmp)
        } else {
          let tmp = {}
          tmp[qfld] = {'$eq': qval}
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
app.get('/xml/:title?', function (req, res) { // currently only supports JWT style login (need to add a authRequired field to config for bearer support
  // checks to make sure:
  //   XML is public
  //   or user is owner/creator
  //   or user is admin
  let jsonResp = {'error': null, 'data': null}
  let title = req.params.title // may be null
  let id = req.query.id
  let fmt = req.query.format
  let dsSeq = req.query.dataset // may be null -- to get all xmls for a dataset (mutually exclusive of id)
  let schemaId = req.query.schemaid
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
  if (title && dsSeq) {
    // error
    jsonResp.error = 'dataset and title are mutually exclusive parameters'
    return res.status(400).json(jsonResp)
  }
  getCurrentSchemas()
    .then(function (versions) {
      if (!validQueryParam(schemaId)) {
        schemaId = versions[0].currentRef._id
      }
      let schemaQuery = {'schemaId': {'$eq': schemaId}}
      if (title) {
        if (title.match(/.*\.xml$/) === null) {
          title += '.xml' // actual title field of xml data record has .xml appended. Lookup will fail if it's not there.
        }
        dataQuery = {'title': {'$eq': title}}
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
      let idQuery = null // the id query does not depend on schema, so it should be outside/separate TODO find time to fix this
      if (id) { // OVERRIDES Query already set if ID=id is used
        idQuery = {'_id': {'$eq': ObjectId(id)}}
        if (secQuery) {
          theQuery = {'$and': [secQuery, idQuery]}
        } else {
          theQuery = idQuery
        }
      }
      // TODO - Security related reasons for the file not to be found should be reflected as 403, not 404 as they are now!! i.e. not public & not admin & not owner
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
          if (fmt && fmt.toLowerCase() === 'xml') { // format xml only returns raw xml text with no other fields
            setTimeout(function () {
              res.set('Content-Type', 'application/xml')
              return res.send(xmlRecs[0].xml_str)
            }, 200)
          } else {
            return res.json(jsonResp)
          }
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
        titleQuery = {'title': {'$regex': re}}
        // logger.debug(req.path + ' by title: ' + JSON.stringify(titleQuery))
      } else {
        titleQuery = {'title': {'$eq': title}}
      }
    }
    if (validQueryParam(schema)) {
      if (schema.slice(0, 1) === '/' && schema.slice(-1) === '/') {
        schema = schema.replace(/(^[/]|[/]$)/g, '')
        let re = new RegExp(schema, 'i')
        schemaQuery = {'schemaId': {'$regex': re}}
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
        schemasQuery = {'$or': schemasParams}
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
          jsonResp.data.push({'_id': v._id, 'schema': v.schemaId, 'title': v.title, 'content': v.xml_str})
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

app.post('/curate', function (req, res) {
  let func = 'curate'
  let jsonResp = {'error': null, 'data': null}
  // TODO need to keep prior versions of XML by using a version number in the record
  let title = req.body.title
  let schemaId = req.body.schemaId
  let datasetId = req.body.datasetId
  let content = req.body.content
  let userid = req.body.userid
  let ispublished = req.body.ispublished || false // no camelcase
  let isPublic = req.body.isPublic || false
  if (!userid) {
    userid = getNmLoginUserIdHeaderValue(req) // set by auth middleware
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
      let dsQuery = {'datasetId': datasetId}
      Datasets.find(dsQuery, function (err, docs) {
        if (err || docs.length === 0) {
          jsonResp.err = 'unable to find associated datasetId: ' + datasetId + ' err: ' + err
          console.log(msg + ' ' + jsonResp.err)
          return res.status(400).json(jsonResp)
        } else {
          // upsert the data to curate
          let xmlQuery = {'title': title, 'schemaId': schemaId}
          let theData = {
            'title': title,
            'schemaId': schemaId,
            'datasetId': datasetId,
            'entityState': curatedDataState,
            'dsSeq': dsSeq,
            'ispublished': ispublished,
            'isPublic': isPublic,
            'iduser': userid,
            'curateState': curateState,
            'xml_str': content
          }
          XmlData.findOneAndUpdate(xmlQuery, theData, {'upsert': true, new: true, rawResult: true}, function (err, findUpdateReturnValues) {
            if (err) {
              jsonResp.error = err
              return res.status(500).json(jsonResp)
            }
            jsonResp.data = findUpdateReturnValues.value // updated document
            logger.debug(func + ' - success. OK = ' + findUpdateReturnValues.ok + ' lastError: ' + inspect(findUpdateReturnValues.lastErrorObject))
            logger.debug(func + ' - returning: ' + inspect(jsonResp))
            return res.status(200).json(jsonResp)
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

app.post('/blob/create', function (req, res) {
  // save blob to gridfs
  let jsonResp = {'error': null, 'data': null}
  let bucketName = null // req.body.bucketName -- no longer used for now
  let filename = req.body.filename
  let dataUri = req.body.dataUri
  let originalDatasetId = req.body.originalDatasetId
  let options = {}
  if (originalDatasetId) {
    options.metadata = { 'originalDatasetId': originalDatasetId }
  }
  if (filename && typeof filename === 'string' && dataUri && typeof dataUri === 'string') {
    if (bucketName && typeof bucketName === 'string') {
      options.bucketName = bucketName
    }
    let buffer = datauri(dataUri)
    // logger.info('blob dataUri buffer length: ' + buffer.length)
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, options)
    let bufferStream = new stream.PassThrough()
    // bufferStream.write(buffer)
    bufferStream.end(buffer)
    let uploadStream = bucket.openUploadStream(filename, options)
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
  // return list of fully qualified filenames for blobs associated with sample
  let jsonResp = {'error': null, 'data': null}
  let xmlId = req.params.xmlId
  let schemaId = req.query.schemaId
  let validTitle = matchValidXmlTitle(xmlId)
  if (validTitle) {
    datasetXmlFileList(xmlId, schemaId)
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
// app.get('/dataset/file/:dsSeq/:xmlId/:filename', function (req, res) {
//   let dsSeq = req.params.dsSeq
//   let xmlId = req.params.xmlId
//   let filename = req.params.filename
//   let bucketName = datasetBucketName
//   // Probably needs to look into default bucketname as well -- or ...
//   //  1 - put all data into default bucket
//   //  2 - put images into the default bucket as well as the curate input bucket (might work best)
//   // TODO ...
// })

app.get('/blob', function (req, res) { // MDCS only supports get by id (since they save id in XML) and filename is almost superfluous
  //    for our purposes, get will support filename (expected to be schemaid/xml_title/filename), bucketname (optional) or id
  //    HOWEVER, existing file names (the ones converted from MDCS), so the id must be extracted from the xml and supplied as parameter
  //      since MDCS (1.3) filenames are not unique
  // get blob and send to client
  let jsonResp = {'error': null, 'data': null}
  let id = req.query.id // may be empty
  let bucketName = null // req.query.bucketname no longer used for now (it could be empty when it was)
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
        res.status(404).send('NOT FOUND: ' + id + ' err:' + err)
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
        res.status(404).send('NOT FOUND: ' + id + ' err: ' + err.message)
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
  // this endpoint is not currently checked by the auth middleware
  // Access to public data is granted to everyone
  // Access to non-public datasets is granted to the owner and administrators
  let func = 'get /dataset'
  let jsonResp = {'error': null, 'data': null}
  let id = req.query.id
  let seq = req.query.seq
  let doi = req.query.doi
  let onlyPublic = false
  let allowedAll = false
  // if no user is logged in, then only return public data
  // if the user is logged in, but not admin return public data and data owned by user
  // if the user is logged in and admin, return all
  let userid = getNmLoginUserIdHeaderValue(req)
  let msg = func + ' - dataset lookup for userid: ' + userid
  logger.debug(msg)
  let p = new Promise(function (resolve, reject) {
    if (!userid) {
      onlyPublic = true
      allowedAll = false
      resolve()
    } else {
      onlyPublic = false
      getUserAndAdminInfo(userid)
        .then(function (userAndAdminInfo) {
          if (userAndAdminInfo.userInfo) {
            if (userAndAdminInfo.isAdmin === true) {
              allowedAll = true
            }
          }
          let msg = func + ' - getUserAndAdminInfo successful. onlyPublic: ' + onlyPublic + ' allowedAll: ' + allowedAll + ' userInfo: ' + inspect(userAndAdminInfo)
          logger.debug(msg)
          resolve()
        })
        .catch(function (err) {
          let msg = func + ' - error obtaining user info for userid: ' + userid + ' error: ' + err.message
          logger.error(msg)
          reject(err)
        })
    }
  })
  p.then(function () {
    if (validQueryParam(id)) {
      let idFilter = {_id: {'$eq': id}}
      let filter = null
      let userFilter = {userid: {'$eq': userid}}
      let publicFilter = {isPublic: {'$eq': true}}
      if (allowedAll) {
        filter = idFilter
      } else if (onlyPublic) {
        filter = {'$and': [idFilter, publicFilter]}
      } else {
        filter = {'$and': [idFilter, {'$or': [userFilter, publicFilter]}]}
      }
      let msg = func + ' - applying filter: ' + inspect(filter)
      logger.debug(msg)
      Datasets.find(filter, function (err, ds) {
        if (err) {
          jsonResp.error = err
          return res.status(500).json(jsonResp)
        } else {
          jsonResp.data = ds
          return res.json(jsonResp)
        }
      })
    } else if (validQueryParam(seq)) {
      let seqFilter = {'seq': {'$eq': seq}}
      let filter = null
      let userFilter = {userid: {'$eq': userid}}
      let publicFilter = {isPublic: {'$eq': true}}
      if (allowedAll) {
        filter = seqFilter
      } else if (onlyPublic) {
        filter = {'$and': [seqFilter, publicFilter]}
      } else {
        filter = {'$and': [seqFilter, {'$or': [userFilter, publicFilter]}]}
      }
      let msg = func + ' - applying filter: ' + inspect(filter)
      logger.debug(msg)
      Datasets.find(filter, function (err, doc) {
        if (err) {
          jsonResp.error = err
          return res.status(500).json(jsonResp)
        } else {
          jsonResp.data = doc
          return res.json(jsonResp)
        }
      })
    } else if (validQueryParam(doi)) {
      let doiFilter = {'doi': {'$eq': doi}}
      let filter = null
      let userFilter = {userid: {'$eq': userid}}
      let publicFilter = {isPublic: {'$eq': true}}
      if (allowedAll) {
        filter = doiFilter
      } else if (onlyPublic) {
        filter = {'$and': [doiFilter, publicFilter]}
      } else {
        filter = {'$and': [doiFilter, {'$or': [userFilter, publicFilter]}]}
      }
      let msg = func + ' - applying filter: ' + inspect(filter)
      logger.debug(msg)
      Datasets.find(filter, function (err, doc) {
        if (err) {
          jsonResp.error = err
          return res.status(500).json(jsonResp)
        } else {
          jsonResp.data = doc
          return res.json(jsonResp)
        }
      })
    } else {
      // return all datasets
      // Datasets.find({'$and': [{isDeleted: {'$eq': false}}, {isPublic: {$eq: true}}]}).sort({'seq': 1}).exec(function (err, docs) {
      let delFilter = {isDeleted: {'$eq': false}}
      let filter = null
      let userFilter = {userid: {'$eq': userid}}
      let publicFilter = {isPublic: {'$eq': true}}
      if (allowedAll) {
        filter = delFilter
      } else if (onlyPublic) {
        filter = {'$and': [delFilter, publicFilter]}
      } else {
        filter = {'$and': [delFilter, {'$or': [userFilter, publicFilter]}]}
      }
      let msg = func + ' - applying filter: ' + inspect(filter)
      logger.debug(msg)
      Datasets.find(filter).sort({'seq': 1}).exec(function (err, docs) {
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
    .catch(function (err) {
      let msg = func + ' - error occurred: ' + err.message
      logger.error(msg)
      jsonResp.error = err
      jsonResp.data = null
      return res.status(500).json(jsonResp)
    })
})

app.post('/dataset/update', function (req, res) {
  // NOTE: sets verify owner flag. The userid of the dataset owner must match the login user
  //    Also, this version of update should not be used from the API approach using bearer tokens
  let func = '/dataset/update'
  let dsUpdate = req.body.dsUpdate
  // let dsSeq = req.body.dsSeq
  // let schemaId = req.body.schemaid
  let userid = getNmLoginUserIdHeaderValue(req)
  let verifyOwner = true
  logger.debug(func + ' - datataset/update: doing update... userid: ' + userid + ' ' + JSON.stringify(dsUpdate) + ' verifyOwner: ' + verifyOwner)
  updateDataset(Datasets, logger, dsUpdate, verifyOwner)
    .then(function (status) {
      logger.debug(func + ' - datataset/update: success - ' + inspect(status))
      return res.status(status.statusCode).json(status)
    })
    .catch(function (status) { // Here, status is not just an error object
      logger.error(func + ' - datataset/update: error - ' + inspect(status))
      return res.status(status.statusCode).json(status)
    })
})

app.post('/dataset/updateEx', function (req, res) { // NOT A GUI FUNCTION in its current state. Do not call from GUI (will return 403)
  // NOTE: DOES NOT SET verify owner flag, so the update info can contain a userid
  //    This version SHOULD NOT BE called from the GUI. Admins may use the runAs capability to runas a user
  //    in the GUI which calls /dataset/update on behalf of the user.  Otherwise, the admin may only update
  //    datasets belonging to themselves using the GUI.
  // NOTE: these restrictions are subject to change in the future ....
  let func = '/dataset/updateEx'
  let dsUpdate = req.body.dsUpdate
  // let dsSeq = req.body.dsSeq
  // let schemaId = req.body.schemaid
  let userid = getNmLoginUserIdHeaderValue(req)
  let verifyOwner = false
  logger.debug(func + ' - datataset/updateEx: doing update... userid: ' + userid + ' ' + inspect(dsUpdate))
  updateDataset(Datasets, logger, dsUpdate, verifyOwner)
    .then(function (status) {
      logger.debug(func + ' - datataset/update: success - ' + inspect(status))
      return res.status(status.statusCode).json(status)
    })
    .catch(function (err) {
      logger.error(func + ' - datataset/update: error - ' + inspect(status))
      return res.status(err.statusCode).json(status)
    })
})

app.post('/dataset/create', function (req, res) { // auth middleware verifies user
  let func = '/dataset/create'
  let jsonResp = {'error': null, 'data': null}
  let dsInfo = req.body.dsInfo // requires schemaId now
  if (!dsInfo.doi || dsInfo.doi.length === 0) {
    dsInfo.doi = nmDatasetInitialDoi
  }
  dsInfo.userid = getNmLoginUserIdHeaderValue(req)
  createDataset(Datasets, Sequences, logger, dsInfo)
    .then(function (result) {
      jsonResp.error = null
      jsonResp.data = result.data
      return res.status(result.statusCode).json(jsonResp)
    })
    .catch(function (status) {
      logger.error(func + ' - Error creating dataset: ' + JSON.stringify(status))
      jsonResp.error = status.error.message
      jsonResp.data = null
      return res.status(500).json(jsonResp)
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
  let hr4 = 4 * 60 * 60 // 4 hrs in seconds
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
                        let hr = 60 * 60 // seconds
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
    fs.truncate(statusFileName, function (err) {
      if (err) {
        logger.error('unable to truncate job status file: ' + statusFileName)
      }
      // even if truncate fails, write the file
      fs.writeFile(statusFileName, JSON.stringify(statusObj), {'encoding': 'utf8'}, function (err) {
        if (err) {
          logger.error('error creating job_status file: ' + statusFileName + ' err: ' + err)
        } else {
          logger.info('updated job status file: ' + statusFileName + ' new status: ' + JSON.stringify(statusObj))
        }
      }) // if it fails, it's OK
    })
  } catch (err) {
    logger.error('try/catch driven for updating job status: ' + statusFileName + ' err: ' + err)
  }
}

function jobCreate (jobType, jobParams) {
  return new Promise(function (resolve, reject) {
    let jobId = jobType + '-' + shortUUID.new()
    let jobDir = nmJobDataDir + '/' + jobId
    let paramFileName = jobDir + '/' + 'job_parameters.json'
    logger.debug('job parameters: ' + JSON.stringify(jobParams))
    fs.mkdir(jobDir, function (err, data) {
      if (err) {
        let msg = 'mkdir nmJobDataDir failed. jobDir: ' + jobDir + ' error: ' + err
        logger.error(msg)
        // jsonResp.data = null
        // jsonResp.error = msg
        // res.status(400).json(jsonResp)
        reject(new Error(msg))
      } else {
        fs.writeFile(paramFileName, JSON.stringify(jobParams), {'encoding': 'utf8'}, function (err, data) {
          if (err) {
            updateJobStatus(jobDir, 'preCreateError')
            let msg = 'error updating/creating job parameters file: ' + paramFileName
            logger.error(msg)
            // jsonResp.data = null
            // jsonResp.error = 'error updating/creating job parameters file: ' + paramFileName
            // res.status(400).json(jsonResp)
            reject(new Error(msg))
          } else {
            updateJobStatus(jobDir, 'created')
            // jsonResp.data = {'jobId': jobId}
            // res.json(jsonResp)
            resolve({'jobId': jobId})
          }
        })
      }
    })
  })
}

app.post('/jobcreate', function (req, res, next) {
  let jsonResp = {'error': null, 'data': null}
  let jobType = req.body.jobType
  let jobParams = req.body.jobParameters
  jobCreate(jobType, jobParams)
    .then(function (jobInfo) {
      jsonResp.data = jobInfo
      res.json(jsonResp)
    })
    .catch(function (err) {
      jsonResp.error = err
      res.status(400).json(jsonResp)
    })
  // let jobId = jobType + '-' + shortUUID.new()
  // let jobDir = nmJobDataDir + '/' + jobId
  // let paramFileName = jobDir + '/' + 'job_parameters.json'
  // logger.debug('job parameters: ' + JSON.stringify(jobParams))
  // fs.mkdir(jobDir, function (err, data) {
  //   if (err) {
  //     let msg = 'mkdir nmJobDataDir failed. jobDir: ' + jobDir + ' error: ' + err
  //     logger.error(msg)
  //     jsonResp.data = null
  //     jsonResp.error = msg
  //     res.status(400).json(jsonResp)
  //   } else {
  //     fs.writeFile(paramFileName, JSON.stringify(jobParams), {'encoding': 'utf8'}, function (err, data) {
  //       if (err) {
  //         updateJobStatus(jobDir, 'preCreateError')
  //         jsonResp.data = null
  //         jsonResp.error = 'error updating/creating job parameters file: ' + paramFileName
  //         res.status(400).json(jsonResp)
  //       } else {
  //         updateJobStatus(jobDir, 'created')
  //         jsonResp.data = {'jobId': jobId}
  //         res.json(jsonResp)
  //       }
  //     })
  //   }
  // })
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
function submitGenerateSeoFiles (userid) {
  let func = 'submitGenerateSeoFiles'
  let jobParams = {'user': userid}
  return new Promise(function (resolve, reject) {
    jobCreate('generateseofiles', jobParams)
      .then(function (jobInfo) {
        getUserAndAdminInfo(userid)
          .then(function (userAndAdminInfo) {
            // NOTE: overridding isAdmin for now since nanomine system user may not officially be admin in groups
            //  ALSO: ensure that the nanomine nmAuthSystemUserId exists in the nm DB before calling!
            if (userAndAdminInfo.userInfo) {
              if (userAndAdminInfo.isAdmin !== true) {
                let msg = func + ' - WARNING - overriding isAdmin to true for user: ' + userid + ' to submit curator.'
                logger.error(msg)
                userAndAdminInfo.isAdmin = true
              }
              let userToken = createOutboundJwt(userAndAdminInfo)
              jobSubmit(jobInfo.jobId, 'generateseofiles', userToken)
                .then(function (jobInfo) {
                  logger.info('successfully submitted generate seo files job. Pid: ' + jobInfo.jobPid)
                  resolve()
                })
                .catch(function (err) {
                  logger.error('error submitting generate seo files job. Error: ' + err)
                  reject(err)
                })
            } else {
              // user Not defined!
              let msg = func + ' - cannot submit generate seo files job for non-existent user: ' + userid
              logger.error(msg)
              reject(new Error(msg))
            }
          })
          .catch(function (err) {
            let msg = func + ' - getUserAndAdminInfo for userid: ' + userid + '. Unable to submit job. Error: ' + err
            logger.error(msg)
            reject(err)
          })
      })
      .catch(function (err) {
        logger.error('error creating curator job. Error: ' + err)
      })
  })
}

function submitCurator (userid) {
  let func = 'submitCurator'
  let jobParams = {'user': userid}
  return new Promise(function (resolve, reject) {
    jobCreate('curator', jobParams)
      .then(function (jobInfo) {
        getUserAndAdminInfo(userid)
          .then(function (userAndAdminInfo) {
            // NOTE: overridding isAdmin for now since nanomine system user may not officially be admin in groups
            //  ALSO: ensure that the nanomine nmAuthSystemUserId exists in the nm DB before calling!
            if (userAndAdminInfo.userInfo) {
              if (userAndAdminInfo.isAdmin !== true) {
                let msg = func + ' - WARNING - overriding isAdmin to true for user: ' + userid + ' to submit curator.'
                logger.error(msg)
                userAndAdminInfo.isAdmin = true
              }
              let userToken = createOutboundJwt(userAndAdminInfo)
              jobSubmit(jobInfo.jobId, 'curator', userToken)
                .then(function (jobInfo) {
                  logger.info('successfully submitted curator job. Pid: ' + jobInfo.jobPid)
                  resolve()
                })
                .catch(function (err) {
                  logger.error('error submitting curator job. Error: ' + err)
                  reject(err)
                })
            } else {
              // user Not defined!
              let msg = func + ' - cannot submit curator job for non-existent user: ' + userid
              logger.error(msg)
              reject(new Error(msg))
            }
          })
          .catch(function (err) {
            let msg = func + ' - getUserAndAdminInfo for userid: ' + userid + '. Unable to submit job. Error: ' + err
            logger.error(msg)
            reject(err)
          })
      })
      .catch(function (err) {
        logger.error('error creating curator job. Error: ' + err)
      })
  })
}
dbPromise.then(function () {
  if (!nmAutostartCurator) {
    console.log('NOT SUBMITTING CURATOR AT THIS TIME. DISABLED.')
    return
  }
  console.log('db opened successfully. Submitting curator.')
  submitCurator(nmAuthSystemUserId) // run the curator job (long running job) TODO: monitor curator
    .then(function () {
      let msg = 'successfully submitted curator job.'
      logger.info(msg)
      console.log(msg) // for convenience
    })
    .catch(function (err) {
      let msg = 'submission of curator job failed. Error: ' + err
      logger.error(msg)
      console.log(msg)
    })
  submitGenerateSeoFiles(nmAuthSystemUserId) // run the curator job (long running job) TODO: monitor generateSeoFiles
    .then(function () {
      let msg = 'successfully submitted generate seo files job.'
      logger.info(msg)
      console.log(msg) // for convenience
    })
    .catch(function (err) {
      let msg = 'submission of generate seo files job failed. Error: ' + err
      logger.error(msg)
      console.log(msg)
    })
})
dbPromise.catch(function (err) {
  console.log('dbPromise.catch - db open failed: ' + err)
})
function jobSubmit (jobId, jobType, userToken) {
  let func = 'jobSubmit'
  return new Promise(function (resolve, reject) {
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
          // jsonResp.data = null
          // jsonResp.error = msg
          // return res.status(500).json(jsonResp)
          reject(new Error(msg))
        } else {
          jobParams = JSON.parse(jobParamsStr)
          let token = userToken
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
                // jsonResp.data = null
                // jsonResp.error = msg
                // return res.status(500).json(jsonResp)
                reject(new Error(msg))
              } else {
                updateJobStatus(jobDir, 'userUpdatedOnSubmit-Old(' + oldUser + ')--New(' + newUser + ')')
                if (pgm != null && pgmdir) {
                  let jobPid = null
                  // TODO track child status and output with events and then update job status, but for now, just kick it off
                  let cwd = process.cwd()
                  let pgmpath = pathModule.join(cwd, pgmdir)
                  pgm = pathModule.join(pgmpath, pgm)
                  logger.info('executing: ' + pgm + ' in: ' + pgmpath)
                  let path = process.env['PATH'] + ':/apps/n/bin'
                  let localEnv = {'PYTHONPATH': pathModule.join(cwd, '../src/jobs/lib'), 'NODE_PATH': '/apps/nanomine/rest/node_modules', 'PATH': path}
                  _.merge(localEnv, process.env)
                  logger.debug(func + ' - running job ' + jobId + ' with env path = ' + localEnv['PATH'] +
                      ' PYTHONPATH = ' + localEnv['PYTHONPATH'] + '' + ' NODE_PATH: ' + localEnv['NODE_PATH'])
                  let child = require('child_process').spawn(pgm, [jobType, jobId, jobDir], {
                    'cwd': pgmpath,
                    'env': localEnv
                  })
                  jobPid = child.pid
                  updateJobStatus(jobDir, {'status': 'submitted', 'pid': jobPid})
                  child.stdout.on('data', (data) => {
                    logger.info('job ' + jobId + ' o: ' + data)
                  })
                  child.stderr.on('data', (data) => {
                    logger.error('job ' + jobId + ' e: ' + data)
                  })
                  child.on('error', (err) => {
                    logger.error('failed to start job' + jobId + ' Error: ' + err)
                    updateJobStatus(jobDir, {'status': 'failed to execute', 'error': err})
                  })
                  child.on('close', (data) => {
                    logger.info('job ' + jobId + ' exited with code: ' + data)
                    updateJobStatus(jobDir, {'status': 'completed', 'rc': data})
                  })
                  child.on('exit', (data) => {
                    logger.info('job ' + jobId + ' exited with code: ' + data)
                    updateJobStatus(jobDir, {'status': 'completed', 'rc': data})
                  })
                  resolve({'jobPid': jobPid})
                } else {
                  updateJobStatus(jobDir, 'failed-no-pgm-defined')
                  let msg = 'job type has no program defined'
                  // jsonResp.error = 'job type has program not defined'
                  // return res.status(400).json(jsonResp)
                  logger.error(msg + ' pgm: ' + pgm + ' pgmdir: ' + pgmdir)
                  reject(new Error(msg))
                }
              }
            })
          } else {
            let msg = 'Did not run job because proper userid was not set in JWT token. This should not happen since auth required to get here!'
            logger.error(msg + ' token: ' + JSON.stringify(token))
            // jsonResp.error = msg
            // return res.status(500).json(jsonResp)
            reject(new Error(msg))
          }
        }
      })
    } catch (err) {
      updateJobStatus(jobDir, 'failed-to-exec-' + err)
      let msg = func + ' - job failed to exec: ' + err
      logger.error(msg)
      // jsonResp.error = 'job failed to exec: ' + err
      // res.status(400).json(jsonResp)
      reject(new Error(msg))
    }
  })
}

app.post('/jobsubmit', function (req, res) {
  let func = '/jobsubmit'
  let jsonResp = {'error': null, 'data': null}
  let jobId = req.body.jobId
  let jobType = req.body.jobType
  let userToken = getTokenDataFromReq(req) // TODO: normalize this with the 'nmLoginUserId' added to the req header by the middleware - note that if the header is not set, the user did not come in through shibboleth
  // let jobDir = nmJobDataDir + '/' + jobId
  // let paramFileName = jobDir + '/' + 'job_parameters.json'

  jobSubmit(jobId, jobType, userToken)
    .then(function (data) {
      jsonResp.data = data
      return res.json(jsonResp)
    })
    .catch(function (err) {
      jsonResp.error = err
      logger.error(func + ' - returning error: ' + jsonResp.error)
      return res.status(500).json(jsonResp)
    })
})

/* end job related rest services */

function fillOutJobEmailTemplate (jobtype, templateName, emailvars) {
  // resolves with filled out template
  // rejects with new Error('error text')
  let func = 'fillOutJobEmailTemplate'
  let emailtemplate = templateName
  return new Promise(function (resolve, reject) {
    // read the email template, merge with email vars
    fs.readFile('config/emailtemplates/' + jobtype + '/' + emailtemplate + '.etf', function (err, etfText) {
      if (err) {
        // jsonResp.error = {'statusCode': 400, 'statusText': 'unable to find template file.'}
        // return res.status(400).json(jsonResp)
        let msg = func + ' - unable to find template file: ' + emailtemplate
        logger.error(msg)
        reject(new Error(msg))
      } else {
        let filled = null
        try {
          filled = templateFiller(etfText, emailvars)
          logger.debug(func + ' - filled out email template: ' + filled)
          resolve(filled)
        } catch (fillerr) {
          let msg = func + ' - error occurred filling out email template. jobtype: ' + jobtype + ' jobid: ' + jobid + ' template: ' + emailtemplate + ' vars: ' + JSON.stringify(emailvars)
          logger.error(msg)
          reject(new Error(msg))
          // jsonResp.error = 'error filling out email template for jobid: ' + jobid
          // return res.status(400).json(jsonResp)
        }
      }
    })
  })
}

/* email related rest services - begin */
app.post('/jobemail', function (req, res, next) { // bearer auth
  let func = '/jobemail handler'
  let jsonResp = {'error': null, 'data': null}
  let jobtype = req.body.jobtype
  let jobid = req.body.jobid
  // let userId = req.body.user
  let emailtemplate = req.body.emailtemplatename
  let emailvars = req.body.emailvars
  let userId = emailvars.user
  emailvars.jobtype = jobtype
  emailvars.jobid = jobid

  if (sendEmails) {
    let userEmailAddr = emailTestAddr
    let adminEmailAddr = emailAdminAddr
    let givenName = 'NanoMine user'
    let userPromise = new Promise(function (resolve, reject) {
      if (nmAuthType !== 'local') {
        // get user's email address from database
        Users.findOne({userid: {'$eq': userId}}, function (err, userDoc) {
          if (err) {
            reject(err)
          } else {
            if (userDoc) {
              userEmailAddr = userDoc.email
              givenName = userDoc.givenName
              resolve()
            } else {
              let err = new Error(func + ' - cannot find userId: ' + userId)
              logger.error(err)
              reject(err)
            }
          }
        })
      } else {
        resolve()
      }
    })
    userPromise.then(function () {
      emailvars.user = givenName
      fillOutJobEmailTemplate(jobtype, emailtemplate, emailvars)
        .then(function (filled) {
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
          jsonResp.error = err
          jsonResp.data = null
          return res.status(500).json(jsonResp)
        })
    })
      .catch(function (err) {
        logger.error(func + ' - error setting up for email send: ' + err)
        return res.status(400).send(err)
      })
  } else {
    fillOutJobEmailTemplate(jobtype, emailtemplate, emailvars)
      .then(function (filled) {
        logger.error(filled)
        jsonResp.data = null
        jsonResp.error = null
        return res.json(jsonResp)
      })
      .catch(function (err) {
        logger.error(err)
        jsonResp.data = null
        jsonResp.error = err
        return res.status(500).json(jsonResp)
      })
  }
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
// app.get('/visualization/fillerPropertyList', function (req, res) {
//   let query = `
// prefix sio:<http://semanticscience.org/resource/>
// prefix ns:<http://nanomine.tw.rpi.edu/ns/>
// select distinct ?fillerProperty
// where {
//     ?filler sio:hasRole [a ns:Filler].
//     ?filler sio:hasAttribute ?fillerAttribute .
//     ?fillerAttribute a ?fillerProperty .
// } order by ?fillerProperty
// `
//   return postSparql(req.path, query, req, res)
// })
//
// app.get('/visualization/materialPropertyList', function (req, res) {
//   let query = `
// prefix sio:<http://semanticscience.org/resource/>
//   prefix ns:<http://nanomine.tw.rpi.edu/ns/>
//   select distinct ?materialProperty
//   where {
//      ?sample sio:hasComponentPart ?filler .
//      ?sample sio:hasAttribute ?sampleAttribute .
//      ?sampleAttribute a ?materialProperty .
//      ?filler sio:hasRole [a ns:Filler].
// } order by ?materialProperty
// `
//   return postSparql(req.path, query, req, res)
// })
//
// app.get('/visualization/materialPropertiesForFillerProperty', function (req, res) {
//   let fillerPropertyUri = req.query.fillerPropertyUri
//   let query = `
// prefix sio:<http://semanticscience.org/resource/>
// prefix ns:<http://nanomine.tw.rpi.edu/ns/>
// select distinct ?materialProperty (count(?materialProperty) as ?count)
//    where {
//       ?sample sio:hasComponentPart ?filler .
//       ?sample sio:hasAttribute ?sampleAttribute .
//       ?sampleAttribute a ?materialProperty .
//       ?filler sio:hasRole [a ns:Filler].
//       ?filler sio:hasAttribute [a <${fillerPropertyUri}>].
//    }
// group by ?materialProperty order by desc(?count)
// `
//   return postSparql(req.path, query, req, res)
// })
// app.get('/visualization/fillerPropertyMaterialPropertyGraphData', function (req, res) {
//   let fillerPropertyUri = req.query.fillerPropertyUri
//   let materialPropertyUri = req.query.materialPropertyUri
//   let query = `
// prefix sio:<http://semanticscience.org/resource/>
// prefix ns:<http://nanomine.tw.rpi.edu/ns/>
// prefix np: <http://www.nanopub.org/nschema#>
// prefix dcterms: <http://purl.org/dc/terms/>
// select distinct ?sample ?x ?y ?xUnit ?yUnit ?matrixPolymer ?fillerPolymer ?doi ?title
// where {
//   ?nanopub np:hasAssertion ?ag.
//   graph ?ag {
//     ?sample sio:hasAttribute ?sampleAttribute .
//     ?sampleAttribute a <${materialPropertyUri}> .
//     ?sampleAttribute sio:hasValue ?y.
//     optional{?sampleAttribute sio:hasUnit ?yUnit.}
//     ?sample sio:hasComponentPart ?matrix .
//     ?sample sio:hasComponentPart ?filler .
//     ?matrix a ?matrixPolymer .
//     ?filler a ?fillerPolymer .
//     ?matrix sio:hasRole [a ns:Matrix].
//     ?filler sio:hasRole [a ns:Filler].
//     ?filler sio:hasAttribute ?fillerAttribute .
//     ?fillerAttribute a <${fillerPropertyUri}> .
//     ?fillerAttribute sio:hasValue ?x .
//     optional{?fillerAttribute sio:hasUnit ?xUnit.}
//   }
//   ?nanopub np:hasProvenance ?pg.
//   graph ?pg {
//     ?doi dcterms:isPartOf ?journal.
//     ?doi dcterms:title ?title.
//   }
// }
//   `
//   return postSparql(req.path, query, req, res)
// })

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

// function configureLogger () { // logger is not properly configured yet. This config is for an earlier version of Winston
//   let logger = winston.createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
//     transports: [
//       new (winston.transports.File)({
//         levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
//         level: config.loglevel,
//         timestamps: true,
//         // zippedArchive: true,
//         filename: config.logfilename,
//         maxfiles: config.maxlogfiles,
//         maxsize: config.maxlogfilesize,
//         json: false,
//         formatter: function (data) {
//           let dt = moment().format('YYYYMMDDHHmmss')
//           return (dt + ' ' + data.level + ' ' + data.message)
//         }
//       })
//     ]
//   })
//   return logger
// }
function configureLogger () { // logger is not properly configured yet. This config is for an earlier version of Winston
  let logger = createLogger({ // need to adjust to the new 3.x version - https://www.npmjs.com/package/winston#formats
    levels: {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, trace: 5},
    format: combine(
      label({label: 'nm-rest'}),
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

-- Ontology based queries

SELECT DISTINCT ?count ?value ?unit
 WHERE {
   SELECT DISTINCT ?count ?value ?unit {
     {
       SELECT DISTINCT (count(DISTINCT ?id) as ?count) ?value ?unit {
         ?id rdf:type/rdfs:subClassOf* <http://nanomine.org/ns/PolymerNanocomposite> .
         FILTER (!ISBLANK(?id))
         FILTER ( !strstarts(str(?id), "bnode:") )
         ?id <http://semanticscience.org/resource/hasComponentPart>/<http://semanticscience.org/resource/isSurroundedBy>/<http://semanticscience.org/resource/hasAttribute>/rdf:type ?value .
         ?id <http://semanticscience.org/resource/hasComponentPart>/<http://semanticscience.org/resource/isSurroundedBy> ?surfacePart. ?surfacePart <http://semanticscience.org/resource/hasRole> [ a <http://nanomine.org/ns/SurfaceTreatment>]. ?surfacePart <http://semanticscience.org/resource/hasAttribute>/rdf:type ?value.
         optional { ?id <http://semanticscience.org/resource/hasComponentPart>/<http://semanticscience.org/resource/isSurroundedBy>/<http://semanticscience.org/resource/hasAttribute>/<http://semanticscience.org/resource/hasUnit> ?unit. }

         ?id rdf:type/rdfs:subClassOf* <http://nanomine.org/ns/PolymerNanocomposite>.
         FILTER (!ISBLANK(?id))
         FILTER ( !strstarts(str(?id), "bnode:") )
       } GROUP BY ?value ?unit
     }
     FILTER(BOUND(?value))
   }
 }

 --- ingested count
 SELECT DISTINCT (count(distinct ?id) as ?count)
 WHERE {
         ?id rdf:type/rdfs:subClassOf* <http://nanomine.org/ns/PolymerNanocomposite>.
   }

*/
