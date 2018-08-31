<template>
  <div class="vis">
    <v-alert
      v-model="visError"
      type="error"
      dismissible
    >
      {{visErrorMsg}}
    </v-alert>
    <div v-if="showMain()">
      <v-layout column fill-height>
        <div class="navbar navbar-fixed-top">
          <nav class="navbar navbar-inverse">
            <div class="container-fluid">
              <div class="jumbotron">
                <v-layout align-center justify-center column fill-height>
                  <h1 class="display-3">NanoMine Visualization Dashboard</h1>
                  <p class="lead">Welcome! Explore a series of visualizations revealing data information by clicking on
                    the buttons below.</p>
                </v-layout>
              </div>
              <!--add option buttons here-->
              <ul class="nav navbar-nav"></ul>
              <a href="http://nanomine.org" class="btn navbar-btn btn-info" role="button"><span
                class="glyphicon glyphicon-home" title="Nanomine HomePage"></span></a>
              <v-layout justify-center row>
                <v-btn type="button" class="btn btn-primary" id="fp" v-on:click="makeFpActive()">Filler Descriptor vs
                  Material Property
                </v-btn>
                <v-btn type="button" class="btn btn-primary" id="mp" v-on:click="active ='mp'">Material Property
                  Dashboard
                </v-btn>
                <v-btn type="button" class="btn btn-primary" id="ms" v-on:click="active ='ms'">Material Spectrum</v-btn>
                <v-btn type="button" class="btn btn-primary" id="db" v-on:click="active ='db'">Database Overview (under
                  construction)
                </v-btn>
              </v-layout>
              <div class="navbar-header">
                <v-layout align-center justify-center row fill-height>
                  <a href="/viz" class="navbar-brand">Go back to NanoMine Main Page</a>
                </v-layout>
              </div>
            </div>
          </nav>
        </div>
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
              <a href="https://imgur.com/Thtu5w6"><img src="https://i.imgur.com/Thtu5w6.png" title="source: imgur.com"/></a>
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
                <a href="https://imgur.com/woeikox"><img src="https://i.imgur.com/woeikox.png"
                                                         title="source: imgur.com"/></a>
              </div>
              <div class="col-xs-2 col-sm-2 col-md-2 col-lg-2"></div>
            </div>
          </div>
        </div>
      </v-layout>
    </div>
    <div v-if="showfp()">
      <v-container fluid grid-list-xl>
        <v-layout wrap align-center>
      <!--v-layout align-center justify-space-around column fill-height-->
        <h1>Filler Descriptor vs Material Property</h1>
            <v-flex xs12 d-flex>
              <v-select v-model="fillerProperty" v-on:change="getMaterialPropertiesForFillerProperty()"
                :items="fillerPropertyList"
                label="Select Filler Property for X axis"
              ></v-select>
            </v-flex>
            <v-flex xs12 d-flex>
              <v-select v-model="materialPropertyY"
                :items="materialPropertiesY"
                label="Select Material Property for Y axis"
              ></v-select>
            </v-flex>
              <v-btn type="button" class="btn btn-primary" id="viz-fp" style="width:300px;">Visualize</v-btn>
        <table class="table">
          <thead>
          <tr>
            <th class="text-center" id="sampleFilter"></th>
            <th class="text-center" id="matrixFilter"></th>
            <th class="text-center" id="fillerFilter"></th>
          </tr>
          </thead>
        </table>
        <div id="propertyChart"></div>
        <br>
        <div id="propertyTable"></div>
      </v-layout>
      <v-btn type="button" class="btn btn-primary" v-on:click="active ='main'">Go Back</v-btn>
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
            <option value="" distabled selected></option>
          </select></td>
          <td><select id="material-property-select-y" style="width:300px;">
            <option value="" distabled selected></option>
          </select></td>
          <td>
            <v-btn type="button" class="btn btn-primary" id="viz-mp" style="width:300px;">Visualize</v-btn>
          </td>
        </tr>
        </tbody>
      </table>
      <table class="table">
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
      <div id="propertyTable"></div>
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
            <option value="" distabled selected></option>
          </select></td>
          <td><select id="filler-select" style="width:300px;">
            <option value="" distabled selected></option>
          </select></td>
          <td><select id="specialization-x" style="width:300px;">
            <option value="" distabled selected></option>
          </select></td>
          <td><select id="specialization-y" style="width:300px;">
            <option value="" distabled selected></option>
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
export default {
  name: 'Visualization',
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
      fillerProeprty: '',
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
      materialPropertyListY: []

    }
  },
  methods: {
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
            for (var i = 0; i < rsp.data.results.bindings.length; i++) {
              var fp = rsp.data.results.bindings[i].fillerProperty.value
              var key = ''
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
                function (str) { return str.toUpperCase() })
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
      let fpuri = vm.fillerPropertyMap.get(fp)
      axios.get('/nmr/visualization/materialPropertiesForFillerProperty', {
        params: {
          'fillerPropertyUri': fpuri
        }
      })
        .then(function (rsp) {
          vm.materialPropertiesY = []
          for (let i = 0; i < rsp.data.results.bindings.length; i++) {
            let mp = rsp.data.results.bindings[i].materialProperty.value
            let count = rsp.data.results.bindings[i].count.value
            let key = mp.substring(vm.nanoPrefix.length, mp.length).replace(/([A-Z]+)/g, ' $1').replace(/^./, function (str) { return str.toUpperCase() }) + ' (' + count + ')'
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

</style>
