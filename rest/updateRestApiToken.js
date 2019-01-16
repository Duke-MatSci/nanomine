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


cmds.command('updateToken <apiname>')
  .action(function (apiname, cmd) {
    let newToken = shortUUID.new()
    Api.findOneAndUpdate({'name': {$eq: apiname}}, {$set: {token: newToken}}, function (err, api) {
      if (err) {
        console.log('Unexpected error looking up api: ' + apiname + ' err: ' + err)
        db.close()
      } else if (api) {
        console.log('API ' + apiname + ' updated with new token: ' + newToken)
        db.close()
      } else {
        console.log('API ' + apiname + ' does not exist.')
        db.close()
      }
    })
  })

cmds.parse(process.argv)
