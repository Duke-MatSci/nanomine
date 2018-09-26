<template>
  <div class="nmeditor">
    <v-alert
      v-model="editorError"
      type="error"
      dismissible
    >
      {{editorErrorMsg}}
    </v-alert>
    <v-toolbar dark color="primary">
      <v-tooltip bottom v-if="canAddTab()">
        <v-btn icon slot="activator" v-on:click="addTabButton()">
          <v-icon>add_circle_outline</v-icon>
        </v-btn>
        <span>Open</span>
      </v-tooltip>

      <v-toolbar-title class="white--text">{{showFileName}}</v-toolbar-title>
      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="lockButton()">
          <v-icon>lock_open</v-icon>
        </v-btn>
        <span>Unlocked</span>
      </v-tooltip>

      <v-tooltip bottom v-if="hasPrevTab()">
        <v-btn icon slot="activator" v-on:click="prevTabButton()">
          <v-icon>skip_previous</v-icon>
        </v-btn>
        <span>Previous Tab</span>
      </v-tooltip>

      <v-tooltip bottom v-if="hasNextTab()">
        <v-btn icon slot="activator" v-on:click="nextTabButton()">
          <v-icon>skip_next</v-icon>
        </v-btn>
        <span>Next Tab</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator">
          <v-icon>change_history</v-icon>
        </v-btn>
        <span >File changed</span>
      </v-tooltip>

      <v-spacer></v-spacer>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="transformButton()">
          <v-icon>transform</v-icon>
        </v-btn>
        <span v-if="view=='xml'">Show Form View</span>
        <span v-if="view=='form'">Show XML View</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="saveButton()">
          <v-icon>save</v-icon>
        </v-btn>
        <span >Save</span>
      </v-tooltip>

      <!--v-tooltip bottom> !!! Disabled settings for now
        <v-btn icon slot="activator" v-on:click="settingsButton()">
          <v-icon>settings</v-icon>
        </v-btn>
        <span>Settings</span>
      </v-tooltip-->

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="searchButton()">
          <v-icon>find_in_page</v-icon>
        </v-btn>
        <span>Find In Editor</span>
      </v-tooltip>

      <!--<v-tooltip bottom>-->
      <!--<v-btn icon slot="activator" v-on:click="samplesButton()">-->
      <!--<v-icon>list</v-icon>-->
      <!--</v-btn>-->
      <!--<span>List data and schemas</span>-->
      <!--</v-tooltip>-->

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="infoButton()">
          <v-icon>info</v-icon>
        </v-btn>
        <span>Info</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="refreshButton()">
          <v-icon>refresh</v-icon>
        </v-btn>
        <span>Refresh</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="testButton()">
          <v-icon>more_vert</v-icon>
        </v-btn>
        <span>More</span>
      </v-tooltip>
    </v-toolbar>
    <v-dialog v-model="openOrCreateDialog" max-width="500px">
      <v-tabs
        v-model="active"
        color="light-blue"
        dark
        slider-color="red"
      >
        <v-tab
          v-for="n in 2"
          :key="n"
          ripple
        >
          {{ openOrCreateTabs[n-1] }}

        </v-tab>
        <v-tab-item
          v-for="n in 2"
          :key="n"
        >
          <v-card flat>
              <v-layout justify-center v-if="n==1"> <!-- open existing -->
                <v-flex xs10>
                  <v-form v-model="valid">
                    <v-text-field append-icon="search" @click:append="clickedOpenIdSearch()"
                      v-model="openID"
                      label="ID"
                      required
                    ></v-text-field>
                    <v-switch
                      :label="`Latest schema only? ${openLatestSchema?'Yes':'No'}`"
                      v-model="openLatestSchema"
                    ></v-switch>
                  </v-form>
                </v-flex>
              </v-layout>
              <v-layout v-if="n==2"> <!-- create new -->
                <v-flex>
                  Layout 2
                </v-flex>
              </v-layout>
          </v-card>
        </v-tab-item>
      </v-tabs>
      <v-card>
        <v-card-actions>
          <v-btn color="primary" flat @click="openOrCreateDialog=false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-layout row justify-center>
      <v-dialog v-model="saveMenuActive" max-width="150px">
          <v-list>
            <v-list-tile
              v-for="(item, idx) in saveMenu"
              :key="item"
              @click="fileButton(idx, $event)"
            >
              <v-list-tile-title v-text="item"></v-list-tile-title>
            </v-list-tile>
          </v-list>
      </v-dialog>
    </v-layout>

    <v-layout row justify-center>
      <v-dialog v-model="fileDialog" scrollable max-width="300px">
        <!--v-btn slot="activator" color="primary" dark>Open Dialog</v-btn-->
        <v-card>
          <v-card-title>Select File to Open</v-card-title>
          <v-divider></v-divider>
          <v-card-text style="height: 300px;">
            <v-radio-group v-model="fileDialogItem" column>
              <v-radio v-for="(item, idx) in fileDialogList"
                       :key="idx"
                       :label="item"
                       :value="idx"
                       v-on:change="fileDialogRadio (idx)"
              ></v-radio>
            </v-radio-group>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-btn color="blue darken-1" flat @click.native="fileDialog = false">Cancel</v-btn>
            <v-btn color="blue darken-1" flat @click.native="fileOpen()">Open</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-layout>
    <v-layout row justify-center>
      <v-dialog v-model="settingsDialog" persistent max-width="290">
        <!--v-btn slot="activator" color="primary" dark>Open Dialog</v-btn-->
        <v-card>
          <v-card-title class="headline">NanoMine Editor Settings</v-card-title>
          <v-card-text>Editor settings</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="green darken-1" flat @click.native="settingsDialog = false">Cancel</v-btn>
            <v-btn color="green darken-1" flat @click.native="settingsDialog = false">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-layout>
    <!--/><-->
    <v-container fluid justify-start fill-height>
      <!--img :src="imageUrl" height="150" v-if="imageUrl"/>
      <v-btn flat icon color="primary" @click.native='pickFile()'>
        <v-icon>attach_file</v-icon>
      </v-btn>
      <input
        type="file"
        style="display: none"
        ref="image"
        multiple
        accept=".zip, .xlsx,.xls, image/*"
        @change="onFilePicked"
      >
      <v-list>
        <v-list-tile
          v-for="(v, idx) in filesToUpload"
          :key="idx"
        >
          <v-list-tile-content>
            <v-list-tile-title v-text="v"></v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list-->
      <v-layout row wrap align-start fill-height>
        <v-flex fill-height xs12>
          <div id="editor" ref="editor"></div>
        </v-flex>
      </v-layout>
    </v-container>
    <!--/>Note: some help on vuetify file uploads: https://stackoverflow.com/questions/44989162/file-upload-in-vuetify<-->
  </div>
