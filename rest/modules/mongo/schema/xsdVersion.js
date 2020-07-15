const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// maps the mongo template_version collection
const xsdVersionSchema = new Schema(
  {
    versions: {                       // Array of xsdSchema ids as stings
      type: [String]
    },
    deletedVersions: {                // deleted versions array of xsdSchema ids
      type: [String]
    },
    nbVersions: {                     // current count of versions
      type: Number
    },
    isDeleted: {                      // this schema is not to be shown/used at all and all xmls based on schema are deprecated
      type: Boolean
    },
    current: {                        // current schema version id
      type: String
    },
    currentRef: {
      type: Schema.Types.ObjectId,
      ref: 'xsdData'
    }
  }, {collection: 'template_version'}
)
module.exports = mongoose.model('xsdVersionData', xsdVersionSchema)
