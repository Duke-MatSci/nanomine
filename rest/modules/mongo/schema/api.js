module.exports = function (mongoose) {
  let apiSchema = new mongoose.Schema({
    name: String, // Name of the API
    desc: String, // Description of the API
    token: String // random token representing api that can be changed if necessary
  }, {collection: 'api'})
  return apiSchema
}
