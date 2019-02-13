module.exports = function (mongoose) {
  let mgiVersionsSchema = new mongoose.Schema({
    majorVer: Number, /* SEMVER versioning for the overall MGI db schema represented by the db. NM base was MDCS 1.3 */
    minorVer: Number, /* http://semver.org */
    patchVer: Number,
    labelVer: String /* major.minor.patch-label when formatted */
  }, {collection: 'mgi_version'}) /* Latest is 1.3.0-nm-sp-dev-1 */
  return mgiVersionsSchema
}
