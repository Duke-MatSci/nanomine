// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200326a {
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
              {"filter":"datum.Conductivity > 0"}
            ],
            "width":360,
            "height":300,
            "encoding": {
              "x": {"field": "Conductivity", "type": "quantitative", 
                "scale": {"type":"log","domain":{"selection": "grid"}},"axis":{"title":"Electrical Conductivity (S/m)", "titleFontSize": 20, 
                  "labelFontSize":12, "format":"e"}},
              "color": {"field": "Filler", "type": "nominal", 
                "legend":{"title":"Filler Type","titleFontSize": 20,"symbolStrokeWidth": 0,"symbolSize": 200}},
              "stroke":{"value":"black"},
              "strokeWidth":{
                "condition":{
                  "selection":"highlight", "value": 4
                },
                "value": 0
              }
            },
            "layer": [
              {
                "mark": {"type": "point", "fillOpacity": 0.6, "size": 300, 
                  "filled": true, "clip": true, "shape":"triangle-left"},
                "encoding": {
                  "y": {"field": "Loading_mass", "type": "quantitative", 
                    "scale": {"type":"log"},
                    "axis":{"title":"Loading (mass fraction)", "titleFontSize":20, "labelFontSize":16}}
                }
              },
              {
                "mark": {"type": "point", "fillOpacity": 0.6, "size": 300, 
                  "filled": true, "clip": true, "shape":"triangle-right"},
                "encoding": {
                  "y": {"field": "Loading_vol", "type": "quantitative", "scale": {"type":"log"},
                  "axis":{"title":"Loading (volume fraction)", "titleFontSize":20, "labelFontSize":16}}
                }
              }
            ],
            "resolve": {"scale": {"y": "independent"}}},
            {"transform": [
              {"filter":"datum.Conductivity > 0"}
            ],
            "width":360,
            "height":300,
            "encoding": {
              "x": {"field": "Conductivity", "type": "quantitative", 
                "scale": {"type":"log"},"axis":{"title":"Electrical Conductivity (S/m)", "titleFontSize": 20, 
                  "labelFontSize":12, "format":"e"}},
              "stroke": {"field": "source", "type": "nominal",
                "legend":{"title":"Data Source","titleFontSize": 20,"labelFontSize": 16,"symbolStrokeWidth": 3,"symbolSize": 300}},
              "tooltip": {"field": "expID", "type": "nominal"}
            },
            "layer": [
              {
                "selection": {
                  "grid": {
                    "type": "interval", "bind": "scales"
                  },
                  "highlight":{
                    "type": "single", "on":"mouseover", "empty": "none"
                  }
                },
                "mark": {"type": "point", "size": 300, "strokeWidth": 3,
                  "filled": false, "clip": true, "shape":"triangle-left"},
                "encoding": {
                  "y": {"field": "Loading_mass", "type": "quantitative", 
                    "scale": {"type":"log"},
                    "axis":{"title":"Loading (mass fraction)", "titleFontSize":20, "labelFontSize":16}}
                }
              },
              {
                "selection": {
                  "grid2": {
                    "type": "interval", "bind": "scales"
                  }
                },
                "mark": {"type": "point", "size": 300, "strokeWidth": 3,
                  "filled": false, "clip": true, "shape":"triangle-right"},
                "encoding": {
                  "y": {"field": "Loading_vol", "type": "quantitative", "scale": {"type":"log"},
                  "axis":{"title":"Loading (volume fraction)", "titleFontSize":20, "labelFontSize":16}}
                }
              }
            ],
            "resolve": {"scale": {"y": "independent"}}}
          ],
            
          
          "usermeta": {
            "title": "Electrical Conductivity Linked Plots",
            "description": "Electrical conductivity as a function of filler loading, on log scales. The bottom plot features dynamic panning and zooming, which also adjusts the horizontal scale of the top plot. Hover over a data point in the bottom plot to view the NanoMine experiment ID and to see the point highlighted in the top plot."
          }
        }

        return returnSchema; 
    }
}

export default MD20200326a;