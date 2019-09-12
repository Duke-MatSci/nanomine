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
          <p>This tool assesses the uploaded image of microstructure and performs certain checks to decide which characterization method would work best. The process
            consists of three steps: </p>
          <p>(1) Calculate universal descriptors</p>
          <p>(2) Check whether Spheroidal descriptors or Spectral Density Function(SDF) is applicable</p>
          <p>(3) Based on the decision in previous step calculate either SDF or Spheroidal Descriptors. If SDF is selected, then it is also parameterized.</p>
            <p>In step (1) universal descriptors include void fraction, isotropy index, and interfacial area.
            For step (2) stated above the decision is based upon the connectivity and isotropy index. If the material is too connected it becomes unfit for spheroidal descriptors. And if the material is not isotropic
            it becomes unfit for SDF characterization.
            For step (3) if SDF is selected, a curve fitting is done based on five different forms. The one which has the best fit is outputted along with the goodness of fit value.</p>
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
      <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
        <p class="text-xs-left">Select File
          <v-btn class="text-xs-left" small color="primary" @click='pickFile'>Browse</v-btn>
          <input
            type="file"
            style="display: none"
            accept=".jpg, .png, .tif, .mat, .zip"
            ref="myUpload"
            @change="onFilePicked"
          >
        </p>
        <v-list v-model="fileName" subheader: true v-if="fileUploaded">
          <v-list-tile
            v-for="file in filesDisplay"
            :key="file.fileName"
          >
            <v-list-tile-avatar>
              <v-icon color="primary">check_circle_outline</v-icon>
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title v-text="file.fileName"></v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-flex>
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

export default {
  name: 'IntelligentCharacterize',
  data: () => {
    return ({
      title: 'Input Upload',
      msg: 'Microstructure Characterization - Intelligent',
      dialog: false,
      fileName: '',
      // file_type: [],
      files: [],
      filesDisplay: [],
      errorAlert: false,
      errorAlertMsg: '',
      loginRequired: false,
      loginRequiredMsg: '',
      fileUploaded: false,
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
    setLoading: function () {
      this.$store.commit('isLoading')
    },

    resetLoading: function () {
      this.$store.commit('notLoading')
    },

    pickFile () {
      this.$refs.myUpload.click()
    },

    resetFiles: function () {
      this.files = []
      this.filesDisplay = []
      this.fileUploaded = false
    },

    onFilePicked (e) {
      this.resetFiles()
      const files = e.target.files
      for (let i = 0; i < files.length; i++) {
        let file = {}
        let f = files[i]
        if (f !== undefined) {
          file.fileName = f.name
          if (file.fileName.lastIndexOf('.') <= 0) {
            return
          }
          console.log(file.fileName)
          const fr = new FileReader()
          fr.readAsDataURL(f)
          fr.addEventListener('load', () => {
            file.fileUrl = fr.result
            this.files.push(file)
            this.filesDisplay.push(file)
            this.fileUploaded = true
          })
        } else {
          console.log('File Undefined')
        }
      }
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
