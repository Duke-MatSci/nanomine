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
            <!--g style="transform: translate(0, 10px)">
              <path class="line-path" :d="line" />
            </g-->
          </svg>
        </v-flex>
        <v-flex xs-3>
          <v-btn v-on:click="handleClick()">Update</v-btn>
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
    handleClick: function () {
      let vm = this
      vm.lineData.forEach(function (v, idx) {
        vm.lineData[idx] = Math.floor(Math.random() * 100)
      })
      vm.calculatePath()
    },
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
    updateSvg: function () {
      let vm = this
      let svg = d3.select('svg')
      let margin = {top: 20, right: 80, bottom: 30, left: 50}
      let width = svg.attr('width') - margin.left - margin.right
      let height = svg.attr('height') - margin.top - margin.bottom
      let g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      // var parseTime = d3.timeParse('%Y%m%d')

      let x = d3.scaleTime().range([0, width])
      let y = d3.scaleLinear().range([height, 0])
      let z = d3.scaleOrdinal(d3.schemeCategory10)

      let line = d3.line()
        .curve(d3.curveBasis)
        .x(function (d) { return x(d.date) })
        .y(function (d) { return y(d.temperature) })

      try {
        let typ = vm.getType
        d3.tsv('/cdn/data.tsv', typ, function (error, data) {
          console.log(data)
          if (error) {
            console.log('tsv conversion error: ' + JSON.stringify(error))
            throw error
          }

          let cities = data.columns.slice(1).map(function (id) {
            return {
              id: id,
              values: data.map(function (d) {
                return {date: d.date, temperature: d[id]}
              })
            }
          })

          x.domain(d3.extent(data, function (d) {
            return d.date
          }))

          y.domain([
            d3.min(cities, function (c) {
              return d3.min(c.values, function (d) {
                return d.temperature
              })
            }),
            d3.max(cities, function (c) {
              return d3.max(c.values, function (d) {
                return d.temperature
              })
            })
          ])

          z.domain(cities.map(function (c) {
            return c.id
          }))

          g.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(x))

          g.append('g')
            .attr('class', 'axis axis--y')
            .call(d3.axisLeft(y))
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 6)
            .attr('dy', '0.71em')
            .attr('fill', '#000')
            .text('Temperature, ºF')

          let city = g.selectAll('.city')
            .data(cities)
            .enter().append('g')
            .attr('class', 'city')

          city.append('path')
            .attr('class', 'line')
            .attr('d', function (d) {
              return line(d.values)
            })
            .style('stroke', function (d) {
              return z(d.id)
            })

          city.append('text')
            .datum(function (d) {
              return {id: d.id, value: d.values[d.values.length - 1]}
            })
            .attr('transform', function (d) {
              return 'translate(' + x(d.value.date) + ',' + y(d.value.temperature) + ')'
            })
            .attr('x', 3)
            .attr('dy', '0.35em')
            .style('font', '10px sans-serif')
            .text(function (d) {
              return d.id
            })
        })
      } catch (err) {
        console.log(err)
      }
    },
    getType: function (d, /*_,*/ columns) {
      console.log('getType: ' + d)
      try {
        let parseTime = d3.timeParse('%Y%m%d') // parseTime(d.date)
        d.date = parseTime(d.date)
        for (let i = 1, n = columns.length, c; i < n; ++i) {
          console.log(columns[i])
          d[c = columns[i]] = +d[c]
        }
      } catch (err) {
        console.log('getType throwing ' + err)
        throw err
      }
      console.log('getType returning: ' + JSON.stringify(d))
      return d
    },
    calculatePath: function () {
      let vm = this
      vm.updateSvg()
      /* const scale = vm.getScales()
      const path = d3.line()
        .x((d, i) => scale.x(i))
        .y(d => scale.y(d))
      vm.line = path(vm.lineData)
      console.log('calculated path.') */
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
