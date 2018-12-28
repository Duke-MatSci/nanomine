<!-- NOTE NOTE NOTE - WARNING
  Work on the editor was halted and the editor(online curation) was removed from the Vue router.
  The code is in a very inconsistent state and would need quite a bit of work before it would be useful.
  The code is here in case work ever resumes.
-->
<template>
  <div class="nmeditor" v-if="showEditor()">
    <v-alert
      v-model="editorError"
      type="error"
      dismissible
    >
      {{editorErrorMsg}}
    </v-alert>
    <v-alert
      v-model="editorValidated"
      type="success"
      dismissible
    >
      {{editorValidatedMsg}}
    </v-alert>
    <v-toolbar dark color="secondary" class="editor-toolbar">
      <v-tooltip bottom v-if="canAddTab()">
        <v-btn dark color="primary" slot="activator" v-on:click="addTabButton()">Open ...
          <!--v-icon>add_circle_outline</v-icon-->
        </v-btn>
        <span>Open</span>
      </v-tooltip>

      <v-toolbar-title class="white--text">Curating: {{showFileName}} {{editorSchemaName}}</v-toolbar-title>
      <!--ADD BACK LATER v-tooltip bottom>
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
        <span>File changed</span>
      </v-tooltip-->

      <v-spacer></v-spacer>

      <v-tooltip bottom>
        <v-btn slot="activator" dark color="primary" v-on:click="transformButton()">
          <!--v-icon>transform</v-icon-->
          <span v-if="view=='xml'">Show Form</span>
          <span v-if="view=='form'">Show XML</span>
        </v-btn>
        <span v-if="view=='xml'">Show Form View</span>
        <span v-if="view=='form'">Show XML View</span>
      </v-tooltip>
      <!--v-tooltip bottom>
        <v-btn  slot="activator" dark color="primary" v-on:click="validateButton()">Validate
        </v-btn>
        <span>Validate</span>
      </v-tooltip-->

      <v-tooltip bottom>
        <v-btn  slot="activator" dark color="primary" v-on:click="saveButton()">Save ...
          <!--v-icon>save</v-icon-->
        </v-btn>
        <span>Save</span>
      </v-tooltip>

      <!--v-tooltip bottom> !!! Disabled for now ADD BACK LATER
        <v-btn icon slot="activator" v-on:click="settingsButton()">
          <v-icon>settings</v-icon>
        </v-btn>
        <span>Settings</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="searchButton()">
          <v-icon>find_in_page</v-icon>
        </v-btn>
        <span>Find In Editor</span>
      </v-tooltip>

      <v-tooltip bottom>
      <v-btn icon slot="activator" v-on:click="samplesButton()">
      <v-icon>list</v-icon>
      </v-btn>
      <span>List data and schemas</span>
      </v-tooltip>

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
      </v-tooltip-->
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
      <v-dialog v-model="fileDialog" scrollable width="500">
        <!--v-layout row>
          <v-flex xs12-->
        <v-card>
          <v-card-title class="file-open-header">Open ...</v-card-title>
          <v-card-title>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="fileDialogSearch"
              append-icon="search"
              label="Filter by title or schema"
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-data-table :headers="fileDialogHeaders" :items="fileDialogList" :search="fileDialogSearch">
            <v-divider></v-divider>
            <template slot="items" slot-scope="props" height="300">
              <td class="text-xs-left"
                  v-on:click="fileDialogClick(props.item.name, props.item.schemaId, props.item.xmlText)">
                {{props.item.name}}
              </td>
              <td class="text-xs-left"
                  v-on:click="fileDialogClick(props.item.name, props.item.schemaId, props.item.xmlText)">
                {{props.item.schema}}
              </td>
            </template>
            <v-alert slot="no-results" :value="true" color="error" icon="warning">
              Your search for "{{ fileDialogSearch }}" found no results.
            </v-alert>
          </v-data-table>
          <v-divider></v-divider>
          <v-card-actions class="file-open-footer">
            <v-btn color="primary" @click.native="fileDialog = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
        <!--/v-flex>
      </v-layout-->
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
    <v-container fluid class="info-window" v-if="showInfo()">
      <v-layout row wrap align-start >
        <v-flex xs12 fill-width>INFO!!!</v-flex>
      </v-layout>
    </v-container>
    <v-container  fluid  class="search-window" v-if="showSearch()">
      <v-layout row wrap>
        <v-flex xs12>Search line 1</v-flex>
        <v-flex xs12>Search line 2</v-flex>
        <v-flex xs12>Search line 3</v-flex>
        <v-flex xs12>Search line 4</v-flex>
      </v-layout>
    </v-container>
    <v-container v-bind:style="{'display': xmlInView}" fluid justify-start fill-height>
      <v-layout row wrap align-start fill-height>
        <v-flex fill-height xs12>
          <div id="editor" ref="editor"></div>
        </v-flex>
      </v-layout>
    </v-container>
    <v-container v-bind:style="{'display': formInView}" fluid justify-start fill-height>
      <v-layout row wrap align-start fill-height>
        <v-flex fill-height xs12 align-start justify-start>
          <div id="feditor" ref="feditor">
            <div>
              <tree-view style="text-align: left;" :data="jsonSource" @change-data="treeViewUpdated"
                         :options="{maxDepth: 99, rootObjectKey: 'PolymerNanocomposite', modifiable: true}"></tree-view>
            </div>
          </div>
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
import * as jxParser from 'fast-xml-parser'
import * as xmljs from 'xml-js'

