<template>
  <div class="metaminetools">
    <h1>{{ msg }}</h1>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <v-flex d-flex xs12>
          <v-card-text>
            <p class="text-xs-left">
              A set of Metamaterial tools
            </p>
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
                <router-link to="/meta/pixelunit">Pixel Unit 32K Results</router-link>
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
                <router-link to="/meta/threedmodelviewer">3D STL Viewer</router-link>
              </span>
            </h4>
            <p class="text-xs-left">
              A viewer for STL files
            </p>
          </v-card-text>
        </v-flex>
        <v-flex d-flex xs1>
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
      msg: 'MetaMine Tools'
    }
  },
  methods: {
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
