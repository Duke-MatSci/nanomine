<!--
################################################################################
#
# File Name: SDFCharacterize.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, November 1, 2018
# Customized for NanoMine
#
################################################################################
-->
<template>
  <div class="SDFCharacterize">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-layout row wrap>
        <v-flex xs12>
          <h3>Description</h3>
          <br>
          <p>Upload a binarized image / ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Characterize".
            All correlation functions are evaluated for the "white" phase in image.</p>
        </v-flex>
        <v-flex xs12 justify-start>
          <h4> Input Options:</h4>
          <p class="text-xs-left"><strong> Upload a single image: </strong>Supported image formats are .jpg, .tif and .png.The results will include the 2D SDF and it's radially averaged 1D version in CSV file format.</p>
          <p class="text-xs-left"><strong> --OR-- Upload a single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named
            "Input" - which contains the image.The results will include the 2D SDF and it's radially averaged 1D version in CSV file format.</p>
          <p class="text-xs-left"><strong> --OR-- Upload multiple images in ZIP File:</strong> Submit a ZIP file containing multiple images (supported
            formats: .jpg, .tif, .png) of same size (in pixels). DO NOT ZIP the folder containing images; select all images and ZIP them directly.
            DO NOT ZIP the folder containing images; select all images and ZIP them directly. The results will include a folder "input" which contains all images submitted by user,
            one folder for each input image that comprises the 2D and 1D SDF (in CSV format) of the respective image.
            Additionally, the mean 2D and 1D SDF, averaged over all input images is provided in CSV file along with a plot of the mean 2D SDF in "SDF_2D.jpg".</p>
        </v-flex>
      </v-layout>
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
            <span>SDF Characterization Job Submitted Successfully</span>
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-text>
            Your job is: {{jobId}} <br/> You should receive an email with a link to the job output.
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
      <v-btn v-on:click="submit()" color="primary">Characterize</v-btn>
    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
      <p>Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017. Characterization and design of functional quasi-random nanostructured materials using spectral density function. Journal of Mechanical Design, 139(7), p.071401.</p>
      <p>Lee, W. K., Yu, S., Engel, C. J., Reese, T., Rhee, D., Chen, W., & Odom, T. W. (2017). Concurrent design of quasi-random photonic nanostructures. Proceedings of the National Academy of Sciences, 114(33), 8734-8739.</p>
    </v-flex>
  </div>
</template>

<script>
import {} from 'vuex'
import {JobMgr} from '@/modules/JobMgr.js'

export default {
  name: 'SDFCharacterize',
  data: () => {
    return ({
      title: 'Input Upload',
      msg: 'Microstructure Characterization - Spectral Density Function',
      dialog: false,
      fileName: '',
      // file_type: [],
      files: [],
      filesDisplay: [],
      errorAlert: false,
      errorAlertMsg: '',
      fileUploaded: false,
      successDlg: false,
      jobId: ''
    })
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
      jm.setJobType('SDFCharacterize')
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
</style>
