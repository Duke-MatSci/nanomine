const moment = require('moment')
const {createLogger, format, transports} = require('winston')

const { combine, label, printf, prettyPrint } = format

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

function getDatasetXmlFileList (mongoose, logger, xmlTitle) {
  let func = 'getDatasetXmlFileList'
  let bucketName = datasetBucketName
  let validTitle = matchValidXmlTitle(xmlTitle)
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
      reject(new Error(func + ' - invalid xmlTitle format: ' + xmlTitle))
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


function getLatestSchemas (xsdVersionSchema, logger) { // duplicate of getCurrentSchemas!! TODO
  let func = 'getLatestSchemas'
  return new Promise(function (resolve, reject) {
    xsdVersionSchema.find({isDeleted: {$eq: false}}).populate('currentRef').exec(function (err, versions) {
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
          logger.error(func + ' - schema sort reverse by date failed :( - error' + err)
          reject(err)
        }
      }
    })
  })
}

module.exports = {
  'configureLogger': configureLogger,
  'matchValidXmlTitle': matchValidXmlTitle,
  'getEnv': getEnv,
  'datasetBucketName': datasetBucketName,
  'getDatasetXmlFileList': getDatasetXmlFileList,
  'getLatestSchemas': getLatestSchemas,
  'sortSchemas': sortSchemas
}
