<!--
################################################################################
#
# File Name: ImageUpload.vue
# Application: templates
# Description: A reusable component that allows users to upload files. Used for Microstructure Characterization & Reconstruction jobs.
#
# Created by: Atul Jalan 6/23/20
# Customized for NanoMine
#
################################################################################
-->

<template>

  <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">

    <!-- file upload button -->
    <p class="text-xs-left fileButtonWrapper">
      <v-btn class="text-xs-left fileButton" color="primary" @click='$refs.myUpload.click()'>Browse files</v-btn>
      <input type="file" style="display: none" accept=".jpg, .png, .tif, .mat, .zip" ref="myUpload" @change="uploadFiles">
    </p>

    <!-- error alert if phase becomes invalid after cropping -->
    <v-alert class='alert' type='error' dismissible v-model="showErrorAlert">{{ errorAlert.text }}</v-alert>

    <!-- info alert that functionality reduced if user uploads mat or tif file type -->
    <v-alert class='alert' type='info' dismissible v-model="fileTypeAlert">Note: due to browser limitations, image editing functionality and pulling data about image dimensions is not available for mat and tif file types. But, these file types can still be submitted for jobs.</v-alert>

    <!-- image dimension input section -->
    <div v-if="fileUploaded && collectDimensions">

      <h4 class='subheader' >Image Dimensions</h4>

      <div class='imageDimensionsWrapper'>

        <div class='imgDimWidth'>
          <v-text-field outline label='width' v-model='inputtedDimensions.width' @change="userDimensionsCallback"></v-text-field>
        </div>

        <h3>x</h3>

        <div class='imgDimHeight'>
          <v-text-field outline label='height' v-model='inputtedDimensions.height' @change="userDimensionsCallback"></v-text-field>
        </div>

        <div class='imgDimUnits'>
          <v-select
            label="units"
            :items="['nanometers (nm)', 'micrometers (µM)', 'millimeters (mm)']"
            v-model="inputtedDimensions.units"
            @change="userDimensionsCallback"
          ></v-select>
        </div>

        <v-btn v-if='filesEditable' class='imgDimButton' small v-on:click="openImageEditor(0, 'calibrate')" color="primary">Scale Bar Calibration Tool</v-btn>

      </div>

    </div>

    <!-- parameters that are specific to job type -->
    <div v-if="fileUploaded && selects.length > 0">

      <h4 class='subheader'>Parameters</h4>

      <div class='selectDropdownsWrapper'>
        <div class='singleSelectDropdown' v-for="(select, index) in selects" :key='index'>

          <div v-if="'options' in select">
            <v-select
              outline
              :label="select.title"
              :items="select.options"
              v-model="selectedOptions[select.submitJobTitle]"
              v-on:change="$emit('set-selectors', selectedOptions)"
            ></v-select>
          </div>

          <div v-else>
            <v-text-field
              outline
              :label="select.title"
              v-model="selectedOptions[select.submitJobTitle]"
              @change="$emit('set-selectors', selectedOptions)"
            ></v-text-field>
          </div>

        </div>
      </div>

    </div>

    <!-- image cropper & phase selection modal -->
    <EditImage
      v-model='imageEditorOpen'
      v-bind:file='imageEditorData'
      v-bind:aspectRatio='aspectRatio'
      v-bind:type='editImageType'
      v-on:setCroppedImage="cropCallback"
      v-on:setPhase="phaseCallback"
      v-on:setCalibration="calibrationCallback"
    ></EditImage>

    <!-- table of uploaded images -->
    <div v-if="fileUploaded" class='imageTable'>

      <div class='imageTableHeader'>
        <h4>Name</h4>
        <h4>Size</h4>
        <div class='tooltipWrapper'>
          <h4>Selected phase</h4>
          <v-tooltip top>
            <template v-slot:activator="{ on, attrs }">
              <v-icon v-bind="attrs" v-on="on">mdi-information</v-icon>
            </template>
            <span>Select which phase to analyze for each image</span>
          </v-tooltip>
        </div>
        <h4>Options</h4>
      </div>

      <div class='imageTableContents' v-for="(file, index) in displayedFiles" :key='file.name'>

        <p>{{ file.name }}</p>

        <p :key='file.pixelSize.width'><span v-if="dimensionsEntered" :key='file.size.height'>{{ file.size.width }} x {{ file.size.height }} {{ file.size.units }} / </span>{{ file.pixelSize.width }} x {{ file.pixelSize.height }} pixels <span v-if='file.errors.size' class='imageSizeError'>ERROR</span></p>

        <p v-if="file.phase.x_offset !== 0 || file.phase.y_offset !== 0">Manually set (x-offset: {{ file.phase.x_offset }}px, y-offset: {{ file.phase.y_offset }}px)</p>
        <p v-else>Preset (bright phase)</p>

        <div class='imageTableButtons' v-if='filesEditable'>
          <v-btn small class='imageTableButton' :key='index' v-on:click="openImageEditor(index, 'crop')" color="primary">Crop image</v-btn>
          <v-btn small class='imageTableButton' :key='index' v-on:click="openImageEditor(index, 'phase')" color="primary">Set phase</v-btn>
        </div>

      </div>

    </div>

  </v-flex>
