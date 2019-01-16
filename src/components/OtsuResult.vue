<template>
  <div class="OtsuResult">
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
        <v-flex xs6>
          <h4>Uploaded Image</h4>
          <img :src="getInputImage()"/>
          {{inputImage}}
          <p></p>
        </v-flex>
        <v-flex xs6>
          <h4>Binarized Image</h4>
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
    </v-container>
    <h4>Reference</h4>
    <v-flex xs12>
      <p> N. Otsu, A threshold selection method from gray-level histograms, IEEE transactions on systems, man, and
        cybernetics, vol. 9, no. 1, pp. 62-66, 1979.</p>

    </v-flex>
  </div>
</template>

<script>
import Axios from 'axios'
import {} from 'vuex'

export default {
  name: 'OtsuResult',
  data: () => {
    return ({
      msg: 'Otsu Binarization Results',
      resultsError: false,
      resultsErrorMsg: '',
      inputFileName: '',
      binarizedFileName: '',
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
      return vm.$route.query.refuri + '/' + vm.binarizedFileName
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
          vm.binarizedFileName = myOutputParams.binarizedFileName
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
