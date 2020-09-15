const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const usersSchema = new Schema(
  {
    alias: {          // random unless overridden by user - not used for attribution, only display
      type: String,
    },
    userid: {
      type: String,
    },
    givenName: {      // first name
      type: String,
    },
    surName: {        // last name
      type: String,
    },
    displayName: {    // full name
      type: String,
    },
    email: {
      type: String,
    },
    apiAccess: {      // api token | refresh token | accessToken:expiration
      type: [String]
    }
  }, {collection: 'users'}
)

module.exports = mongoose.model('users', usersSchema)
