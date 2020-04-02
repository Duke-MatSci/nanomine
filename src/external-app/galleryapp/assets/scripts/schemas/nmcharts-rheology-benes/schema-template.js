// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200330b {
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
            {
              "hconcat":[
                {
                  "height":300,
                  "width":300,
                  "mark": {"type": "point", "filled": true, "tooltip":true, "size": 200, "stroke":"black"},
                  "encoding": {
                    "x": {"field": "Storage", "type": "quantitative", "scale":{"domain":[0.01,1000], "type": "log"},
                           "axis":{"title":"Storage Modulus (Pa)","titleFontSize": 20,
                             "labelFontSize":14, "format": "e"}},
                    "y": {"field": "Loss", "type": "quantitative", "scale":{"domain":[0.1,10000], "type": "log"},
                           "axis":{"title":"Loss Modulus (Pa)","titleFontSize": 20,
                             "labelFontSize":14, "format": "e"}},
                    "shape": {"field": "Loading", "type": "ordinal","scale":{"domain":["undefined","0.03"]}, 
                              "legend":{"title":"Loading (mass fraction)"}},
                    "color": {"field": "Surface", "type": "nominal", "legend":{"title":"Surface Treatment"},
                                "scale":{"domain":["undefined","APMBP","PDA","PEI"]}},
                    "opacity": {
                      "condition":{
                        "selection":"freqselect","value": 0.8
                      },
                      "value": 0.2
                    },
                    "strokeWidth":{
                      "condition":{
                        "selection":"freqselect","value": 2
                      },
                      "value":0
                    }
                  }
                },
                {
                  "height":40,
                  "width":200,
                  "mark":"tick",
                  "title":{"text":["Select a frequency range",
                          "in the tick chart above and",
                          "click+drag to dynamically",
                          "highlight the other plots.","",
                          "Use mousewheel to expand",
                          "or reduce frequency range.",""],
                          "subtitle":["[Raw data courtesy of Benes et al.,",
                            "DOI: 10.1021/acs.macromol.8b01204]"],
                          "orient": "bottom", "offset": 30,"fontSize": 16,"subtitleFontSize": 12},  
                  "selection": {
                    "freqselect": {"type": "interval", "encodings": ["x"], "empty": "none"}
                  },
                  "encoding": {
                    "x":{"field":"Freq", "type": "quantitative", "scale":{"type": "log", "domain":[0.005,200]},
                          "axis":{"title":"Frequency (rad/s)", "titleFontSize": 20,
                            "labelFontSize":14,
                            "labelAngle": 90}}
                  }
                }
              ]
            },
            {
              "hconcat": [
                {
                  "height":225,
                  "width":225,
                  "mark": {"type": "point", "filled": true, "tooltip":true, "size": 150, "stroke":"black"},
                  "encoding": {
                    
                    "x": {"field": "Freq", "type": "quantitative", "scale":{"domain":[0.005,200], "type": "log"},
                          "axis":{"title":"Frequency (rad/s)","titleFontSize": 20,
                             "labelFontSize":14, "format": "e"}},
                    "y": {"field": "Storage", "type": "quantitative", "scale":{"domain":[0.01,1000], "type": "log"},
                          "axis":{"title":"Storage Modulus (Pa)","titleFontSize": 20,
                            "labelFontSize":14, "format": "e"}},
                    "shape": {"field": "Loading", "type": "ordinal","scale":{"domain":["undefined","0.03"]}, 
                              "legend":{"title":"Loading (mass fraction)"}},
                    "color": {"field": "Surface", "type": "nominal", "legend":{"title":"Surface Treatment"},
                                "scale":{"domain":["undefined","APMBP","PDA","PEI"]}},
                    "opacity": {
                      "condition":{
                        "selection":"freqselect","value": 0.8
                      },
                      "value": 0.2
                    },
                    "strokeWidth":{
                      "condition":{
                        "selection":"freqselect","value": 2
                      },
                      "value":0
                    }
                  }
                },
                {
                  "height":225,
                  "width":225,
                  "mark": {"type": "point", "filled": true, "tooltip":true, "size": 150, "stroke":"black"},
                  "encoding": {
                    "x": {"field": "Freq", "type": "quantitative", "scale":{"domain":[0.005,200], "type": "log"},
                      "axis":{"title":"Frequency (rad/s)","titleFontSize": 20,
                        "labelFontSize":14, "format": "e"}},
                    "y": {"field": "Loss", "type": "quantitative", "scale":{"domain":[0.01,10000], "type": "log"},
                           "axis":{"title":"Loss Modulus (Pa)","titleFontSize": 20,
                             "labelFontSize":14, "format": "e"}},
                    "shape": {"field": "Loading", "type": "ordinal","scale":{"domain":["undefined","0.03"]}, 
                              "legend":{"title":"Loading (mass fraction)"}},
                    "color": {"field": "Surface", "type": "nominal", "legend":{"title":"Surface Treatment"},
                                "scale":{"domain":["undefined","APMBP","PDA","PEI"]}},
                    "opacity": {
                      "condition":{
                        "selection":"freqselect","value": 0.8
                      },
                      "value": 0.2
                    },
                    "strokeWidth":{
                      "condition":{
                        "selection":"freqselect","value": 2
                      },
                      "value":0
                    }
                  }
                }
              ]
            }
          ]
          ,
          "usermeta": {
            "title": "Interactive Rheology Data",
            "description": "Click-and-drag along the Frequency tick plot to define an angular frequency range. Drag the selection to sweep across different frequency ranges and watch the scatter plot adjust in real-time. Data in this chart were provided by Benes et al. (DOI: 10.1021/acs.macromol.8b01204) Supporting Figure S3, who performed rheology on DGEBA epoxy containing titanate nanotubes (TiNT) with different surface treatments."
          }
        }

        return returnSchema; 
    }
}

export default MD20200330b;