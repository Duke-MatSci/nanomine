// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200323c {
    constructor(args) {
        this.data = args;
        this.events();
    }

    events(){
        const returnSchema = {
          "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
          "description": "Example plot of NanoMine data.",
          "autosize":"pad",
          "data": {"values": this.data},
            "width":360,
            "height":270,
            "transform": [       
                {
                    "filter": "datum.deltaTg > -60"
                },
                {
                    "filter": "datum.deltaTg < 60"
                },
                {
                    "density": "deltaTg",
                    "groupby": ["Matrix"],
                    "extent": [-100,100],
                    "as": ["deltaTgvalue","Tgdensity"]
                },
                {
                    "joinaggregate": [{
                        "op": "count",
                        "field": "Matrix",
                        "as": "matrixcount"
                    }]
                },
                {
                    "filter": "datum.matrixcount > 30"
                }
            ],
            "selection": {
                "selectmatrixmatls":{
                    "type": "multi", "fields": ["Matrix"], "bind":"legend"
                }
            },
            "mark":{"type":"area","clip": true},
            "encoding": {
                "x":{
                    "field":"deltaTgvalue",
                    "type": "quantitative",
                    "title": "delta Tg (Celsius)",
                    "scale": {"domain": [-100,100]}
                },
                "y":{
                    "field":"Tgdensity",
                    "type": "quantitative",
                    "title":"Probability Density",
                    "scale": {"domain": [0,0.1]}
                },
                "color":{
                    "field":"Matrix",
                    "type": "nominal",
                    "scale":{"scheme":"category20"}
                },
                "opacity":{
                    "condition":{"selection":"selectmatrixmatls","value": 0.95},
                    "value": 0.05
                }
            },
            "usermeta": {
              "title": "Density Plot of Delta Tg",
              "description": "In the legend, click on a matrix to see the distribution of deviation in glass transition temperature upon the addition of nanoparticle filler, compared to Tg of the neat matrix. This plot does not consider the type or amount of filler added."
            }
        }

        return returnSchema; 
    }
}

export default MD20200323c;