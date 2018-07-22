
const express = require('express')
let app = express()
let shortUUID = require('short-uuid')() // https://github.com/oculus42/short-uuid (npm i --save short-uuid)

app.get('/', function (req, res) {
  let query =
    `
     prefix xsd: <http://www.w3.org/2001/XMLSchema#>
     select *
     where {
       ?p ?s ?o. FILTER regex(?o,".*png.*","i")
     }
     `
  let ID = 'TestData_' + shortUUID.new()

  let xml = `
    <PolymerNanocomposite>
     <ID>${ID}</ID>
    </PolymerNanocomposite>
    `
  let jsonData = {
    xml: xml,
    xmlLen: xml.length,
    query: query,
    queryLen: query.length

  }
  res.json(jsonData)
})

app.listen(3000)
