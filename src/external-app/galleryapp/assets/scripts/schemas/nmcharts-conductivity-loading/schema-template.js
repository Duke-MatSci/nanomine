// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200323f {
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
            {"filter":"datum.Conductivity > 0"}
          ],
          "width":360,
          "height":300,
          "encoding": {
            "y": {"field": "Conductivity", "type": "quantitative", 
              "scale": {"type":"log"},"axis":{"title":"Electrical Conductivity (S/m)", "titleFontSize": 20, 
                "labelFontSize":16}},
            "color": {"field": "source", "type": "nominal", 
              "legend":{"title":"Data Source","titleFontSize": 20,"labelFontSize": 20}},
            "tooltip": {"field": "expID", "type": "nominal"}
          },
          "layer": [
            {
              "mark": {"type": "point", "opacity": 0.4, "size": 300, 
                "filled": true, "clip": true, "shape":"triangle-down"},
              "encoding": {
                "x": {"field": "Loading_mass", "type": "quantitative", 
                  "scale": {"type":"log"},
                  "axis":{"title":"Loading (mass fraction)", "titleFontSize":16, "labelFontSize":16}}
              }
            },
            {
              "mark": {"type": "point", "opacity": 0.4, "size": 300, 
                "filled": true, "clip": true, "shape":"triangle-up"},
              "encoding": {
                "x": {"field": "Loading_vol", "type": "quantitative", "scale": {"type":"log"},
                "axis":{"title":"Loading (volume fraction)", "titleFontSize":16, "labelFontSize":16}}
              }
            }
          ],
          "resolve": {"scale": {"x": "independent"}},
          "usermeta": {
            "title": "Electrical Conductivity vs Filler Loading",
            "description": "Electrical conductivity as a function of filler loading, on a log scale. This plot highlights data from the Virtual Issue. Hover over a data point to view the NanoMine experiment ID."
          }
        }

        return returnSchema; 
    }
}

export default MD20200323f;