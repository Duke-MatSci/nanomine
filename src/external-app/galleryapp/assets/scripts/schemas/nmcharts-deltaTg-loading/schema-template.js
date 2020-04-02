// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200330a {
    constructor(args) {
        this.data = args;
        this.events();
    }

    events(){
        const returnSchema = {
          "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
          "description": "Example plot of NanoMine data.",
          "data": {"values": this.data},
          "vconcat":[
            {"transform": [
              {
                "filter": {"and": [
                  {"field": "Loading_mass", "valid": true},
                  {"field": "deltaTg", "valid": true},
                  {"field": "deltaTg","range": [-60,60]}
                  ]
                }
              }
            ],
            "selection": {
              "myhighlight":{"type": "single", "empty":"none","on":"mouseover"},
              "myselect":{"type":"multi","fields":["Matrix"],"bind":"legend"}
            },    
            "mark": {"type":"point","stroke": "black", "strokeWidth": 0, "filled": true, "size": 150},
            "width": 350,
            "height": 280,
            "encoding": {
              "y": {
                "field": "Loading_mass",
                "type": "quantitative",
                "axis":{"title":"Loading (mass fraction)", "titleFontSize": 20, "labelFontSize": 20},
                "scale":{ "type": "log"}
              },
              "x": {
                "field": "deltaTg",
                "type": "quantitative",
                "axis":{"title":"delta Tg (Celsius)", "titleFontSize": 20, "labelFontSize": 20},
                "scale": {"domain":[-40,50]}
              },
              "color":{
                "field":"Matrix",
                "type": "nominal",
                "scale":{"scheme":"category20"},
                "legend":{"titleFontSize": 16}
              },
              "opacity": {
                "condition":[
                  {"selection":"myhighlight","value": 0.8},
                  {"selection":"myselect","value": 1}
                ],
                "value": 0.15
              },
              "strokeWidth": {
                "condition": [
                  {"test": {"and": [{"selection":"myselect"},"length(data(\"myselect_store\"))"]}, "value": 1},
                  {"selection":"myhighlight", "value": 1}
                ],
                "value": 0.5
              },
              "tooltip": {"field": "expID", "type": "nominal"}
            },
            "config": {
              "view": {
                "stroke": "transparent"
              }
            }},
            {"width":350,
              "height":280,
              "transform": [
                
                {
                  "filter": "datum.deltaTg != null"
                },
                {
                  "filter": "datum.Loading_mass != null"
                }, 
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
                        "field": "Tgdensity",
                        "as": "Tgcount"
                    }]
                },
                {
                  "filter": "datum.Tgcount > 50"
                }
              ],
              
              "mark":{"type":"area","clip": true, "stroke":"black"},
              "encoding": {
                  "x":{
                      "field":"deltaTgvalue",
                      "type": "quantitative",
                      "title": "delta Tg (Celsius)",
                      "scale": {"domain": [-40,50]},
                      "axis": {"titleFontSize": 20, "labelFontSize":20}
                  },
                  "y":{
                      "field":"Tgdensity",
                      "type": "quantitative",
                      "title":"Probability Density",
                      "scale": {"domain": [0,0.1]},
                      "axis": {"titleFontSize": 20, "labelFontSize":20}
                  },
                  "color":{
                      "field":"Matrix",
                      "type": "nominal"
                  },
                  "opacity":{
                      "condition":[
                        
                        {"selection":"myselect","value": 0.75}
                      ],
                      "value": 0.1
                  }
              }}
          ]
            ,
            "usermeta": {
              "title": "Linked Delta-Tg Scatter Plot and Density Plot",
              "description": "Selecting a symbol in the legend highlights all corresponding points in the scatterplot in addition to the distribution of points in the density plot below. SHIFT+click allows selection of multiple series. Glass transition temperature (Tg) was normalized by subtracting the Tg of the neat matrix from the Tg of the nanocomposite."
            }
        }

        return returnSchema; 
    }
}

export default MD20200330a;