</template>

<script>

import {} from 'vuex'
import EditImage from './EditImage.vue' // image cropping modal
import jszip from 'jszip' // for unzipping and rezipping files

export default {
  name: 'ImageUpload',

  components: {
    EditImage
  },

  props: {
    aspectRatio: String,
    selects: Object,
    collectDimensions: Boolean
  },

  data () {
    return {

      submissionFile: {},
      displayedFiles: [],
      selectedOptions: {},

      filesEditable: true,
      errorAlert: {count: 0, text: 'Error: selected phase for one or more images falls outside the image(s). This is likely due to cropping the image after setting the phase.'},

      dimensionsEntered: false,
      inputtedDimensions: {units: null, width: 0, height: 0},

      imageEditorOpen: false,
      imageEditorData: {url: null, name: null, phase: {x_offset: null, y_offset: null}},
      editImageType: 'crop'

    }
  },

  computed: {

    // info alert that functionality is restricted if the user uploads tif or mat file type
    fileTypeAlert: function () {
      return !this.filesEditable
    },

    // show error alert if count of errors is greater than 0
    showErrorAlert: function () {
      return !!this.errorAlert.count
    },

    fileUploaded: function () {
      if (this.displayedFiles.length > 0) {
        return true
      }
      return false
    }

  },

  methods: {

    // process uploaded files
    uploadFiles: function (e) {
      // initial variable declaration and input validation
      let vm = this
      const inputFile = e.target.files[0]
      if (inputFile === undefined) { return }

      // reset file information
      vm.submissionFile = {}
      vm.displayedFiles = []
      vm.filesEditable = true
      if ('phase' in vm.selectedOptions) { delete vm.selectedOptions.phase }
      if ('dimensions' in vm.selectedOptions) {
        vm.selectedOptions['dimensions'] = {'units': vm.inputtedDimensions.units, 'width': parseInt(vm.inputtedDimensions.width), 'height': parseInt(vm.inputtedDimensions.height)}
      }
      vm.$emit('set-selectors', vm.selectedOptions)

      const fr = new FileReader()
      fr.readAsDataURL(inputFile)
      fr.addEventListener('load', async () => {
        // get file information
        vm.submissionFile = {
          name: inputFile.name.toLowerCase(),
          url: fr.result,
          fileType: inputFile.name.split('.').pop().toLowerCase()
        }

        // push to parent
        vm.$emit('setFiles', vm.submissionFile)

        // push to displayed files
        if (vm.submissionFile.fileType === 'zip') {
          vm.unzipUploadedFiles(inputFile) // function unzips contents, sets editable status and gets image dimensions
        } else {
          var lowerCaseName = inputFile.name.toLowerCase()
          vm.displayedFiles = [{
            name: lowerCaseName,
            originalName: lowerCaseName,
            url: fr.result,
            fileType: lowerCaseName.split('.').pop(),
            size: { width: 0, height: 0, units: null },
            pixelSize: { width: 0, height: 0 },
            phase: { x_offset: 0, y_offset: 0 },
            errors: {size: false}
          }]
          vm.getInitialDimensions(0) // set pixel dimensions for image
          if (vm.displayableFileType(0) === false) { vm.filesEditable = false } // set displayable status for image
          vm.pushPhase(0)
          vm.pushImageDimensions()
        }
      })
    },

    getInitialDimensions: function (index) {
      let vm = this
      if (vm.displayableFileType[index] === false) { return }

      var img = new Image()
      img.src = vm.displayedFiles[index].url
      img.onload = function () {
        vm.displayedFiles[index].pixelSize = {width: img.width, height: img.height}
        vm.displayedFiles[index].originalSize = {width: img.width, height: img.height}
        vm.updateUserDimensions(index)
        vm.displayedFiles[index].name += ' '
      }
    },

    // unzip if the user uploads a zip file
    unzipUploadedFiles: function (inputFile) {
      // initial variable declaration
      const vm = this
      const jszipObj = new jszip()

      // unzip
      jszipObj.loadAsync(inputFile)
        .then(async function (zip) {
          // transform contents to base64
          Object.keys(zip.files).forEach(function (filename) {
            zip.files[filename].async('base64')
              .then(function (fileData) {
                var lowerCaseName = filename.toLowerCase()
                var filetype = lowerCaseName.split('.').pop()
                vm.displayedFiles.push({
                  name: lowerCaseName,
                  originalName: lowerCaseName,
                  url: 'data:image/' + filetype + ';base64,' + fileData,
                  fileType: filetype,
                  size: { width: 0, height: 0, units: null },
                  pixelSize: { width: 0, height: 0 },
                  phase: { x_offset: 0, y_offset: 0 },
                  errors: {size: false}
                })
              })
              .then(function () {
                vm.getInitialDimensions(vm.displayedFiles.length - 1) // get image dimensions
                vm.pushPhase(vm.displayedFiles.length - 1)
                vm.pushImageDimensions()
                if (vm.displayableFileType(vm.displayedFiles.length - 1) === false) { vm.filesEditable = false } // reduce functionality if image is tif or mat
              })
          })
        })
    },

    calibrationCallback: function (...args) {
      this.inputtedDimensions.width = args[0].width
      this.inputtedDimensions.height = args[0].height
      this.inputtedDimensions.units = args[1].units
      this.userDimensionsCallback()
    },

    // callback function for when users enter data into the image dimensions section
    userDimensionsCallback: function () {
      if (this.inputtedDimensions.units !== null && parseInt(this.inputtedDimensions.width) > 0 && parseInt(this.inputtedDimensions.height) > 0) {
        this.dimensionsEntered = true
        for (let i = 0; i < this.displayedFiles.length; i++) { this.updateUserDimensions(i) }
        this.pushImageDimensions()
      }
    },

    // emit image dimensions data back to parent
    pushImageDimensions: function () {
      if (this.displayableFileType(0) === true) {
        this.selectedOptions['dimensions'] = {'units': this.inputtedDimensions.units, 'width': this.displayedFiles[0].size.width, 'height': this.displayedFiles[0].size.height}
      } else {
        this.selectedOptions['dimensions'] = {'units': this.inputtedDimensions.units, 'width': parseInt(this.inputtedDimensions.width), 'height': parseInt(this.inputtedDimensions.height)}
      }
      this.$emit('set-selectors', this.selectedOptions)
    },

    // scale user inputted dimensions by how much user has cropped the images
    updateUserDimensions: function (index) {
      let vm = this
      vm.displayedFiles[index].size.units = vm.inputtedDimensions.units
      vm.displayedFiles[index].size.width = parseInt((parseInt(vm.inputtedDimensions.width) / vm.displayedFiles[index].originalSize.width) * vm.displayedFiles[index].pixelSize.width)
      vm.displayedFiles[index].size.height = parseInt((parseInt(vm.inputtedDimensions.height) / vm.displayedFiles[index].originalSize.height) * vm.displayedFiles[index].pixelSize.height)
    },

    // args: [fileName, phase]
    phaseCallback: function (...args) {
      // find index of object to change in array
      const indexFunction = (object) => object.name === args[0]
      const index = this.displayedFiles.findIndex(indexFunction)

      // apply new phase
      this.displayedFiles[index].phase = args[1]
      if (this.displayedFiles[index].errors.size === true) {
        this.displayedFiles[index].errors.size = false
        this.errorAlert.count -= 1
      }

      this.displayedFiles[index].name += ' ' // force rerender

      // push to parent
      this.pushPhase(index)
    },

    pushPhase: function (index) {
      if ('phase' in this.selectedOptions) {
        this.selectedOptions['phase'][this.displayedFiles[index].originalName] = this.displayedFiles[index].phase
      } else {
        this.selectedOptions['phase'] = {}
        this.selectedOptions.phase[this.displayedFiles[index].originalName] = this.displayedFiles[index].phase
      }
      this.$emit('set-selectors', this.selectedOptions)
    },

    // args: [cropped image, filename of cropped image, coordinates]
    cropCallback: async function (...args) {
      for (let i = 0; i < this.displayedFiles.length; i++) {
        if (this.displayedFiles[i].name === args[1]) {
          await this.cropImage(args[0], args[2], i)
        } else if (this.displayableFileType(i) === false) {
          continue
        } else {
          await this.cropImage(null, args[2], i)
        }

        this.displayedFiles[i].name = 'cropped_' + this.displayedFiles[i].name // force rerender
      }

      // push to parent
      if (this.submissionFile.fileType === 'zip') {
        this.rezipFiles()
      } else {
        this.submissionFile.url = this.displayedFiles[0].url
        this.$emit('setFiles', this.submissionFile)
      }
      this.pushImageDimensions()
      for (let i = 0; i < this.displayedFiles.length; i++) { this.pushPhase(i) }
    },

    // crops a single image: update the image, the image's phase, and the image dimensions
    cropImage: async function (url, coordinates, index) {
      let vm = this

      // crop the image
      if (url !== null) {
        vm.displayedFiles[index].url = url
      } else {
        var canvas = document.createElement('canvas')
        canvas.width = coordinates.width
        canvas.height = coordinates.height

        var ctx = canvas.getContext('2d')
        var image = new Image()
        image.src = vm.displayedFiles[index].url

        function awaitImageCrop (image) {
          return new Promise((resolve, reject) => {
            image.onload = function () {
              ctx.drawImage(image, (-1) * coordinates.left, (-1) * coordinates.top)
              vm.displayedFiles[index].url = canvas.toDataURL()
              resolve()
            }
          })
        }
        await awaitImageCrop(image) // done to ensure that all images are cropped before files are rezipped
      }

      // update the phase based on new top left of image
      if (vm.displayedFiles[index].phase.x_offset !== 0 || vm.displayedFiles[index].phase.y_offset !== 0) {
        vm.displayedFiles[index].phase.x_offset -= coordinates.left
        vm.displayedFiles[index].phase.y_offset -= coordinates.top

        // validate that new phase is still within the image
        if (vm.displayedFiles[index].phase.x_offset < 0 || vm.displayedFiles[index].phase.y_offset < 0) {
          vm.errorAlert.count += 1
          vm.displayedFiles[index].errors.size = true
        } else if (vm.displayedFiles[index].phase.x_offset > coordinates.width || vm.displayedFiles[index].phase.y_offset > coordinates.height) {
          vm.errorAlert.count += 1
          vm.displayedFiles[index].errors.size = true
        }
      }

      // update the image dimensions
      vm.displayedFiles[index].pixelSize.width = coordinates.width
      vm.displayedFiles[index].pixelSize.height = coordinates.height

      if (vm.dimensionsEntered === true) {
        vm.updateUserDimensions(index)
      }
    },

    // rezip images when images are altered and emit that back to parent component
    async rezipFiles () {
      let jszip_obj = new jszip()
      let vm = this

      // add images to zip file
      for (let i = 0; i < vm.displayedFiles.length; i++) {
        jszip_obj.file(this.displayedFiles[i].originalName, this.displayedFiles[i].url.split(',').pop(), {base64: true})
      }

      // create zip file
      jszip_obj.generateAsync({type: 'base64', compression: 'DEFLATE'})
        .then(function (base64) {
          vm.submissionFile.url = 'data:application/zip;base64,' + base64
          vm.$emit('setFiles', vm.submissionFile)
        })
    },

    // opens image editor modal and passes information for specific image that is opened
    openImageEditor: function (index, type) {
      this.editImageType = type
      this.imageEditorData = this.displayedFiles[index]
      this.imageEditorOpen = !this.imageEditorOpen // toggle the image editor modal being open and closed
    },

    displayableFileType: function (index) {
      if (this.displayedFiles === []) {
        return false
      } else if (this.displayedFiles[index].fileType === 'mat' || this.displayedFiles[index].fileType === 'tif') {
        return false
      }
      return true
    }
  }
}
</script>

