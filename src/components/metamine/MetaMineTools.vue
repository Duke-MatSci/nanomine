<template>
  <div class="metaminetools">
    <h1>{{ msg }}</h1>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <v-flex d-flex xs12>
          <v-card-text>
            <v-flex xs11 class="title bold text-xs-left" @click="updateImageChanger()">
              A set of Metamaterial tools
            </v-flex>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs1>
        </v-flex>
        <v-flex d-flex xs12 sm5 md3>
          <v-img :src="getPixelUnitImageUrl()" aspect-ratio="1.7" contain xs12 sm6></v-img>
        </v-flex>
        <v-flex d-flex xs12 sm6 md8>
          <v-card-text>
            <h4 class="text-xs-left">
              <span>
                <router-link to="/meta/pixelunit">Pixel Unit 32K Results for a 10x10 cell</router-link>
              </span>
            </h4>
            <p class="text-xs-left">
              A tool for viewing a preloaded example set of static and dynamic results for a 2D Unit Cell
            </p>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs1>
        </v-flex>
        <v-flex d-flex xs12 sm5 md3>
          <v-img src="/nmstatic/img/3dmodel.jpg" aspect-ratio="1.7" contain xs12 sm6></v-img>
        </v-flex>
        <v-flex d-flex xs12 sm6 md8>
          <v-card-text>
            <h4 class="text-xs-left">
              <span>
                <router-link to="/meta/modelviewer">3D Model Viewer</router-link>
              </span>
            </h4>
            <p class="text-xs-left">
              3D Model File Viewer (supports only a limited set of model types)
            </p>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs1>
        </v-flex>
        <v-flex d-flex xs12 sm5 md3>
          <v-img :src="pixelUnit50ImageUrl" aspect-ratio="1.7" contain xs12 sm6></v-img>
        </v-flex>
        <v-flex d-flex xs12 sm6 md8>
          <v-card-text>
            <h4 class="text-xs-left">
              <span>
                <a >Unit Cell (50x50) Sample Results (not available yet)</a>
                <!--router-link to="/meta/pixelunit50">Unit Cell (50x50) Sample Results (not available yet)</router-link-->
              </span>
            </h4>
            <p class="text-xs-left">
              A tool for viewing a sample subset of static simulation results for a 50x50 2D Unit Cell
            </p>
          </v-card-text>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'MetaMineTools',
  data () {
    return {
      msg: 'MetaMine Tools',
      pixelUnit50ImageUrl: ''
    }
  },
  beforeMount () {
    let vm = this
    vm.refreshPixelUnit50() // need to set url initially
  },
  computed: {
  },
  methods: {
    updateImageChanger () {
      let vm = this
      vm.refreshPixelUnit50()
    },
    refreshPixelUnit50 () {
      let vm = this
      // cause pixelUnit50ImageUrl to be updated
      vm.pixelUnit50ImageUrl = vm.getPixelUnit50ImageUrl()
    },
    getPixelUnit50ImageUrl () {
      let base = '/nmr/geometry/image?geometry_type=ns&geometry_dimensions=50,50,1&geometry_data_link_type=embedded&geometry_data='
      let len = 2500
      let geometry = ''
      for (let idx = 0; idx < len; ++idx) {
        let val = Math.floor(Math.random() * 2)
        geometry += val
      }
      return base + geometry
    },
    getPixelUnitImageUrl () {
      let base = '/nmr/geometry/image?geometry_type=C4v&geometry_dimensions=10,10,1&geometry_data_link_type=embedded&geometry_data='
      let len = 15
      let geometry = ''
      for (let idx = 0; idx < len; ++idx) {
        let val = Math.floor(Math.random() * 2)
        geometry += val
      }
      return base + geometry
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
