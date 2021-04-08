<!--
################################################################################
#
# File Name: DescriptorReconstructResults.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, December 6, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="main">
    <div class="DescriptorReconstructResults">
      <v-alert
        v-model="resultsError"
        type="error"
        dismissible
      >
        {{resultsErrorMsg}}
      </v-alert>
      <v-container>
        <h1 class="header-nm">{{msg}}</h1>
        <v-layout>
          <v-flex xs4>
            <h4>Uploaded Image</h4>
            <img :src="getInputImage()"/>
            {{inputImage}}
            <p></p>
          </v-flex>
          <v-flex xs4>
            <h4>XY Slice from Reconstructed Image</h4>
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
        <h4 v-if="referenceOpen" @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_up</i></h4>
        <h4 v-else @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_down</i></h4>
        <v-flex xs12 v-if="referenceOpen">
          <p> Xu, H., Li, Y., Brinson, C. and Chen, W., 2014. A descriptor-based design methodology for developing heterogeneous microstructural materials system. <i>Journal of Mechanical Design</i>, 136(5), p.051007.</p>
          <p>Xu, H., Dikin, D.A., Burkhart, C. and Chen, W., 2014. Descriptor-based methodology for statistical characterization and 3D reconstruction of microstructural materials. <i>Computational Materials Science</i>, 85, pp.206-216.</p>
        </v-flex>
      </v-container>
    </div>
  </div>
</template>

<script>
import Axios from 'axios'
import {} from 'vuex'
export default {
  name: 'DescriptorReconstructResults',
  data: () => {
    return ({
      msg: 'Physical Descriptors',
      resultsError: false,
      resultsErrorMsg: '',
      inputFileName: '',
      ReconstructedFileName: '',
      CorrelationComparison: '',
      zipFileName: '',
      referenceOpen: false,
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
    },
    refOpen () {
      return this.referenceOpen = !this.referenceOpen;
    }
  },
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Microstructure Reconstruction'})
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
</style>
