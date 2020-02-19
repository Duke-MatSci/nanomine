<template>
  <v-flex class="mypage">

    <h1>{{ msg }}</h1>
    <v-container grid-list-xl>
      <v-alert
        v-model="myPageError"
        type="error"
        dismissible
      >
        {{myPageErrorMsg}}
      </v-alert>
      <!--

         Admin functions

      -->
      <v-layout row wrap>
        <!--v-flex xs4 v-show="isAdmin()" v-on:click="$router.push('/admin')"-->
        <v-card v-show="isAdmin()" style="width:100%;">
          <v-card-title class="admin-header"><span style="width:50%;" class="text-xs-left">
           <v-btn
             fab small
             color="primary"
             class="white--text"
             @click="toggleShowAdmin()"
           >
           <v-icon light v-if="showAdmin">expand_more</v-icon>
           <v-icon light v-else>expand_less</v-icon>
           </v-btn>
            Administrative Functions
          </span>
          </v-card-title>
          <span v-show="showAdmin">
          <div class="sect-divider"></div>
          <h5 class="text-xs-left">
           <v-btn
             small left flat light
             color="primary"
             class="white--text"
             @click="toggleShowSchemaMgt()"
           >
           <v-icon light v-if="showSchemaMgt">expand_more</v-icon>
           <v-icon light v-else>expand_less</v-icon>
           </v-btn>Schema Management ...</h5>
            <v-alert
              v-model="schemaSuccess"
              type="success"
              dismissible
            >
            {{schemaSuccessMsg}}
            </v-alert>
            <v-alert
              v-model="schemaError"
              type="error"
              dismissible
            >
            {{schemaErrorMsg}}
            </v-alert>
            <v-layout row wrap justify-center v-if="showSchemaMgt">
              <v-card flat>
                <v-card-text class="title font-weight-light">Upload Schema</v-card-text>
                <v-divider/>
                <v-btn class="text-xs-left" small color="primary" @click='selectSchemaFile'>Browse</v-btn>
                <input
                  type="file"
                  style="display: none"
                  accept=".xsd"
                  ref="schemaFileRef"
                  @change="onSchemaSelected"
                >
                <v-btn v-if="schemaFileName && schemaFileName.length > 0" class="text-xs-left" small color="primary"
                       @click="doSchemaUpload()">Upload</v-btn>

                <v-card-text v-if="schemaFileName && schemaFileName.length > 0" class="body">Selected: {{schemaFileName}}</v-card-text>
              </v-card>
            </v-layout>
          <div class="sect-divider"></div>
          <h5 class="text-xs-left">
            <v-btn
              small left flat light
              color="primary"
              class="white--text"
              @click="toggleShowBecomeUser()"
            >
           <v-icon light v-if="showBecomeUser">expand_more</v-icon>
           <v-icon light v-else>expand_less</v-icon>
           </v-btn>Become User ...</h5>
          <v-data-table v-if="showBecomeUser"
                        v-model="userselected"
                        :headers="userheaders"
                        :items="users"
                        :pagination.sync="userpagination"
                        select-all
                        item-key="userid"
                        class="elevation-1"
          >
            <template slot="headers" slot-scope="props">
              <tr>
                <th>
                  <v-checkbox
                    :indeterminate="getUserIndeterminate()"
                    primary
                    hide-details
                    @click="usersToggle"
                  ></v-checkbox>
                </th>

                <th
                  v-for="header in props.headers"
                  :key="header.text"
                  :class="['text-xs-right column sortable', userpagination.descending ? 'desc' : 'asc', header.value === userpagination.sortBy ? 'active' : '']"
                  @click="usersChangeSort(header.value)"
                >
                  <v-icon small>arrow_upward</v-icon>
                  {{ header.text }}
                </th>
              </tr>
            </template>
            <template slot="items" slot-scope="props">
              <td :active="props.item.selected" @click="props.item.selected = !props.item.selected">
                <v-checkbox
                  v-model="props.item.selected"
                  primary
                  hide-details
                  @click="userSelect(props.item.userid)"
                ></v-checkbox>
              </td>
              <td class="text-xs-right">{{ props.item.userid }}</td>
              <td class="text-xs-right">{{ props.item.displayName }}</td>
              <td class="text-xs-right">{{ props.item.email }}</td>
            </template>
          </v-data-table>
            </span>
          <p class="warn-red" v-show="auth.getRunAsUser() !== null">
            Running as {{auth.getRunAsUser()}} for Curate functions, otherwise running as {{auth.getGivenName()}}
          </p>
          <p class="warning">
            You have administrative privileges. Be careful.
          </p>
        </v-card>
        <div class="sect-divider"></div>
        <!--
           Select schema
        -->
        <!--v-card style="width:100%">
          <v-card-title class="dataset-header"><span style="width:40%;" class="text-xs-left">
          <v-combobox single-line dense
            v-model="selectedSchemaTitle"
            @change="onSchemaComboChanged()"
            :items="schemaTitles"
            label="Using latest schema - click to change"
            default="{{firstSchemaTitle}}"
          ></v-combobox>
          </span>
          </v-card-title>
        </v-card-->
        <!--

           Dataset Selection

        -->
        <v-card style="width:100%;">
          <v-card-title class="dataset-header">
            <span class="text-xs-left">
            <v-btn
              fab small
              color="primary"
              class="white--text"
              @click="toggleDatasetHide"
            >
             <v-icon light v-if="!datasetHideSelector">expand_more</v-icon>
             <v-icon light v-else>expand_less</v-icon>
            </v-btn>
            <v-btn
              v-if="isLoggedIn()"
              fab small
              color="primary"
              class="white--text"
              @click="addDataset"
            ><v-icon>library_add</v-icon></v-btn>
            <v-btn
              v-if="datasetsHeaderInfoIcon"
              fab small
              color="primary"
              class="white--text"
              @click="datasetInfoDialog()"
            >
              <v-icon>info</v-icon>
            </v-btn>
            {{datasetsHeaderTitle}}</span>
            <v-spacer></v-spacer>
            <span class="text-xs-right" style="width:50%;"
                  v-show="datasetSelected !== null">{{headerDOI}}</span>
          </v-card-title>
          <v-card-title v-show="!datasetHideSelector">
            <!--v-btn v-on:click="mineOnly()"><span v-show="showMineOnly">Show All</span><span v-show="!showMineOnly">Mine Only</span></v-btn-->
            <v-checkbox
              v-if="isLoggedIn()"
              v-model="showMineOnly"
              primary
              hide-details
              label="Show mine only"
            ></v-checkbox>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="datasetSearch"
              append-icon="search"
              label="Filter datasets"
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-data-table v-show="!datasetHideSelector" :headers="datasetHeaders" :items="datasetsFiltered"
                        :search="datasetSearch">
            <v-divider></v-divider>
            <template slot="items" slot-scope="props" height="300">
              <td class="text-xs-left"
                  v-on:click="datasetClick(props.item)">
                {{props.item.seq}}
              </td>
              <td class="text-xs-left"
                  v-on:click="datasetClick(props.item)">
                {{props.item.doi}}
              </td>
              <td class="text-xs-left"
                  v-on:click="datasetClick(props.item)">
                {{props.item.title}}
              </td>
              <td class="text-xs-left"
                  v-on:click="datasetClick(props.item)">
                {{props.item.datasetComment}}
              </td>
            </template>
            <v-alert slot="no-results" :value="true" color="error" icon="warning">
              Your search for "{{ datasetSearch }}" found no results.
            </v-alert>
          </v-data-table>
        </v-card>
        <div class="sect-divider"></div>
        <!--

           Fileset Selection

        -->
        <v-card style="width:100%;" v-show="datasetSelected !== null">
          <v-card-title class="filesets-header"><span style="width:50%;" class="text-xs-left">
            <v-btn
              fab small
              color="primary"
              class="white--text"
              @click="toggleFilesetsHide"
            >
            <v-icon light v-if="!filesetsHideSelector">expand_more</v-icon>
            <v-icon light v-else>expand_less</v-icon>

           </v-btn>{{filesetsHeaderTitle}}</span>
            <span class="text-xs-right" style="width:50%;" v-show="filesetSelected !== null">
             <!--v-btn v-if="datasetSelected && datasetSelected.filesets.length > 0"
                    fab small
                    color="primary"
                    class="white--text"
                    @click="sampleFilesDialogActive = true"
             >
             <v-icon light>cloud_download</v-icon>
             </v-btn-->
             {{headerFilesetName}}
           </span>
          </v-card-title>
          <v-card-title v-show="!filesetsHideSelector">
            <v-spacer></v-spacer>
            <v-text-field
              v-model="filesetsSearch"
              append-icon="search"
              label="Filter filesets"
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-data-table v-show="!filesetsHideSelector" :headers="filesetsHeaders" :items="filesetsList"
                        :search="filesetsSearch">
            <v-divider></v-divider>
            <template slot="items" slot-scope="props" height="300">
              <td class="text-xs-left"
                  v-on:click="filesetClick(props.item)"
              >
                {{props.item.fileset}}
              </td>
            </template>
            <v-alert slot="no-results" :value="true" color="error" icon="warning">
              Your search for "{{ filesetsSearch }}" found no results.
            </v-alert>
          </v-data-table>
        </v-card>
        <!--

           Files Selection

        -->
        <v-card style="width:100%;" v-show="filesetSelected !== null">
          <v-card-title class="files-header"><span style="width:40%;" class="text-xs-left">
            <v-btn
              fab small
              color="primary"
              class="white--text"
              @click="toggleFilesHide"
            >
            <v-icon light v-if="!filesHideSelector">expand_more</v-icon>
            <v-icon light v-else>expand_less</v-icon>

           </v-btn>{{filesHeaderTitle}}</span>
            <span class="text-xs-right" style="width:60%;" v-show="fileSelected !== null">
             <!--v-btn v-if="sampleFileinfo.length > 0"
                    fab small
                    color="primary"
                    class="white--text"
                    @click="sampleFilesDialogActive = true"
             >
             <v-icon light>cloud_download</v-icon>
             </v-btn-->
             {{headerFileName}}
           </span>
          </v-card-title>
          <v-card-title v-show="!filesHideSelector">
            <v-spacer></v-spacer>
            <v-text-field
              v-model="filesSearch"
              append-icon="search"
              label="Filter list of files"
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-data-table v-show="!filesHideSelector" :headers="filesHeaders" :items="filesList"
                        :search="filesSearch">
            <v-divider></v-divider>
            <template slot="items" slot-scope="props" height="300">
              <td class="text-xs-left"
                  v-on:click="fileClick(props.item)">
                {{getFileFilename(props.item)}}
              </td>
              <td class="text-xs-left"
                  v-on:click="fileClick(props.item)">
                {{getFileContentType(props.item)}}
              </td>
              <td class="text-xs-left"
                  v-on:click="fileClick(props.item)">
                {{props.item.id}}
              </td>
            </template>
            <v-alert slot="no-results" :value="true" color="error" icon="warning">
              Your search for "{{ filesSearch }}" found no results.
            </v-alert>
          </v-data-table>
        </v-card>
        <v-alert
          v-model="fileError"
          type="error"
          dismissible
        >
          {{fileErrorMsg}}
        </v-alert>
        <v-card style="width:100%;" v-show="(fileSelected !== null && fileSelected.type === 'xmldata')">
          <v-container v-bind:style="{'display': formInView}" fluid justify-start fill-height>
            <v-layout row wrap align-start fill-height>
              <v-flex fill-height xs12 align-start justify-start>
                <div>
                  <tree-view ref="tree" style="text-align: left;" :data="fileObj"
                             :options="sampleTreeviewOptions()"></tree-view>
                </div>
              </v-flex>
            </v-layout>
          </v-container>
        </v-card>
        <v-card style="width:100%;" v-show="(fileSelected !== null && fileSelected.type === 'blob')">
          <v-container v-bind:style="{'display': formInView}" fluid justify-start fill-height>
            <v-layout row wrap align-start fill-height>
              <v-flex fill-height xs12 align-start justify-start>
                <v-img v-if="fileImageDataUri !== null" ref="fileImageDisplay" :src="fileImageDataUri"></v-img>
              </v-flex>
            </v-layout>
          </v-container>
        </v-card>
      </v-layout>
      <!--

        Dataset Info Dialog

      -->
      <!--v-layout row justify-center-->
      <v-dialog v-model="datasetInfoDialogActive">
        <v-layout row>
          <v-flex xs12 sm6 offset-sm3>
            <v-card>
              <v-toolbar color="cyan" dark>
                <!--v-toolbar-side-icon></v-toolbar-side-icon-->

                <v-toolbar-title>Dataset Information</v-toolbar-title>

                <v-spacer></v-spacer>

                <v-btn icon @click="datasetInfoDialogActive=false">
                  <v-icon>close</v-icon>
                </v-btn>
              </v-toolbar>

              <v-list two-line>
                <template v-for="(item, index) in datasetDialogInfo.items">
                  <v-subheader
                    v-if="item.header"
                    :key="item.header"
                  >
                    {{ item.header }}
                  </v-subheader>

                  <v-divider
                    v-else-if="item.divider"
                    :key="index"
                    :inset="item.inset"
                  ></v-divider>

                  <!--@click=""-->
                  <v-list-tile
                    v-else
                    :key="item.title"
                    avatar
                  >
                    <v-list-tile-content>
                      <v-list-tile-title v-html="item.title"></v-list-tile-title>
                      <v-list-tile-sub-title v-html="item.subtitle"></v-list-tile-sub-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </template>
              </v-list>
            </v-card>
          </v-flex>
        </v-layout>
      </v-dialog>
      <!--/v-layout-->

      <!--

         Result Files Dialog

      -->
      <!-- v-layout row justify-center>
        <v-dialog v-model="sampleFilesDialogActive" scrollable width="500">
          <v-card>
            <v-card-title class="sample-file-download-header">Download related files</v-card-title>
            <v-data-table
              v-model="sampleFileDownloadSelected"
              UNUSED4NOWselect-all
              item-key="basename"
              :pagination.sync="samplefilepagination"
              :headers="sampleFileHeaders"
              :items="sampleFileinfo">
              <template slot="headers" slot-scope="props">
                <tr>
                  <!- -th>
                    <v-checkbox
                      :input-value="props.all"
                      :indeterminate="props.indeterminate"
                      primary
                      hide-details
                      @click.stop="sampleFileToggleAll()"
                    ></v-checkbox>
                  </th- ->
                  <th
                    style="text-align:left;"
                    v-for="header in props.headers"
                    :key="header.text"
                    :class="['column sortable', samplefilepagination.descending ? 'desc' : 'asc', header.value === samplefilepagination.sortBy ? 'active' : '']"
                    @click="sampleFileChangeSort(header.value)"
                  >
                    <v-icon small>arrow_upward</v-icon>
                    {{ header.text }}
                  </th>
                </tr>
              </template>
              <v-divider></v-divider>
              <template slot="items" slot-scope="props" height="320">
                <!- -td :active="props.selected" @click="props.selected = !props.selected">
                  <v-checkbox
                    :input-value="props.selected"
                    primary
                    hide-details
                  ></v-checkbox>
                </td- ->
                <td class="text-xs-left">
                  <a :href="getDownloadName(props.item.filename)">{{props.item.basename}}</a>
                </td>
              </template>
            </v-data-table>
            <v-divider></v-divider>
            <v-card-actions class="download-footer">
              <!- -v-btn color="primary" @click.native="sampleFileDownload()">Download</v-btn- ->
              <v-btn color="normal" @click.native="sampleFilesDialogActive = false">Close</v-btn>
            </v-card-actions>
          </v-card>
          <!- -/v-flex>
        </v-layout- ->
        </v-dialog>
      </v-layout -->

    </v-container>
  </v-flex>