</template>

<script>
import {} from 'vuex'
import CodeMirror from '@/utils/codemirror'
import Axios from 'axios'
import vkbeautify from 'vkbeautify'

export default {
  name: 'Editor',
  data: function () {
    return {
      msg: '<untitled>',
      openOrCreateDialog: false,
      openOrCreateTabs: ['Open Existing', 'Create New'],
      openLatestSchema: true,
      openID: '',
      settingsDialog: false,
      editorError: false,
      editorErrorMsg: '',
      content: null,
      xml_text: '<PolymerNanocomposite>\n</PolymerNanocomposite>',
      view: 'xml',
      fileDialog: false,
      fileDialogItem: -1, // the value of the radio button selected
      fileDialogList: [], // list to use for radio button item names
      loadFile: false,
      saveMenuActive: false,
      saveMenu: [
        // 'Explore',
        'Publish',
        // 'Import',
        'Export'
      ],
      saveMenuOps: [
        // this.fileExplore,
        this.filePublish,
        // this.fileImport,
        this.fileExport
      ],
      dialog: false, // testing file upload
      filesToUpload: [], // testing
      imageUrl: '', //  testing
      imageFile: '' //  testing
    }
  },
  beforeDestroy: function () {
    let vm = this
    vm.$nextTick(function () {
      vm.$store.commit('setEditorInactive')
    })
  },
  mounted: function () {
    let vm = this
    vm.$nextTick(function () {
      vm.$store.commit('setEditorActive')
    })
    vm.content = CodeMirror(vm.$refs['editor'], {
      lineNumbers: true,
      mode: 'xml',
      autofocus: true,
      smartIndent: true,
      indentUnit: 1,
      matchTags: {
        bothTags: true
      },
      extraKeys: {
        'Ctrl-J': 'toMatchingTag',
        /* "Cmd-B": vm.beautify,
          "Ctrl-B": vm.beautify,
          "Cmd-Z": vm.undo,
          "Ctrl-Z": vm.undo,
          "Shift-Cmd-Z": vm.redo,
          "Shift-Ctrl-Z": vm.redo, */
        "'<'": vm.completeAfter,
        "'/'": vm.completeIfAfterLt,
        "' '": vm.completeIfInTag,
        "'='": vm.completeIfInTag
        // "Cmd-C": "autocomplete",
        // "Ctrl-C": "autocomplete"
      },
      hintOptions: {
        // schemaInfo: vm.state.xmlSchemaList
      },
      foldGutter: true,
      gutters: [
        'CodeMirror-linenumbers',
        'CodeMirror-foldgutter'
      ]

    })
    vm.refreshEditor()
  },
  computed: {
    showFileName: function () {
      let vm = this
      let fn = vm.$store.getters.editorFileName
      if (fn !== '<untitled>') {
        fn = fn.toUpperCase()
      }
      return (fn)
    }
  },
  methods: {
    log: function (msg) {
      window.console.log(msg)
    },
    clickedOpenIdSearch: function () {
      let vm = this
      vm.log('clicked ID')
      vm.openOrCreateDialog = false // close dialog box
      vm.setLoading()
      let url = '/nmr/templates/versions/select/allactive'
      setTimeout(function () {
        Axios.get(url)
          .then(function (response) {
            console.log(response)
            vm.$store.commit('addSchemas', response.data) // could allow this to be cached, but for now just get it done
            vm.resetLoading()
            vm.fileDialog = true
          })
          .catch(function (err) {
            vm.resetLoading()
            vm.editorErrorMsg = err
            vm.editorError = true
          })
      }, 2000)
    },
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    testButton: function () {
      let vm = this
      console.log(vm.msg + ' testButton() clicked')
      /*
      console.log('testButton() executes one of the sparql queries that is very similar to the one used by the original visualization pgm.')
      let url = '/nmr/test1'
      // let url = 'http://localhost:3000'
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response)
          if (response.data.head !== null) {
            vm.xml_text = JSON.stringify(response.data.results.bindings)
          }
          vm.refreshEditor()
          vm.resetLoading()
        })
        .catch(function (err) {
          vm.resetLoading()
          vm.fetchError = err
          console.log(err)
          // alert(err)
          vm.editorErrorMsg = err
          vm.editorError = true
        })
        */
    },
    test2Button: function () {
      let vm = this
      console.log(vm.msg + ' test2Button() clicked')
      /*
      let url = '/nmr/fullgraph'
      console.log('this code will load the entire triple store, so it's expensive!')
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response.data)
          console.log(response.data.results.bindings.length)
          // let x = []
          // response.data.results.bindings.forEach(function (v) {
          //   let sampleID = v.sample.value.split('/').pop()
          //   console.log(sampleID + ' ' + v.sample.value)
          //   sampleList.push({'uri': v.sample.value, 'id': sampleID})
          // })
          // vm.$store.commit('sampleList')
          setTimeout(function () {
            vm.resetLoading()
          }, 1000)
        })
        .catch(function (err) {
          vm.resetLoading()
          vm.fetchError = err
          console.log(err)
          vm.editorErrorMsg = err
          vm.editorError = true
        })
        */
    },
    showSaveMenu: function () {
      let vm = this
      return vm.saveMenuActive
    },
    saveButton: function () {
      let vm = this
      vm.saveMenuActive = true
    },
    settingsButton: function () {
      let vm = this
      vm.settingsDialog = true
    },
    transformButton: function () {
      let vm = this
      if (vm.view === 'xml') {
        vm.view = 'form'
      } else {
        vm.view = 'xml'
      }
    },
    infoButton: function () {
      let vm = this
      console.log(vm.msg + ' info button')
    },
    lockButton: function () {
      return false
    },
    // activateFileMenu: function (ev) {
    //   let vm = this
    //   console.log(ev.target.tagName + ' x: ' + ev.screenX + ' y: ' + ev.screenY)
    //   vm.showFileMenu = true
    // },
    canAddTab: function () {
      let vm = this
      let rv = false
      console.log(vm.msg + ' canAddTab()')
      let tabCount = vm.$store.getters.editorTabCount
      if (tabCount < 5) {
        rv = true
      }
      return rv
    },

    addTabButton: function () {
      this.openOrCreateDialog = true
    },
    fileButton: function (idx, ev) {
      let vm = this
      console.log('hi fileButton ' + idx + ' = ' + vm.saveMenu[idx])
      console.log(ev.target.tagName + ' x: ' + ev.screenX + ' y: ' + ev.screenY)
      vm.saveMenuActive = false
      vm.saveMenuOps[idx].apply(vm)
    },
    fileDialogRadio: function (idx) {
      console.log('idx: ' + idx)
    },
    fileOpen: function () {
      // should probably pass index
      let vm = this
      if (vm.fileDialogItem >= 0) {
        let fileNm = vm.fileDialogList[vm.fileDialogItem]
        console.log('opening ' + fileNm)
        vm.fileDialog = false
        vm.fileLoad(fileNm)
      } else {
        console.log('no file selected')
      }
    },
    fileLoad: function (fileNm) {
      let vm = this
      let url = '/nmr/sample/' + fileNm
      // load sample for now. Need more params to denote type
      console.log('load: ' + fileNm + ' from: ' + url)
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          vm.xml_text = vkbeautify.xml(response.data.data.xml, 1)
          vm.$store.commit('newEditorTab', {'name': fileNm, 'xmlText': vm.xml_text, 'schemaIndex': -1}) // no schema yet :(
          // console.log(tabNumber)
          vm.refreshEditor()
          vm.resetLoading()
        })
        .catch(function (err) {
          vm.fetchError = err
          console.log(err)
          // alert(err)
          vm.editorErrorMsg = err
          vm.editorError = true
          vm.resetLoading()
        })
    },

    fileSelectSchema: function () { // get the schema versions and select a schema
    },
    fileExplore: function () {
      let vm = this
      // let tvurl = '/nmr/templates/versions/select/all'
      // let tsurl = '/nmr/templates/select'
      let url = '/nmr/explore/select'
      console.log('fileExplore!')
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response.data)
          console.log(response.data.data.length)
          let sampleList = []
          // response.data.results.bindings.forEach(function (v) {
          //   let sampleID = v.sample.value.split('/').pop()
          //   console.log(sampleID + ' ' + v.sample.value)
          //   sampleList.push({'uri': v.sample.value, 'id': sampleID})
          // })
          vm.fileDialogList = []
          vm.fileDialogItem = -1 // by default set radio selections off
          response.data.data.forEach(function (v) {
            let sampleID = v.split('/').pop()
            console.log(sampleID + ' ' + v)
            sampleList.push({'uri': v, 'id': sampleID})
            vm.fileDialogList.push(sampleID)
          })
          // let a = ['dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy', 'dummy']
          // a.forEach(function (v, i) {
          //   vm.fileDialogList.push(v + i)
          // })
          vm.fileDialog = true
          vm.$store.commit('sampleList')
          vm.resetLoading()
        })
        .catch(function (err) {
          vm.fetchError = err
          console.log(err)
          // alert(err)
          vm.editorErrorMsg = err
          vm.editorError = true
          vm.resetLoading()
        })
    },
    filePublish: function () {
      let vm = this
      console.log('filePublish!')
      vm.setLoading()
      let url = '/nmr/xml'
      return Axios.post(url, {
        'filename': 'L217_S1_Ash_2002.xml',
        'filetype': 'sample',
        'xml': vm.getEditorContent()
      })
        .then(function (resp) {
          console.log('response: ' + JSON.stringify(resp))
          vm.resetLoading()
        })
        .catch(function (err) {
          console.log('error: ' + err)
          vm.resetLoading()
        })
    },
    fileImport: function () {
      console.log('fileImport!')
    },
    fileExport: function () {
      console.log('fileExport!')
    },
    searchButton: function () {
      console.log('Search button.')
    },
    refreshButton: function () {
      let vm = this
      vm.setLoading()
      console.log('refreshButton() pressed')
      setTimeout(function () {
        vm.resetLoading()
      }, 1000)
      /*
      let url = '/nmr'
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          vm.xml_text = vkbeautify.xml(response.data.xml, 1)
          vm.refreshEditor()
          setTimeout(function () {
            vm.resetLoading()
          }, 1000)
        })
        .catch(function (err) {
          vm.fetchError = err
          console.log(err)
          // alert(err)
          vm.editorErrorMsg = err
          vm.editorError = true
          vm.resetLoading()
        })
        */
    },
    getEditorContent: function () {
      // this is really not a good way to do this and is TEMPORARY! TODO
      let vm = this
      return vm.content.getValue()
    },
    refreshEditor: function () {
      let vm = this
      // let tabNumber = vm.$store.getters.currentEditorTab
      // if (tabNumber && typeof tabNumber === 'number' && tabNumber >= 0) {
      vm.content.setValue(vm.$store.getters.editorXmlText)
      // }
      // vm.content.setValue('<xml></xml>')
      vm.content.setSize('100%', '100%')
      setTimeout(function () { // this timeout is required. Otherwise the editor will not refresh properly.
        vm.content.refresh()
        vm.content.execCommand('goDocStart')
        vm.content.clearHistory()
      }, 0)
    },
    pickFile () {
      this.$refs.image.click()
    },

    onFilePicked: function (e) { // credit to stack overflow
      let vm = this
      const files = e.target.files
      if (files !== undefined) {
        for (let v = 0; v < files.length; ++v) {
          console.log('file selected: ' + files[v].name)
          vm.filesToUpload.push(files[v].name)
        }
        console.log(vm.filesToUpload)
        const fr = new FileReader()
        fr.readAsDataURL(files[0])
        fr.addEventListener('load', () => {
          vm.imageUrl = fr.result
          console.log(vm.imageUrl)
        })
      } else {
        vm.filesToUpload = []
      }
    },
    tabModified: function () {
      return true
    },
    hasNextTab: function () {
      let vm = this
      let rv = false
      console.log(vm.msg + ' hasNextTab()')
      let tabNumber = vm.$store.getters.currentEditorTab
      // if (tabNumber && typeof tabNumber === 'number' && tabNumber >= 0) {
      let tabCount = vm.$store.getters.editorTabCount
      if (tabNumber !== -1 && tabNumber < (tabCount - 1)) {
        rv = true
      }
      return rv
    },
    hasPrevTab: function () {
      let vm = this
      let rv = false
      console.log(vm.msg + ' hasPrevTab()')
      let tabNumber = vm.$store.getters.currentEditorTab
      // if (tabNumber && typeof tabNumber === 'number' && tabNumber >= 0) {
      let tabCount = vm.$store.getters.editorTabCount
      if (tabNumber !== -1 && tabNumber < tabCount) {
        rv = true
      }
      return rv
    },
    nextTabButton: function () {
      let vm = this
      console.log(vm.msg + ' nextTabButton()')
    },
    prevTabButton: function () {
      let vm = this
      console.log(vm.msg + ' prevTabButton()')
    },
    newEditorTab: function (isXsd, schemaId, title, filename) {
      // { schemaId: null, xmlTitle: null, isXsd: false }

    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .nmeditor {
    /* height: 100%; text-align: left; */
    /* position: relative;  need to ensure that app styles are loaded after codemirror styles -- which is not currently happening */
  }

  #editor {
    text-align: left;
    position: relative;
    height: 100%;
    max-height: 100%;
    padding-bottom: 32px;
  }

  .editor-save {
    font-size: 24px;
    display: inline-flex;
    vertical-align: bottom;
    padding-bottom: 2px;
  }

  h1 {
    text-transform: uppercase;
  }
</style>
