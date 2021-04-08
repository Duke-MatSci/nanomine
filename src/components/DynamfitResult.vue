<template>
  <div class="main">
    <div class="dynamfitResult">
      <v-container>
        <h1 class="header-nm">Dynamfit - Prony Series coefficient fitting</h1>
        <v-alert
          v-model="resultsError"
          type="error"
          dismissible
        >
          {{resultsErrorMsg}}
        </v-alert>
        <h3 class="text-xs-left">The fitting result is shown below:</h3>
        <v-layout justify-space-around>
          <v-flex xs5>
            <v-layout column>
              <div class="subheading">Epsilon Prime</div>
              <v-img :src="getEImage()" contain></v-img>
            </v-layout>
          </v-flex>
          <v-flex xs5>
            <v-layout column>
              <div class="subheading">Epsilon Double Prime</div>
              <v-img :src="getEEImage()" contain></v-img>
            </v-layout>
          </v-flex>
        </v-layout>
        <p class="text-xs-left">Prony Series Coefficients (the program writes three files.)</p>
        <h5 class="text-xs-left">File #.XPR</h5>
        <p class="text-xs-left">This file contains the Prony series terms. It consists of N lines of data with each line containing (&#947;<sub>i</sub>, P-SVD<sub>i</sub>, RMS-SVD, P-Sign<sub>i</sub>, RMS-Sign), where &#947;<sub>i</sub> are the relaxation times (constant term has &#947;<sub>i</sub> set to 10<sup>50</sup>, P-SVD<sub>i</sub> and P-Sign<sub>i</sub>are the Prony series coefficients for the linear (SVD) and sign controlled method, respectively, and RMS-SVD  and RMS-Sign are the RMS percent errors between the obtained fit and the entire data for the linear (SVD) and sign controlled method, respectively. Note that the RMS errors are provided on every line; this is a simplification to keep all lines in the file identical in size.</p>
        <h5 class="text-xs-left">File #.XFF</h5>

        <p class="text-xs-left">
            This file contains the predicted frequency domain response obtained by the program. It consists of U lines of data, where U is the number of points specified by the user for the response predictions. Each line contains
            (&#969;<sub>i</sub>, X<sup>'</sup>-SVD<sub>i</sub>, X-SVD<sub>i</sub>, X-Sign<sub>i</sub>, X-Sign<sub>i</sub>),  where &#969;<sub>i</sub> are the frequency points of evaluation (U points evenly spaced in the log domain between &#969;<sub>min</sub> and &#969;<sub>max</sub>.</p>
        <h5 class="text-xs-left">File #.XTF</h5>
        <p class="text-xs-left">
            This file contains the predicted time domain response obtained by the program. It consists of U lines of data, where U is the number of points specified by the user for the response predictions. Each line contains (t<sub>i</sub>, X-SVD<sub>i</sub>, X-Sign<sub>i</sub>, where t<sub>i</sub> are the time points of evaluation (U points evenly spaced in the log domain between t<sub>min</sub> = 2 &#960;/ &#969; <sub>min</sub>), and X-SVD<sub>i</sub> and X-Sign<sub>i</sub> are the predicted time domain values from the Prony series obtained by the linear (SVD) and sign controlled method, respectively.</p>
        <p class="text-xs-left">
          These Prony Series coefficients associated with the elastic parameters of nanoparticles are then imported into the material section of finite element simulation.</p>
        <h3 class="text-xs-left">Your results are ready to download</h3><br>
        <p class="text-xs-left">Click <a :href="getXPRFile()">here</a> to download #.XPR file.</p>
        <p class="text-xs-left">Click <a :href="getXFFFile()">here</a> to download #.XFF file.</p>
        <p class="text-xs-left">Click <a :href="getXTFFile()">here</a> to download #.XTF file.</p>
        <v-layout row wrap>
          <v-flex text-xs-left offset-xs0 offset-md0 offset-lg0>
            <v-btn color="primary" dark to="/Dynamfit">
              <v-icon dark left>arrow_back</v-icon>Run another file?
            </v-btn>
          </v-flex>
        </v-layout>
        <br>
        <h4 v-if="referenceOpen" @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_up</i></h4>
        <h4 v-else @click="refOpen" class="text-xs-left">References <i class="material-icons icon-adjust">keyboard_arrow_down</i></h4>
        <p v-if="referenceOpen" class="text-xs-left">Bradshaw et al., <i><a href="http://link.springer.com/article/10.1023/A:1009772018066">A Sign Control Method for Fitting and Interconverting Material Functions for Linearly Viscoelastic Solids</a></i>, Mechanics of Time-Dependent Materials. 1997 1(1)</p>
      </v-container>
    </div>
    </div>
</template>

<script>
import Axios from 'axios'
import {} from 'vuex'

export default {
  name: 'DynamfitResult',
  data () {
    return {
      resultsError: false,
      resultsErrorMsg: '',
      Eimg: '',
      EEimg: '',
      XPR: '',
      XFF: '',
      XTF: '',
      referenceOpen: false
    }
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
    getEImage: function () {
      let vm = this
      return vm.$route.query.ref + '/' + vm.Eimg
    },
    getEEImage: function () {
      let vm = this
      return vm.$route.query.ref + '/' + vm.EEimg
    },
    getXPRFile: function () {
      let vm = this
      return vm.$route.query.ref + '/' + vm.XPR
    },
    getXFFFile: function () {
      let vm = this
      return vm.$route.query.ref + '/' + vm.XFF
    },
    getXTFFile: function () {
      let vm = this
      return vm.$route.query.ref + '/' + vm.XTF
    },
    getJobOutputParams: function () {
      let vm = this
      let url = vm.$route.query.ref + '/job_output_parameters.json'
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response.data)
          let myOutputParams = response.data // Axios did the JSON parse for us
          vm.Eimg = myOutputParams.Eimg
          vm.EEimg = myOutputParams.EEimg
          vm.XPR = myOutputParams.XPR
          vm.XFF = myOutputParams.XFF
          vm.XTF = myOutputParams.XTF
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
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Dynamfit Result'})
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
