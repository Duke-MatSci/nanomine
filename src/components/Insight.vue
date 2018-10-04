<template>
  <div class="NanoMine Data Insight">
    <v-jumbotron>
      <v-layout align-center>
        <v-flex>
          <h3 class="mainheading">NanoMine Data Insights</h3>
          <span
            class="subheading">Explore and reveal patterns</span>
          <br/>
        </v-flex>
      </v-layout>
    </v-jumbotron>
    <v-container>
      <v-layout>
        <v-flex xs12>
          <svg class="line-graph">
            <g style="transform: translate(0, 10px)">
              <path class="line-path" :d="line" />
            </g>
          </svg>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'Insight',
  data: () => {
    return ({
      msg: 'NanoMine Data Insight',
      lineData: [99, 71, 78, 25, 36, 92],
      line: ''
    })
  },
  mounted: function () {
    this.calculatePath() // from example @ https://raw.githubusercontent.com/johnnynotsolucky/samples/master/vuejs-d3/src/components/VueLineChart.vue
  },
  methods: {
    getScales: function () {
      let vm = this
      const x = d3.scaleTime().range([0, 430])
      const y = d3.scaleLinear().range([210, 0])
      d3.axisLeft().scale(x)
      d3.axisBottom().scale(y)
      x.domain(d3.extent(vm.lineData, (d, i) => i))
      y.domain([0, d3.max(vm.lineData, d => d)])
      return {x, y}
    },
    calculatePath: function () {
      let vm = this
      const scale = vm.getScales()
      const path = d3.line()
        .x((d, i) => scale.x(i))
        .y(d => scale.y(d))
      vm.line = path(vm.lineData)
      console.log('calculated path.')
    }
  }
}
</script>

<style scoped>
  img {
    width: 240px;
    height: auto;
  }

  h4 {
    text-transform: uppercase;
  }

  .mainheading { /* class of large text in jumbotron*/
    font-size: 40px;
    color: white;
    padding-top: 20px;
  }

  .subheading {
    color: white;
  }
  .v-jumbotron {
    color: white;
    padding: 0.5rem 0.3rem;
    background-color: #000000;
    border-radius: 0px;
    margin-top: 0px;
    max-height: 120px;
  }
  .line-graph {
    margin: 25px;
    width: 500px;
    height: 270px;
  }
  .line-path {
    fill: none;
    stroke: #76BF8A;
    stroke-width: 3px;
  }
</style>
