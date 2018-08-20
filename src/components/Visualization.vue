<template>
  <div class="vis" >
    <v-layout align-center justify-center row fill-height>
      <div></div>
      <div class="navbar navbar-fixed-top">
            <nav class="navbar navbar-inverse">
                <div class="container-fluid">
                    <div class="navbar-header">
                        <a href="/viz" class="navbar-brand">Nanomine Data Dashboard</a>
                    </div>
                    <!--add option buttons here-->
                    <ul class="nav navbar-nav"></ul>
                    <a href="http://nanomine.org" class="btn navbar-btn btn-info" role="button"><span class = "glyphicon glyphicon-home" title="Nanomine HomePage"></span></a>
                    <button type="button" class="btn btn-primary navbar-btn" id="fp">Filler Descriptor vs Material Property</button>
                    <button type="button" class="btn btn-primary navbar-btn" id="mp">Material Property Dashboard</button>
                    <button type="button" class="btn btn-primary navbar-btn" id="ms">Material Spectrum</button>
                    <!--button type="button" class="btn btn-primary navbar-btn" id="db">Database Overview (under construction)</button-->

                </div>
            </nav>
        </div>
        <!-- visualization dashboard section -->
        <div class="text-center" id="dashboard">
            <div class="jumbotron">
              <h1 class="display-3">Nanomine Visualization Dashboard</h1>
              <p class="lead">Welcome! Explore a series of visualization revealing data information by clicking on the buttons in the navigation bar.</p>
            </div>

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
		</div>
            <a href="https://imgur.com/woeikox"><img src="https://i.imgur.com/woeikox.png" title="source: imgur.com" /></a>        
              </div>
              <div class="col-xs-2 col-sm-2 col-md-2 col-lg-2"></div>
            </div>
            </div>
        </div>
      <div></div>
    </v-layout>
  </div>
</template>

<script>

import {} from 'vuex'

export default {
  name: 'Visualization',
  methods: {
    show: function () {
      return (
        true
      )
    }
  },
  data () {
    return {
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
