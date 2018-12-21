const mongoose = require('mongoose')
// const chalk = require('chalk')
const cmds = require('commander')
const shortUUID = require('short-uuid')()

let nmAuthSysToken = process.env['NM_AUTH_SYS_TOKEN']

let db = mongoose.connection
let dbUri = process.env['NM_MONGO_URI']

mongoose.connect(dbUri, {keepAlive: true, keepAliveInitialDelay: 300000})
db.on('error', function (err) {
  console.log('db error: ' + err)
})
db.once('open', function () {
  console.log('database opened successfully.')
})

let usersSchema = new mongoose.Schema({
  alias: String, // random unless overridden by user - not used for attribution, only display
  userid: String,
  givenName: String, // first name
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

cmds.command('generateRefreshToken <userid> <apiname>')
  .action(function (userid, apiname) {
    // lookup api and get the api token
    // lookup user to
    //    if it exists, delete entry associated with apitoken from apiAccess array
    //    (re)add apitoken entry with new refresh token as well as accesstoken/expiration (will need to be refreshed via refresh api)
    Api.findOne({'name': {$eq: apiname}}, function (err, api) {
      if (err) {
        console.log('Unexpected error looking up api: ' + apiname + ' err: ' + err)
        db.close()
      } else {
        let newRefreshToken = shortUUID.new()
        let dummyAccessToken = 'dummy' + shortUUID.new()
        let expiration = 99 // dummy expired expiration
        Users.findOne({'userid': {$eq: userid}}, function (err, user) {
          if (err) {
            console.log('error looking up userid: ' + userid)
            db.close()
          } else {
            let newApiAccessList = []
            let found = false
            if (user && user.apiAccess) {
              user.apiAccess.forEach(function (v) {
                let parts = v.split(' ') // api token, refresh token, access token, expiration
                if (parts[0] === api.token) {
                  found = true
                  newApiAccessList.push(`${api.token} ${newRefreshToken} ${dummyAccessToken} ${expiration}`)
                } else {
                  newApiAccessList.push(v)
                }
              })
            }
            if (!found) {
              newApiAccessList.push(`${api.token} ${newRefreshToken} ${dummyAccessToken} ${expiration}`)
            }
            Users.findOneAndUpdate({'userid': {$eq: userid}}, {$set: {apiAccess: newApiAccessList}}, function (err, oldDoc) {
              if (err) {
                console.log('error updating api access for userid: ' + err)
                db.close()
              } else {
                console.log('Successfully updated refresh token for userid: ' + userid + ' api: ' + apiname + ' new refresh token: ' + newRefreshToken)
                db.close()
              }
            })
          }
        })
      }
    })
  })

cmds.parse(process.argv)
