module.exports = function (mongoose) {
  let usersSchema = new mongoose.Schema({
    alias: String, // random unless overridden by user - not used for attribution, only display
    userid: String,
    givenName: String, // first name
    surName: String, // last name
    displayName: String, // full name
    email: String,
    apiAccess: [String] // api token | refresh token | accessToken:expiration
  }, {collection: 'users'})
  return usersSchema
}
