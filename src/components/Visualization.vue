<template>
  <div class="vis" >
  <div v-if="showMain()">
    <v-layout column fill-height>
       <div class="navbar navbar-fixed-top">
            <nav class="navbar navbar-inverse">
                <div class="container-fluid">
                    <div class="jumbotron">
                      <v-layout align-center justify-center column fill-height>
                        <h1 class="display-3">NanoMine Visualization Dashboard</h1>
                        <p class="lead">Welcome! Explore a series of visualizations revealing data information by clicking on the buttons below.</p>
                      </v-layout>
                    </div>
                  <!--add option buttons here-->
                    <ul class="nav navbar-nav"></ul>
                    <a href="http://nanomine.org" class="btn navbar-btn btn-info" role="button"><span class = "glyphicon glyphicon-home" title="Nanomine HomePage"></span></a>
                  <v-layout justify-center row>
                    <v-btn type="button" class="btn btn-primary" id="fp" v-on:click="active ='fp'">Filler Descriptor vs Material Property</v-btn>
                    <v-btn type="button" class="btn btn-primary" id="mp" v-on:click="active ='mp'">Material Property Dashboard</v-btn>
                    <v-btn type="button" class="btn btn-primary" id="ms" v-on:click="active ='ms'">Material Spectrum</v-btn>
                    <v-btn type="button" class="btn btn-primary" id="db" v-on:click="active ='db'">Database Overview (under construction)</v-btn>
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
            <h4 class="text-left">Data in NanoMine may be visualized in various ways. At present, three functions are available in the navigation bar:</h4>
              <div class="col-xs-8 col-sm-8 col-md-8 col-lg-8">
            <p class="text-left"> •   Filler Descriptors vs. Material Property: to see impact of the filler features on the final properties.  </p>
            <p class="text-left"> •   Material Property Dashboard: to explore the correlations between two selected properties. </p>
            <p class="text-left"> •   Material Spectrum: to examine the relationships between the features and the properties of a specific composite or a certain matrix or filler of interest. </p>
            <!--p class="text-left"> •   Database Overview (under construction) will offera visual summary of the data in NanoMine. </p-->
              </div>
            <a href="https://imgur.com/Thtu5w6"><img src="https://i.imgur.com/Thtu5w6.png" title="source: imgur.com" /></a>
            <br>
            <!--h4 class="text-left">While many of these functions are under construction, an example illustrating the types of visualizations which will be readily available in the next months is below. </h4-->
            <p class="text-left">To re-create the sample visualization shown above: </p>
              <div class="col-xs-8 col-sm-8 col-md-8 col-lg-8">
            <p class="text-left"> •   select the first tab (“filler descriptor vs material property”) </p>
            <p class="text-left"> •   select “mass fraction” as the x-axis </p>
            <p class="text-left"> •   select “glass transition temperature” as the y-axis </p>
            <p class="text-left"> •   Refinement can be obtained by playing with other features on the page </p>
            <p class="text-left"> •   The table below the graph contains the information of the graph in tabular form.</p>
            <a href="https://imgur.com/woeikox"><img src="https://i.imgur.com/woeikox.png" title="source: imgur.com" /></a>
              </div>
              <div class="col-xs-2 col-sm-2 col-md-2 col-lg-2"></div>
            </div>
            </div>
        </div>
    </v-layout>
  </div>
    <div v-if="showfp()">
      <v-layout align-center justify-space-around column fill-height>
        <h1>Filler Descriptor vs Material Property</h1>
      <table class="table"><thead><tr><th scope="col" class="text-center">choose one filler property as x axis: </th><th scope="col" class="text-center">choose one material property as y axis:</th></tr></thead>
        <tbody><tr><td><select v-model="selected" id="material-property-select-y" style="width:300px;"><option disabled value = "">Please select one</option><div class="text-xs-center"><v-menu offset-y>
          <v-list>
            <v-list-tile
              v-for="(item, index) in items"
              :key="index"
              @click="data_drop_fx()"
            >
              <v-list-tile-title>{{ item.title }}</v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
    </div></select></td>
          <td><select v-model="selected" id="material-property-select-y" style="width:300px;"><option distabled value="">Please select one</option><option>A</option><option>B</option><option>C</option></select>
          </td><td><v-btn type="button" class="btn btn-primary" id="viz-fp" style="width:300px;">Visualize</v-btn></td></tr></tbody></table>
      <table class="table"><thead><tr><th class="text-center" id="sampleFilter"></th><th class="text-center" id="matrixFilter"></th><th class="text-center" id="fillerFilter"></th></tr></thead></table>
      <div id="propertyChart"></div>
      <br>
      <div id="propertyTable"></div>
      </v-layout>
      <v-btn type="button" class="btn btn-primary" v-on:click="active ='main'">Go Back</v-btn>
    </div> <!-- showfp() -->
    <div v-if="showmp()">
      <h1>Material Property Dashboard</h1>
      <table class="table"><thead><tr><th scope="col" class="text-center">choose one material property as x axis: </th><th scope="col" class="text-center">choose one material property as y axis:</th></tr></thead><tbody><tr><td><select id="material-property-select-x" style="width:300px;"><option value="" distabled selected></option></select></td><td><select id="material-property-select-y" style="width:300px;"><option value="" distabled selected></option></select></td><td><v-btn type="button" class="btn btn-primary" id="viz-mp" style="width:300px;">Visualize</v-btn></td></tr></tbody></table>
      <table class="table"><thead><tr><th class="text-center" id="sampleFilter"></th><th class="text-center" id="matrixFilter"></th><th class="text-center" id="fillerFilter"></th><th class="text-center" id="fillerPropertyFilter"></th></tr></thead></table>
      <div id="propertyChart"></div>
      <br>
      <div id="propertyTable"></div>
      <v-btn type="button" class="btn btn-primary" id="mp" v-on:click="active ='main'">Go Back</v-btn>
    </div> <!-- showmp() -->
    <div v-if="showms()">
      <h1>Material Spectrum Dashboard</h1>
      <table class="table"><thead><tr><th scope="col" class="text-center">choose matrix</th><th scope="col" class="text-center">choose filler</th><th scope="col" class="text-center">choose x axis</th><th scope="col" class="text-center">choose y axis</th><th></th></tr></thead><tbody><tr><td><select id="matrix-select" style="width:300px;"><option value="" distabled selected></option></select></td><td><select id="filler-select" style="width:300px;"><option value="" distabled selected></option></select></td><td><select id="specialization-x" style="width:300px;"><option value="" distabled selected></option></select></td><td><select id="specialization-y" style="width:300px;"><option value="" distabled selected></option></select></td><td><v-btn type="button" class="btn btn-primary" id="viz-ms" style="width:300px;">Visualize</v-btn></td></tr></tbody></table>
      <table class="table"><thead><tr><th class="text-center" id="sampleFilter"></th></tr></thead></table>
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

