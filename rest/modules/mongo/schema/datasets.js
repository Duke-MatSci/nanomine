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

function addFiles (Datasets, logger, datasetId, filesetName, files) {
  // DO NOT USE!!! This code needs to be re-worked!!!!
  // - Datasets is a caller supplied datasets model
  // - will create filesetName if it does not exist
  // - Files should be an array of at least one { type: 'blob'|'xmldata', id: blobid | xmldata._id }
  // If filesetName exists, the files will be merged into the existing list (added if not already existing)
  let func = 'datasetsAddFiles'
  return new Promise(function (resolve, reject) {
    // verify files array objects format looks correct and contains entries
    //   Also, convert any ObjectIds to strings
    let filesOk = true
    if (files && files.length > 0) {
      files.forEach((v, idx) => {
        if (!((v.type === 'blob' || v.type === 'xmldata') && (v.id instanceof ObjectId || typeof v.id === 'string'))) {
          filesOk = false
        } else if (typeof v.id === 'string') { // test if the string is possibly a valid ObjectId
          let isValid = false
          try {
            isValid = ObjectId.isValid(v.id)
          } catch (err) {
            // Nothing to do
          }
          logger.debug(func + ' - ' + 'files entry has valid potential objectid as string: ' + isValid + ' value: ' + v.id)
          if (filesOk) { // Do not change filesOk if it's already false
            filesOk = isValid
          }
        } else if (v.id instanceof ObjectId) { // it is valid, but prefer strings over objectid objects in the list
          files[idx].id = v.id.toString()
        }
      })
    }
    if (filesOk) {
      Datasets.findById(datasetId, function (err, doc) {
        if (err) {
          logger.error(func + ' - ' + ' error looking for datasetId: ' + datasetId + ' error: ' + err.message)
          reject(err)
        } else { // if the fileset does not exist, add it. If it does, merge the new file list with the old file list
          if (doc) {
            if (doc.filesets) {
              let found = false
              doc.filesets.forEach((fs, idx) => {
                if (fs.fileset === filesetName) {
                  found = true
                  logger.debug(func + ' - ' + ' performing union operation. doc.fileset[' + idx + ']: ' + JSON.stringify(fs) + ' merge from: ' + JSON.stringify(files))
                  doc.filesets[idx] = {'fileset': filesetName, 'files': _.unionWith(fs.files, files, _.isEqual)}
                  // doc.markModified('filesets')
                  logger.debug(func + ' - ' + ' union operation result:  doc.fileset[' + idx + ']: ' + JSON.stringify(doc.filesets[idx]))
                }
              })
              if (found) {
                // update the dataset
                // Datasets.replaceOne({'_id': datasetId}, doc, (err, updateInfo) => {
                // doc.markModified('filesets')
                logger.debug(func + ' - ' + 'marked modified: ' + doc.modifiedPaths())
                Datasets.replaceOne({_id: datasetId}, doc, (err, modInfo) => {
                  if (err) {
                    let msg = 'failed to update (1) dataset: ' + datasetId + ' with new fileset info: ' + filesetName + ' files: ' + JSON.stringify(files) + ' filesets: ' + JSON.stringify(doc.filesets) + ' Error: ' + err.message
                    logger.error(func + ' - ' + msg)
                    reject(err)
                  } else {
                    logger.debug('Updated (1) dataset: ' + datasetId + ' with new fileset info for: ' + filesetName + ' files: ' + JSON.stringify(files) + ' filesets: ' + JSON.stringify(doc.filesets) + ' modInfo:' + JSON.stringify(modInfo))
                    resolve(doc)
                  }
                })
              } else {
                // add the fileset and the files
                // update the dataset
                let fsInfo = {fileset: filesetName, files: files}
                logger.debug(func + ' - ' + 'before adding new fileset dataset.filesets is: ' + JSON.stringify(doc.filesets))
                doc.filesets.push(fsInfo)
                logger.debug(func + ' - ' + 'after adding new fileset dataset.filesets is: ' + JSON.stringify(doc.filesets) + ' new info: ' + JSON.stringify(files))
                // doc.markModified('filesets')
                Datasets.replaceOne({_id: datasetId}, doc, (err, modInfo) => {
                  if (err) {
                    let msg = 'failed to update (2) dataset: ' + datasetId + ' with new fileset info for: ' + filesetName + ' files: ' + JSON.stringify(files) + ' Error: ' + err.message
                    logger.error(func + ' - ' + msg)
                    reject(err)
                  } else {
                    logger.debug('Updated (2) dataset: ' + datasetId + ' with new fileset info: ' + JSON.stringify(fsInfo) + ' modInfo:' + JSON.stringify(modInfo) + ' filesets: ' + JSON.stringify(doc.filesets))
                    resolve(doc)
                  }
                })
              }
            } else {
              // add a filesets array, add the fileset and the files to the new filesets array
              // update the dataset
              let fsInfo = {fileset: filesetName, files: files}
              doc.filesets = []
              doc.filesets.push(fsInfo)
              // doc.markModified('filesets')
              Datasets.replaceOne({_id: datasetId}, doc, (err, modInfo) => {
                if (err) {
                  let msg = 'failed to update (3) dataset: ' + datasetId + ' with new fileset info for: ' + filesetName + ' files: ' + JSON.stringify(files) + ' Error: ' + err.message
                  logger.error(func + ' - ' + msg)
                  reject(err)
                } else {
                  logger.debug('Updated (3) dataset: ' + datasetId + ' with new fileset info: ' + JSON.stringify(fsInfo) + ' modInfo:' + JSON.stringify(modInfo) + ' filesets: ' + JSON.stringify(doc.filesets))
                  resolve(doc)
                }
              })
            }
          } else {
            // dataset does not exist
            let err = new Error('Cannot add filesetName: ' + filesetName + '  to non-existant dataset: ' + datasetId)
            logger.error(func + ' - ' + err.message)
            reject(err)
          }
        }
      })
    } else {
      // files parameter is not acceptable
      let err = new Error('Cannot add files to filesetName: ' + filesetName + '  the files are not properly described by type and id.')
      logger.error(func + ' - ' + err.message)
      reject(err)
    }
  })
}

module.exports = {
  datasets: datasets,
  datasetsAddFiles: addFiles
}
