const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// maps the mongo xmldata collection
const xmlDataSchema = new Schema(
  {
    schemaId: {          /* !!! NOTE: had to rename 'schema' field name in restored data from MDCS to schemaId because of mongoose name conflict. */
      type: String,
    },
    datasetId: {
      type: String,
    },
    dttm_created: {
      type: Number,
    },
    dttm_updated: {
      type: Number,
    },
    title: {    // full name
      type: String,
    },
/* !!! NOTE: MDCS stores the XML content as a BSON object parsed into the individual fields.
  Moving forward NanoMine will not use this approach, so the data was downloaded as text via the MDCS rest interface
  as a string and re-loaded into the xml_str string.  This is another reason why a dump of MDCS mongo will not restore
  and run with the new app directly.
  The migration tool will convert the 1.3.0 (no mgi_version collection) content field data and put a copy into xml_str.
  The content field is left alone. Note that for really old XMLdata records or ones where the title is not in the
  correct format, the conversion will not occur.
  bluedevil-oit/nanomine-tools project has (PRELIMINARY) code to update the field. 
*/
    content: {
      type: Schema.Types.Mixed
    },
    xml_str: {
      type: String,
    },
    iduser: {           /* numeric reference to user (probably in sqlite) - Original MDCS name for userid */
      type: String
    },
    ispublished: {      /* In the current db, these are all false */
      type: Boolean
    },
    isPublic: {         /* Set this to true to make available to everyone */
      type: Boolean
    },
    curateState: {      /* currently values are Edit, Review, Curated */
      type: String
    },
    entityState: {      /* currently values are EditedNotValid, EditedValid, Valid, NotValid, Ingesting, IngestFailed, IngestSuccess */
      type: String
    },
    dsSeq: {            /* Sequence number of the associated dataset (datasetSchema) */
      type: Number
    },
    resultSeq: {        /* 0 is the control sample */
      type: Number
    }
  }
)

module.exports = mongoose.model('xmldata', xmlDataSchema)
