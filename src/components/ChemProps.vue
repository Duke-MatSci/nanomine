<template>
  <div class="main">
    <div class="chemprops">
      <h1 v-if="this.$store.state.versionNew" class="header-mm">ChemProps - A growing polymer name and filler name standardization database</h1>
      <v-container>
        <h1 v-if="!this.$store.state.versionNew" class="header-nm">ChemProps - A growing polymer name and filler name standardization database</h1>
        <v-alert
          v-model="submitError"
          type="error"
          outline
        >
          {{loginRequiredMsg}}
        </v-alert>
        <h3 class="text-xs-left">Description</h3>
        <br>
        <p class="text-xs-left">ChemProps is a growing polymer name and filler name standardization database. Polymer names and filler names can have many alias, impeding the queries to collect all relevant data by a chemical name as the keyword. Chemprops is a useful resource to address this problem. It standardizes the chemical names that belong to the same database such that queries can retrieve all data that is related to a certain chemical name regardless of how they were originally reported. You can find more details in our paper <a href="https://jcheminf.biomedcentral.com/articles/10.1186/s13321-021-00502-6" target="_blank">"ChemProps: A RESTful API enabled database for composite polymer name standardization"</a>.
        </p>
        <p class="text-xs-left">This webapp is designed for one-time search. For batch jobs, please use the ChemProps API. A token is required to use the API. You must be logged in to request the ChemProps API token.
        </p>
        <v-btn v-if="!this.$store.state.versionNew" to="/ChemPropsAPIToken" color="primary">Request API Token</v-btn>
        <v-btn v-else to="/mm/ChemPropsAPIToken" color="primary">Request API Token</v-btn>
        <br>
        <h3 class="text-xs-left">Instructions</h3>
        <p class="text-xs-left"><b>1. Select the collection.</b></p>
        <v-form @submit.prevent="search" id="submit-chemprops-form">
          <v-flex xs12 sm6 md6>
            <v-radio-group v-model="pfRadios">
              <v-radio label="Polymer" value="pol"></v-radio>
              <v-radio label="Filler" value="fil"></v-radio>
            </v-radio-group>
          </v-flex>
          <!--<div>-->
            <p class="text-xs-left" v-if="pfRadios === 'pol'"><b>2. Input the searching terms. For the quick search, you can search by either chemical name, abbreviation, trade name, or SMILES. For the advanced search, you must input a chemical name.</b></p>
            <p class="text-xs-left" v-if="pfRadios === 'fil'"><b>2. Input the searching terms. Note that you must input a chemical name.</b></p>
            <v-flex xs12 sm6 md6>
              <v-card v-if="pfRadios === 'pol'" style="box-shadow:none">
                <p class="text-xs-left"><b>Quick Search (Filling this textbox will overwrite the advanced search)</b></p>
                <v-text-field v-model="quicksearchkeyword" label='Enter the keyword:' outlined></v-text-field>
              </v-card>
              <v-card style="box-shadow:none">
              <p class="text-xs-left" v-if="pfRadios === 'pol'"><b>Advanced Search</b></p>
                <v-text-field v-model="chemicalname" label='Enter the chemical name (required):' outlined></v-text-field>
                <v-text-field v-model="abbreviation" label='Enter the abbreviation (optional):' outlined></v-text-field>
                <v-text-field v-model="SMILES" label='Enter the SMILES (optional):' outlined v-if="pfRadios === 'pol'"></v-text-field>
                <v-text-field v-model="tradename" label='Enter the tradename (optional):' outlined v-if="pfRadios === 'pol'"></v-text-field>
              </v-card>
            </v-flex>
            <v-alert
              v-model="searchError"
              type="error"
              dismissible
            >
              {{searchErrorMsg}}
            </v-alert>
            <v-btn type="submit" color="primary" form="submit-chemprops-form">Search</v-btn>
          </v-form>
          <div id="chemprops-displayed-result">
            <v-flex xs12 sm6 md6 class="text-xs-left" v-if="stdname !== ''">
              <p class="text-xs-left">Standardized chemical name and density information:</p>
              <v-text-field v-model="stdname" label='Standardized Name' outlined></v-text-field>
              <v-text-field v-model="density" label='Density (g/cm3 at 25°C)' outlined></v-text-field>
              <v-text-field v-model="uSMILES" label='uSMILES' outlined v-if="pfRadios === 'pol'"></v-text-field>
              <p v-if="pfRadios === 'pol'">Structure
              <Smiles :smilesOptions="smilesOptions" :smilesInput="inputStr" :formulaHandler="formulaUpdated" :onSuccessHandler="onSuccess" :onErrorHandler="onError" height="100%" width="100%"></Smiles>
              </p>
              <p v-if="pfRadios === 'pol'">Formula: {{molecularFormula}}
              </p>
            </v-flex>
          </div>
          <br>
          <h4 v-if="referenceOpen" @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_up</i></h4>
          <h4 v-else @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_down</i></h4>
          <p v-if="referenceOpen" class="text-xs-left">Hu, Bingyin, Anqi Lin, and L. Catherine Brinson. "ChemProps: A RESTful API enabled database for composite polymer name standardization." Journal of cheminformatics 13.1 (2021): 1-13.</p>
          <p v-if="referenceOpen" class="text-xs-left">Probst, Daniel, and Jean-Louis Reymond. "Smilesdrawer: parsing and drawing SMILES-encoded molecular structures using client-side javascript." Journal of chemical information and modeling 58.1 (2018): 1-7.</p>
        <!--</div>-->
      </v-container>
    </div>
  </div>
