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
          <svg class="line-graph" ref="svg">
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
      vm.chart(d3, document.body, vm.width, vm.height, vm.xAxis, vm.yAxis, vm.data, vm.line, vm.hover)
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
    },
    chart: function (d3, DOM, width, height, xAxis, yAxis, data, line, hover) {
      let vm = this
      // let mydata = d3.data
      let mySvg = vm.$refs['svg']
      const svg = d3.select(mySvg)
      svg.attr('height', height)
      svg.attr('width', width)

      svg.append('g')
        .call(xAxis)

      svg.append('g')
        .call(yAxis)

      let dataObj = vm.svgdata(d3)
      const path = svg.append('g')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 1.5)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .selectAll('path')
        .data(dataObj)
        .enter().append('path')
        .style('mix-blend-mode', 'multiply')
        .attr('d', d => line(d.values))

      svg.call(hover, path)

      return svg.node()
    },

    hover: function (y, d3, x, data) {
      return (
        function hover (svg, path) {
          svg.style('position', 'relative')
            .on('mousemove touchmove', moved)
            .on('mouseenter touchstart', entered)
            .on('mouseleave touchend', left)

          const dot = svg.append('g')
            .attr('display', 'none')

          dot.append('circle')
            .attr('r', 2.5)

          dot.append('text')
            .style('font', '10px sans-serif')
            .attr('text-anchor', 'middle')
            .attr('y', -8)

          function moved () {
            const ym = y.invert(d3.event.layerY)
            const xm = x.invert(d3.event.layerX)
            const i1 = d3.bisectLeft(data.dates, xm, 1)
            const i0 = i1 - 1
            const i = xm - data.dates[i0] > data.dates[i1] - xm ? i1 : i0
            const s = data.series.reduce((a, b) => Math.abs(a.values[i] - ym) < Math.abs(b.values[i] - ym) ? a : b)
            path.attr('stroke', d => d === s ? null : '#ddd').filter(d => d === s).raise()
            dot.attr('transform', `translate(${x(data.dates[i])},${y(s.values[i])})`)
            dot.select('text').text(s.name)
          }

          function entered () {
            path.style('mix-blend-mode', null).attr('stroke', '#ddd')
            dot.attr('display', null)
          }

          function left () {
            path.style('mix-blend-mode', 'multiply').attr('stroke', null)
            dot.attr('display', 'none')
          }
        }
      )
    },
    height: function () {
      return (
        600
      )
    },
    width: function () {
      return 800
    },
    margin: function () {
      return (
        {top: 20, right: 20, bottom: 30, left: 40}
      )
    },
    x: function (d3, data, margin, width) {
      return (
        d3.scaleTime()
          .domain(d3.extent(data.dates))
          .range([margin.left, width - margin.right])
      )
    },
    y: function (d3, data, height, margin) {
      return (
        d3.scaleLinear()
          .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
          .range([height - margin.bottom, margin.top])
      )
    },
    xAxis: function (height, margin, d3, x, width) {
      return (
        g => g
          .attr('transform', `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
      )
    },
    yAxis: function (margin, d3, y, data) {
      return (
        g => g
          .attr('transform', `translate(${margin.left},0)`)
          .call(d3.axisLeft(y))
          .call(g => g.select('.domain').remove())
          .call(g => g.select('.tick:last-of-type text').clone()
            .attr('x', 3)
            .attr('text-anchor', 'start')
            .attr('font-weight', 'bold')
            .text(data.y))
      )
    },
    line: function (d3, x, data, y) {
      return (
        d3.line()
          .defined(d => !isNaN(d))
          .x((d, i) => x(data.dates[i]))
          .y(d => y(d))
      )
    },
    svgdata: async function (d3) {
      const data = await d3.tsv('https://gist.githubusercontent.com' +
        '/mbostock/8033015/raw' +
        '/01e8225d4a65aca6c759fe4b8c77179f446c5815/unemployment.tsv', (d, i, columns) => {
        return {
          name: d.name.replace(/, ([\w-]+).*/, ' $1'),
          values: columns.slice(1).map(k => +d[k])
        }
      })
      return {
        y: '% Unemployment',
        series: data,
        dates: data.columns.slice(1).map(d3.timeParse('%Y-%m'))
      }
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
