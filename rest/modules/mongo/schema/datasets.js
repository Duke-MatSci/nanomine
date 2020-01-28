
module.exports = function (mongoose) {
  let datasetsSchema = new mongoose.Schema({
    author: [String], /* Authors, first is primary */
    chapter: String, /* Chapter of book */
    citationType: String, /* study, book, article, paper -- fixed set -- required field */
    datasetComment: String, /* general comment about the dataset */
    dateOfCitation: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields.DateOfCitation */
    datasetId: String, /* the _id of this dataset record as a string, set by create */
    doi: String, /* DOI or other unique assigned handle -- must be unique */
    dttm_created: Number,
    dttm_updated: Number,
    edition: String,
    editor: String,
    isDeleted: Boolean, /* Logically deleted if true */
    isPublic: Boolean, /* available to everyone */
    ispublished: Boolean, /* could use this to flag actually published */
    isbn: String,
    issn: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CitationType.Journal.ISSN */
    issue: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CitationType.Journal.Issue */
    keyword: [String], /* Keywords. NOTE: some are multi-word */
    language: String, /* English, etc */
    location: String, /* Originally: PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields.Location */
    publication: String, /* Journal name, book name, etc */
    publicationYear: Number, /* 2005, etc. */
    publisher: String, /* publisher */
    relatedDoi: [String], /* dois that this dataset is related to */
    results: [mongoose.Schema.Types.Mixed], /* 0th entry is the control record, if there's no ctl 0th entry is null.
                                            tracks each sample record's base information, files uploaded and information
                                            about those files like isCompletedTemplateXML:true/false and
                                            processedXmlId: xmlRecId
                                           */
    seq: Number, /* not unique because of xml sets of prior versions -- required field (set by create) */
    title: String, /* Name of study, book, article, paper, etc -- required field */
    url: String, /* Best url to access paper, book, etc */
    userid: String, /* creator's user id */
    volume: Number /* 1-12 for monthly, could be others for weekly, semi-monthly, etc */
    // latestSchema: Boolean, /* Has associated xml_data recs for latest schema. If not, then lookups of xmls for latest schema using this dsSeq will fail */
  }, {collection: 'datasets'})
  return datasetsSchema
}
