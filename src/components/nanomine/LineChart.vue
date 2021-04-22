<template>
  <v-container fluid grid-list-md>
    <v-layout row wrap>
      <v-flex d-flex xs10 sm10 md10>
        <v-switch
          v-model="xLogScale"
          inset
          :label="`x Axis Log Scale`"
        ></v-switch>
        <v-switch
          v-model="yLogScale"
          inset
          :label="`y Axis Log Scale`"
        ></v-switch>
      </v-flex>
      <v-flex d-flex xs10 sm10 md10>
        <svg
          :width="width + margin.left + margin.right"
          :height="height + margin.top + margin.bottom"
          class="nm-linechart"
        >
          <g :transform="`translate(${margin.left + 3}, ${10})`">
            <!-- Axes -->
            <g class="x-axis" :transform="`translate(0, ${height})`"></g>
            <g class="y-axis"></g>
            <!-- Axis Labels -->
            <g>
              <text class="x-axis-label" :transform="`translate(${width/2}, ${height+margin.top+20})`" style="text-anchor:middle"></text>
              <text
                class="y-axis-label"
                :transform="`rotate(-90)`"
                :y="`${0 - margin.left}`"
                :x="`${0 - (height/2)}`"
                :dy="`1em`"
                style="text-anchor:middle"
              >
              </text>
            </g>
            <!-- Line -->
            <g>
              <path class="nm-line" d=""></path>
              <!-- <path class="gf-area"></path> -->
            </g>

            <!-- Grids -->
      <!--       <g>
              <g class="gf-x-grid grid" :transform="`translate(0, ${height})`"></g>
              <g class="gf-y-grid grid"></g>
            </g> -->

            <!-- Tooltip -->
            <!-- <rect :width="width" :height="height" class="overlay"></rect>
            <g class="focus">
              <rect
                width="100"
                height="30"
                class="tooltip"
                y="0"
                rx="4"
                ry="4"
              ></rect>
            </g> -->
          </g>
        </svg>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import * as d3 from "d3";
