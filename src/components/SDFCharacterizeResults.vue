<template>
  <div>
    <a-header :info="info"></a-header>
    <div class="main">
      <div class="SDFCharacterizeResults">
        <v-alert
          v-model="resultsError"
          type="error"
          dismissible
        >
          {{resultsErrorMsg}}
        </v-alert>
        <v-container>
          <h1>{{msg}}</h1>
          <v-layout>
            <v-flex xs6>
              <h4>Uploaded Image</h4>
              <img :src="getInputImage()"/>
              {{inputImage}}
              <p></p>
            </v-flex>
            <v-flex xs6>
              <h4>Spectral Density Function</h4>
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
          <h4>References</h4>
          <v-flex xs12>
            <p>Ghumman, U.F., Iyer, A., Dulal, R., Munshi, J., Wang, A., Chien, T., Balasubramanian, G., and Chen, W., A Spectral Density Function Approach for Active Layer Design of Organic Photovoltaic Cells, <i>Journal of Mechanical Design</i>, Special Issue on Design of Engineered Materials and Structures, accepted July 2018. doi:10.1115/1.4040912.</p>s
            <p>Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017. Characterization and design of functional quasi-random nanostructured materials using spectral density function. <i>Journal of Mechanical Design</i>, 139(7), p.071401.</p>
            <p>Lee, W. K., Yu, S., Engel, C. J., Reese, T., Rhee, D., Chen, W., & Odom, T. W. (2017). Concurrent design of quasi-random photonic nanostructures. Proceedings of the National Academy of Sciences, 114(33), 8734-8739.</p>
          </v-flex>
        </v-container>
      </div>
    </div>
    <a-footer></a-footer>
  </div>
</template>

<script>
import Axios from 'axios'
import {} from 'vuex'
import * as Util from './utils'
export default {
  name: 'SDFCharacterizeResults',
  data: () => {
    return ({
      info: {icon: 'fa-file', name: 'Spectral Density Function'},
      msg: 'Characterization Results',
      resultsError: false,
      resultsErrorMsg: '',
      inputFileName: '',
      SDFPlot: '',
      zipFileName: ''
    })
  },
  components: {
    aHeader: Util.Header,
    aFooter: Util.Footer,
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
      return vm.$route.query.refuri + '/' + vm.SDFPlot
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
          vm.SDFPlot = myOutputParams.SDFPlot
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
    width: 250px;
    height: auto;
  }

  h4 {
    text-transform: uppercase;
  }
  h1 {
    margin-top: 10px;
    padding-bottom: .1rem;
    border-bottom: .2rem solid black;
  }

</style>
