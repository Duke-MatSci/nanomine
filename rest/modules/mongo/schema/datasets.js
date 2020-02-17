const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')

function datasets (mongoose) {
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
    filesets: [mongoose.Schema.Types.Mixed], /*
      Array of
      { 'filesetName': 'fileset name',
        'files': [{
            type: 'blob' | 'xmldata',
            id: blobid | xmldata._id, // must be ObjectId or convertable to one
            metadata: [ // Optional
               {key, value}, ...
            ]
          } ... ]
      }
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

function isValidFileInfo (logger, fileInfo) { // checks fileInfo to see if it's valid AND also converts id to string if it's an ObjectId
  let func = 'isValidFileInfo'
  let rv = true
  let v = fileInfo
  if (!((v.type === 'blob' || v.type === 'xmldata') && (v.id instanceof ObjectId || typeof v.id === 'string'))) {
    rv = false
  } else if (typeof v.id === 'string') { // test if the string is possibly a valid ObjectId
    let isValid = false
    try {
      isValid = ObjectId.isValid(v.id)
    } catch (err) {
      // Nothing to do
    }
    logger.debug(func + ' - ' + 'files entry has valid potential objectid as string: ' + isValid + ' value: ' + v.id)
    if (rv) { // Do not change rv if it's already false
      rv = isValid
    }
  } else if (v.id instanceof ObjectId) { // it is valid, but prefer strings over objectid objects in the list
    fileInfo.id = v.id.toString()
  }

  return rv
}

function datasetAddOrOverwriteFileInfo (datasetInfo, logger, filesetName, fileInfo) {
  let rv = -1
  let func = 'datasetAddOrUpdateFileInfo'
  // This code only adds tracking information about files to the dataset
  // Updates the datasetInfo in memory only. It's up to the client to read/create the original data and subsequently save the dataset record.
  // If the filesetName does not exist, the filesetName will be created and the fileInfo added
  // If the filesetName exists and the fileInfo does not exist, the fileInfo will be added to the filesetName
  // If the filesetName exists and the fileInfo already exists, it will be OVERWRITTEN
  // The filesetName is simply a string like 'result 1' or 'sample 1'
  // The fileInfo is an object consisting of:
  //   type, id, and metadata keys at the top level
  //      type: 'blob' or 'xmldata'
  //      id: a mongo ObjectId or a string representing an ObjectId
  //         for blobs, the objectid is the id of the blob in the fs.files collection
  //         for xmldata, the objectid is the id of the xmldata collection record
  //      metadata: an object consisting of metadata information about the file
  //         filename: the base filename
  //         isCompletedExcelTemplate: (optional) true or false
  //         contentType: application/xml, image/jpeg, image/png, image/tif or other valid content type representing the data
  let filesets = datasetInfo.filesets
  let filesetIdx = -1
  let fileIdx = -1
  if (isValidFileInfo(fileInfo) && filesetName && typeof filesetName === 'string' && filesetName.length > 0) {
    filesets.forEach((v, idx) => {
      if (v.fileset === filesetName) {
        filesetIdx = idx
      }
    })
    if (filesetIdx !== -1) { // fileset already exists
      let files = filesets[filesetIdx].files
      files.forEach((f, fidx) => {
        if (f.id === fileInfo.id) {
          fileIdx = fidx
        }
      })
      if (fileIdx !== -1) {
        // overwrite the fileinfo
        files[fileIdx] = fileInfo
      } else {
        files.push(fileInfo)
      }
    } else { // fileset does not exist
      filesets.push({'fileset': filesetName, 'files': [fileInfo]})
    }
  } else {
    // Invalid input parameters
    let msg = func + ' - invalid input parameters.'
    logger.error(msg)
    rv = null
  }
  return rv // returns -1=error, 0=fileset updated, 1=fileset added
}

module.exports = {
  datasets: datasets,
  datasetAddOrOverwriteFileInfo: datasetAddOrOverwriteFileInfo
}
