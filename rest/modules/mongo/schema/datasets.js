
module.exports = function (mongoose) {
  let datasetsSchema = new mongoose.Schema({
    schemaId: String, /* differentiate datasets by schema id as well as sequence */
    citationType: String, /* study, book, article, paper -- fixed set -- required field */
    publication: String, /* Journal name, book name, etc */
    title: String, /* Name of study, book, article, paper, etc -- required field */
    author: [String], /* Authors, first is primary */
    keyword: [String], /* Keywords. NOTE: some are multi-word */
    publisher: String, /* publisher */
    publicationYear: Number, /* 2005, etc. */
    doi: String, /* DOI or other unique assigned handle -- must be unique */
    relatedDoi: [String], /* dois that this dataset is related to */
    volume: Number, /* 1-12 for monthly, could be others for weekly, semi-monthly, etc */
    url: String, /* Best url to access paper, book, etc */
    language: String, /* English, etc */
    location: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields.Location */
    dateOfCitation: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields.DateOfCitation */
    issn: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CitationType.Journal.ISSN */
    issue: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CitationType.Journal.Issue */
    seq: Number, /* Unique index constraint, but not forced to monotonic -- required field (set by create) */
    ispublished: Boolean, /* could use this to flag actually published */
    isPublic: Boolean, /* available to everyone */
    latestSchema: Boolean, /* Has associated xml_data recs for latest schema. If not, then lookups of xmls for latest schema using this dsSeq will fail */
    userid: String /* creator's user id */
  }, {collection: 'datasets'})
  return datasetsSchema
}
