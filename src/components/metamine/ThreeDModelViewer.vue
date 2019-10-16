<template>
  <div class="threedmodelviewer">
    <h1>{{ msg }}</h1>
    <v-alert
      v-model="errorAlert"
      type="error"
    >
      {{errorMsg}}
    </v-alert>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <v-flex d-flex xs12>
          <v-layout row wrap>
            <v-flex d-flex xs12>
              <model-stl width="400" height="400" :src="modelData"></model-stl>
            </v-flex>
            <v-flex d-flex xs12 v-if="modelName.length > 0">
              Model Name: {{modelName}}
            </v-flex>
          </v-layout>
        </v-flex>
        <v-flex d-flex xs2>
          <div class="text-xs-left">Select an STL file to view
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
    </v-container>
  </div>
</template>

<script>
import { ModelStl } from 'vue-3d-model'
export default {
  name: 'ThreeDModelViewer',
  components: { ModelStl },
  data () {
    return {
      msg: '3D Model Viewer',
      modelData: null,
      modelName: ''
    }
  },
  methods: {
    getModelData () {
      return this.modelData
    },
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    selectFile () {
      let vm = this
      vm.$refs.stlfilebrowser.click()
    },
    onFileSelected (e) {
      let vm = this
      vm.setLoading()
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
        console.log('model data: ' + vm.modelData)
        vm.resetLoading()
        vm.errorAlert = false
      })
        .catch(function (err) {
          vm.resetLoading()
          vm.errorMsg = 'Error loading file: ' + err
          vm.errorAlert = true
          // Handle error
        })
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
  }

</style>
