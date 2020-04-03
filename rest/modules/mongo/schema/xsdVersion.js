module.exports = function (mongoose) {
  let xsdVersionSchema = new mongoose.Schema({ // maps the mongo template_version collection
    versions: [String], // Array of xsdSchema ids as stings
    deletedVersions: [String], // deleted versions array of xsdSchema ids
    nbVersions: Number, // current count of versions
    isDeleted: Boolean, // this schema is not to be shown/used at all and all xmls based on schema are deprecated
    current: String, // current schema version id
    currentRef: {type: mongoose.Schema.Types.ObjectId, ref: 'xsdData'}
  }, {collection: 'template_version'})
  return xsdVersionSchema
}
