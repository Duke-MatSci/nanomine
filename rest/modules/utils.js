
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

module.exports = {
  'configureLogger': configureLogger,
  'matchValidXmlTitle': matchValidXmlTitle,
  'getEnv': getEnv,
  'datasetBucketName': datasetBucketName,
  'getDatasetXmlFileList': getDatasetXmlFileList
}