</template>

<script>
import {} from 'vuex'
import {Auth} from '@/modules/Auth.js'
import Axios from 'axios'
import Smiles from './Smiles'
const SERVER = `${window.location.origin}/nmr/api`
// const SERVER = `http://localhost:8000/nmr/api`
const URL = SERVER

export default {
  name: 'ChemProps',
  components: {
    Smiles
  },
  data () {
    return {
      title: 'ChemProps',
      dialog: false,
      pfRadios: 'pol',
      quicksearchkeyword: '',
      chemicalname: '',
      abbreviation: '',
      SMILES: '',
      tradename: '',
      stdname: '',
      density: '',
      uSMILES: '',
      searchError: false,
      searchErrorMsg: '',
      loginRequired: false,
      loginRequiredMsg: '',
      successDlg: false,
      theme: 'dark',
      smilesError: false,
      smilesMessage: '',
      inputStr: '',
      molecularFormula: '',
      chempropsToken: null,
      // https://github.com/reymond-group/smilesDrawer#options
      smilesOptions: {
        Padding: 0.0,
        atomVisualization: 'default', // 'balls',
        explicitHydrogens: true,
        terminalCarbons: true,
        debug: false
      },
      referenceOpen: false,
    }
  },
  watch: {
    stdname(newData, oldData){
      if(newData){
        this.scrollToResult()
      }
    }
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
  },
  async mounted () {
    let result = await fetch(`${URL}/parser`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
    if (result && result.status === 201) {
      result = await result.json()
      if (result.token) this.chempropsToken = result.token
    }
  },
  methods: {
    scrollToResult() {
      let elem = document.getElementById('chemprops-displayed-result');
      if(elem){
        let vm = this;
        setTimeout(function(){
          elem.scrollIntoView()
        }, 800)
      }
    },
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    resetOutput: function () {
      let vm = this
      vm.stdname = ''
      vm.density = ''
      vm.searchError = false // reset the error message on click
    },
    successDlgClicked: function () {
      let vm = this;
      // vm.$router.go(-1) // go back to previous page
      vm.successDlg = false;
    },
    search: function () {
      let vm = this
      vm.resetOutput()
      if (!vm.chempropsToken) {
        vm.searchError = true
        vm.searchErrorMsg = 'System error, contact our system administrator'
        return
      }
      if (vm.pfRadios === 'pol' && vm.quicksearchkeyword.trim() !== '') {
        if (vm.quicksearchkeyword === '') {
          vm.searchError = true
          vm.searchErrorMsg = 'Please input the quick search keyword.'
          return
        }
        vm.chemicalname = vm.quicksearchkeyword
        vm.abbreviation = vm.quicksearchkeyword
        vm.tradename = vm.quicksearchkeyword
        vm.SMILES = vm.quicksearchkeyword
      }
      if (vm.chemicalname === '') {
        vm.searchError = true
        vm.searchErrorMsg = 'Please input the chemical name.'
        return
      }
      if (vm.pfRadios === '') {
        vm.searchError = true
        vm.searchErrorMsg = 'Please select the collection.'
        return
      }
      // TODO need to configure after nmcp API done
      vm.setLoading()
      Axios.request({
        url: `${URL}/chemprops?polfil=${vm.pfRadios}&nmId=restNmId&chemicalname=${vm.chemicalname}&abbreviation=${vm.abbreviation}&tradename=${vm.tradename}&smiles=${vm.SMILES}`,
        method: 'get',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + vm.chempropsToken
        }
      })
      .then(function (res) {
        return res
      })
      .then(function (response) {
        vm.stdname = response.data.data.StandardName
        vm.density = parseFloat(response.data.data.density)
        // show uSMILES if it's polymer search
        if (vm.pfRadios === 'pol') {
          vm.uSMILES = response.data.data.uSMILES
        }
        // check if stdname is found
        if (vm.stdname === '') {
          vm.searchError = true
          vm.searchErrorMsg = 'No results found. Admin will update the database soon. Please try again in a week.'
          vm.resetOutput()
        }
        vm.resetLoading()
      })
      .catch(function (error) {
        console.log(error)
        vm.resetOutput()
        vm.searchError = true
        if (error.message.includes('404')) {
          vm.searchErrorMsg = 'No results found. Admin will update the database soon. Please try again in a week.'
        } else {
          vm.searchErrorMsg = 'An exception occurred when calling the ChemProps API service.'
        }
        vm.resetLoading()
      })
      .then(function () {
        // always executed
        vm.inputStr = vm.uSMILES
        // reset input if using quick search
        if (vm.quicksearchkeyword.trim() !== '') {
          vm.chemicalname = ''
          vm.abbreviation = ''
          vm.tradename = ''
          vm.SMILES = ''
        }
      })
    },
    onSuccess () {
      this.smilesError = false
    },
    formulaUpdated (formula) {
      this.molecularFormula = formula
    },
    onError (err) {
      console.trace('Error handler called: ')
      let vm = this
      if (err) {
        vm.smilesMessage = err
      } else {
        vm.smilesMessage = 'Undefined error'
      }
      vm.smilesError = true
      console.log('SmilesTest - error: ' + vm.smilesMessage)
    },
    refOpen () {
      return this.referenceOpen = !this.referenceOpen;
    }
  },
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'ChemProps'})
  }
}
</script>

<style scoped>
  html {
    scroll-behavior: smooth;
  }
</style>
