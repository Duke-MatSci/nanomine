<!--
################################################################################
#
# File Name: SDFReconstructResults.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, December 1, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="CorrelationReconstructResults">
    <v-alert
      v-model="resultsError"
      type="error"
      dismissible
    >
      {{resultsErrorMsg}}
    </v-alert>
    <h1>{{msg}}</h1>
    <v-container>
      <v-layout>
        <v-flex xs4>
          <h4>Uploaded Image</h4>
          <img :src="getInputImage()"/>
          {{inputImage}}
          <p></p>
        </v-flex>
        <v-flex xs4>
          <h4>Reconstructed Image</h4>
          <img :src="getOutputImage()"/>
          {{outputImage}}
          <p></p>
        </v-flex>
        <v-flex xs4>
          <h4>Correlation Comparison</h4>
          <img :src="getCorrelationComparison()"/>
          {{correlation}}
          <p></p>
        </v-flex>
      </v-layout>
      <v-layout>
        <v-flex xs12>
          <h4>Download Results</h4>
          <a :href="getZipFile()">{{zipFileName}}</a>
        </v-flex>
      </v-layout>
      <h4>References</h4>
      <v-flex xs12>
        <p>Rintoul, M.D. and Torquato, S., 1997. Reconstruction of the structure of dispersions. Journal of Colloid and Interface Science, 186(2), pp.467-476.</p>
        <p>Yeong,C. and Torquato,S., 1998. Reconstructing random media Physical Review E, vol. 57, no. 1, p. 495</p>
      </v-flex>
    </v-container>
  </div>
</template>

<script>
import Axios from 'axios'
import {} from 'vuex'

export default {
  name: 'CorrelationReconstructResults',
  data: () => {
    return ({
      msg: 'Microstructure reconstruction - Correlation Function',
      resultsError: false,
      resultsErrorMsg: '',
      inputFileName: '',
      ReconstructedFileName: '',
      CorrelationComparison: '',
      zipFileName: ''
    })
  },
  mounted: function () {
    this.getJobOutputParams()
  },
  methods: {
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    getInputImage: function () {
      let vm = this
      return vm.$route.query.refuri + '/' + vm.inputFileName
    },
    getOutputImage: function () {
      let vm = this
      return vm.$route.query.refuri + '/' + vm.ReconstructedFileName
    },
    getCorrelationComparison: function () {
      let vm = this
      return vm.$route.query.refuri + '/' + vm.CorrelationComparison
    },
    getZipFile: function () {
      let vm = this
      return vm.$route.query.refuri + '/' + vm.zipFileName
    },
    getJobOutputParams: function () {
      let vm = this
      let url = vm.$route.query.refuri + '/job_output_parameters.json'
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response.data)
          let myOutputParams = response.data // Axios did the JSON parse for us
          vm.inputFileName = myOutputParams.inputFileName
          vm.ReconstructedFileName = myOutputParams.ReconstructedFileName
          vm.CorrelationComparison = myOutputParams.CorrelationComparison
          vm.zipFileName = myOutputParams.zipFileName
          vm.resetLoading()
        })
        .catch(function (err) {
          console.log(err)
          vm.resultsrErrorMsg = err
          vm.resultsError = true
          vm.resetLoading()
        })
    }
  }
}
</script>

<style scoped>
  img {
    width: 240px;
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

</style>
