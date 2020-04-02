// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200323a {
    constructor(args) {
        this.data = args;
        this.events();
    }

    events(){
        const returnSchema = {
          "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
          "description": "Example plot of NanoMine data.",
          "data": {"values": this.data},
          "autosize":"pad",
          "transform": [       
              {
                "filter": "datum.Conductivity > 0"
              },
              {
                "filter": "datum.Filler != null"
              },
              {
                "calculate": "log(datum.Conductivity)/log(10)", "as": "logCond"
              },
              {
                "bin":{"step": 1},
                "field": "logCond",
                "as": "bin_logCond"
              },
              {
                "calculate": "pow(10, datum.bin_logCond)", "as": "x1"
              }, 
              {
                "calculate": "pow(10, datum.bin_logCond_end)", "as": "x2"
              }
          ],
          "vconcat": [{
            "width":360,
            "height":270,
            "selection": {
              "selectfillermatls":{
                "type": "multi", "fields": ["Filler"], "bind":"legend"
              },
              "mybrush": {
                "type": "interval", "encodings": ["x"]
              }
            },
            "mark":"bar",
            "encoding": {
              "x":{
                "field":"x1",
                "type": "quantitative",
                "scale": {"type": "log"},
                "axis":{"tickCount": 5, "title": "Electrical Conductivity (S/m)",
                    "titleFontSize": 16, "labelFontSize":16}            
              },
              "x2":{
                  "field": "x2"
              },
              "y":{
                "aggregate": "count",
                "type": "quantitative",
                "axis":{"title":"Number of Samples","titleFontSize": 16,"labelFontSize":16}
              },
              "color":{
                "field":"Filler",
                "type": "nominal",
                "legend":{"titleFontSize": 16, "title":"Filler Type"}
              },
              "opacity":{
                "condition":{"selection":"selectfillermatls","value": 0.95},
                "value": 0.05
              }
            }
          },
          {
            "width":360,
            "height":220,
            "encoding": {
              "x":{
                "field":"Conductivity",
                "type": "quantitative",
                "scale": {"type": "log", "domain":{"selection": "mybrush"}},
                "axis":{"tickCount": 5, "title": "Electrical Conductivity (S/m)",
                    "titleFontSize": 16, "labelFontSize":16}           
              },
              "color":{
                "field":"Filler",
                "type": "nominal",
                "legend":{"titleFontSize": 16, "title":"Filler Type"}
              },
              "opacity":{
                "condition":{
                  "selection":"selectfillermatls","value": 0.8
                },
                "value": 0.01
              }
            },
            "layer": [
              {
                "mark": {"type": "point", "opacity": 0.8, "size": 300, 
                  "filled": true, "clip": true, "shape":"triangle-left"},
                "encoding": {
                  "y": {"field": "Loading_mass", "type": "quantitative", 
                    "scale": {"type":"log"},"axis":{
                      "title":"Loading (mass fraction)",
                      "titleFontSize": 16,
                      "labelFontSize": 16
                    }}
                }
              },
              {
                "mark": {"type": "point", "opacity": 0.8, "size": 300, 
                  "filled": true, "clip": true, "shape":"triangle-right"},
                "encoding": {
                  "y": {"field": "Loading_vol", "type": "quantitative", 
                    "scale": {"type":"log"},"axis":{
                      "title":"Loading (volume fraction)",
                      "titleFontSize": 16,
                      "labelFontSize": 16
                    }}
                }
              }
            ],
            "resolve": {"scale": {"y":"independent"}}
          }],
          "usermeta": {
            "title": "Electrical Conductivity of Polymer Nanocomposites",
            "description": "In the legend, click or SHIFT+click to highlight specific filler materials. In the bar chart, drag to define a selection brush and adjust the horizontal scale of the scatter plot below. Click and drag the selection brush left or right to view different conductivity ranges."
          }  
        }

        return returnSchema; 
    }
}

export default MD20200323a;