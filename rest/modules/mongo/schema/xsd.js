module.exports = function (mongoose) {
  let xsdSchema = new mongoose.Schema({ // maps the mongo template collection
    title: String, // the name of the schema does not need to be unique
    filename: String, // not unique and is like 'PNC_schema_112916.xsd'
    content: String, // definitely a string containing the XSD file
    templateVersion: String, // string _id of the template version info in template_version (xsdVersionSchema)
    version: Number, // relative version number for this schema/template within the xsdVersionSchema with templateVersion id
    hash: String, // MDCS calculates MD5 hash of schema, we'll do something similar. Data restores from MDCS will be OK, but not portable back into MDCS
    dependencies: [], // Optional and will not be used
    exporters: [], // optional and will not be used
    XSLTFiles: [] // optional and will not be used
  }, {collection: 'template'})
  return xsdSchema
}
