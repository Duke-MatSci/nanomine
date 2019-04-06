<template>
  <div class="mtools">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-layout row wrap>
        <v-flex d-flex xs12>
          <v-card-text>
            <p class="text-xs-left">
            Statistical learning and analysis modules include web and downloadable packages that can be used to
            pre-process and analyze structure and material property data. Each of the modules will specify the required
            input format and output data, and provide a brief introduction behind the mechanism of the algorithm.
            </p>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs2>
        </v-flex>
        <v-flex d-flex xs3>
          <img src="/nmstatic/img/recon_tool.PNG"/>
        </v-flex>
        <v-flex d-flex xs5>
          <v-card-text>
            <h4 class="text-xs-left">
              <span>
                <router-link to="/mcr_homepage">Microstructure Characterization and Reconstruction</router-link>
              </span>
            </h4>
            <p class="text-xs-left">
              An essential component of computational material design involves microstructure analysis. Our user
              friendly webtools allow users to characterize microstructure images and reconstruct statistically
              equivalent microstructures. Users can choose among
              multiple input formats as well as characterization and reconstruction methods.
            </p>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs2>
        </v-flex>
        <v-flex d-flex xs2>
        </v-flex>
        <v-flex d-flex xs3>
          <img src="/nmstatic/img/dynamfit.png"/>
        </v-flex>
        <v-flex d-flex xs5>
          <v-card-text>
            <h4 class="text-xs-left">
              <span>
                <router-link to="/Dynamfit">Dynamfit</router-link>
              </span>
            </h4>
            <p class="text-xs-left">
              Dynamfit is a sign control algorithm for Prony Series fitting. This program fits a viscoelastic
              mastercurve from DMA experiments with a Prony Series. The Prony Series coefficients can be used as
              baseline properties for the matrix in a FEA simulation of nanocomposites.
            </p>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs2>
        </v-flex>
        <v-flex d-flex xs2>
        </v-flex>
        <v-flex d-flex xs3>
          <img src="/nmstatic/img/webtool_tuneshifting.png"/>
        </v-flex>
        <v-flex d-flex xs5>
          <v-card-text>
            <h4 class="text-xs-left">
              <span>
                <!--router-link to="/AUTOFIT"-->
                <h3>Automatic Fitting of Interphase Relaxation Model in Nanocomposites</h3>
                <!--/router-link-->
              </span>
            </h4>
            <p class="text-xs-left">
              This algorithm derives interphase relaxation properties in nanocomposites using an inverse method that
              starts from composite properties and microstructure. It integrates finite element analysis and
              metamodeling optimization that predicts the interphase properties that results in minimal error between
              simulated properties from FEA and experimental composite properties.
            </p><h3>Under construction. Not currently available.</h3>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs2>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'ModuleTools',
  data () {
    return {
      msg: 'Statistical Learning and Analysis Module Tools'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 240px;
  }
  h3 {
    color: #096ff4;
  }
  h4 {
    text-transform: uppercase;
  }
  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }
</style>
