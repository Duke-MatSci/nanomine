<template>
  <div class="vis">
    <v-alert
      v-model="visError"
      type="error"
      dismissible
    >
      {{visErrorMsg}}
    </v-alert>
    <div class="navbar navbar-fixed-top">
      <nav class="navbar navbar-inverse">
        <div class="container-fluid">
          <v-jumbotron>
            <v-layout align-center>
              <v-flex>
                <h3 class="mainheading">NanoMine Visualization Dashboard</h3>
                <span
                  class="subheading">Explore a series of visualizations to reveal Nanocomposites data patterns</span>
                <br/>
                <v-btn class="mx-0" color="primary" id="fp" v-on:click="makeFpActive()">Filler Descriptor vs
                  Material Property
                </v-btn>
                <v-btn class="mx-0" color="primary" id="mp" v-on:click="active ='mp'">Material Property
                  Dashboard
                </v-btn>
                <v-btn class="mx-0" color="primary" id="ms" v-on:click="active ='ms'">Material Spectrum</v-btn>
              </v-flex>
            </v-layout>
          </v-jumbotron>
        </div>
      </nav>
    </div>
    <div v-if="showMain()">
      <v-layout column fill-height>
        <!-- visualization dashboard section -->
        <div class="text-center" id="dashboard">
          <div class="row">
            <div class="col-xs-2 col-sm-2 col-md-2 col-lg-2"></div>
            <div class="col-xs-8 col-sm-8 col-md-8 col-lg-8">
              <!--h4 class="text-left">In this prototype data visualizer, data in NanoMine are visualized in various ways. At present, four functions are being developed and preliminary versions are available in the navigation bar:</h4-->
              <h4 class="text-left">Data in NanoMine may be visualized in various ways. At present, three functions are
                available in the navigation bar:</h4>
              <div class="col-xs-8 col-sm-8 col-md-8 col-lg-8">
                <p class="text-left"> • Filler Descriptors vs. Material Property: to see impact of the filler features
                  on the final properties. </p>
                <p class="text-left"> • Material Property Dashboard: to explore the correlations between two selected
                  properties. </p>
                <p class="text-left"> • Material Spectrum: to examine the relationships between the features and the
                  properties of a specific composite or a certain matrix or filler of interest. </p>
                <!--p class="text-left"> •   Database Overview (under construction) will offera visual summary of the data in NanoMine. </p-->
              </div>
              <img style="width:680px;height:auto;" src="/cdn/img/visualization_hero.jpg"/>
              <br>
              <!--h4 class="text-left">While many of these functions are under construction, an example illustrating the types of visualizations which will be readily available in the next months is below. </h4-->
              <p class="text-left">To re-create the sample visualization shown above: </p>
              <div class="col-xs-8 col-sm-8 col-md-8 col-lg-8">
                <p class="text-left"> • select the first tab (“filler descriptor vs material property”) </p>
                <p class="text-left"> • select “mass fraction” as the x-axis </p>
                <p class="text-left"> • select “glass transition temperature” as the y-axis </p>
                <p class="text-left"> • Refinement can be obtained by playing with other features on the page </p>
                <p class="text-left"> • The table below the graph contains the information of the graph in tabular
                  form.</p>
                <img src="/cdn/img/visualization_hero2.png"/>
              </div>
              <div class="col-xs-2 col-sm-2 col-md-2 col-lg-2"></div>
            </div>
          </div>
        </div>
      </v-layout>
    </div>
    <div v-if="showfp()">
      <v-container fluid grid-list-xl>
        <!--v-layout align-center justify-space-around column fill-height-->
        <h1>Filler Descriptor vs Material Property</h1>
        <v-layout xs12 align-center>
          <v-flex xs1 d-flex></v-flex>
          <v-flex xs5 d-flex>
            <v-select v-model="fillerProperty" v-on:change="getMaterialPropertiesForFillerProperty()"
                      :items="fillerPropertyList"
                      label="Select Filler Property for X axis"
            ></v-select>
          </v-flex>
          <v-flex xs6 d-flex>
            <v-select v-model="materialPropertyY"
                      :items="materialPropertiesY"
                      label="Select Material Property for Y axis"
                      v-on:change="visualizeFp()"
            ></v-select>
            <v-flex xs2 d-flex></v-flex>
          </v-flex>
        </v-layout>
        <!--table class="table">
          <thead>
          <tr>
            <th class="text-center" id="sampleFilter"></th>
            <th class="text-center" id="matrixFilter"></th>
            <th class="text-center" id="fillerFilter"></th>
          </tr>
          </thead>
        </table-->
        <v-layout xs12 d-flex>
          <v-select xs3
                    v-model="fdmpSampleFilterSelected"
                    :items="fdmpSampleFilter"
                    label="Filter by sample"
                    v-on:change="fdmpFilterData"
                    multiple
          >
            <template
              slot="selection"
              slot-scope="{ item, index }"
            >
              <span v-if="index === 0">
                <span>{{ item }}</span>
              </span>
              <span
                v-if="index === 1"
                class="grey--text caption"
              >&nbsp;(+{{ fdmpSampleFilterSelected.length - 1 }} more)</span>
            </template>
            <v-list-tile
              slot="prepend-item"
              ripple
              @click="fdmpAllSamplesToggle"
            >
              <v-list-tile-action>
                <v-icon :color="fdmpSampleFilterSelected.length > 0 ? 'indigo darken-4' : ''">{{ icon }}</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Select All</v-list-tile-title>
            </v-list-tile>
            <v-divider
              slot="prepend-item"
              class="mt-2"
            ></v-divider>
          </v-select>
          <v-flex xs1 d-flex></v-flex>
          <v-select xs3
                    v-model="fdmpMatrixFilterSelected"
                    :items="fdmpMatrixFilter"
                    label="Filter by matrix"
                    v-on:change="fdmpFilterData"
                    multiple
          >
            <template
              slot="selection"
              slot-scope="{ item, index }"
            >
              <span v-if="index === 0">
                <span>{{ item }}</span>
              </span>
              <span
                v-if="index === 1"
                class="grey--text caption"
              >&nbsp;(+{{ fdmpMatrixFilterSelected.length - 1 }} more)</span>
            </template>
            <v-list-tile
              slot="prepend-item"
              ripple
              @click="fdmpAllMatrixToggle"
            >
              <v-list-tile-action>
                <v-icon :color="fdmpMatrixFilterSelected.length > 0 ? 'indigo darken-4' : ''">{{ matrixIcon }}</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Select All</v-list-tile-title>
            </v-list-tile>
            <v-divider
              slot="prepend-item"
              class="mt-2"
            ></v-divider>
          </v-select>
          <v-flex xs1 d-flex></v-flex>
          <v-select xs3
                    v-model="fdmpFillerFilterSelected"
                    :items="fdmpFillerFilter"
                    label="Filter by filler"
                    v-on:change="fdmpFilterData"
                    multiple
          >
            <template
              slot="selection"
              slot-scope="{ item, index }"
            >
              <span v-if="index === 0">
                <span>{{ item }}</span>
              </span>
              <span
                v-if="index === 1"
                class="grey--text caption"
              >&nbsp;(+{{ fdmpFillerFilterSelected.length - 1 }} more)</span>
            </template>
            <v-list-tile
              slot="prepend-item"
              ripple
              @click="fdmpAllFillerToggle"
            >
              <v-list-tile-action>
                <v-icon :color="fdmpFillerFilterSelected.length > 0 ? 'indigo darken-4' : ''">{{ fillerIcon }}</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Select All</v-list-tile-title>
            </v-list-tile>
            <v-divider
              slot="prepend-item"
              class="mt-2"
            ></v-divider>
          </v-select>
        </v-layout>
        <div class="visChartContainer">
          <GChart class="visChart" xs12 v-if="showFdmpChart()"
                  type="BubbleChart"
                  :data="fdmpChartData"
                  :options="fdmpChartOptions"
          />
          <div class="visNoData" v-else>
            No data for selected criteria
          </div>
        </div>
        <v-flex xs12 v-flex v-if="showFdmpChart()">
          <v-btn xs4 align-center color="secondary">Download Table as CSV</v-btn>
        </v-flex>
        <GChart xs12 v-if="showFdmpChart()"
                type="Table"
                :data="fdmpChartData"
                :options="fdmpTableOptions"
        />
        <br>
        <!--div id="propertyTable"></div-->
        <!--v-btn v-on:click="active ='main'">Go Back</v-btn-->
      </v-container>
    </div> <!-- showfp() -->
    <div v-if="showmp()">
      <h1>Material Property Dashboard</h1>
      <table class="table">
        <thead>
        <tr>
          <th scope="col" class="text-center">choose one material property as x axis:</th>
          <th scope="col" class="text-center">choose one material property as y axis:</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><select id="material-property-select-x" style="width:300px;">
            <option value="" disabled selected></option>
          </select></td>
          <td><select id="material-property-select-y" style="width:300px;">
            <option value="" disabled selected></option>
          </select></td>
          <td>
            <v-btn type="button" class="btn btn-primary" id="viz-mp" style="width:300px;">Visualize</v-btn>
          </td>
        </tr>
        </tbody>
      </table>
      <!--table class="table">
        <thead>
        <tr>
          <th class="text-center" id="sampleFilter"></th>
          <th class="text-center" id="matrixFilter"></th>
          <th class="text-center" id="fillerFilter"></th>
          <th class="text-center" id="fillerPropertyFilter"></th>
        </tr>
        </thead>
      </table>
      <div id="propertyChart"></div>
      <br>
      <div id="propertyTable"></div-->
      <v-btn type="button" class="btn btn-primary" id="mp" v-on:click="active ='main'">Go Back</v-btn>
    </div> <!-- showmp() -->
    <div v-if="showms()">
      <h1>Material Spectrum Dashboard</h1>
      <table class="table">
        <thead>
        <tr>
          <th scope="col" class="text-center">choose matrix</th>
          <th scope="col" class="text-center">choose filler</th>
          <th scope="col" class="text-center">choose x axis</th>
          <th scope="col" class="text-center">choose y axis</th>
          <th></th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><select id="matrix-select" style="width:300px;">
            <option value="" disabled selected></option>
          </select></td>
          <td><select id="filler-select" style="width:300px;">
            <option value="" disabled selected></option>
          </select></td>
          <td><select id="specialization-x" style="width:300px;">
            <option value="" disabled selected></option>
          </select></td>
          <td><select id="specialization-y" style="width:300px;">
            <option value="" disabled selected></option>
          </select></td>
          <td>
            <v-btn type="button" class="btn btn-primary" id="viz-ms" style="width:300px;">Visualize</v-btn>
          </td>
        </tr>
        </tbody>
      </table>
      <table class="table">
        <thead>
        <tr>
          <th class="text-center" id="sampleFilter"></th>
        </tr>
        </thead>
      </table>
      <div id="propertyChart"></div>
      <br>
      <div id="propertyTable"></div>
      <v-btn type="button" class="btn btn-primary" id="ms" v-on:click="active ='main'">Go Back</v-btn>
    </div> <!-- showms() -->
    <div v-if="showdb()">
      <h1>Material Spectrum Dashboard (Under Construction)</h1>
    </div> <!-- showdb()under construction -->
  </div>