</template>

<script>
import {Auth} from '@/modules/Auth.js'
import * as base64js from 'base64-js'
import {} from 'vuex'
import Axios from 'axios'
import * as xmljs from 'xml-js'
import * as _ from 'lodash'

export default {
  name: 'MyPage',
  data () {
    return {
      formInView: 'block',
      msg: 'My Page',
      showAdmin: false,
      myPageError: false,
      myPageErrorMsg: '',
      fileError: false,
      fileErrorMsg: '',
      // Schema mgt
      showSchemaMgt: false,
      schemaFileText: '',
      schemaFileName: '',
      schemaError: false,
      schemaErrorMsg: '',
      schemaSuccess: false,
      schemaSuccessMsg: '',
      // schemas
      firstSchemaTitle: 'first',
      selectedSchemaId: '',
      selectedSchemaTitle: '',
      schemas: [],
      // Users
      showBecomeUser: false,
      userall: true,
      userpagination: {
        sortBy: 'userid'
      },
      userindeterminate: true,
      userselected: [],
      userheaders: [
        {text: 'User ID', align: 'right', sortable: true, value: 'userid'},
        {text: 'Full Name', align: 'right', sortable: false, value: 'displayName'},
        {text: 'Email Address', align: 'right', sortable: false, value: 'email'}
      ],
      users: [
        {value: false, selected: false, userid: 'A101', displayName: 'John Doe', email: 'john.doe@example.com'},
        {value: false, selected: false, userid: 'A102', displayName: 'Jane Doe', email: 'jane.doe@example.com'},
        {value: false, selected: false, userid: 'A103', displayName: 'Manny Doe', email: 'manny.doe@example.com'}
      ],
      // Datasets
      showMineOnly: false,
      datasetSearch: '',
      datasetHeaders: [
        {text: 'ID', align: 'left', value: 'seq'},
        {text: 'DOI', align: 'left', value: 'doi'},
        {text: 'Title', align: 'left', value: 'title'},
        {text: 'Comment', align: 'left', value: 'datasetComment'}
      ],
      datasetList: [],
      datasetInfoDialogActive: false,
      datasetDialogInfo: {}, // re-structured information from dataset
      datasetHideSelector: false,
      datasetSelected: null,
      datasetTransformed: {},
      // Filesets
      filesetsSearch: '',
      headerFilesetName: '',
      filesetsHeaders: [
        {text: 'Fileset Name', align: 'left', value: 'datasetSelected.filesets'}
      ],
      filesetsList: [],
      filesetsHideSelector: false,
      filesetsPagination: {
        sortBy: 'filesets'
      },
      filesetSelected: null,
      // Samples
      filesSearch: '',
      filesHeaders: [
        {text: 'File Name', align: 'left', value: 'metadata.filename'},
        {text: 'Type', align: 'left', value: 'metadata.contentType'},
        {text: 'ID', align: 'left', value: 'id'}
        // {text: 'Published', align: 'left', value: 'ispublished'},
        // {text: 'Public', align: 'left', value: 'isPublic'},
        // {text: 'Edit State', align: 'left', value: 'entityState'},
        // {text: 'Curate State', align: 'left', value: 'curateState'}
      ],
      filesList: [],
      filesHideSelector: true,
      // sampleFileAll: true,
      filespagination: {
        sortBy: 'basename'
      },
      sampleFileIndeterminate: false,
      headerFileName: null,
      fileSelected: null,
      fileObj: '',
      fileImageDataUri: '',
      sampleFileinfo: [], // names/info of files associated with sample
      sampleFilesDialogActive: false,
      sampleFileDownloadSelected: [],
      sampleFileHeaders: [
        {text: 'Filename', align: 'left', value: 'basename'}
      ],
      sampleTree: {},
      sampleTreeModel: null
    }
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    if (vm.auth.isAdmin()) {
      let runAs = vm.auth.getRunAsUser()
      Axios.get('/nmr/users')
        .then(function (resp) {
          let users = resp.data.data
          vm.users = []
          users.forEach(function (v, idx) {
            v.selected = false
            v.value = false
            if (v.userid === runAs) {
              v.selected = true
            }
            if (v.userid !== vm.auth.getUserId()) {
              vm.users.push(v)
            }
          })
        })
        .catch(function (err) {
          vm.myPageError = true
          vm.myPageErrorMsg = 'fetching users: ' + err
        })
    }
    vm.getActiveSchemas()
      .then(function () {
        Axios.get('/nmr/dataset', {
          params: {}
        })
          .then(function (resp) {
            resp.data.data.forEach(function (v) {
              vm.datasetList.push(v)
            })
          })
          .catch(function (err) {
            vm.myPageError = true
            vm.myPageErrorMsg = 'fetching datasets: ' + err
          })
      })
      .catch(function (err) {
        vm.myPageError = true
        vm.myPageErrorMsg = 'fetching schemas: ' + err
      })
  },
  computed: {
    // schemas
    schemaTitles () {
      let titles = []
      let vm = this
      vm.schemas.forEach((v) => {
        titles.push(v.title)
      })
      return titles
    },
    // datasets
    datasetsHeaderTitle: function () {
      let vm = this
      let rv = null
      if (vm.datasetSelected) {
        rv = 'Dataset:'
      } else {
        rv = 'Datasets'
      }
      return rv
    },
    datasetsHeaderInfoIcon: function () {
      let vm = this
      let rv = false
      if (vm.datasetSelected) {
        rv = true
      }
      return rv
    },
    filesetsHeaderTitle: function () {
      let vm = this
      let rv = null
      if (vm.filesetSelected) {
        rv = 'Fileset:'
      } else {
        rv = 'Filesets'
      }
      return rv
    },

    filesHeaderTitle: function () {
      let vm = this
      let rv = null
      if (vm.fileSelected) {
        rv = 'File:'
      } else {
        rv = 'Files'
      }
      return rv
    },
    headerDOI: function () {
      let rv = null
      let vm = this
      if (vm.datasetSelected) {
        rv = vm.datasetSelected.doi
      }
      return rv
    },
    // samples
    // headerFileName: function () {
    //   let rv = null
    //   let vm = this
    //   if (vm.fileSelected) {
    //     rv = vm.sampleSelected.title.replace(/\.xml$/, '')
    //   }
    //   return rv
    // },
    datasetsFiltered: function () {
      let rv = true
      let vm = this
      // TODO back-end should only provide data visible to this user
      let userid = vm.auth.getUserId()
      let runAsUser = vm.auth.getRunAsUser()
      return vm.datasetList.filter((i) => {
        if (vm.showMineOnly) {
          rv = i.userid && (i.userid === userid || i.userid === runAsUser)
        } else {
          rv = true
        }
        return rv
      })
    }
  },
  methods: {
    setSchemaError (msg) {
      let vm = this
      vm.schemaError = true
      vm.schemaErrorMsg = msg
    },
    resetSchemaError () {
      let vm = this
      vm.schemaError = false
      vm.schemErrorMsg = ''
    },
    setSchemaSuccess (msg) {
      let vm = this
      vm.schemaSuccess = true
      vm.schemaSuccessMsg = msg
    },
    resetSchemaSuccess () {
      let vm = this
      vm.schemaSuccessMsg = ''
      vm.schemaSuccess = false
    },
    getActiveSchemas () {
      let vm = this
      return new Promise(function (resolve, reject) {
        Axios.get('/nmr/templates/versions/select/allactive')
          .then(function (resp) {
            vm.schemas = []
            resp.data.data.forEach(function (v) {
              let schemaId = v.currentRef[0]._id
              let title = v.currentRef[0].title
              vm.schemas.push({'schemaId': schemaId, 'title': title})
              console.log('schemaId: ' + schemaId + ' title: ' + title)
            })
            vm.selectedSchemaTitle = vm.schemas[0].title
            vm.selectedSchemaId = vm.schemas[0].schemaId
            resolve()
          })
          .catch(function (err) {
            console.log('error getting schemas: ' + err)
            reject(err)
          })
      })
    },
    doSchemaUpload () {
      let vm = this
      let data = {
        filename: vm.schemaFileName,
        xsd: vm.schemaFileText
      }
      Axios.post('/nmr/schema', data)
        .then(function (resp) {
          console.log(resp.data)
          vm.resetSchemaError()
          vm.setSchemaSuccess(vm.schemaFileName + ' uploaded successfully.')
          vm.schemaFileName = ''
          vm.schemaFileText = ''
          vm.getActiveSchemas()
            .then(function () {
              console.log('re-read schemas successfully.')
            })
            .catch(function (err) {
              vm.myPageError = true
              vm.myPageErrorMsg = 'loading schemas: ' + err
            })
        })
        .catch(function (err) {
          vm.resetSchemaSuccess()
          vm.setSchemaError('' + err + ' : ' + err.response.data.error)
          vm.schemaSuccess = false
        })
    },
    selectSchemaFile () {
      let vm = this
      vm.resetSelectedSchema()
      vm.resetSchemaError()
      vm.resetSchemaSuccess()
      vm.$refs.schemaFileRef.click()
    },
    resetSelectedSchema: function () {
      let vm = this
      vm.schemaFileText = ''
      vm.schemaFileName = ''
    },
    onSchemaComboChanged (evdata) { // select current schema changed
      let vm = this
      vm.selectedSchemaId = vm.schemas[0].schemaId
      if (!vm.selectedSchemaTitle || vm.selectedSchemaTitle === '') {
        vm.selectedSchemaTitle = vm.schemas[0].title
      }
      let selected = -1
      vm.schemas.forEach((v, idx) => {
        if (v.title === vm.selectedSchemaTitle) {
          selected = idx
          vm.selectedSchemaId = v.schemaId
        }
      })
      if (selected === -1) {
        vm.selectedSchemaTitle = vm.schemas[0].title
        vm.selectedSchemaId = vm.schemas[0].schemaId
      }
      console.log('selected schema schemaId: ' + vm.selectedSchemaId + ' title: ' + vm.selectedSchemaTitle)
    },
    onSchemaSelected (e) { // schema upload
      let vm = this
      vm.resetSelectedSchema()
      const files = e.target.files
      let f = files[0]
      if (f !== undefined) {
        vm.schemaFileName = f.name
        const fr = new FileReader()
        fr.readAsText(f)
        fr.addEventListener('load', () => {
          vm.schemaFileText = fr.result
          console.log(vm.schemaFileText)
        })
      } else {
        this.resetSelectedSchema()
      }
    },
    isLoggedIn: function () {
      let vm = this
      return vm.auth.isLoggedIn()
    },
    getUserIndeterminate: function () {
      let vm = this
      return vm.userindeterminate
    },
    toggleShowAdmin: function () {
      let vm = this
      vm.showAdmin = !vm.showAdmin
    },
    toggleShowSchemaMgt: function () {
      let vm = this
      vm.showSchemaMgt = !vm.showSchemaMgt
    },
    toggleShowBecomeUser: function () {
      let vm = this
      vm.showBecomeUser = !vm.showBecomeUser
    },
    isAdmin: function () {
      let vm = this
      return vm.auth.isAdmin()
    },
    getUsers: function () {
      //   'userid': userDoc.userid,
      //   'givenName': userDoc.givenName,
      //   'surName': userDoc.surName,
      //   'displayName': userDoc.displayName,
      //   'email': userDoc.email
    },
    usersToggle: function () {
      let vm = this
      console.log('users selected: ' + JSON.stringify(vm.userselected))
      vm.userselected = []
      vm.userindeterminate = false
      vm.users.forEach(function (v) {
        v.selected = false
      })
      vm.auth.resetRunAsUser()
    },
    usersChangeSort: function (column) {
      console.log('usersChangeSort: ' + column)
      if (this.userpagination.sortBy === column) {
        this.userpagination.descending = !this.userpagination.descending
      } else {
        this.userpagination.sortBy = column
        this.userpagination.descending = false
      }
    },
    userSelect: function (userid) {
      let vm = this
      console.log('selected: ' + userid)
      vm.users.forEach(function (v) {
        if (v.userid !== userid) {
          v.selected = false
        } else {
          if (!v.selected) { // The value has not been updated yet, so it's opposite
            vm.userindeterminate = true
            vm.userselected.push(userid)
            vm.auth.setRunAsUser(userid)
          } else {
            vm.userindeterminate = false
            vm.auth.resetRunAsUser()
          }
        }
      })
      vm.userselected = []
    },
    // datasets
    datasetInfoDialog: function () {
      let vm = this
      vm.datasetInfoDialogActive = true
    },
    toggleDatasetHide: function () {
      let vm = this
      vm.datasetHideSelector = !vm.datasetHideSelector
      vm.datasetSelected = null
      vm.filesHideSelector = true
      vm.filesetsHideSelector = true
      vm.selectedFile = null
      vm.hideFilesets()
    },
    mineOnly: function () {
      let vm = this
      vm.showMineOnly = !vm.showMineOnly
      console.log('showMineOnly is now: ' + vm.showMineOnly)
    },
    transformDataset: function (entry) {
      let vm = this
      let transformed = {}
      _.keys(entry).forEach((k) => {
        if (k !== 'filesets' && k !== '__v' && k !== 'dttm_created' && k !== 'dttm_updated') {
          if (Array.isArray(entry[k])) {
            if (entry[k].length > 0) {
              transformed[k] = entry[k].join('; ')
            } else {
              transformed[k] = 'N/A'
            }
          } else {
            transformed[k] = entry[k]
          }
          if (transformed[k] === null) {
            transformed[k] = 'N/A'
          }
        }
      })
      vm.datasetDialogInfo = {
        items: [
          {header: transformed['doi']}
        ]
      }
      _.keys(transformed).forEach((k) => {
        vm.datasetDialogInfo.items.push({
          title: k,
          subtitle: transformed[k]
        })
        vm.datasetDialogInfo.items.push({
          divider: true,
          inset: true
        })
      })
      return transformed
    },

    datasetClick: function (entry) {
      let vm = this
      console.log('dataset selected: ' + entry.seq)
      vm.datasetSelected = entry
      vm.datasetTransformed = vm.transformDataset(entry)
      console.log(JSON.stringify(vm.datasetTransformed))
      vm.datasetHideSelector = true
      vm.filesetsHideSelector = false
      vm.filesetsList = vm.datasetSelected.filesets
      vm.filesetHideSelector = false
      vm.filesHideSelector = true
      vm.Selected = null
      vm.myPageError = false
      vm.myPageErrorMsg = ''
    },
    // filesets
    hideFilesets: function () {
      let vm = this
      vm.filesetsHideSelector = true
      vm.filesetSelected = null
      vm.hideFiles()
    },
    filesetClick: function (fileset) {
      let func = 'filesetClick'
      let vm = this
      console.log(func + ' - ' + JSON.stringify(fileset))
      vm.filesetSelected = fileset
      vm.filesHideSelector = false
      vm.headerFilesetName = fileset.fileset
      vm.filesList = fileset.files
      vm.filesetsHideSelector = true
    },

    // samples / files
    getFileFilename: function (item) {
      let rv = 'N/A'
      console.log('getFileFilename item: ' + JSON.stringify(item) + ' type of item: ' + typeof item)
      if (item.metadata && item.metadata.filename) {
        rv = item.metadata.filename
      }
      console.log('getFileFilename rv: ' + rv)
      return rv
    },
    getFileContentType: function (item) {
      let rv = 'N/A'
      console.log('getFileContentType item: ' + JSON.stringify(item) + ' type of item: ' + typeof item)
      if (item.metadata && item.metadata.contentType) {
        rv = item.metadata.contentType
      }
      console.log('getFileContentType rv: ' + rv)
      return rv
    },
    sampleTreeviewOptions: function () {
      // let vm = this
      // let id = 'Sample Information'
      // if (vm.sample) {
      //   id = vm.sampleIdFromTitle(vm.sampleIdFromTitle(vm.sample.title))
      // }
      return {maxDepth: 99, rootObjectKey: 'PolymerNanocomposite', modifiable: false}
    },
    toggleFilesetsHide: function () {
      let vm = this
      vm.filesetsHideSelector = !vm.filesetsHideSelector
      vm.filesetSelected = null
      vm.fileSelected = null
      console.log('filesetsHideSelector: ' + vm.filesetsHideSelector)
    },
    hideFiles: function () {
      let vm = this
      vm.filesHideSelector = true
      vm.filesetSelected = null
      vm.fileSelected = null
      vm.fileObj = null
      vm.fileError = false
    },
    toggleFilesHide: function () {
      let vm = this
      vm.filesHideSelector = !vm.filesHideSelector
      vm.headerFileName = null
      vm.fileSelected = null
      vm.fileObj = null
      vm.fileError = false
      vm.fileErrorMsg = ''
      console.log('filesHideSelector: ' + vm.filesHideSelector)
    },
    getXmlData: function (fileInfo) {
      // file info is assumed to be the fileset/file info from the dataset
      let func = 'getXmlData'
      return new Promise(function (resolve, reject) {
        let id = fileInfo.id
        if (fileInfo.xmldata) {
          resolve(fileInfo)
        } else {
          Axios.get('/nmr/xml', {
            params: {
              id: id
            }
          })
            .then(function (resp) {
              fileInfo.xmldata = resp.data.data[0] // looking up by id returns at most 1 in an array
              resolve(fileInfo)
            })
            .catch(function (err) {
              let msg = func + ' - ' + 'Error: ' + err.message
              console.log(msg)
              reject(err)
            })
        }
      })
    },
    getBlobData: function (fileInfo) {
      // fileInfo is assumed to be the fileset/file info from the dataset
      let id = fileInfo.id
      return new Promise(function (resolve, reject) {
        Axios.get('/nmr/blob', {
          responseType: 'arraybuffer',
          params: {
            id: id
          }
        })
          .then(function (resp) {
            fileInfo.fileData = resp.data // standard http response, not json
            // name and length are in response header
            fileInfo.nameFromHeader = resp.headers['content-disposition'].split(';')[1].trim().split('=')[1].replace(/"/g, '')
            fileInfo.contentTypeFromHeader = resp.headers['content-type']
            console.log('name: ' + fileInfo.nameFromHeader + ' content-type ' + fileInfo.contentTypeFromHeader)
            resolve(fileInfo)
          })
          .catch(function (err) {
            let msg = 'unable to retrieve blob id: ' + id + ' error: ' + err.message
            console.log(msg)
            reject(err)
          })
      })
    },
    // getFilesList: function (sample) {
    //   let vm = this
    //   return new Promise(function (resolve, reject) {
    //     Axios.get('/nmr/dataset/filenames/' + sample.title, {
    //       params: {schemaId: vm.selectedSchemaId}
    //     })
    //       .then(function (resp) {
    //         vm.sampleFileinfo = resp.data.data.files
    //         if (!vm.sampleFileinfo) {
    //           vm.sampleFileinfo = []
    //         }
    //         vm.sampleFileinfo.forEach(function (v, idx) {
    //           vm.sampleFileinfo[idx].selected = false // add the field and set it to false
    //         })
    //         resolve(resp.data.data)
    //       })
    //       .catch(function (err) {
    //         console.log('unable to obtain sample\'s file list. Error: ' + err)
    //         reject(err)
    //       })
    //   })
    // },
    // sampleFileDownload: function () {
    //   let vm = this
    //   console.log('--------')
    //   vm.sampleFileDownloadSelected.forEach(function (v) {
    //     console.log('download: ' + v.basename)
    //     Axios.get('/nmr/blob?bucketname=curateinput&filename=' + v.filename)
    //       .then(function (data) {
    //         console.log('downloaded: ' + v.filename)
    //       })
    //       .catch(function (err) {
    //         console.log('error downloading: ' + v.filename + ' error: ' + err)
    //       })
    //   })
    // },
    // sampleFileToggleAll: function () {
    //   let vm = this
    //   vm.sampleFileDownloadIndeterminate = false
    //   if (vm.sampleFileDownloadSelected.length) {
    //     vm.sampleFileDownloadSelected = []
    //     vm.sampleFileinfo.forEach(function (v, idx) {
    //       vm.sampleFileinfo[idx].selected = false
    //     })
    //   } else {
    //     vm.sampleFileDownloadSelected = vm.sampleFileinfo.slice()
    //     vm.sampleFileinfo.forEach(function (v, idx) {
    //       vm.sampleFileinfo[idx].selected = true
    //     })
    //   }
    //   console.log('sample files selected: ' + JSON.stringify(vm.sampleFileDownloadSelected))
    // },
    // sampleFileSelect: function (filename) {
    //   let vm = this
    //   vm.sampleFileDownloadIndeterminate = true
    //   vm.sampleFileinfo.forEach(function (v, idx) {
    //     if (v.filename === filename) {
    //       vm.sampleFileinfo[idx].selected = !vm.sampleFileinfo[idx].selected
    //       console.log('selected: ' + JSON.stringify(vm.sampleFileinfo[idx]))
    //     }
    //   })
    // },
    // sampleFileChangeSort: function (column) {
    //   console.log('sampleFileChangeSort: ' + column)
    //   if (this.samplefilepagination.sortBy === column) {
    //     this.samplefilepagination.descending = !this.samplefilepagination.descending
    //   } else {
    //     this.samplefilepagination.sortBy = column
    //     this.samplefilepagination.descending = false
    //   }
    // },
    fileClick: function (file) {
      let func = 'fileClick'
      let vm = this
      console.log(func + ' - ' + JSON.stringify(file))
      vm.fileSelected = file
      vm.headerFileName = file.id
      vm.filesHideSelector = true
      let p = null
      switch (file.type) {
        case 'blob':
          console.log('file is blob')
          vm.setLoading()
          p = vm.getBlobData(file)
          break
        case 'xmldata':
          console.log('file is xmldata')
          vm.setLoading()
          p = vm.getXmlData(file)
          break
        default:
          console.log('file is unknown type')
          vm.fileError = true
          vm.fileErrorMsg = 'Unknown file type'
      }
      if (p) {
        p.then(function (fileInfo) {
          switch (fileInfo.type) {
            case 'blob':
              let contentType = fileInfo.contentTypeFromHeader
              if (contentType.indexOf('tif') === -1) {
                let b64 = ''
                try {
                  let ab = new Uint8Array(fileInfo.fileData)
                  // console.log('ab = ' + ab)
                  // --b64 = btoa(String.fromCharCode.apply(null, ab))
                  // b64 = btoa(ab)
                  // console.log('new b64: ' + b64)
                  b64 = base64js.fromByteArray(ab)
                } catch (err) {
                  // console.log('data: ' + fileInfo.fileData.toString() + ' length: ' + fileInfo.fileData.byteLength)
                  let msg = 'Error viewing file. Error: ' + err.message
                  vm.fileError = true
                  vm.fileErrorMsg = msg
                }
                vm.fileImageDataUri = 'data:' + contentType + ';base64,' + b64
                // console.log('dataUri: ' + vm.fileImageDataUri)
              } else {
                let msg = 'cannot display images of contentType: ' + contentType + '. Please download instead.'
                vm.fileImageDataUri = null
                vm.fileError = true
                vm.fileErrorMsg = msg
                console.log(msg)
              }
              break
            case 'xmldata':
              //   setTimeout(function () {
              //     vm.sampleFileinfo = []
              //     vm.samplesHideSelector = true
              //     console.log('sampleClick - title: ' + sample.title + ' ' + sample.schemaId)
              //     vm.sampleSelected = sample
              //     // vm.getFilesList(sample)
              //     //   .then(function () {
              let sample = fileInfo.xmldata
              console.log(JSON.stringify(sample))
              try {
                vm.fileObj = xmljs.xml2js(sample.xml_str, {
                  'compact': true,
                  ignoreDeclaration: true,
                  ignoreAttributes: true
                })
                if (vm.fileObj['PolymerNanocomposite']) {
                  vm.fileObj = vm.fileObj.PolymerNanocomposite
                }
              } catch (err) { // L138_S1
                console.log(func + ' error occurred attempting to xml to json convert sample: ' + sample.title + ' ' + sample.schemaId + ' err: ' + err)
                vm.fileObj = {'Error': 'Unable to display: ' + sample.title}
              }
              //     console.log(func)
              //     console.log(vm.sampleObj)
              //     // delete vm.sampleObj['_declaration']
              //     // window.sampleObj = vm.sampleObj
              //     // let indent = 2
              //     // vm.sample2Tree(vm.sampleObj, vm.sampleTree, indent)
              //     vm.resetLoading()
              //     // })
              //     // .catch(function (err) {
              //     //   let msg = 'Error loading sample file: ' + err
              //     //   console.log(msg)
              //     //   vm.myPageError = true
              //     //   vm.myPageErrorMsg = msg
              //     //   vm.resetLoading()
              //     // })
              //   }, 20)
              break
          }
          vm.resetLoading()
        })
        p.catch(function (err) {
          vm.fileImageDataUri = null
          vm.fileObj = null
          vm.fileErrorMsg = `Error occurred fetching file: ${err.message}`
          vm.fileError = true
          vm.resetLoading()
        })
      }
    },

    // sampleClick: function (sample) {
    //   let func = 'sampleClick'
    //   let vm = this
    //   vm.setLoading()
    //   setTimeout(function () {
    //     vm.sampleFileinfo = []
    //     vm.samplesHideSelector = true
    //     console.log('sampleClick - title: ' + sample.title + ' ' + sample.schemaId)
    //     vm.sampleSelected = sample
    //     // vm.getFilesList(sample)
    //     //   .then(function () {
    //     try {
    //       vm.sampleObj = xmljs.xml2js(sample.xml_str, {
    //         'compact': true,
    //         ignoreDeclaration: true,
    //         ignoreAttributes: true
    //       })
    //       if (vm.sampleObj['PolymerNanocomposite']) {
    //         vm.sampleObj = vm.sampleObj.PolymerNanocomposite
    //       }
    //     } catch (err) { // L138_S1
    //       console.log(func + ' error occurred attempting to xml to json convert sample: ' + sample.title + ' ' + sample.schemaId + ' err: ' + err)
    //       vm.sampleObj = {'Error': 'Unable to display: ' + sample.title}
    //     }
    //     console.log(func)
    //     console.log(vm.sampleObj)
    //     // delete vm.sampleObj['_declaration']
    //     // window.sampleObj = vm.sampleObj
    //     // let indent = 2
    //     // vm.sample2Tree(vm.sampleObj, vm.sampleTree, indent)
    //     vm.resetLoading()
    //     // })
    //     // .catch(function (err) {
    //     //   let msg = 'Error loading sample file: ' + err
    //     //   console.log(msg)
    //     //   vm.myPageError = true
    //     //   vm.myPageErrorMsg = msg
    //     //   vm.resetLoading()
    //     // })
    //   }, 20)
    // },
    // sample2Tree: function (node, sampleTree, indent) {
    //   let vm = this
    //   Object.keys(node).forEach(function (v) {
    //     console.log( ' '.repeat(indent) + v)
    //   })
    // },
    // utils
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 50px;
    height: auto;
  }

  h4 {
    text-transform: uppercase;
  }

  h5 {
    color: white;
    background-color: black;
    font-size: 16px;
    margin-top: -1px;
  }

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

  p {
    margin-bottom: 2px;
  }

  .warn-red {
    background-color: red;
    color: white;
    margin-bottom: 0px;
  }

  .sect-divider {
    height: 5px;
    background-color: #2ff2ff;
    padding-top: 2px;
    padding-bottom: 2px;
    width: 100%;
  }

  .admin-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }

  .select-schema-header {
    background-color: #03A9F4;
    height: 30px;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }

  .dataset-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }

  .filesets-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }

  .files-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }

  .dataset-info-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
    width: 100%;
    padding: 10px;
    margin-right: 0px;
  }

  .dataset-info-footer {
    background-color: #03A9F4;
    color: #000000;
    font-size: 22px;
    font-weight: bold;
  }

</style>
