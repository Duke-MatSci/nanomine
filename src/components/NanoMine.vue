<template>
  <div class="main">
    <v-jumbotron src="/nmstatic/img/random_network.png">
      <v-container fill-height>
        <v-layout align-center>
          <div class="centralize-heading white-color">
            <h3 class="mainheading">MetaMine</h3>
            <span>Material Informatics for Polymer MetaMaterial</span>
          </div>
        </v-layout>
      </v-container>
    </v-jumbotron>
    <v-container fluid>
      <h3 style="text-align:center; margin-top:1.8rem"><span>MetaMine is an open source, data resource for members of the metamaterial community with four key goals:</span></h3>
      <div class="card-container">
        <ul class="ul_adjust">
          <li class="card card-float inline-display" @click="links('/nm#/mm/XMLCONV')">
            <div class="card-inside">
              <div class="card-icon-container"><i class="material-icons card-icon">people_alt</i></div>
              <h2 class="card-heading">Curation</h2>
              <p>Provide a curation platform for sharing of data across the community in ways that are findable, accessible, interoperable and reusable (FAIR ww.force11.org)</p>
            </div>
          </li>
          <li class="card card-float inline-display" @click="links('/home')">
            <div class="card-inside">
              <div class="card-icon-container"><i class="material-icons card-icon">tune</i></div>
              <h2 class="card-heading">Visualizing Data</h2>
              <p>Provide a platform for visualizing data, and mechanisms for visualization methods to be shared</p>
            </div>
          </li>
          <li class="card card-float inline-display" @click="links('mtools')">
            <div class="card-inside">
              <div class="card-icon-container"><i class="material-icons card-icon">grain</i></div>
              <h2 class="card-heading">Module Tools</h2>
              <p>Provide module tools that improve the quantification of nano filler dispersion and morphology as well as the ability to reconstruct those morphologies for subsequent modeling and analysis.</p>
            </div>
          </li>
          <li class="card card-float inline-display" @click="links('http://reccr.chem.rpi.edu/polymerizer/index.html', false)">
            <div class="card-inside">
              <div class="card-icon-container"><i class="material-icons card-icon">widgets</i></div>
              <h2 class="card-heading">Simulation Tools</h2>
              <p>Improve the ability to design metamaterial through simulation and design tools.</p>
            </div>
          </li>
        </ul>
      </div>
    </v-container>
    <div class="mid-first white-color">
      <ul>
        <li class="inline-display mid-first-li mid-first-container"><i class="material-icons card-icon">smart_display</i></li>
        <li class="inline-display mid-first-li mid-first-container">
          <p class="mid-first-p">New to MetaMine? <span class="mid-first-span">View Our step-by-step tutorials!</span></p>
        </li>
        <li class="inline-display mid-first-container" @click="links('/nm#/mm/tutorials')" style="cursor:pointer"><i class="material-icons card-icon">arrow_right_alt</i></li>
      </ul>
    </div>
    <div class="mid-second white-color">
      <p style="font-size:1.3rem;">
        <strong>Login or register</strong> for an account to enable advanced analysis and upload features.  Registering for an account is easy
        using <a href="https://accounts.oit.duke.edu/onelink/register" target="_blank" class="white-color">Duke's OneLink feature</a>.
        InCommon support is coming soon.
        <a href="https://www.incommon.org/federation/incommon-federation-participants/" target="_blank" class="white-color">InCommon federation</a> allows
        many university users to login with the same credentials they use for their own university.
      </p>
      <p style="font-size:1.3rem;"><span>MetaMine is built on both a <a
        href="https://github.com/Duke-MatSci/nanomine-schema/tree/master/xml" target="_blank" class="white-color">schema</a>* and an ontology to provide a robustness to the FAIR principles. MetaMine also allows for the registration of materials resources, bridging the gap between existing resources and the end users and making those existing resources available for research to material community.</span>
      </p>
    </div>
    <v-container fluid>
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
import { AppMixin } from './utils'
export default {
  name: 'NanoMine',
  mixins: [AppMixin],
  data () {
    return {
      msg: 'A Nanocomposites Data Resource'
    }
  },
  mounted: function () {
    // console.log('cookies: ' + document.cookie)
    let auth = new Auth()
    // console.log('token: ' + JSON.stringify(auth.tokenValues))
  },
  created(){
    let auth = new Auth();
    // return this.$router.push('/home_v2');
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .main {
    margin-top: -3px;
  }

  ul {
    text-align: center;
    padding-left: 0;
    padding-right: 0;
    margin-top: 4rem;
    margin-bottom: 2rem;
    -webkit-align-items: center;
    -ms-flex-align: center;
    align-items: center;
    display: -webkit-flex;
    display: flex;
    margin: 2rem auto;
    justify-content: center;
  }

  .mainheading { /* class of large text in jumbotron*/
    font-size: 3rem;
  }

  .centralize-heading {
    position: relative;
    top: 32%;
    transform: translate(-50%,-50%);
    left: 50%;
    text-align: center;
    font-size: 1.5rem
  }

  .white-color {
    color: #ffffff !important;
  }

  .card-container {
    margin: 1.5rem 0;
    padding: .5rem;
  }

  .card-heading {
    font-size: 2rem;
    font-weight: 400;
  }

  .card-icon {
    font-size: 7rem;
  }

  .card-icon-container {
    margin-bottom: .9rem;
    margin-top: 1rem;
  }

  .card-float {
    text-align: center;
    padding: .1rem 1rem;
  }

  .inline-display {
    display: inline-flex !important;
  }

  .card {
    background: #fff;
    border-radius: 2px;
    display: inline-block;
    height: 300px;
    margin: 1rem;
    position: relative;
    width: 300px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
    cursor: pointer;
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
