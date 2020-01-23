<template>
 <div class="smiles-test">
   Smiles Test
   <v-container>
     <v-alert
       dismissible
       v-model="smilesError"
       type="error">
       {{smilesMessage}}
     </v-alert>
     <v-layout row>
       <v-flex d-flex xs6>
        <v-text-field v-model="inputStr" size="30" label="Smiles" placeholder="Enter smiles" single-line></v-text-field>
       </v-flex>
       <v-flex d-flex xs6>
        <smiles :smilesOptions="smilesOptions" :smilesInput="inputStr" :formulaHandler="formulaUpdated" :onSuccessHandler="onSuccess" :onErrorHandler="onError" height="100%" width="100%"></smiles>
       </v-flex>
       <v-flex d-flex xs6>
         Formula: {{molecularFormula}}
       </v-flex>
     </v-layout>
   </v-container>
 </div>
</template>

<script>
import Smiles from '../Smiles'

export default {
  name: 'SmilesTest',
  components: {
    Smiles
  },
  data () {
    return {
      inputStr: '',
      theme: 'dark', // 'light',
      smilesError: false,
      smilesMessage: '',
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
  mounted () {
    console.log('SmilesTest mounted')
  },
  methods: {
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
  .smiles-test {
    margin-top: 20px;
  }
</style>
