const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// maps the mongo template collection
const xsdSchema = new Schema(
  {
    title: {              // the name of the schema does not need to be unique
      type: String,
    },
    filename: {           // not unique and is like 'PNC_schema_112916.xsd'
      type: String,
    },
    content: {            // definitely a string containing the XSD file
      type: String,
    },
    templateVersion: {    // string _id of the template version info in template_version (xsdVersionSchema)
      type: String,
    },
    version: {            // relative version number for this schema/template within the xsdVersionSchema with templateVersion id
      type: Number
    },
    hash: {               // MDCS calculates MD5 hash of schema, we'll do something similar. Data restores from MDCS will be OK, but not portable back into MDCS
      type: String
    },
    dependencies: {      // Optional and will not be used
      type: Array
    },
    exporters: {         // Optional and will not be used
      type: Array
    },
    XSLTFiles: {         // Optional and will not be used
      type: Array
    }
  }
)

module.exports = mongoose.model('xsdData', xsdSchema)
