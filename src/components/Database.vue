<template>
  <div class="database">
    <h1>{{ msg }}</h1>
    <v-container grid-list-xl>
      <v-layout row wrap>
        <!--v-flex xs4>
          <img src="/nmstatic/img/visualize_data.png"/>
          <h4>
            <a href="https://nanomine.oit.duke.edu:8443/viz" target="_blank">Visualize</a>
          </h4>
          <p>Visualize nanocomposite data.</p>
        </v-flex-->
        <v-flex xs4>
          <router-link to="/XMLCONV">
            <img src="/nmstatic/img/excel.png"/>
            <h4>
              Curate Using Uploader
            </h4>
          </router-link>
          <p>
            Download an Excel template, enter nanocomposite sample or simulation data into the template and upload.
          </p>
        </v-flex>
        <v-flex xs4 v-if="false">
          <img src="/nmstatic/img/edit-big.png"/>
          <h4>
            <router-link to="/editor">Curate online</router-link>
          </h4>
          <p>
            Select a schema and fill out the corresponding form. Using the Excel template upload is usually simpler.
          </p>
        </v-flex>
        <v-flex xs4 v-if="false">
          <img src="/nmstatic/img/search-big.png"/>
          <h4>
            <router-link href="/home">Explore the repository</router-link>
          </h4>
          <p>Search this nanocomposite data resource using flexible queries.</p>
        </v-flex>
        <v-flex xs4 v-if="false">
          <img src="/nmstatic/img/edit-big.png"/>
          <h4>
            <router-link to="/compose">Compose a schema</router-link>
          </h4>
          <p>Compose your own schema.</p>
        </v-flex>
        <v-flex xs4 v-if="true">
          <a href="/home">
            <img src="/nmstatic/img/visualize_data.png"/>
            <h4>
              Visualization and Search
            </h4>
          </a>
          <p>Nanocomposite data insights.</p>
        </v-flex>
        <v-flex xs4 v-if="true">
          <img src="/nmstatic/img/Icon_verified_chemical_structure.svg"/>
          <h4>
            <router-link to="/ChemProps">ChemProps</router-link>
          </h4>
          <p>Standardized Polymer Name and Filler Search</p>
        </v-flex>
        <v-flex xs4 v-if="false && isAdmin()">
          <router-link to='/xmluploader'>
            <img src="/nmstatic/img/admin-icon.jpg"/>
            <h4>
              <span class="link">Xml Uploader</span>
            </h4>
          </router-link>
          <p>Upload XML files directly</p>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'Database',
  data () {
    return {
      msg: 'Database Options'
    }
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
  },
  methods: {
    isAdmin: function () {
      let vm = this
      return vm.auth.isAdmin()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 50px;
    height: auto;
  }

  h4 {
    text-transform: uppercase;
  }

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

  a, .link {
    color: blue;
    text-decoration: underline;
  }

</style>
