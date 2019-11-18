<template>
  <v-flex class="model-viewer" ref="pageContent">
  <h1>{{ msg }}</h1>
    <v-alert
      v-model="errorAlert"
      type="error"
      dismissible
    >
      {{errorMsg}}
    </v-alert>
    <v-alert
      v-model="infoAlert"
      type="info"
      dismissible
    >
      {{infoMsg}}
    </v-alert>
    <v-container>
    <v-layout
      text-center
      wrap
    >
      <v-flex d-flex xs12>
        <span @click="selectFile" class="text-xs-center headline font-weight-bold">Drag an OBJ, STL or VTP model file here or <span class="font-italic link">click</span> to browse models on file system.
          <input
            type="file"
            style="display: none"
            :accept="allowableExtensions().join(',')"
            ref="filebrowser"
            @change="onFileSelected"
          >
        </span>
      </v-flex>
      <v-flex xs12 class="text-xs-center headline" v-if="modelName.length > 0">Model: {{modelName}}</v-flex>
      <v-flex d-flex xs12 class="examples subheading">
        <v-flex xs2>
          A few example models to download and try:
          <span v-for="(item, idx) in exampleModels" v-bind:key="item">
            <br/><a :href="getExampleUrl(idx)">Example #{{idx+1}}</a>
          </span>
        </v-flex>
        <v-flex d-flex xs8 style="width:100%; height:100%;min-height: 300px" ref="modelView">
          <div style="background-color: rgb(250, 250, 250)"></div>
        </v-flex>
        <v-flex d-flex xs2></v-flex>
      </v-flex>
      <v-hover>
        <v-flex @click="meshio" d-flex xs12 slot-scope="{ hover }" :class="`${hover ? 'text-black link': 'text-primary'}`"><span class="text-xs-center  subheading font-weight-medium ">Convert from other model file types such as MSH or VTK using a conversion tool like meshio.</span></v-flex>
      </v-hover>
      <a style="display: none;" href="https://pypi.org/project/meshio/" target="_blank" ref="meshiolink"/>
    </v-layout>
  </v-container>
  </v-flex>
</template>

<script>

export default {
  name: 'ModelViewer',
  data () {
    return {
      msg: '3D Model Viewer',
      infoAlert: false,
      infoMsg: '',
      errorAlert: false,
      errorMsg: '',
      modelView: null,
      modelName: '',
      modelBackground: [0.9, 0.9, 0.9],
      exampleModels: [
        'latTrunCube_4921.stl',
        'tpbsDD1_20.stl'
      ]
    }
  },
  mounted () {
    let vm = this
    /* eslint-disable-next-line */
    console.log('ModelViewer mounted')
    let events = ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop']
    events.forEach(function (evt) {
      vm.$refs.pageContent.addEventListener(evt, function (e) {
        e.preventDefault()
        e.stopPropagation()
      }, false)
    })
    vm.$refs.pageContent.addEventListener('drop', function (e) {
      // for (let i = 0; i < e.dataTransfer.files.length; i++) {
      //   vm.files.push(e.dataTransfer.files[i])
      // }
      if (e.dataTransfer.files.length > 0) {
        let f = e.dataTransfer.files[0]
        vm.handleFileDrop(f)
        console.log(JSON.stringify(f) + ' ' + f.name)
      }
      if (e.dataTransfer.files.length > 1) {
        vm.infoMsg = 'Please select only 1 model at a time'
        vm.infoAlert = true
      }
    })
  },
  methods: {
    getExampleUrl (idx) {
      let vm = this
      return 'https://materialsmine.org/nmf/' + vm.exampleModels[idx]
    },
    allowableExtensions () {
      return ['.obj', '.stl', '.vtp']
    },
    selectFile () {
      let vm = this
      vm.$refs.filebrowser.click()
    },
    handleFileDrop (file) {
      let vm = this
      const ext = file.name.split('.').slice(-1)[0]
      console.log('drop: ' + JSON.stringify(file) + ' ' + file.name + ' ext: ' + ext)
      if (vm.allowableExtensions().includes('.' + ext)) {
        vm.doLoadModel(vm.$refs.modelView, {file: file, ext: ext, bgColor: vm.modelBackground})
      } else {
        vm.errorAlert = true
        vm.errorMsg = 'Only files with extensions like ' + vm.allowableExtensions().join(',') + ' are accepted.'
      }
    },
    meshio () {
      let vm = this
      console.log('clicky meshio')
      vm.$refs.meshiolink.click()
    },
    // NOTE: use meshio to convert VTK and MSH (gmsh) files to OBJ for viewing
    doLoadModel (container, options) {
      let vm = this
      vm.modelName = options.file.name
      console.log('loading: ' + vm.modelName + ' started: ' + Date.now())
      window.mmModelViewers.loadModel(container, options)
      console.log('loading: ' + vm.modelName + ' completed: ' + Date.now())
    },
    onFileSelected (e) {
      let vm = this
      const files = e.target.files
      if (files.length === 1) {
        const ext = files[0].name.split('.').slice(-1)[0]
        vm.doLoadModel(vm.$refs.modelView, {file: files[0], ext: ext, bgColor: vm.modelBackground})
      }
    }
  }
}
</script>
<style scoped>
  .text-black {
    color: #000000;
  }
  .text-primary {
    color: #1f68fc;
  }
  .link {
    text-decoration: underline;
  }
  .examples {
    margin-top: 15px;
  }
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
