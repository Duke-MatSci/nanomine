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
  <div class="main">
    <div class="SDFReconstructResults">
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
          <v-flex xs6>
            <h4>Uploaded Image</h4>
            <img :src="getInputImage()"/>
            {{inputImage}}
            <p></p>
          </v-flex>
          <v-flex xs6>
            <h4>Reconstructed Image</h4>
            <img :src="getOutputImage()"/>
            {{outputImage}}
            <p></p>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex xs12>
            <h4>Download Results</h4>
            <a :href="getZipFile()">{{zipFileName}}</a>
          </v-flex>
        </v-layout>
        <h4 v-if="referenceOpen" @click="refOpen">References <i class="material-icons icon-adjust">keyboard_arrow_up</i></h4>
        <h4 v-else @click="refOpen">References <i class="material-icons icon-adjust">keyboard_arrow_down</i></h4>
        <v-flex xs12 v-if="referenceOpen">
          <p>Ghumman, U.F., Iyer, A., Dulal, R., Munshi, J., Wang, A., Chien, T., Balasubramanian, G., and Chen, W., A Spectral Density Function Approach for Active Layer Design of Organic Photovoltaic Cells, <i>Journal of Mechanical Design</i>, Special Issue on Design of Engineered Materials and Structures, accepted July 2018. doi:10.1115/1.4040912.</p>
          <p>Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017. Characterization and design of functional quasi-random nanostructured materials using spectral density function. <i>Journal of Mechanical Design</i>, 139(7), p.071401.</p>
          <p>Lee, W. K., Yu, S., Engel, C. J., Reese, T., Rhee, D., Chen, W., & Odom, T. W. (2017). Concurrent design of quasi-random photonic nanostructures. Proceedings of the National Academy of Sciences, 114(33), 8734-8739.</p>
        </v-flex>
      </v-container>
    </div>
  </div>
</template>

<script>
import Axios from 'axios'
import {} from 'vuex'
export default {
  name: 'SDFReconstructResults',
  data: () => {
    return ({
      msg: 'Spectral Density Function',
      resultsError: false,
      resultsErrorMsg: '',
      inputFileName: '',
      ReconstructedFileName: '',
      zipFileName: '',
      referenceOpen: false
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
