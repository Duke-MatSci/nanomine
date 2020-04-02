// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200327a {
    constructor(args) {
        this.data = args;
        this.events();
    }

    events(){
        const returnSchema = {
          "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
          "description": "Example plot of NanoMine data.",
          "data": {"values": this.data},
          "hconcat":[
            {
              "transform": [
                {"filter":{"selection":"freqselect"}}
              ],
              "height":300,
              "width":300,
              "mark": {"type": "point", "opacity": 0.4, "filled": true, "tooltip":true},
              "encoding": {
                "x": {"field": "e_real", "type": "quantitative", "scale":{"domain":[2.2,3]},
                       "axis":{"title":"Real Permittivity","titleFontSize": 20,
                         "labelFontSize":14}},
                "y": {"field": "e_loss", "type": "quantitative", "scale":{"domain":[0,0.135]},
                       "axis":{"title":"Loss Permittivity","titleFontSize": 20,
                         "labelFontSize":14}},
                "shape": {"field": "Matrix Mw", "type": "ordinal","scale":{"domain":["4k","152k"]}},
                "color": {"field": "Loading", "type": "nominal"},
                "size":{"field":"Treatment", "type": "nominal","scale":{"range":[100,250]}}
              }
            },
            {
              "height":40,
              "width":200,
              "mark":"tick",
              "selection": {
                "freqselect": {"type": "interval", "encodings": ["x"]}
              },
              "encoding": {
                "x":{"field":"Freq", "type": "quantitative", "scale":{"type": "log"},
                      "axis":{"title":"Frequency (Hz)", "titleFontSize": 20,
                        "labelFontSize":14,
                        "labelAngle": 90}}
              }
            }
          ],
          "usermeta": {
            "title": "Dielectric Spectroscopy Data Reimagined",
            "description": "Click-and-drag along the Frequency tick plot to define a frequency range. Drag the selection to sweep across different frequency ranges and watch the scatter plot adjust in real-time. Data in this chart were provided by Ning et al. (DOI: 10.1021/acsmacrolett.9b00619), who studied silica-filled polyethylene at various matrix molecular weight and heat treatment."
          }
        }

        return returnSchema; 
    }
}

export default MD20200327a;