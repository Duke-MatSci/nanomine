<template>
  <div class="threedmodelviewer">
    <h1>{{ msg }}</h1>
    <v-alert
      v-model="errorAlert"
      type="error"
      dismissible
    >
      {{errorMsg}}
    </v-alert>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <v-flex d-flex xs2>
          <div class="text-xs-left">
            View example 1: {{exampleModels[0]}}
            <v-btn class="text-xs-left" small color="primary" @click="selectExample(0)">View</v-btn>
          </div>
        </v-flex>
        <v-flex d-flex xs2>
          <div class="text-xs-left">
            View example 2: {{exampleModels[1]}}
            <v-btn class="text-xs-left" small color="primary" @click="selectExample(1)">View</v-btn>
          </div>
        </v-flex>
        <v-flex d-flex xs2>
          <div class="text-xs-left">Select an STL file to view from your local file system
            <v-btn class="text-xs-left" small color="primary" @click='selectFile'>Browse</v-btn>
            <input
              type="file"
              style="display: none"
              accept=".stl"
              ref="stlfilebrowser"
              @change="onFileSelected"
            >
          </div>
        </v-flex>
      </v-layout>
      <v-flex d-flex xs12>
          <v-layout row wrap>
            <v-flex d-flex xs12 class="font-weight-black font-italic text-xs-center" v-if="modelName.length > 0">
              Model Name: {{modelName}}
            </v-flex>
            <v-flex d-flex xs12>
              <model-stl width="400" height="400" :src="modelData" @on-load="modelLoaded" @on-error="modelLoadError"></model-stl>
            </v-flex>
          </v-layout>
        </v-flex>
    </v-container>
  </div>
</template>

<script>
import { ModelStl } from 'vue-3d-model'
import Axios from 'axios'

export default {
  name: 'ThreeDModelViewer',
  components: { ModelStl },
  data () {
    return {
      msg: '3D Model Viewer',
      errorAlert: false,
      errorMsg: '',
      modelData: null,
      modelName: '',
      currentExample: -1,
      exampleModelData: [null, null],
      exampleModels: ['latTrunCube_4921.stl', 'tpbsDD1_20.stl']
    }
  },
  methods: {
    modelLoaded (ev) {
      let vm = this
      setTimeout(function () {
        vm.resetLoading()
      }, 250)
    },
    modelLoadError (ev) {
      let vm = this
      vm.resetLoading()
      vm.errorAlert = true
      vm.errorMsg = 'Error loading image.'
      vm.modelData = null
      vm.modelName = ''
      if (vm.currentExample >= 0) {
        vm.exampleModelData[vm.currentExample] = null
      }
    },
    getModelData () {
      return this.modelData
    },
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    selectExample (exampleIdx) {
      let vm = this
      vm.currentExample = exampleIdx
      console.log('exampleIdx: ' + exampleIdx)
      let fileNm = vm.exampleModels[exampleIdx]
      let fullNm = 'https://materialsmine.org/nmf/' + fileNm + '.base64'
      if (vm.exampleModelData[exampleIdx] === null) {
        vm.setLoading()
        vm.loadData(fullNm)
          .then(function (modelData) {
            // NOTE: let the model on error or on load handler reset the loading spinner
            //    vm.resetLoading()
            console.log(modelData.slice(0, 20))
            vm.exampleModelData[exampleIdx] = modelData
            vm.errorMsg = ''
            vm.errorAlert = false
            vm.modelData = vm.exampleModelData[exampleIdx]
            vm.modelName = 'Example model: ' + vm.exampleModels[exampleIdx]
          })
          .catch(function (err) {
            vm.errorMsg = 'Error loading example: ' + vm.exampleModels[exampleIdx] + ' - ' + err
            vm.errorAlert = true
            vm.modelData = null
            vm.modelName = ''
            vm.resetLoading()
          })
      } else {
        vm.setLoading()
        vm.modelData = vm.exampleModelData[exampleIdx]
        vm.modelName = 'Example model: ' + vm.exampleModels[exampleIdx]
        setTimeout(function () {
          vm.resetLoading()
        }, 250)
      }
    },
    loadData (url) {
      return new Promise(function (resolve, reject) {
        Axios.get(url)
          .then(function (resp) {
            resolve(resp.data)
          })
          .catch(function (err) {
            reject(err)
          })
      })
    },
    selectFile () {
      let vm = this
      vm.$refs.stlfilebrowser.click()
    },
    onFileSelected (e) {
      let vm = this
      vm.setLoading()
      vm.currentExample = -1 // not an example
      console.log('on file selected')
      vm.modelData = null
      vm.modelName = ''
      const files = e.target.files
      let loadPromise = null
      let file = {}
      let f = files[0]
      if (f !== undefined) {
        file.fileName = f.name
        if (file.fileName.lastIndexOf('.') <= 0) {
          return
        }
        const fr = new FileReader()
        loadPromise = new Promise(function (resolve, reject) {
          fr.addEventListener('load', function () {
            file.model = fr.result
            file.error = false
            resolve()
          })
        })
        // fr.readAsText(f)
        fr.readAsDataURL(f)
        // fr.readAsBinaryString(f)
        // vm.xmlFiles.push(file) // needs to be inside callback if callback is used
      } else {
        console.log('File Undefined')
      }

      loadPromise.then(function () {
        vm.modelName = file.fileName
        vm.modelData = file.model
        // console.log('model data: ' + vm.modelData)
        // let model viewer load handler resetLoading
        //     vm.resetLoading()
        vm.errorAlert = false
      })
        .catch(function (err) {
          vm.resetLoading()
          vm.errorMsg = 'Error loading file: ' + err
          vm.errorAlert = true
          // Handle error
        })
    },
    loadExample (idx, fullNm) {

    }
  }
}
</script>

<style scoped>
  img {
    width: 240px;
  }
  h3 {
    color: #096ff4;
  }
  h4 {
    text-transform: uppercase;
  }
  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
    margin-bottom: -4px;
  }

</style>
