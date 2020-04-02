// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class MD20200323g {
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
                  "aggregate": [{
                      "op": "mean",
                      "field": "Tg",
                      "as": "mean_Tg"
                  }],
                  "groupby": ["Matrix"]
              }
          ],
          "width":360,
          "height":360,
          "mark":"bar",
          "encoding": {
            "y": {"field":"mean_Tg","type": "quantitative","axis":{"title":"Mean Tg (Celsius)"}},
            "x": {"field":"Matrix","type": "nominal"},        
            "tooltip": {"field": "Matrix", "type": "nominal"}
          },
          "usermeta": {
            "title": "Aggregated Mean Tg Grouped by Matrix",
            "description": "Mean glass transition temperature, aggregated and calculated within Vega-Lite. These data are grouped by matrix type."
          }
        }

        return returnSchema; 
    }
}

export default MD20200323g;