<template>
  <div class="main">
    <div class="CorrelationCharacterizeResults">
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
            <h4>Correlation Function</h4>
            <img :src="getCorrelationPlot()"/>
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
        <h4 v-if="referenceOpen" @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_up</i></h4>
        <h4 v-else @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_down</i></h4>
        <v-flex xs12 v-if="referenceOpen">
          <p>Rintoul, M.D. and Torquato, S., 1997. Reconstruction of the structure of dispersions. <i>Journal of Colloid and Interface Science</i>, 186(2), pp.467-476.</p>
          <p>Yeong,C. and Torquato,S., 1998. Reconstructing random media Physical Review E, vol. 57, no. 1, p. 495</p>
        </v-flex>
      </v-container>
    </div>
  </div>
</template>

<script>
import Axios from 'axios'
import {} from 'vuex'
export default {
  name: 'CorrelationCharacterizeResults',
  data: () => {
    return ({
      msg: 'Characterization Results',
      resultsError: false,
      resultsErrorMsg: '',
      inputFileName: '',
      CorrelationPlot: '',
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
    getCorrelationPlot: function () {
      let vm = this
      return vm.$route.query.refuri + '/' + vm.CorrelationPlot
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
          vm.CorrelationPlot = myOutputParams.CorrelationPlot
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
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Correlation Function'})
  }
}
</script>

<style scoped>
  img {
    width: 300px;
    height: auto;
  }

  h4 {
    text-transform: uppercase;
  }
</style>
