// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200323d {
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
          "transform": [{
            "filter": {"and": [
              {"field": "Loading_mass", "valid": true},
              {"field": "deltaTg", "valid": true},
              {"field": "deltaTg","range": [-50,50]}
            ]}
          }],
          
          "mark": "rect",
          "width": 300,
          "height": 300,
          "encoding": {
            "x": {
              "bin": {"maxbins":20},
              "field": "Loading_mass",
              "type": "quantitative",
              "axis":{"title":"Loading (mass fraction)", "titleFontSize": 20}
            },
            "y": {
              "bin": {"maxbins": 20},
              "field": "deltaTg",
              "type": "quantitative",
              "axis":{"title":"delta Tg", "titleFontSize": 20}
            },
            "color": {
              "aggregate": "count",
              "type": "quantitative",
              "legend":{"orient":"right"}
            }
          },
          "config": {
            "view": {
              "stroke": "transparent"
            }
          },
          "usermeta": {
            "title": "Heatmap of Delta Tg",
            "description": "Of the samples in NanoMine which report glass transition temperature data, this plot bins those data based on delta Tg and filler loading and counts the total number of samples. This plot does not consider filler type or matrix type."
          }
        }

        return returnSchema; 
    }
}

export default MD20200323d;