<style scoped>

  /* Browse files button */
  .fileButtonWrapper {
    margin-bottom: 0px;
  }

  .fileButton {
    margin-left: 0px;
    margin-bottom: 20px;
  }

  h4 {
    text-align: left;
    margin-top: 0px;
    font-size: 15px;
  }

  /* Subheaders such as 'Image dimensions' and 'Parameters' */
  .subheader {
    margin-bottom: 15px;
    border-bottom: 1px solid gray;
  }

  .tooltipWrapper {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  }

  /* info and error alerts */
  .alert {
    text-align: left;
    border: none;
  }

  /**********
  image table
  **********/
  .imageTable {
    margin-bottom: 20px;
  }

  .imageTableHeader {
    border-bottom: 1px solid gray;
    margin-bottom: 15px;
  }

  .imageTableHeader, .imageTableContents {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  }

  .imageTableContents {
    margin-bottom: 5px;
  }

  .imageTableHeader h4, .imageTableContents p, .tooltipWrapper {
    width: 25%;
    text-align: left;
  }

  .tooltipWrapper h4 {
    width: initial;
  }

  .imageTableContents p {
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 15px;
  }

  .imageTableButtons {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    flex-wrap: wrap;
    width: 25%;
  }

  .imageTableButton {
    margin-top: 0px;
    margin-left: 0px;
  }

  .imageSizeError {
    font-weight: 700;
    color: red;
  }

  /*********
  parameters
  *********/
  .selectDropdownsWrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .singleSelectDropdown {
    width: 49%;
  }

  /* image dimensions */
  .imageDimensionsWrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
  }

  /* giant x between width and height for image dimensions */
  h3 {
    font-size: 20px;
    margin-top: -28px;
  }

  .imgDimWidth {
    width: 20%;
    max-width: 225px;
    margin-right: 15px;
  }

  .imgDimHeight {
    width: 20%;
    max-width: 225px;
    margin-left: 15px;
    margin-right: 30px;
  }

  .imgDimUnits {
    width: 200px;
    max-width: 25%;
  }

  .imgDimButton {
    margin-left: 30px;
  }

</style>
