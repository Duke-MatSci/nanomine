module.exports = function (mongoose) { // DO NOT UPDATE fs.files collection, just read it
  let fsfilesSchema = new mongoose.Schema({
    chunkSize: Number, // chunksize set by gridfs
    filename: String, // filename set by gridfs
    length: Number, // length of file set by gridfs
    uploadDate: Date, // datetime of upload set by gridfs
    md5: String // md5 hash of file set by gridfs
  }, {collection: 'fs.files'})
  return fsfilesSchema
}
