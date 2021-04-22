<template>
  <div class="OtsuResult">
    <v-alert
      v-model="resultsError"
      type="error"
      dismissible
    >
      {{resultsErrorMsg}}
    </v-alert>
    <v-container>
      <h1 class="header-nm">{{msg}}</h1>
      <!-- eslint-disable-next-line vue/valid-v-for --> <!-- otherwise eslint shows error, but statement works with no key -->
      <v-layout v-for="(file, idx) in files" v-bind:data="file" v-bind:key="files[idx]">
        <v-container xs6>
          <h4>{{file.input}}</h4>
          <img :src="getInputImage(idx)"/>
        </v-container>
        <v-container xs6>
          <h4>{{file.output}}</h4>
          <img :src="getOutputImage(idx)"/>
        </v-container>
      </v-layout>
      <!--v-layout>
        <v-flex xs12>
          <h4>Download Results</h4>
          <a :href="getZipFile()">{{zipFileName}}</a>
        </v-flex>
      </v-layout-->
      <h4 v-if="referenceOpen" @click="refOpen">References <i class="material-icons icon-adjust">keyboard_arrow_up</i></h4>
      <h4 v-else @click="refOpen">References <i class="material-icons icon-adjust">keyboard_arrow_down</i></h4>
      <v-flex xs12 v-if="referenceOpen">
        <p> N. Otsu, A threshold selection method from gray-level histograms, IEEE transactions on systems, man, and
          cybernetics, vol. 9, no. 1, pp. 62-66, 1979.</p>
      </v-flex>
    </v-container>
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
      zipFileName: '',
      files: [],
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
    getInputImage: function (idx) {
      let vm = this
      return vm.$route.query.refuri + '/' + vm.files[idx].input
    },
    getOutputImage: function (idx) {
      let vm = this
      return vm.$route.query.refuri + '/' + vm.files[idx].output
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
          vm.files = myOutputParams.files // use files array instead of individual file references
          // vm.inputFileName = myOutputParams.inputFileName
          // vm.binarizedFileName = myOutputParams.binarizedFileName
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
  },
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Otsu Results'})
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