export default {
  name: 'Editor',
  data: function () {
    return {
      msg: '<untitled>',
      jsonSource: {'PolymerNanocomposite': {}},
      openOrCreateDialog: false,
      openOrCreateTabs: ['Open Existing', 'Create New'],
      openLatestSchema: true,
      openID: '',
      settingsDialog: false,
      editorError: false,
      editorErrorMsg: '',
      editorValidated: false,
      editorValidatedMsg: '',
      content: null,
      xml_text: '<PolymerNanocomposite>\n</PolymerNanocomposite>',
      view: 'form',
      fileDialogSearch: '',
      fileDialogHeaders: [
        {text: 'Title', align: 'left', value: 'name'},
        {text: 'Schema', align: 'left', value: 'schema'}
      ],
      fileDialog: false,
      fileDialogItem: -1, // the value of the radio button selected
      fileDialogList: [], // list to use for open item names
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
        'Cmd-B': vm.beautify,
        'Ctrl-B': vm.beautify,
        /* "Cmd-Z": vm.undo,
                "Ctrl-Z": vm.undo,
                "Shift-Cmd-Z": vm.redo,
                "Shift-Ctrl-Z": vm.redo, */
        '\'<\'': vm.completeAfter,
        '\'/\'': vm.completeIfAfterLt,
        '\' \'': vm.completeIfInTag,
        '\'=\'': vm.completeIfInTag
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
    CodeMirror.autoLoadHelperStylesheet(vm.content, 'fold', 'foldgutter')
    CodeMirror.autoLoadHelperStylesheet(vm.content, 'hint', 'show-hint')
    CodeMirror.autoLoadHelper(vm.content, 'fold', 'foldcode')
    CodeMirror.autoLoadHelper(vm.content, 'fold', 'foldgutter')
    CodeMirror.autoLoadHelper(vm.content, 'fold', 'xml-fold')
    CodeMirror.autoLoadHelper(vm.content, 'edit', 'matchtags')
    CodeMirror.autoLoadHelper(vm.content, 'hint', 'show-hint')
    CodeMirror.autoLoadHelper(vm.content, 'hint', 'xml-hint')
    CodeMirror.autoLoadMode(vm.content, 'xml')

    vm.refreshEditor()
    vm.refreshForm()
    vm.content.on('changes', function (cm, changes) {
      vm.xmlEditorOnChanges(cm, changes)
    })
    vm.content.on('blur', function (cm, event) {
      vm.xmlEditorOnBlur(cm, event)
    })
  },
  computed: {
    formInView: function () {
      let vm = this
      let rv = 'none'
      if (vm.view === 'form') {
        rv = 'flex'
      }
      return rv
    },
    xmlInView: function () {
      let vm = this
      let rv = 'none'
      if (vm.view === 'xml') {
        rv = 'flex'
      }
      return rv
    },
    showFileName: function () {
      let vm = this
      let fn = vm.$store.getters.editorFileName
      if (fn !== '<untitled>') {
        fn = fn.toUpperCase()
      }
      return fn
    },
    editorSchemaName: function () {
      let vm = this
      let rv = ''
      let schemaName = vm.$store.getters.editorSchemaName
      if (schemaName && schemaName.length > 0) {
        rv = ' (schema: ' + schemaName + ')'
      }
      return rv
    }
  },
  methods: {
    showEditor: function () {
      return false
    },
    log: function (msg) {
      window.console.log(msg)
    },
    showSearch: function () {
      return false
    },
    showInfo: function () {
      return false
    },
    xmlEditorOnChanges: function (cm, changes) {
      // let vm = this
      // console.log('xmleditor on change: store the editor data into the central storage. WELL, NO. Probably BLUR instead.')
    },
    xmlEditorOnBlur: function (cm, event) {
      let vm = this
      console.log('xmleditor on blur: store the editor data into the central storage...')
      console.log(event)
      let ec = vm.content.getValue()
      vm.$store.commit('editorUpdateXml', ec)
      setTimeout(vm.refreshForm(), 0) // let commit finish storing before the refresh tries to obtain data
    },
    fileDialogClick: function (name, schemaId, xmlText) {
      let vm = this
      console.log('fileDialogClick name: ' + name + ' schemaId: ' + schemaId)
      vm.$store.commit('newEditorTab', {'name': name, 'xmlText': vkbeautify.xml(xmlText, 1), 'schemaId': schemaId}) // no schema yet :(
      // console.log(tabNumber)
      // if default is XML vm.refreshEditor()
      // default is form
      // vm.jsonSource = jxParser.parse(xmlText)
      vm.jsonSource = xmljs.xml2js(xmlText)
      // console.log(vm.jsonSource)
      setTimeout(function () {
        let vals = document.getElementsByClassName('tree-view-item-value')
        // console.log('transform: found ' + vals.length + ' input elements.')
        for (let i = 0; i < vals.length; ++i) { // can't use forEach on dom nodes
          vals[i].setAttribute('size', '240')
        }
      }, 500) // vm.$nextTick was not sufficient for some reason

      vm.fileDialog = false
    },
    // validateButton: function () {
    //   let vm = this
    //   // let xml = vm.$store.getters.editorXmlText
    //   // let xsd = vm.$store.getters.editorSchemaText
    //   let errors = null
    //   if (errors) {
    //     vm.editorError = true
    //     vm.editorErrorMsg = JSON.stringify(errors)
    //   } else {
    //     vm.editorValidated = true
    //     vm.editorValidatedMsg = 'Validation Successful'
    //   }
    // },
    clickedOpenIdSearch: function () {
      let vm = this
      vm.log('clicked ID')
      vm.openOrCreateDialog = false // close dialog box
      vm.setLoading()
      let xsdUrl = '/nmr/templates/versions/select/allactive'
      let xmlUrl = '/nmr/explore/select'
      vm.fileDialogList = []
      setTimeout(function () {
        Axios.get(xsdUrl)
          .then(function (response) {
            console.log(response)
            // let j2xOptions = {
            //   attributeNamePrefix: '@_',
            //   attrNodeName: 'attr', // default is 'false'
            //   textNodeName: '#text',
            //   ignoreAttributes: false,
            //   ignoreNameSpace: false,
            //   allowBooleanAttributes: false,
            //   parseNodeValue: true,
            //   parseAttributeValue: true,
            //   trimValues: true,
            //   cdataTagName: '__cdata', // default is 'false'
            //   cdataPositionChar: '\\c',
            //   localeRange: '', // To support non english character in tag/attribute values.
            //   parseTrueNumberOnly: false
            //   // attrValueProcessor: a => he.decode(a, {isAttributeValue: true}),//default is a=>a
            //   // tagValueProcessor : a => he.decode(a) //default is a=>a
            // }
            response.data.data.forEach(function (v, idx) {
              // response.data.data[idx].currentRef[0].contentJson = jxParser.parse(response.data.data[idx].currentRef[0].content, j2xOptions)
              response.data.data[idx].currentRef[0].contentJson = xmljs.xml2js(response.data.data[idx].currentRef[0].content, {})
              console.log(JSON.stringify(response.data.data[idx].currentRef[0].contentJson))
            })
            vm.$store.commit('addSchemas', response.data.data) // could allow this to be cached, but for now just get it done
            // NOTE: store is not updated until next tick, so continue to use request.data.data in this method :(
            let criteria = '/' + vm.openID + '/'
            console.log('vm.openID: ' + vm.openID)
            let schemas = []
            if (vm.openLatestSchema) { // TODO -- see todo in store/index.js method editorLatestSchemaId
              // let latestSchemaId = vm.$store.getters.editorLatestSchemaId
              // if (latestSchemaId) {
              //   schemas.push(vm.$store.getters.editorLatestSchemaId)
              // }
              schemas.push({
                'id': response.data.data[0].currentRef[0]._id,
                'title': response.data.data[0].currentRef[0].title
              })
            } else {
              // schemas = vm.$store.getters.editorSchemaIds
              response.data.data.forEach(function (v) {
                schemas.push({'id': v.currentRef[0]._id, 'title': v.currentRef[0].title})
              })
            }
            let params = {'params': {'title': criteria}}
            if (schemas.length > 0) {
              let s = []
              schemas.forEach(function (v) {
                s.push(v.id)
              })
              let ss = s.join(',')
              console.log('schemas: ' + JSON.stringify(ss))
              params = {'params': {'title': criteria, 'schemas': ss}}
              console.log('params: ' + JSON.stringify(params))
            }
            Axios.get(xmlUrl, params)
              .then(function (response) {
                console.log(response)
                response.data.data.forEach(function (v) {
                  v.id = v.title.replace('.xml', '')
                  v.xmlText = v.content
                  schemas.forEach(function (s) {
                    if (s.id === v.schema) {
                      v.schemaName = s.title
                      v.schemaId = s.id
                    }
                  })
                  vm.fileDialogList.push({
                    'value': false,
                    'name': v.id,
                    'schema': v.schemaName,
                    'schemaId': v.schemaId,
                    'xmlText': v.xmlText
                  })
                })
                vm.resetLoading()
                vm.fileDialog = true
              })
              .catch(function (err) {
                vm.resetLoading()
                vm.editorErrorMsg = err
                vm.editorError = true
              })
          })
          .catch(function (err) {
            vm.resetLoading()
            vm.editorErrorMsg = err
            vm.editorError = true
          })
      }, 500)
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
    },
    test2Button: function () {
      let vm = this
      console.log(vm.msg + ' test2Button() clicked')
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
    treeViewUpdated: function (data) {
      let vm = this
      let Parser = jxParser.j2xParser
      let parser = new Parser()
      let newXml = parser.parse(data)
      // console.log(newXml)
      vm.$store.commit('editorUpdateXml', newXml)
    },
    transformButton: function () {
      let vm = this
      if (vm.view === 'xml') {
        // let ec = vm.getEditorContent()
        vm.refreshForm()
        vm.view = 'form'
      } else {
        vm.view = 'xml'
        vm.refreshEditor()
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
    fileOpen: function () { // TODO this function will not be used -- remove
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
    fileLoad: function (fileNm) { // TODO this function will not be used -- remove after extracting some behavior i.e. refactor
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
      let url = '/nmr/curate'
      let title = vm.$store.getters.editorFileName // TODO inconsistency in naming. In the xmldata collection it is 'title'
      title += '.xml' // TODO fix this since title in mongo has .xml, but the code is not saving that internally.
      let schemaId = vm.$store.getters.editorSchemaId
      let content = vm.$store.getters.editorXmlText
      let curatedDataState = 'editedNotValid' // for now, since validation is not done
      console.log('filePublish - title: ' + title + ' schemaId: ' + schemaId + ' content length: ' + content.length + ' curatedDataState: ' + curatedDataState)
      return Axios.post(url, {
        'title': title,
        'schemaId': schemaId,
        'content': vkbeautify.xmlmin(content),
        'curatedDataState': curatedDataState
      })
        .then(function (resp) {
          console.log('response: ' + JSON.stringify(resp))
          if (resp.error) {
            vm.editorError = true
            vm.editorErrorMsg = resp.error
          }
          vm.resetLoading()
        })
        .catch(function (err) {
          console.log('error: ' + err)
          vm.editorError = true
          vm.editorErrorMsg = '' + err
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
    },
    getEditorContent: function () {
      // this is really not a good way to do this and is TEMPORARY! TODO
      let vm = this
      return vm.content.getValue()
    },
    refreshForm: function () {
      let vm = this
      let xml = vkbeautify.xml(vm.$store.getters.editorXmlText, 1)
      // console.log('refreshForm xml: ' + xml)
      // vm.jsonSource = jxParser.parse(xml) // always returns a valid xml value (default if none opened)
      vm.jsonSource = xmljs.xml2js(xml, {'compact': true})
      console.log(vm.jsonSource)
      setTimeout(function () {
        let vals = document.getElementsByClassName('tree-view-item-value')
        // console.log('transform: found ' + vals.length + ' input elements.')
        for (let i = 0; i < vals.length; ++i) { // can't use forEach on dom nodes
          vals[i].setAttribute('size', '240')
        }
      }, 500) // vm.$nextTick was not sufficient for some reason
    },
    refreshEditor: function (newCursorPos) {
      let vm = this
      // let tabNumber = vm.$store.getters.currentEditorTab
      // if (tabNumber && typeof tabNumber === 'number' && tabNumber >= 0) {
      let xmlText = vkbeautify.xml(vm.$store.getters.editorXmlText, 1)
      vm.content.setValue(xmlText)
      // }
      // vm.content.setValue('<xml></xml>')
      vm.content.setSize('100%', '100%')
      setTimeout(function () { // this timeout is required. Otherwise the editor will not refresh properly.
        vm.content.refresh()
        vm.content.execCommand('goDocStart')
        vm.content.clearHistory()
        if (newCursorPos) {
          setTimeout(function () {
            vm.content.setCursor(newCursorPos)
          }, 0)
        }
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

    },
    createXmlModeSchema: function (schema) { // TODO fix schema
      // The xmlmode schema is required by the xml hint code to allow hinting
      //   for xml entry.
      let vm = this
      let xmlList = {}

      function buildListFromTree (xmlList, srcElem) {
        xmlList[srcElem.name] = {
          attrs: null,
          children: []
        } // default to leaf
        srcElem.elements.forEach(function (v) { // if there are elements, then fill in children
          xmlList[srcElem.name].children.push(v.name)
          buildListFromTree(xmlList, v)
        })
      }
      // $.when schema loaded
      if (this === false) {
        console.log(schema)
        // only handling tip of tree - no siblings allowed
        var root = schema.originatingRoot.elements[0]
        xmlList['!top'] = [root.name]
        xmlList['!attrs'] = null
        // load the tree using the names of the elements as keys
        let srcElem = root
        buildListFromTree(xmlList, srcElem)
        vm.state.xmlSchemaList = xmlList
      }
    },
    beautify: function () {
      let vm = this
      console.log('Beautify!')
      let xmlContent = vm.content.getValue()
      let savePos = vm.content.getCursor()
      vm.$store.commit('editorUpdateXml', xmlContent)
      setTimeout(function () {
        vm.refreshEditor(savePos)
      }, 0)
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
  .editor-toolbar {
    padding-top: 10px;
  }
  .editor-save {
    font-size: 24px;
    display: inline-flex;
    vertical-align: bottom;
    padding-bottom: 2px;
  }
  .info-window {
    background-color: #cde0ff;
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 5px;
    padding-bottom: 5px;
  }
  .search-window {
    background-color: #dffffd;
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 5px;
    padding-bottom: 5px;
  }
  .file-open-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }

  .file-open-footer {
    background-color: #03A9F4;
    color: #000000;
    font-size: 22px;
    font-weight: bold;
  }

  h1 {
    text-transform: uppercase;
  }
</style>
