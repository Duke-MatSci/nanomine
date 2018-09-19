<!--
################################################################################
#
# File Name: Otsu.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, July 23, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="Otsu">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-flex xs12>
          <h3>Description</h3>
          <br>
            <p>Upload a image / ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Binarize" to binarize image using Otsu's Mehtod.</p>
            <h4> Input Options:</h4>
                  <p><strong> 1) Single image: </strong>Supported image formats are .jpg, .tif and .png.
                  <p><strong> 2) Single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named "Input" - which contains the image.</p>
                  <p><strong> 3) Multiple images in ZIP File:</strong> Submit a ZIP file containing multiple images (supported formats: .jpg, .tif, .png) of same size (in pixels).
                DO NOT ZIP the folder containing images; select all images and ZIP them directly.</p>
      </v-flex>
      <v-alert
        v-model="uploadError"
        type="error"
        dismissible
      >
        {{uploadErrorMsg}}
      </v-alert>
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
      <v-btn v-on:click="submit()" color="primary">Binarize</v-btn>
    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
        <p> N. Otsu, A threshold selection method from gray-level histograms, IEEE transactions on systems, man, and cybernetics, vol. 9, no. 1, pp. 62-66, 1979.</p>

    </v-flex>
  </div>
</template>

<script>
import {} from 'vuex'
import {JobMgr} from '@/modules/JobMgr.js'

export default {
  name: 'Otsu',
  data: () => {
    return ({
      title: 'Input Upload',
      msg: 'Binarization - Otsu Method',
      dialog: false,
      fileName: '',
      // file_type: [],
      files: [],
      filesDisplay: [],
      uploadError: false,
      uploadErrorMsg: '',
      fileUploaded: false
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

    submit: function () {
      let vm = this
      vm.files.forEach(function (v) {
        console.log(JSON.stringify(v))
      })

      vm.setLoading()
      console.log('Loading..')
      let jm = new JobMgr()
      console.log('Called Job Manager')
      jm.setJobType('otsu')
      jm.setJobParameters({'InputType': vm.fileName}) // Figure out which input type
      vm.files.forEach(function (v) {
        jm.addInputFile(v.fileName, v.fileUrl)
        console.log('Job Manager added file: ' + v.fileName)
      })
      return jm.submitJob(function (jobId) {
        console.log('Success! JobId is: ' + jobId)
        vm.resetLoading()
      }, function (errCode, errMsg) {
        console.log('error: ' + errCode + ' msg: ' + errMsg)
        vm.resetLoading()
      })
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
