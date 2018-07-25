/* eslint-disable no-multiple-empty-lines */
const axios = require('axios')
const util = require('util')
const express = require('express')
const cookieParser = require('cookie-parser')
const qs = require('qs')
var app = express()
app.use(cookieParser())

let shortUUID = require('short-uuid')() // https://github.com/oculus42/short-uuid (npm i --save short-uuid)

app.get('/', function (req, res) {
  let ID = 'TestData_' + shortUUID.new()
  let query = 'a query'
  let xml = `
    <PolymerNanocomposite>
     <ID>${ID}</ID>
    </PolymerNanocomposite>
    `
  xml = xml.trim()

  let jsonData = {
    xml: xml,
    xmlLen: xml.length,
    query: query,
    queryLen: query.length

  }
  console.log('session cookie: ' + req.cookies['session'])
  res.json(jsonData)
})

app.get('/test1', function (req, res) { // NOTE: Tg type obtained from material property cache map by name, Mass Fraction from filler property map
  let query = `
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample ?control ?x ?y ?doi ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/FrequencyHz>; sio:hasValue ?x].
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/DielectricLossTangent>; sio:hasValue ?y].
      ?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/PolyDimethylSiloxane>] .
      optional {?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/GrapheneOxide>].}
      ?control sio:hasRole [a sio:ControlRole; sio:inRelationTo ?sample].
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
     ?doi dcterms:isPartOf ?journal.
     ?doi dcterms:title ?title.
  }
}
`
  let url = '/sparql'
  let jsonResp = {'error': null, 'data': null}
  let data = qs.stringify({'query': query.trim().replace(/[\n]/g, ' ')})
  return axios({
    'method': 'post',
    'url': url,
    'data': data
    // 'headers': {'Content-type': 'application/json'},
  })
    .then(function (response) {
      jsonResp = response.data
      console.log('/test1 data: ' + util.inspect(response, { showHidden: true, depth: 2 }))
      res.json(jsonResp)
    })
    .catch(function (err) {
      console.log('/test1 error: ' + util.inspect(err, { showHidden: true, depth: 2 }))
      jsonResp.error = err.message
      jsonResp.data = err.data
      res.status(400).json(jsonResp)
    })
})

app.listen(3000)

/*

prefix dataset: <https://hbgd.tw.rpi.edu/dataset/>
prefix sio:     <http://semanticscience.org/resource/>
prefix chear:   <http://hadatac.org/ont/chear#>
prefix skos:    <http://www.w3.org/2004/02/skos/core#>
prefix dcterms: <http://purl.org/dc/terms/>
prefix prov:    <http://www.w3.org/ns/prov#>
prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
prefix doi:     <http://dx.doi.org/>
prefix nanomine: <http://nanomine.tw.rpi.edu/ns/>
prefix unit: <http://nanomine.tw.rpi.edu/ns/unit/>
prefix author: <http://nanomine.tw.rpi.edu/author/>
prefix publication: <http://nanomine.tw.rpi.edu/publication/>
prefix bibo: <http://purl.org/ontology/bibo/>
prefix foaf: <http://xmlns.com/foaf/0.1/>
prefix nanopub: <http://www.nanopub.org/nschema#>
prefix entry: <http://nanomine.tw.rpi.edu/entry/>
prefix sample: <http://nanomine.tw.rpi.edu/sample/>
prefix article: <http://nanomine.tw.rpi.edu/article/>
prefix compound: <http://nanomine.tw.rpi.edu/compound/>
prefix location: <http://nanomine.tw.rpi.edu/location/>
prefix lang: <http://nanomine.tw.rpi.edu/language/>
prefix void: <http://rdfs.org/ns/void#>
prefix dcat: <http://www.w3.org/ns/dcat#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>

select *
where {
 ?p ?s ?o. FILTER regex(?o,".*png.*","i")
}

select *
where {
  ?p ?s ?o FILTER ( strstarts(str(?p), "http://nanomine.tw.rpi.edu/unit/") )
}


SELECT * WHERE {
  ?s ?p ?o
  FILTER( regex(str(?p), "^(?http://nanomine.tw.rpi.edu/entry/).+"))
}
https://stackoverflow.com/questions/24180387/filtering-based-on-a-uri-in-sparql
https://stackoverflow.com/questions/19044871/exclude-results-from-dbpedia-sparql-query-based-on-uri-prefix


prefix sio: <http://semanticscience.org/resource/>
prefix ns: <http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>

select distinct ?sample ?x ?y ?xUnit ?yUnit ?matrixPolymer ?fillerPolymer ?fillerProperty ?fillerPropertyValue ?fillerPropertyUnit ?doi ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
    ?sample sio:hasAttribute ?sampleAttribute1 .
    ?sampleAttribute1 a <http://nanomine.tw.rpi.edu/ns/GlassTransitionTemperature> .
    ?sampleAttribute1 sio:hasValue ?x.
    optional { ?sampleAttribute1 sio:hasUnit ?xUnit . }
    ?sample sio:hasAttribute ?sampleAttribute2 .
    ?sampleAttribute2 a <http://nanomine.tw.rpi.edu/ns/MassFraction>.
    ?sampleAttribute2 sio:hasValue ?y.
    optional { ?sampleAttribute2 sio:hasUnit ?yUnit . }
    ?sample sio:hasComponentPart ?matrix .
    ?sample sio:hasComponentPart ?filler .
    ?matrix a ?matrixPolymer .
    ?filler a ?fillerPolymer .
    ?matrix sio:hasRole [a ns:Matrix].
    ?filler sio:hasRole [a ns:Filler].
    ?filler sio:hasAttribute ?fillerAttribute .
    ?fillerAttribute a ?fillerProperty .
    ?fillerAttribute sio:hasValue ?fillerPropertyValue .
    optional { ?fillerAttribute sio:hasUnit ?fillerPropertyUnit . }
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
    ?doi dcterms:isPartOf ?journal.
    ?doi dcterms:title ?title.
  }
}

-- simplest sparql to get sample id (#1)
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
  }
}

-- this adds journal name and title to sample id in #1 above (#2)
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample ?journal ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
     ?doi dcterms:isPartOf ?journal.
     ?doi dcterms:title ?title.
  }
}

--- #1 and #2 above can be extended to this (#3)
prefix sio:<http://semanticscience.org/resource/>
prefix ns:<http://nanomine.tw.rpi.edu/ns/>
prefix np: <http://www.nanopub.org/nschema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?sample ?control ?x ?y ?doi ?title
where {
  ?nanopub np:hasAssertion ?ag.
  graph ?ag {
      ?ac <http://www.w3.org/ns/prov#specializationOf> ?sample.
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/FrequencyHz>; sio:hasValue ?x].
      ?ac sio:hasAttribute [a <http://nanomine.tw.rpi.edu/ns/DielectricLossTangent>; sio:hasValue ?y].
      ?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/PolyDimethylSiloxane>] .
      optional {?sample sio:hasComponentPart [a <http://nanomine.tw.rpi.edu/compound/GrapheneOxide>].}
      ?control sio:hasRole [a sio:ControlRole; sio:inRelationTo ?sample].
  }
  ?nanopub np:hasProvenance ?pg.
  graph ?pg {
     ?doi dcterms:isPartOf ?journal.
     ?doi dcterms:title ?title.
  }
}


*/
