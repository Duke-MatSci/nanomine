<template>
  <div class="main">
    <v-jumbotron>
      <v-container fill-height>
        <v-layout align-center>
          <v-flex>
            <h3 class="mainheading">NanoMine</h3>
            <span class="subheading">Material Informatics for Polymer Nanocomposites</span>
            <v-divider class="my-3"></v-divider>
            <v-btn class="mx-0" color="primary" href="/home">Visualization&nbsp;<v-icon>search</v-icon></v-btn>
            <v-btn class="mx-0" color="secondary" to="/XMLCONV">CURATION</v-btn>
          </v-flex>
        </v-layout>
      </v-container>
    </v-jumbotron>
    <v-container fluid>
      <h1>{{ msg }}</h1>
      <v-divider class="my-3"></v-divider>
      <h3><span>NanoMine is an open source, data resource for members of the nanocomposites community with four key goals:</span>
      </h3>
      <ul>
        <li><span>Provide a platform for sharing of data across the community in a format that is makes the data findable, accessible, interoperable and reusable (FAIR <a
          href="https://www.force11.org/" target="_blank">www.force11.org</a>).</span></li>
        <li>
          <span>Provide a platform for visualizing data, and a mechanism for methods for visualization to be shared.</span>
        </li>
        <li><span>Provide tools that improve the quantification of nanofiller dispersion and morphology as well as the ability to reconstruct those morphologies for subsequent modeling and analysis.</span>
        </li>
        <li><span>Improve the ability to design nanocomposites through simulation and design tools.</span></li>
      </ul>
      <p style="padding-left:15%;padding-right:15%;text-align:left"><span>NanoMine is built on both a <a
        href="https://github.com/Duke-MatSci/nanomine-schema/tree/master/xml" target="_blank">schema</a> and an ontology to provide a robustness to the FAIR principles. NanoMine also allows for the registration of materials resources, bridging the gap between existing resources and the end users and making those existing resources available for research to material community.</span>
      </p>

      <p style="text-align:center;"><img src="/cdn/img/sponsors3.png"></p>

      <p style="font-weight:bold;text-align:left;padding-left:15%;padding-right:15%;">NSF supported the initial
        concept of NanoMine as a joint Northwestern University/Rensselaer Polytechnic Institute project through the
        CDMR program and is currently supporting a robust ontology and software framework via the DIBBS program. The
        DMREF program currently supports the development and publication of innovative material simulation and design
        tools. The DIBBS program currently supports infrastructure and software development and integration.
        NIST/CHIMAD support data curation, demonstration materials design problems, and integration into the larger
        MGI network as well as provide backbone use of the Materials Data Curator system run by NIST.</p>
    </v-container>
  </div>
</template>

<script>
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'NanoMine',
  data () {
    return {
      msg: 'A Nanocomposites Data Resource'
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
    margin-bottom: 20px;
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
    background-color: #000000;
    border-radius: 0px;
    margin-top: 0px;
    max-height: 200px;
  }

  img {
    height: 125px;
    width: auto;
  }

  a {
    color: #4Cc0ff;
  }
</style>
