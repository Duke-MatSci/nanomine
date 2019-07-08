<template>
  <div class="main">
    <v-jumbotron src="/nmstatic/img/random_network.png">
      <v-container fill-height>
        <v-layout align-center>
          <v-flex>
            <h3 class="mainheading">NanoMine</h3>
            <span class="subheading">Material Informatics for Polymer Nanocomposites</span>
            <v-divider class="my-3"></v-divider>
            <v-btn class="mx-0" color="primary" href="/home">Visualization&nbsp;<v-icon>search</v-icon></v-btn>
            <v-btn class="mx-0" color="secondary" to="/XMLCONV">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CURATION&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</v-btn>
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
        <li><span>Provide a <router-link to="/XMLCONV">curation</router-link> platform for sharing of data across the community in a format that is makes the data findable, accessible, interoperable and reusable (FAIR <a
          href="https://www.force11.org/" target="_blank">www.force11.org</a>).</span></li>
        <li>
          <span>Provide a platform for <a href="/home">visualizing data</a>, and mechanisms for visualization methods to be shared.</span>
        </li>
        <li><span>Provide <router-link to="/mtools">module tools</router-link> that improve the quantification of nanofiller dispersion and morphology as well as the ability to reconstruct those morphologies for subsequent modeling and analysis.</span>
        </li>
        <li><span>Improve the ability to design nanocomposites through <router-link to="/simtools">simulation and design tools</router-link>.</span></li>
      </ul>
      <v-flex d-flex xs12>
        <v-layout row wrap>
          <v-flex d-flex class="login-info">
            <v-card-text>
              <strong>Login or register</strong> for an account to enable advanced analysis and upload features.  Registering for an account is easy
              using <a href="https://accounts.oit.duke.edu/onelink/register" target="_blank">Duke's OneLink feature</a>.
              InCommon support is coming soon.
              <a href="https://www.incommon.org/federation/incommon-federation-participants/" target="_blank">InCommon federation</a> allows
              many university users to login with the same credentials they use for their own university.
            </v-card-text>
          </v-flex>
        </v-layout>
      </v-flex>
      <p style="padding-left:15%;padding-right:15%;text-align:left"><span>NanoMine is built on both a <a
        href="https://github.com/Duke-MatSci/nanomine-schema/tree/master/xml" target="_blank">schema</a>* and an ontology to provide a robustness to the FAIR principles. NanoMine also allows for the registration of materials resources, bridging the gap between existing resources and the end users and making those existing resources available for research to material community.</span>
      </p>

      <v-flex d-flex xs12>
        <v-layout row wrap justify-center>
          <v-img src="/nmstatic/img/sponsors3.png" max-width="1024"  aspect-ratio="4.6" contain></v-img>
        </v-layout>
      </v-flex>

      <p style="font-weight:bold;text-align:left;padding-left:15%;padding-right:15%;">NSF supported the initial
        concept of NanoMine as a joint Northwestern University/Rensselaer Polytechnic Institute project through the
        CDMR program and development of a robust ontology and software framework via the
        DIBBS program. The
        DMREF program (Duke University, Northwestern University, Rensselaer Polytechnic Institute and the University of Vermont)
        currently supports the development and publication of innovative material simulation and design
        tools. The CSSI program (Duke University, Northwestern University, Rensselaer Polytechnic Institute, University of Vermont and CalTech)
        currently supports infrastructure and software development, integration and extension to the domain of meta-materials.
        NIST/CHIMAD support data curation, demonstration materials design problems, and integration into the larger
        MGI network and connection to the Materials Data Curator system run by NIST.
      </p>
      <h4 style="text-align:left;padding-left:12%;padding-right:12%;">* References</h4>
      <p style="text-align:left;padding-left:12%;padding-right:12%;">Zhao, H., Li, X., Zhang, Y., Schadler, L. S., Chen, W., &amp; Brinson, L. C. (2016).
        <i>
          <a href="https://aip.scitation.org/doi/abs/10.1063/1.4943679">Perspective: NanoMine: A material genome approach for polymer nanocomposites analysis and design</a>
        </i>
        . APL Materials, 4(5), 053204.
      </p>
      <p style="text-align:left;padding-left:12%;padding-right:12%;">Zhao, H., Wang, Y., Lin, A., Hu, B., Yan, R., McCusker, J., ... &amp; Brinson, L. C. (2018).
        <i>
          <a href="https://aip.scitation.org/doi/10.1063/1.5046839">NanoMine schema: An extensible data representation for polymer nanocomposites
          </a>
        </i>
        . APL Materials, 6(11), 111108.
      </p>

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