export default {
  name: 'Visualization',
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
    }
  },
  makeFpActive: function () {
    let vm = this
    console.log('makeFpActive')
    vm.active = 'fp'
    if (!vm.fillerPropertyList || vm.fillerPropertyList.length <= 0) {
      vm.setLoading()
      setTimeout(function () {
        vm.fillerProperties = [{'fp': 'a', 'uri': 'a1'}, {'fp': 'b', 'uri': 'b1'}, {'fp': 'c', 'uri': 'c1'}]
        vm.fillerProperties.forEach(function (v) {
          vm.fillerPropertyList.push(v, fp)
        })
        vm.resetLoading()
      }, 0)
    }
  },
  makeMpActive: function () {
    let vm = this
    console.log('makeMpActive')
    vm.active = 'mp'
    if (!vm.materialPropertyList || vm.materialPropertyList.length <= 0) {
      vm.setLoading()
      setTimeout(function () {
        vm.materialProperty = [{'mp': 'a', 'uri': 'a1'}, {'mp': 'b', 'uri': 'b1'}, {'mp': 'c', 'uri': 'c1'}]
        vm.materialProperty.forEach(function (v) {
          vm.materialPropertyList.push(v, mp)
        })
        vm.resetLoading()
      }, 0)
    }
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
  },
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
  data () {
    return {
      active: 'main',
      msg: 'Visualization'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .viz {

  }

</style>
