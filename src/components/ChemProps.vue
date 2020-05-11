<template>
  <div class="chemprops">
    <h1>ChemProps - A growing polymer name and filler name standardization database</h1>
    <v-container>
      <v-alert
        v-model="loginRequired"
        type="error"
        outline
      >
        {{loginRequiredMsg}}
      </v-alert>
      <h3 class="text-xs-left">Description</h3>
      <br>
      <p class="text-xs-left">ChemProps is a growing polymer name and filler name standardization database. Polymer names and filler names can have many alias, impeding the queries to collect all relevant data by a chemical name as the keyword. Chemprops is a useful resource to address this problem. It standardizes the chemical names that belong to the same database such that queries can retrieve all data that is related to a certain chemical name regardless of how they were originally reported.
      </p>
      <br>
      <h3 class="text-xs-left">Instructions</h3>
      <p class="text-xs-left"><b>1. Select the collection.</b></p>
      <v-flex xs12 sm6 md3>
        <v-radio-group v-model="pfRadios">
          <v-radio label="Polymer" value="pol"></v-radio>
          <v-radio label="Filler" value="fil"></v-radio>
        </v-radio-group>
      </v-flex>
      <p class="text-xs-left"><b>2. Input the searching terms. Note that you must input a chemical name.</b></p>
      <v-flex xs12 sm6 md3>
        <v-text-field v-model="chemicalname" label='Enter the chemical name (required):' outlined></v-text-field>
        <v-text-field v-model="abbreviation" label='Enter the abbreviation (optional):' outlined></v-text-field>
        <v-text-field v-model="SMILES" label='Enter the SMILES (optional):' outlined v-if="pfRadios === 'pol'"></v-text-field>
        <v-text-field v-model="tradename" label='Enter the tradename (optional):' outlined v-if="pfRadios === 'pol'"></v-text-field>
      </v-flex>
      <v-alert
        v-model="searchError"
        type="error"
        dismissible
      >
        {{searchErrorMsg}}
      </v-alert>
      <v-btn v-on:click="search()" color="primary">Search</v-btn>
      <v-flex xs12 sm6 md5 class="text-xs-left" v-if="stdname !== ''">
        <p class="text-xs-left">Standardized chemical name and density information:</p>
        <v-text-field v-model="stdname" label='Standardized Name' outlined></v-text-field>
        <v-text-field v-model="density" label='Density (g/cm3)' outlined></v-text-field>
        <v-text-field v-model="uSMILES" label='uSMILES' outlined v-if="pfRadios === 'pol'"></v-text-field>
        <p v-if="pfRadios === 'pol'">Structure
        <Smiles :smilesOptions="smilesOptions" :smilesInput="inputStr" :formulaHandler="formulaUpdated" :onSuccessHandler="onSuccess" :onErrorHandler="onError" height="100%" width="100%"></Smiles>
        </p>
        <p v-if="pfRadios === 'pol'">Formula: {{molecularFormula}}
        </p>
      </v-flex>
      <br>
      <h4 class="text-xs-left">Reference</h4>
      <p class="text-xs-left">Probst, Daniel, and Jean-Louis Reymond. "Smilesdrawer: parsing and drawing SMILES-encoded molecular structures using client-side javascript." Journal of chemical information and modeling 58.1 (2018): 1-7.</p>
      <!-- <p class="text-xs-left">Bradshaw et al., <i><a href="http://link.springer.com/article/10.1023/A:1009772018066">A Sign Control Method for Fitting and Interconverting Material Functions for Linearly Viscoelastic Solids</a></i>, Mechanics of Time-Dependent Materials. 1997 1(1)</p> -->
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import {Auth} from '@/modules/Auth.js'
import Axios from 'axios'
import Smiles from './Smiles'

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
      // https://github.com/reymond-group/smilesDrawer#options
      smilesOptions: {
        Padding: 0.0,
        atomVisualization: 'default', // 'balls',
        explicitHydrogens: true,
        terminalCarbons: true,
        debug: false
      }
    }
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    // No longer requiring login
    // if (!vm.auth.isLoggedIn()) {
    //   vm.loginRequired = true
    //   vm.loginRequiredMsg = 'Login is required.'
    // }
  },
  mounted () {
    console.log('SmilesTest mounted')
  },
  methods: {
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
      let vm = this
      console.log('Success dlg button clicked')
      // vm.$router.go(-1) // go back to previous page
      vm.successDlg = false
    },
    search: function () {
      let vm = this
      vm.resetOutput()
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
      Axios.get('/api/v1/chemprops', {
        params: {
          polfil: vm.pfRadios,
          ChemicalName: vm.chemicalname,
          Abbreviation: vm.abbreviation,
          TradeName: vm.tradename,
          uSMILES: vm.SMILES,
          nmId: 'restNmId'
        }
      })
      // Axios.get('/nmr//explore/select', {
      //   params: {
      //     title: 'L148_S1_Virtanen_2014.xml'
      //   }
      // })
        .then(function (response) {
          console.log(JSON.stringify(response.data.stdname))
          console.log('get response from ChemProps!')
          vm.stdname = response.data.StandardName
          vm.density = parseFloat(response.data.density)
          // show uSMILES if it's polymer search
          if (vm.pfRadios === 'pol') {
            vm.uSMILES = response.data.uSMILES
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
          vm.searchErrorMsg = 'An exception occurred when calling the ChemProps API service. Detail: ' + error
          vm.resetLoading()
        })
        .then(function () {
          // always executed
          vm.inputStr = vm.uSMILES
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
    }
  }
}
</script>

<style scoped>

h1 {
  margin-top: 10px;
  background-color: black;
  color: white;
}

</style>
