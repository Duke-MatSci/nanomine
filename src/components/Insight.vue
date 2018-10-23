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
    <v-alert
      v-model="insightError"
      type="error"
      dismissible
    >
      {{insightErrorMsg}}
    </v-alert>
      <v-layout align-center>
        <v-flex xs12>
          <svg ref="svg"></svg>
        </v-flex>
        <v-flex xs3>
          <v-btn v-on:click="handleClick()">Update</v-btn>
        </v-flex>
      </v-layout>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'Insight',
  data: () => {
    return ({
      msg: 'NanoMine Data Insight',
      insightError: false,
      insightErrorMsg: '',
      height: 600,
      width: 800,
      margin: {top: 20, right: 20, bottom: 30, left: 40},
      dataObj: null
    })
  },
  mounted: function () {
    this.updateSvg()
  },
  methods: { // Based on example from https://beta.observablehq.com/@mbostock/d3-multi-line-chart
    handleClick: function () {
      let vm = this
      vm.updateSvg()
    },
    updateSvg: function () {
      let vm = this
      vm.chart(vm.width, vm.height, vm.getdata()) // vm.xAxis, vm.yAxis, vm.getdata, vm.line, vm.hover)
    },
    x: function (d3, data, margin, width) {
      return (
        d3.scaleTime()
          .domain(d3.extent(data.dates))
          .range([margin.left, width - margin.right])
      )
    },
    x2: function () {
      let vm = this
      return d3.scaleTime()
        .domain(d3.extent(vm.dataObj.dates))
        .range([vm.margin.left, vm.width - vm.margin.right])
    },
    xAxis: function (svg, height, margin, d3, x, width) {
      let vm = this
      svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(vm.x2()).ticks(width / 80).tickSizeOuter(0))
    },
    y: function (d3, data, height, margin) {
      return (
        d3.scaleLinear()
          .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
          .range([height - margin.bottom, margin.top])
      )
    },
    y2: function () {
      let vm = this
      return d3.scaleLinear()
        .domain([0, d3.max(vm.dataObj.series, d => d3.max(d.values))]).nice()
        .range([vm.height - vm.margin.bottom, vm.margin.top])
    },
    yAxis: function (svg, margin, d3, y, data) {
      let vm = this
      svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(vm.y2()))
        .call(g => g.select('.domain').remove())
        .call(g => g.select('.tick:last-of-type text').clone()
          .attr('x', 3)
          .attr('text-anchor', 'start')
          .attr('font-weight', 'bold')
          .text(data.y))
    },
    line: function () {
      let vm = this
      return (d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => vm.x2(vm.dataObj.dates[i]))
        .y(d => vm.y2(d))
      )
    },
    hover: function hover (svg, path) {
      let vm = this
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
        const ym = vm.y2().invert(d3.event.layerY)
        const xm = vm.x2().invert(d3.event.layerX)
        const i1 = d3.bisectLeft(vm.dataObj.dates, xm, 1)
        const i0 = i1 - 1
        const i = xm - vm.dataObj.dates[i0] > vm.dataObj.dates[i1] - xm ? i1 : i0
        const s = vm.dataObj.series.reduce((a, b) => Math.abs(a.values[i] - ym) < Math.abs(b.values[i] - ym) ? a : b)
        path.attr('stroke', d => d === s ? null : '#ddd').filter(d => d === s).raise()
        let xVal = vm.x2(vm.dataObj.dates[i]) // x(vm.dataObj.dates[i])
        let yVal = vm.y2(s.values[i]) // y(s.values[i])
        // console.log('xm: ' + xm + ' xVal: ' + xVal(xm) + ' ym: ' + ym + ' yVal: ' + yVal(ym) + ' s.name: ' + s.name)
        dot.attr('transform', `translate(${xVal(xm)},${yVal(ym)})`)
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
    },
    lineCall: function (p) {
      // let xVal = vm.x2(vm.dataObj.dates[i]) // x(vm.dataObj.dates[i])
      // let yVal = vm.y2(s.values[i]) // y(s.values[i])
      let vm = this
      let rv = null
      // rv = vm.line(p)
      rv = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => vm.x2()(vm.dataObj.dates[i]))
        .y(d => vm.y2()(d))
      return rv(p)
    },
    chart: function (width, height, data) { // , xAxis, yAxis, line, hover) {
      let vm = this
      data
        .then(function (dataObj) {
          vm.dataObj = dataObj
          window.dataObj = dataObj
          // console.log(dataObj)
          let mySvg = vm.$refs['svg']
          const svg = d3.select(mySvg)
          svg.attr('height', height)
          svg.attr('width', width)
          vm.xAxis(svg, vm.height, vm.margin, d3, vm.x2() /* (d3, dataObj, vm.margin, vm.width) */, vm.width)
          vm.yAxis(svg, vm.margin, d3, vm.y2() /* (d3, dataObj, vm.height, vm.margin) */, dataObj)

          const path = svg.append('g')
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1.5)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .selectAll('path')
            .data(dataObj.series)
            .enter().append('path')
            .style('mix-blend-mode', 'multiply')
            .attr('d', d => vm.lineCall(d.values)) // window.dataObj.series[1].values
          svg.call(vm.hover, path)
          return svg.node()
        })
        .catch(function (err) {
          let msg = 'error fetching data: ' + err
          vm.insightError = true
          vm.insightErrorMsg = msg
          console.log(msg)
        })
      /*
      return svg.node()
      */
    },
    /*
     */
    getdata: async function () {
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
</style>
