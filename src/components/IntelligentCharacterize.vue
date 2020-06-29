<!--
################################################################################
#
# File Name: IntelligentCharacterize.vue
# Application: templates
# Description:
#
# Created by: Henry Zhang, August 29, 2019
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="IntelligentCharacterize">
    <h1>{{ msg }}</h1>
    <v-container class="text-xs-left">
      <v-layout row wrap>
        <v-flex xs12>
          <h3>Description</h3>
          <br>
          <p>This tool assesses the uploaded image(s) of microstructure and performs analysis to decide which characterization method suits the best.
            The process consists of three steps: </p>
          <p>(1) Calculate universal descriptors, i.e., void fraction, isotropy index, and interfacial area.</p>
          <p>(2) Determine whether Spheroidal Descriptors or Spectral Density Function (SDF) is more applicable, based on isotropy index and connectivity index.
            If the material is not isotropic or too connected, then the Spheroidal Descriptors are not applicable.</p>
          <p>(3) Generate results for either Spheroidal Descriptors or SDF representation.
            If Spheroidal Descriptor method is chosen, results of Nearest Neighbor Distance, Number of clusters, Compactness,
            Cluster Area, Cluster Radius, Elongation Ratio, Orientation Angle, and Rectangularity will be provided.
            If the SDF method is chosen, the following five different forms of SDF will be tested and the best fitted
            form will be chosen with output of the fitted parameters and the goodness of fit value.</p>
          <p>Chi-square fit: <math>y = a * f<sub>k</sub>(b * x, n)</math>, where <math>f<sub>k</sub></math> is the probability density function of chi-square distribution.
          </p>
          <p>Gamma fit: <math>y = a * f<sub>g</sub>(x - x<sub>0</sub>, b, c)</math>, where <math>f<sub>g</sub></math> is the probability density function of gamma distribution.
          </p>
          <p>Gaussian fit: <math>y = a * exp[-b * (x - x<sub>0</sub>)<sup>2</sup>]</math>
          </p>
          <p>Step function fit: <math>y = a * [h(x-x<sub>1</sub>) - h(x-x<sub>2</sub>)]</math>, where <math>h</math> is Heaviside function.
          </p>
          <p>Exponential fit: <math>y = a * exp[-b * (x - x<sub>0</sub>)]</math>
          </p>
          <p>Double peak fit: <math>y = a<sub>1</sub> * exp[-b<sub>1</sub> * (x - x<sub>1</sub>)<sup>2</sup>] +  a<sub>2</sub> * exp[-b<sub>2</sub> * (x - x<sub>2</sub>)<sup>2</sup>]</math>
          </p>
                  </v-flex>
        <v-flex xs12 justify-start>
          <h4> Input Options:</h4>
          <p class="text-xs-left"><strong> Upload a single image: </strong>Supported image formats are .jpg, .tif and .png.
          <p class="text-xs-left"><strong> --OR-- Upload a single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named
            "Input" - which contains the image.</p>
          <p class="text-xs-left"><strong> --OR-- Upload multiple images in ZIP File:</strong> Submit a ZIP file containing multiple images (supported
            formats: .jpg, .tif, .png) of same size (in pixels).
            DO NOT ZIP the folder containing images; select all images and ZIP them directly.</p>
        </v-flex>
      </v-layout>
      <v-alert
        v-model="loginRequired"
        type="error"
        outline
      >
        {{loginRequiredMsg}}
      </v-alert>
      <v-alert
        v-model="errorAlert"
        type="error"
        dismissible
      >
        {{errorAlertMsg}}
      </v-alert>
      <v-dialog v-model="successDlg" persistent max-width="500px">
        <v-card>
          <v-card-title>
            <span>Characterization Job Submitted Successfully</span>
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-text>
            Your characterization job is: {{jobId}} <br/> You should receive an email with a link to the job output.
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" flat @click="successDlgClicked()">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <ImageUpload v-on:setFiles="setFiles" aspectRatio='free'></ImageUpload>
      <v-flex class="text-xs-center">
        <v-btn v-on:click="submit()" color="primary">Characterize</v-btn>
      </v-flex>
      <h4>References</h4>
      <v-flex xs12>
        <p>Bostanabad, R. <i>et al.</i>, 2018. Computational microstructure characterization and reconstruction: Review of the state-of-the-art techniques.
          <i>Progress in Materials Science</i>, 95, pp. 1-41.</p>
      </v-flex>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import {JobMgr} from '@/modules/JobMgr.js'
import {Auth} from '@/modules/Auth.js'
import ImageUpload from './ImageUpload.vue'

export default {
  name: 'IntelligentCharacterize',
  components: {
    ImageUpload
  },
  data: () => {
    return ({
      title: 'Input Upload',
      msg: 'Microstructure Characterization - Intelligent',
      dialog: false,
      fileName: '',
      files: [],
      errorAlert: false,
      errorAlertMsg: '',
      loginRequired: false,
      loginRequiredMsg: '',
      successDlg: false,
      jobId: ''
    })
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    if (!vm.auth.isLoggedIn()) {
      vm.loginRequired = true
      vm.loginRequiredMsg = 'Login is required.'
    }
  },
  methods: {

    setFiles: function (...files) {
      this.files = files[0]; // the actual file object
      this.fileName = files[1]; // the name of the file
    },

    setLoading: function () {
      this.$store.commit('isLoading')
    },

    resetLoading: function () {
      this.$store.commit('notLoading')
    },

    successDlgClicked: function () {
      let vm = this
      console.log('Success dlg button clicked')
      vm.$router.go(-2) // go back to mcr homepage page
    },
    submit: function () {
      let vm = this
      vm.files.forEach(function (v) {
        console.log(JSON.stringify(v))
      })

      vm.setLoading()
      console.log('Loading..')
      let jm = new JobMgr()
      console.log('Called Job Manager')
      jm.setJobType('IntelligentCharacterize')
      jm.setJobParameters({'InputType': vm.fileName.split('.').pop()}) // Figure out which input type
      if (vm.files && vm.files.length >= 1) {
        vm.files.forEach(function (v) {
          jm.addInputFile(v.fileName, v.fileUrl)
          console.log('Job Manager added file: ' + v.fileName)
        })
        return jm.submitJob(function (jobId) {
          console.log('Success! JobId is: ' + jobId)
          vm.jobId = jobId
          vm.resetLoading()
          vm.successDlg = true
        }, function (errCode, errMsg) {
          let msg = 'error: ' + errCode + ' msg: ' + errMsg
          console.log(msg)
          vm.errorAlertMsg = msg
          vm.errorAlert = true
          vm.resetLoading()
        })
      } else {
        let msg = 'Please select a file to process.'
        vm.errorAlertMsg = msg
        vm.errorAlert = true
        vm.resetLoading()
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 240px;
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