export default {
  name: "LineChart",
  data() {
    return {
      width: 0,
      height: 0,
      margin: {
        left: 70,
        right: 40,
        bottom: 50,
        top: 40
      },
      scales: {
        x: null,
        y: null
      },
      data: [],
      xlabel: '',
      ylabel: '',
      xLogScale: false,
      yLogScale: false
    };
  },
  props: {
    dataset: {
      type: Object,
      required: true
    },
    // xlabel: {
    //   type: String,
    //   required: true
    // },
    // ylabel: {
    //   type: String,
    //   required: true
    // },
    options: {
      type: Object
    }
  },
  methods: {
    /**
     * setSize: This method will set the width, height
     * and also the margins of the chart.
     */
    setSize() {
      // Width and Height
      this.width =
        this.options.width || 400 - this.margin.left - this.margin.right;
      this.height =
        this.options.height || 250 - this.margin.top - this.margin.top;
    },
    setScales() {
      if (!this.xLogScale) {
        this.scales.x = d3
          .scaleLinear()
          .domain(d3.extent(this.data, d => d.x))
          .range([0, this.width]);
      } else {
        this.scales.x = d3
          .scaleLog()
          .domain(d3.extent(this.data, d => d.x))
          .range([0, this.width]);
      };

      if (!this.yLogScale) {
        this.scales.y = d3
          .scaleLinear()
          .domain(d3.extent(this.data, d => d.y))
          .range([this.height, 0]);
      } else {
        this.scales.y = d3
          .scaleLog()
          .domain(d3.extent(this.data, d => d.y))
          .range([this.height, 0]);
      };
    },
    renderAxes() {
      d3.select(".x-axis")
        .call(d3.axisBottom(this.scales.x).ticks(7))
        .selectAll(".tick line")
        .attr("stroke", "#000")
        .attr("stroke-opacity", "0.8");

      d3.select(".y-axis")
        .call(d3.axisLeft(this.scales.y).ticks(5))
        .selectAll(".tick line")
        .attr("stroke", "#000")
        .attr("stroke-opacity", "0.8");

      // Change axis label text
      d3.select(".x-axis-label")
        .text(this.xlabel)
      d3.select(".y-axis-label")
        .text(this.ylabel)
      
      // Change text color
      d3.selectAll(".y-axis text").attr("color", "#000");
      d3.selectAll(".x-axis text").attr("color", "#000");

      // Change path color
      d3.selectAll(".y-axis path")
        .attr("stroke", "#000")
        .attr("stroke-opacity", "0.8");
      d3.selectAll(".x-axis path")
        .attr("stroke", "#000")
        .attr("stroke-opacity", "0.8");
    },
    line() {
      const { x, y } = this.scales;
      return d3
        .line()
        .x(d => x(d.x))
        .y(d => y(d.y));
    },
    // area() {
    //   const { x, y } = this.scales;
    //   return d3
    //     .area()
    //     .x(d => x(d.x))
    //     .y0(this.height)
    //     .y1(d => y(d.y));
    // },
    renderLine() {
      d3.select(".nm-line")
        .datum(this.data)
        .attr("d", this.line());
    },
    // renderArea() {
    //   d3.select(".gf-area")
    //     .datum(this.data)
    //     .attr("class", "gf-area")
    //     .attr("d", this.area());
    // },
    // renderYGrid() {
    //   const yGrid = d3
    //     .axisLeft(this.scales.y)
    //     .ticks(5)
    //     .tickSize(-this.width)
    //     .tickFormat("");

    //   d3.select(".gf-y-grid")
    //     .call(yGrid)
    //     .selectAll("line")
    //     .attr("stroke", "#000")
    //     .attr("stroke-opacity", "0.1")
    //     .attr("stroke-width", "1px");

    //   // Hide border paths
    //   d3.select(".gf-y-grid path").attr("stroke-opacity", "0");
    //   d3.select(".gf-x-grid path").attr("stroke-opacity", "0");
    // },
    // initToolTip() {
    //   const self = this;
    //   this.bisectDate = d3.bisector(d => d.x).left;
    //   const focus = d3.select(".focus");
    //   d3.select(".overlay")
    //     .on("mouseover", () => focus.style("display", null))
    //     .on("mouseout", () => focus.style("display", "null"))
    //     .on("mousemove", function() {
    //       const that = this;
    //       self.tooltipoOnMouseMove(that);
    //     });
    // },
    // tooltipoOnMouseMove(that) {
    //   // console.log("TOOLTIP ON MOVE: ", that);
    //   const { x } = this.scales;
    //   const x0 = x.invert(d3.mouse(that)[0]);
    //   const i = this.bisectDate(this.data, x0, 1);
    //   const d0 = this.data[i - 1];
    //   const d1 = this.data[i];
    // },
    init() {
      this.setSize();
      this.setScales();
      // this.renderYGrid();
      this.renderAxes();
      this.renderLine();
      // this.initToolTip();
      // this.renderArea();
    }
  },
  watch: {
    /**
     * Re-render the chart on data change
     */
    dataset(data) {
      this.data = data.data;
      this.xlabel = data.xlabel;
      this.ylabel = data.ylabel;
      this.init();
    },
    xLogScale(data) {
      this.init();
    },
    yLogScale(data) {
      this.init();
    }
  },
  mounted() {
    console.log("LineChart mounted");
    this.data = this.dataset;
    this.init();
  }
};
</script>

<style lang="scss" scoped>
// Line
.nm-line {
  stroke: #3cba54;
  stroke-width: 2px;
  fill: none;
}

// .grid {
//   fill: red;
// }

//.grid line {
//  stroke: blue;
//  stroke-opacity: 1;
//}

//.grid path {
//  stroke-width: 1;
//}

//.gf-area {
//  fill: lightsteelblue;
//}

.tooltip {
  fill: white;
  stroke: #444;
}

.overlay {
  fill: none;
  pointer-events: all;
}
</style>
