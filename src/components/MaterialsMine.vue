<template>
  <div class="main">
    <v-jumbotron src="/nmstatic/img/random_network.png">
      <v-container fill-height>
        <v-layout align-center>
          <v-flex>
            <h3 class="mainheading">MaterialsMine</h3>
            <span class="subheading">Material Informatics for Polymer Nanocomposites and Metamaterials</span>
            <v-divider class="my-3"></v-divider>
          </v-flex>
        </v-layout>
      </v-container>
    </v-jumbotron>
    <v-container fluid>
      <h1>{{ msg }}</h1>
      <v-divider class="my-3"></v-divider>
      <h3>
        <span>MaterialsMine is an open source, data resource for members of the nanocomposites an metamaterials communities</span>
      </h3>

    </v-container>
  </div>
</template>

<script>
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'MaterialsMine',
  data () {
    return {
      msg: 'A Nanocomposites and Metamaterials Data Resource'
    }
  },
  mounted: function () {
    console.log('cookies: ' + document.cookie)
    let auth = new Auth()
    console.log('token: ' + JSON.stringify(auth.tokenValues))
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .main {
    margin-top: -3px;
  }

  ul {
    text-align: left;
    padding-left: 20%;
    padding-right: 15%;
    margin-top: 20px;
    margin-bottom: 10px;
  }

  .mainheading { /* class of large text in jumbotron*/
    font-size: 40px;
    color: white;
  }

  .subheading {
    color: white;
  }

  .visualize-button {
    color: #000000;
  }

  .curate-button {
    color: #000000;
  }

  .v-jumbotron {
    color: white;
    padding: 0.5rem 0.5rem;
    background-color: #08233c;
    border-radius: 0px;
    margin-top: 0px;
    max-height: 240px;
  }
  .login-info {
    text-align: left;
    padding-left: 13.8%;
    padding-right: 12%;
  }
  img {
    height: 125px;
    width: auto;
  }
  a {
    color: #3a64ff;
  }
</style>