</template>

<script>

import {} from 'vuex'
import axios from 'axios'
import {GChart} from 'vue-google-charts'

export default {
  name: 'Visualization',
  components: {
    GChart
  },
  data () {
    return {
      active: 'main',
      msg: 'Visualization',
      visError: false,
      visErrorMsg: '',
      nanoPrefix: 'http://nanomine.tw.rpi.edu/ns/',
      unitPrefix: 'http://nanomine.tw.rpi.edu/ns/unit/',
      samplePrefix: 'http://nanomine.tw.rpi.edu/sample/',
      compoundPrefix: 'http://nanomine.tw.rpi.edu/compound/',
      sioPrefix: 'http://semanticscience.org/resource/',
      fillerProperty: '',
      fillerPropertyList: [],
      fillerPropertyMap: new Map(),
      matrixList: [],
      matrixListMap: new Map(),
      fillerList: [],
      fillerListMap: new Map(),
      materialProperty: '',
      materialPropertyY: '',
      materialPropertiesY: [],
      materialPropertyList: [],
      materialPropertyMap: new Map(),
      materialPropertyListY: [],
      fdmpChartData: [],
      fdmpUnfilteredChartData: [],
      fdmpChartOptions: null,
      fdmpTableOptions: null,
      fdmpSampleFilter: [],
      fdmpSampleFilterSelected: [],
      fdmpMatrixFilter: [],
      fdmpMatrixFilterSelected: [],
      fdmpFillerFilter: [],
      fdmpFillerFilterSelected: []
    }
  },
  computed: {
    fdmpAllSamplesSelected: function () {
      return this.fdmpSampleFilter.length === this.fdmpSampleFilterSelected.length
    },
    fdmpSomeSamplesSelected: function () {
      return this.fdmpSampleFilterSelected.length > 0 && !this.fdmpAllSamplesSelected
    },
    icon: function () {
      if (this.fdmpAllSamplesSelected) return 'check_box'
      if (this.fdmpSomeSamplesSelected) return 'indeterminate_check_box'
      return 'check_box_outline_blank'
    },
    fdmpAllMatrixSelected: function () {
      return this.fdmpMatrixFilter.length === this.fdmpMatrixFilterSelected.length
    },
    fdmpSomeMatrixSelected: function () {
      return this.fdmpMatrixFilterSelected.length > 0 && !this.fdmpAllMatrixSelected
    },
    matrixIcon: function () {
      if (this.fdmpAllMatrixSelected) return 'check_box'
      if (this.fdmpSomeMatrixSelected) return 'indeterminate_check_box'
      return 'check_box_outline_blank'
    },
    fdmpAllFillerSelected: function () {
      return this.fdmpFillerFilter.length === this.fdmpFillerFilterSelected.length
    },
    fdmpSomeFillerSelected: function () {
      return this.fdmpFillerFilterSelected.length > 0 && !this.fdmpAllFillerSelected
    },
    fillerIcon: function () {
      if (this.fdmpAllFillerSelected) return 'check_box'
      if (this.fdmpSomeFillerSelected) return 'indeterminate_check_box'
      return 'check_box_outline_blank'
    }
  },
  methods: {
    fdmpFilterData: function () {
      let sampleIdx = 0
      let matrixIdx = 8
      let fillerIdx = 9
      let vm = this
      let rv = vm.fdmpUnfilteredChartData.filter((v, idx, a) => {
        let keep = true
        if (idx > 0) { // Always keep header record
          if (vm.fdmpSampleFilterSelected.length > 0 && !vm.fdmpSampleFilterSelected.includes(v[sampleIdx])) {
            keep = false
          }
          if (keep === true && vm.fdmpMatrixFilterSelected.length > 0 && (!vm.fdmpMatrixFilterSelected.includes(v[matrixIdx]) || v[matrixIdx].length <= 0)) {
            keep = false
          }
          if (keep === true && vm.fdmpFillerFilterSelected.length > 0 && (!vm.fdmpFillerFilterSelected.includes(v[fillerIdx]) || v[fillerIdx].length <= 0)) {
            keep = false
          }
        }
        return keep
      })
      if (rv.length === 1) { // if it's just the headers then there is no data, so keep the chart from displaying
        rv = []
      }
      vm.fdmpChartData = rv
    },
    fdmpAllSamplesToggle: function () {
      let vm = this
      vm.$nextTick(function () {
        console.log('toggle all samples.')
        if (vm.fdmpSampleFilterSelected.length === vm.fdmpSampleFilter.length) {
          vm.fdmpSampleFilterSelected = []
        } else {
          vm.fdmpSampleFilterSelected = vm.fdmpSampleFilter.slice()
        }
      })
    },
    fdmpAllMatrixToggle: function () {
      let vm = this
      vm.$nextTick(function () {
        console.log('toggle all matrix.')
        if (vm.fdmpMatrixFilterSelected.length === vm.fdmpMatrixFilter.length) {
          vm.fdmpMatrixFilterSelected = []
        } else {
          vm.fdmpMatrixFilterSelected = vm.fdmpMatrixFilter.slice()
        }
      })
    },
    fdmpAllFillerToggle: function () {
      let vm = this
      vm.$nextTick(function () {
        console.log('toggle all Filler.')
        if (vm.fdmpFillerFilterSelected.length === vm.fdmpFillerFilter.length) {
          vm.fdmpFillerFilterSelected = []
        } else {
          vm.fdmpFillerFilterSelected = vm.fdmpFillerFilter.slice()
        }
      })
    },
    showMain: function () {
      let vm = this
      return (
        vm.active === 'main'
      )
    },
    showfp: function () {
      let vm = this
      return (
        vm.active === 'fp'
      )
    },
    showFdmpChart: function () {
      let vm = this
      return (vm.fdmpChartData.length > 0 && vm.fdmpChartOptions !== null)
    },
    showmp: function () {
      let vm = this
      return (
        vm.active === 'mp'
      )
    },
    showms: function () {
      let vm = this
      return (
        vm.active === 'ms'
      )
    },
    showdb: function () {
      let vm = this
      return (
        vm.active === 'db'
      )
    },
    makeFpActive: function () {
      let vm = this
      console.log('makeFpActive')
      vm.active = 'fp'
      if (vm.fillerPropertyList.length === 0) {
        axios.get('/nmr/visualization/fillerPropertyList')
          .then(rsp => {
            for (let i = 0; i < rsp.data.results.bindings.length; i++) {
              let fp = rsp.data.results.bindings[i].fillerProperty.value
              let key = ''
              if (fp.includes(vm.nanoPrefix)) {
                key = fp.substring(vm.nanoPrefix.length, fp.length).replace(/([A-Z]+)/g, ' $1').replace(/^./, function (str) {
                  return str.toUpperCase()
                })
              } else if (fp.includes(vm.sioPrefix)) {
                key = fp.substring(vm.sioPrefix.length, fp.length).replace(/([A-Z]+)/g, ' $1').replace(/^./, function (str) {
                  return str.toUpperCase()
                })
              }
              vm.fillerPropertyMap.set(key, fp)
              vm.fillerPropertyList.push(key)
            }
          })
          .catch(err => {
            let msg = 'get fillerPropertyList error: ' + err
            vm.visError = true
            vm.visErrorMsg = msg
            console.log(msg)
          })
      }
      if (vm.materialPropertyList.length === 0) { // where did the code for this come from in the original
        axios.get('/nmr/visualization/materialPropertyList')
          .then(rsp => {
            for (let i = 0; i < rsp.data.results.bindings.length; i++) {
              let mp = rsp.data.results.bindings[i].materialProperty.value
              let key = mp.substring(vm.nanoPrefix.length, mp.length).replace(/([A-Z]+)/g, ' $1').replace(/^./,
                function (str) {
                  return str.toUpperCase()
                })
              vm.materialPropertyMap.set(key, mp)
              vm.materialPropertyList.push(key)
            }
          })
          .catch(err => {
            let msg = 'get materialPropertyList error: ' + err
            vm.visError = true
            vm.visErrorMsg = msg
            console.log(msg)
          })
      }
    },
    getMaterialPropertiesForFillerProperty: function () {
      let vm = this
      let fp = vm.fillerProperty
      let fpUri = vm.fillerPropertyMap.get(fp)
      axios.get('/nmr/visualization/materialPropertiesForFillerProperty', {
        params: {
          'fillerPropertyUri': fpUri
        }
      })
        .then(function (rsp) {
          vm.materialPropertiesY = []
          for (let i = 0; i < rsp.data.results.bindings.length; i++) {
            let mp = rsp.data.results.bindings[i].materialProperty.value
            let count = rsp.data.results.bindings[i].count.value
            let key = mp.substring(vm.nanoPrefix.length, mp.length).replace(/([A-Z]+)/g, ' $1').replace(/^./, function (str) {
              return str.toUpperCase()
            }) + ' (' + count + ')'
            vm.materialPropertiesY.push(key)
          }
        })
        .catch(function (err) {
          let msg = 'get materialPropertiesForFillerProperty - error: ' + err
          console.log(msg)
          vm.visError = true
          vm.visErrorMsg = msg
        })
    },
    visualizeFp: function () {
      let vm = this
      let fpX = vm.fillerProperty
      let mpY = vm.materialPropertyY
      let fpUri = vm.fillerPropertyMap.get(fpX)
      if (mpY.indexOf('(') !== -1) {
        mpY = mpY.split(' ').slice(0, -1).join(' ')
      }
      let mpUri = vm.materialPropertyMap.get(mpY)
      axios.get('/nmr/visualization/fillerPropertyMaterialPropertyGraphData', {
        params: {
          'fillerPropertyUri': fpUri,
          'materialPropertyUri': mpUri
        }
      })
        .then(function (rsp) {
          vm.visError = false
          vm.fdmpSampleFilter = []
          vm.fdmpSampleFilterSelected = []
          vm.fdmpMatrixFilter = []
          vm.fdmpMatrixFilterSelected = []
          vm.fdmpFillerFilter = []
          vm.fdmpFillerFilterSelected = []
          vm.fdmpChartData = []
          vm.fdmpUnfilteredChartData = [['sample', fpX, mpY, 'control', 'bubble size', fpX, mpY, 'matrix-filler', 'matrix', 'filler', 'paper link', 'paper title']]
          if (rsp.data.results.bindings.length === 0) {
            vm.visErrorMsg = 'An axis you have selected includes an array of data and cannot be visualized with this chart. Try using Material Spectrum instead.'
            vm.visError = true
            vm.fdmpChartData = []
            vm.fdmpUnfilteredChartData = []
          } else {
            let xUnit = ''
            let yUnit = ''
            for (let i = 0; i < rsp.data.results.bindings.length; i++) {
              let sample = rsp.data.results.bindings[i].sample.value.substring(vm.samplePrefix.length, rsp.data.results.bindings[i].sample.value.length)
              let x = parseFloat(rsp.data.results.bindings[i].x.value)
              let y = parseFloat(rsp.data.results.bindings[i].y.value)
              if (rsp.data.results.bindings[i].hasOwnProperty('xUnit')) {
                xUnit = rsp.data.results.bindings[i].xUnit.value.substring(vm.unitPrefix.length, rsp.data.results.bindings[i].xUnit.value.length)
                // temperature unit conversion (all to celsius)
                if (xUnit === 'kelvin') {
                  // x = (x - 273.15).toFixed(2);
                  x = Math.round((x - 273.15) * 1e2) / 1e2
                  xUnit = 'celsius'
                }
                // pressure unit conversion (all to mpa)
                if (xUnit === 'gpa') {
                  x = Math.round((x * 1e3) * 1e2) / 1e2
                  xUnit = 'mpa'
                }
                if (xUnit === 'kpa') {
                  x = Math.round((x / 1e3) * 1e2) / 1e2
                  xUnit = 'mpa'
                }
                // resistivity unit conversion (all to 10^15 ohm-cm)
                if (xUnit === 'ohm-cm' || xUnit === 'omega-cm') {
                  x = Math.round((x / 1e15) * 1e4) / 1e4
                  xUnit = '1E15 ohm-cm'
                }
                if (xUnit === 'ohm-meter') {
                  x = Math.round((x / 1e13) * 1e4) / 1e4
                  xUnit = '1E15 ohm-cm'
                }
              }
              if (rsp.data.results.bindings[i].hasOwnProperty('yUnit')) {
                yUnit = rsp.data.results.bindings[i].yUnit.value.substring(vm.unitPrefix.length, rsp.data.results.bindings[i].yUnit.value.length)
                // temperature unit conversion (all to celsius)
                if (yUnit === 'kelvin') {
                  // y = (y - 273.15).toFixed(2);
                  y = Math.round((y - 273.15) * 1e2) / 1e2
                  yUnit = 'celsius'
                }
                // pressure unit conversion (all to mpa)
                if (yUnit === 'gpa') {
                  y = Math.round((y * 1e3) * 1e2) / 1e2
                  yUnit = 'mpa'
                }
                if (yUnit === 'kpa') {
                  y = Math.round((y / 1e3) * 1e2) / 1e2
                  yUnit = 'mpa'
                }
                // resistivity unit conversion (all to 10^15 ohm-cm)
                if (yUnit === 'ohm-cm' || yUnit === 'omega-cm') {
                  y = Math.round((y / 1e15) * 1e4) / 1e4
                  yUnit = '1E15 ohm-cm'
                }
                if (yUnit === 'ohm-meter') {
                  y = Math.round((y / 1e13) * 1e4) / 1e4
                  yUnit = '1E15 ohm-cm'
                }
              }
              let matrixPolymer = rsp.data.results.bindings[i].matrixPolymer.value.substring(vm.compoundPrefix.length, rsp.data.results.bindings[i].matrixPolymer.value.length)
              let fillerPolymer = rsp.data.results.bindings[i].fillerPolymer.value.substring(vm.compoundPrefix.length, rsp.data.results.bindings[i].fillerPolymer.value.length)
              let doi = rsp.data.results.bindings[i].doi.value
              let title = rsp.data.results.bindings[i].title.value
              vm.fdmpUnfilteredChartData.push([sample, x, y, 'control-' + x, 1, x + ' ' + xUnit, y + ' ' + yUnit, matrixPolymer + '(matrix)-' + fillerPolymer + '(filler)', matrixPolymer, fillerPolymer, doi, title])
              if (sample.trim().length > 0 && !vm.fdmpSampleFilter.includes(sample)) {
                vm.fdmpSampleFilter.push(sample)
              }
              if (matrixPolymer.trim().length > 0 && !vm.fdmpMatrixFilter.includes(matrixPolymer)) {
                vm.fdmpMatrixFilter.push(matrixPolymer)
              }
              if (fillerPolymer.trim().length > 0 && !vm.fdmpFillerFilter.includes(fillerPolymer)) {
                vm.fdmpFillerFilter.push(fillerPolymer)
              }
            }
            vm.fdmpSampleFilter.sort()
            vm.fdmpMatrixFilter.sort()
            vm.fdmpFillerFilter.sort()
            if (xUnit !== '') xUnit = ' (' + xUnit + ')'
            if (yUnit !== '') yUnit = ' (' + yUnit + ')'
            vm.fdmpChartOptions = {
              'title': 'Filler Property Chart (series by matrix): ' + fpX + xUnit + ' vs ' + mpY + yUnit,
              'titlePosition': 'out',
              'titleTextStyle': {'color': 'red', 'fontSize': 16, 'bold': true},
              'hAxis': {'title': fpX + xUnit},
              'vAxis': {'title': mpY + yUnit},
              'sizeAxis': {'minValue': 0, 'maxSize': 5},
              // 'height': chartHeight,
              // 'width': chartWidth,
              'legend': 'top',
              'explorer': {
                'keepInBounds': true,
                'actions': ['dragToZoom', 'rightClickToReset'],
                'maxZoomIn': 0.05,
                'maxZoomOut': 1
              },
              'view': {'columns': [0, 1, 2, 7]}
            }
            vm.fdmpTableOptions = {
              table: {
                'view': {'columns': [0, 5, 6, 8, 9, 10, 11]}
              }
            }
            vm.fdmpFilterData() // this copies the data to the chart!!!
            // let sampleCategoryFilter = new google.visualization.ControlWrapper({'controlType': 'CategoryFilter', 'containerId': 'sampleFilter', 'options': {'filterColumnIndex': 0, 'ui': {'caption': 'search/choose a sample', 'selectedValuesLayout': 'belowWrapping'}}})
            // let matrixlCategoryFilter = new google.visualization.ControlWrapper({'controlType': 'CategoryFilter', 'containerId': 'matrixFilter', 'options': {'filterColumnIndex': 8, 'ui': {'caption': 'search/choose a matrix', 'selectedValuesLayout': 'belowWrapping'}}})
            // let fillerCategoryFilter = new google.visualization.ControlWrapper({'controlType': 'CategoryFilter', 'containerId': 'fillerFilter', 'options': {'filterColumnIndex': 9, 'ui': {'caption': 'search/choose a filler', 'selectedValuesLayout': 'belowWrapping'}}})
            // let bubbleChart = new google.visualization.ChartWrapper({'chartType': 'BubbleChart', 'containerId': 'propertyChart', 'options': {'title': 'Filler Property Chart (series by martix): ' + fp_x + xUnit + ' vs ' + mp_y + yUnit, 'titlePosition': 'out', 'titleTextStyle': {'color': 'red', 'fontSize': 16, 'bold': true}, 'hAxis': {'title': fp_x + xUnit}, 'vAxis': {'title': mp_y + yUnit}, 'sizeAxis': {'minValue': 0, 'maxSize': 5}, 'height': chartHeight, 'width': chartWidth, 'legend': 'top', 'explorer': {'keepInBounds': true, 'actions': ['dragToZoom', 'rightClickToReset'], 'maxZoomIn': 0.05, 'maxZoomOut': 1}}, 'view': {'columns': [0, 1, 2, 7]}})
            // let tableChart = new google.visualization.ChartWrapper({'chartType': 'Table', 'containerId': 'propertyTable', 'options': {'height': tableHeight, 'width': tableWidth}, 'view': {'columns': [0, 5, 6, 8, 9, 10, 11]}})
            // DRAW CHART new google.visualization.Dashboard(dashboard.get(0)).bind([sampleCategoryFilter, matrixlCategoryFilter, fillerCategoryFilter], [bubbleChart, tableChart]).draw(chartData);
            // if($('#download').length == 0) dashboard.append('<button id="download" class="btn-primary" style="width:300px;" onClick="exportTableToCSV(\'nanomineData.csv\')">Download Data Table as CSV</button>');
          }
        })
        .catch(function (err) {
          let msg = 'get fillerPropertyMaterialPropertyGraphData - error: ' + err
          console.log(msg)
          vm.visError = true
          vm.visErrorMsg = msg
        })
    },
    makeMsActive: function () {
      let vm = this
      console.log('makeMsActive')
      vm.active = 'ms'
      if (!vm.matrixList || vm.matrixList.length <= 0) {
        vm.setLoading()
        setTimeout(function () {
          vm.matrixMaterial = [{'ms': 'a', 'uri': 'a1'}, {'ms': 'b', 'uri': 'b1'}, {'ms': 'c', 'uri': 'c1'}]
          vm.matrixMaterial.forEach(function (v) {
            vm.matrixList.push(v, ms)
          })
          vm.resetLoading()
        }, 0)
      }
    }

  }
  /* under construction
          makeDbActive: function () {
            let vm = this
            console.log('makeDbActive')
            vm.active = 'db'
            if (!vm.matrixList || vm.matrixList.length <= 0) {
              vm.setLoading()
              setTimeout(function(){
                vm.fillerProperties = [{'db': 'a', 'uri': 'a1'}, {'db': 'b', 'uri': 'b1'}, {'db': 'c', 'uri':'c1'}]
                vm.fillerProperties.forEach(function (v) {
                  vm.matrixList.push(v, db)
                })
                vm.resetLoading()
              }, 0)
            }
          }, */
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .viz {
  }

  .mainheading { /* class of large text in jumbotron*/
    font-size: 40px;
    color: white;
    padding-top: 20px;
  }

  .subheading {
    color: white;
  }

  h1 {
    margin-top: 0px;
    margin-bottom: 10px;
  }

  .visChartContainer {
    height: 500px;
  }

  .visChart {
    height: 100%;
  }
  .visNoData {
    margin-top: 30px;
    font-size: 30px;
    color: red;
  }
  .container {
    padding-top: 10px;
  }
  .v-input {
    margin-top: 0px;
  }

  .v-alert {
    margin-top: 10px;
    margin-bottom: 0px;
  }

  .v-jumbotron {
    color: white;
    padding: 0.5rem 0.3rem;
    background-color: #000000;
    border-radius: 0px;
    margin-top: 0px;
    max-height: 185px;
  }

</style>
