function sequences (mongoose) {
  let sequencesSchema = new mongoose.Schema({
    _id: String,
    sequence: Number
  }, {collection: 'sequences'})
  return sequencesSchema
}

function getNextDatasetsSequenceNumber (Sequences, logger) {
  return getNextSequenceNumber(Sequences, logger, 'datasets')
}

function getNextSequenceNumber (Sequences, logger, sequenceName) { // get the next sequence number for the collection named collectionName
  return new Promise(function (resolve, reject) {
    Sequences.findOneAndUpdate(
      {_id: {'$eq': sequenceName}},
      {$inc: {sequence: 1}},
      {new: true},
      function (err, newDoc) {
        if (err) {
          let msg = 'error occurred getting next sequence for: ' + sequenceName + ' error: ' + err.message
          logger.error(msg)
          reject(err)
        } else {
          let msg = 'next sequence for: ' + sequenceName + ' is ' + newDoc.sequence
          logger.info(msg)
          resolve(newDoc.sequence)
        }
      }
    )
  })
}

module.exports = {
  'sequences': sequences,
  'getNextDatasetsSequenceNumber': getNextDatasetsSequenceNumber
}
