module.exports = function (mongoose) {
  let xmlDataSchema = new mongoose.Schema({ // maps the mongo xmldata collection
    schemaId: String, /* !!! NOTE: had to rename 'schema' field name in restored data from MDCS to schemaId because of mongoose name conflict.
                       The change is being made in the migration script -- migrate.js.
                       OLD INFO: To convert the field after restore from MDCS, use mongocli which loads nanomongo.js. At the mongo command line
                       type 'swizzleForMongoose()' to change all the xmldata document fields named schema to schemaId.
                    */
    title: String,
    content: mongoose.Schema.Types.Mixed, /* !!! NOTE: MDCS stores the XML content as a BSON object parsed into the individual fields.
                      Moving forward NanoMine will not use this approach, so the data was downloaded as text via the MDCS rest interface
                      as a string and re-loaded into the xml_str string.  This is another reason why a dump of MDCS mongo will not restore
                      and run with the new app directly.
                      The migration tool will convert the 1.3.0 (no mgi_version collection) content field data and put a copy into xml_str.
                      The content field is left alone. Note that for really old XMLdata records or ones where the title is not in the
                      correct format, the conversion will not occur.
                      bluedevil-oit/nanomine-tools project has (PRELIMINARY) code to update the field. */
    xml_str: String,
    iduser: String, /* numeric reference to user (probably in sqlite) - Original MDCS name for userid */
    ispublished: Boolean, /* In the current db, these are all false */
    isPublic: Boolean, /* Set this to true to make available to everyone */
    curateState: String, /* currently values are Edit, Review, Curated */
    entityState: String, /* currently values are EditedNotValid, EditedValid, Valid, NotValid, Ingesting, IngestFailed, IngestSuccess */
    dsSeq: Number /* Sequence number of the associated dataset (datasetSchema) */
  }, {collection: 'xmldata'})
  return xmlDataSchema
}
