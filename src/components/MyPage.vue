<template>
  <div class="mypage">
    <v-alert
      v-model="myPageError"
      type="error"
      dismissible
    >
      {{myPageErrorMsg}}
    </v-alert>

    <h1>{{ msg }}</h1>
    <v-container grid-list-xl>
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
          <h5>Become User...</h5>
          <v-data-table
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

           Dataset Selection

        -->
        <v-card style="width:100%;">
          <v-card-title class="dataset-header"><span style="width:50%;" class="text-xs-left">
            <v-btn
              fab small
              color="primary"
              class="white--text"
              @click="toggleDatasetHide"
            >
             <v-icon light v-if="!datasetHideSelector">expand_more</v-icon>
             <v-icon light v-else>expand_less</v-icon>
            </v-btn>Datasets</span>
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
            </template>
            <v-alert slot="no-results" :value="true" color="error" icon="warning">
              Your search for "{{ datasetSearch }}" found no results.
            </v-alert>
          </v-data-table>
        </v-card>
        <div class="sect-divider"></div>
        <!--

           Sample Selection

        -->
        <v-card style="width:100%;" v-show="datasetSelected !== null">
          <v-card-title class="samples-header"><span style="width:50%;" class="text-xs-left">
            <v-btn
            fab small
            color="primary"
            class="white--text"
            @click="toggleSamplesHide"
          >
            <v-icon light v-if="!samplesHideSelector">expand_more</v-icon>
            <v-icon light v-else>expand_less</v-icon>

           </v-btn>Samples</span>
           <span class="text-xs-right" style="width:50%;" v-show="sampleSelected !== null">
             <v-btn  v-if="sampleFileinfo.length > 0"
               fab small
               color="primary"
               class="white--text"
               @click="sampleFilesDialogActive = true"
             >
             <v-icon light>cloud_download</v-icon>
             </v-btn>
             {{headerSampleName}}
           </span>
          </v-card-title>
          <v-card-title v-show="!samplesHideSelector">
            <v-spacer></v-spacer>
            <v-text-field
              v-model="samplesSearch"
              append-icon="search"
              label="Filter samples"
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-data-table v-show="!samplesHideSelector" :headers="sampleHeaders" :items="sampleList"
                        :search="sampleSearch">
            <v-divider></v-divider>
            <template slot="items" slot-scope="props" height="300">
              <td class="text-xs-left"
                  v-on:click="sampleClick(props.item)">
                {{props.item.title}}
              </td>
              <td class="text-xs-left"
                  v-on:click="sampleClick(props.item)">
                {{props.item.ispublished?'Yes':'No'}}
              </td>
              <td class="text-xs-left"
                  v-on:click="sampleClick(props.item)">
                {{props.item.isPublic?'Yes':'No'}}
              </td>
              <td class="text-xs-left"
                  v-on:click="sampleClick(props.item)">
                {{props.item.entityState}}
              </td>
              <td class="text-xs-left"
                  v-on:click="sampleClick(props.item)">
                {{props.item.curateState}}
              </td>
            </template>
            <v-alert slot="no-results" :value="true" color="error" icon="warning">
              Your search for "{{ samplesSearch }}" found no results.
            </v-alert>
          </v-data-table>
        </v-card>
        <v-card  style="width:100%;" v-show="sampleSelected !== null">
          <v-container v-bind:style="{'display': formInView}" fluid justify-start fill-height>
            <v-layout row wrap align-start fill-height>
              <v-flex fill-height xs12 align-start justify-start>
                <div>
                  <tree-view ref="tree" style="text-align: left;" :data="sampleObj"
                             :options="sampleTreeviewOptions()"></tree-view>
                </div>
              </v-flex>
            </v-layout>
          </v-container>
        </v-card>
      </v-layout>
      <!--

         Sample Files Dialog

      -->
      <v-layout row justify-center>
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
                  <!--th>
                    <v-checkbox
                      :input-value="props.all"
                      :indeterminate="props.indeterminate"
                      primary
                      hide-details
                      @click.stop="sampleFileToggleAll()"
                    ></v-checkbox>
                  </th-->
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
                <!--td :active="props.selected" @click="props.selected = !props.selected">
                  <v-checkbox
                    :input-value="props.selected"
                    primary
                    hide-details
                  ></v-checkbox>
                </td-->
                <td class="text-xs-left">
                  <a :href="getDownloadName(props.item.filename)">{{props.item.basename}}</a>
                </td>
              </template>
            </v-data-table>
            <v-divider></v-divider>
            <v-card-actions class="download-footer">
              <!--v-btn color="primary" @click.native="sampleFileDownload()">Download</v-btn-->
              <v-btn color="normal" @click.native="sampleFilesDialogActive = false">Close</v-btn>
            </v-card-actions>
          </v-card>
          <!--/v-flex>
        </v-layout-->
        </v-dialog>
      </v-layout>

    </v-container>
  </div>
</template>

<script>
import {Auth} from '@/modules/Auth.js'
import {} from 'vuex'
import Axios from 'axios'
import * as xmljs from 'xml-js'

export default {
  name: 'MyPage',
  data () {
    return {
      msg: 'My Page',
      showAdmin: false,
      myPageError: false,
      myPageErrorMsg: '',
      // Users
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
        {text: 'Title', align: 'left', value: 'title'}
      ],
      datasetList: [],
      datasetHideSelector: false,
      datasetSelected: null,
      // Samples
      sampleSearch: '',
      sampleHeaders: [
        {text: 'Title', align: 'left', value: 'title'},
        {text: 'Published', align: 'left', value: 'ispublished'},
        {text: 'Public', align: 'left', value: 'isPublic'},
        {text: 'Edit State', align: 'left', value: 'entityState'},
        {text: 'Curate State', align: 'left', value: 'curateState'}
      ],
      sampleList: [],
      samplesHideSelector: false,
      sampleFileAll: true,
      samplefilepagination: {
        sortBy: 'basename'
      },
      sampleFileIndeterminate: false,

      sampleSelected: null,
      sampleObj: '',
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
    Axios.get('/nmr/dataset')
      .then(function (resp) {
        resp.data.data.forEach(function (v) {
          if (v.latestSchema) {
            vm.datasetList.push(v)
          }
        })
      })
      .catch(function (err) {
        vm.myPageError = true
        vm.myPageErrorMsg = 'fetching datasets: ' + err
      })
  },
  computed: {
    // datasets
    headerDOI: function () {
      let rv = null
      let vm = this
      if (vm.datasetSelected) {
        rv = vm.datasetSelected.doi
      }
      return rv
    },
    // samples
    headerSampleName: function () {
      let rv = null
      let vm = this
      if (vm.sampleSelected) {
        rv = vm.sampleSelected.title.replace(/\.xml$/, '')
      }
      return rv
    },
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
    toggleDatasetHide: function () {
      let vm = this
      vm.datasetHideSelector = !vm.datasetHideSelector
    },
    mineOnly: function () {
      let vm = this
      vm.showMineOnly = !vm.showMineOnly
      console.log('showMineOnly is now: ' + vm.showMineOnly)
    },
    datasetClick: function (entry) {
      let vm = this
      console.log('dataset selected: ' + entry.seq)
      vm.datasetSelected = entry
      vm.datasetHideSelector = true
      vm.samplesHideSelector = false
      vm.sampleSelected = null
      vm.sampleFileinfo = []
      vm.setLoading()
      Axios.get('/nmr/xml?dataset=' + entry.seq)
        .then(function (data) {
          // console.log(data.data.data)
          vm.sampleList = data.data.data // Just had to...
          vm.resetLoading()
        })
        .catch(function (err) {
          console.log('Error: ' + err)
          vm.myPageError = true
          vm.myPageErrorMsg = 'loading samples: ' + err
          vm.sampleList = []
          vm.resetLoading()
        })
    },
    // samples
    sampleTreeviewOptions: function () {
      // let vm = this
      // let id = 'Sample Information'
      // if (vm.sample) {
      //   id = vm.sampleIdFromTitle(vm.sampleIdFromTitle(vm.sample.title))
      // }
      return {maxDepth: 99, rootObjectKey: 'PolymerNanocomposite', modifiable: false}
    },
    sampleIdFromTitle: function (title) {
      return title.replace(/\.xml$/, '')
    },
    toggleSamplesHide: function () {
      let vm = this
      vm.samplesHideSelector = !vm.samplesHideSelector
      console.log('samplesHideSelector: ' + vm.samplesHideSelector)
    },
    getDownloadName: function (filename) {
      return '/nmr/blob?bucketname=curateinput&filename=' + filename
    },
    getFilesList: function (sample) {
      let vm = this
      return new Promise(function (resolve, reject) {
        Axios.get('/nmr/dataset/filenames/' + sample.title)
          .then(function (data) {
            vm.sampleFileinfo = data.data.data.files
            if (!vm.sampleFileinfo) {
              vm.sampleFileinfo = []
            }
            vm.sampleFileinfo.forEach(function (v, idx) {
              vm.sampleFileinfo[idx].selected = false // add the field and set it to false
            })
            resolve()
          })
          .catch(function (err) {
            console.log('unable to obtain sample\'s file list. Error: ' + err)
            reject(err)
          })
      })
    },
    sampleFileDownload: function () {
      let vm = this
      console.log('--------')
      vm.sampleFileDownloadSelected.forEach(function (v) {
        console.log('download: ' + v.basename)
        Axios.get('/nmr/blob?bucketname=curateinput&filename=' + v.filename)
          .then(function (data) {
            console.log('downloaded: ' + v.filename)
          })
          .catch(function (err) {
            console.log('error downloading: ' + v.filename + ' error: ' + err)
          })
      })
    },
    sampleFileToggleAll: function () {
      let vm = this
      vm.sampleFileDownloadIndeterminate = false
      if (vm.sampleFileDownloadSelected.length) {
        vm.sampleFileDownloadSelected = []
        vm.sampleFileinfo.forEach(function (v, idx) {
          vm.sampleFileinfo[idx].selected = false
        })
      } else {
        vm.sampleFileDownloadSelected = vm.sampleFileinfo.slice()
        vm.sampleFileinfo.forEach(function (v, idx) {
          vm.sampleFileinfo[idx].selected = true
        })
      }
      console.log('sample files selected: ' + JSON.stringify(vm.sampleFileDownloadSelected))
    },
    sampleFileSelect: function (filename) {
      let vm = this
      vm.sampleFileDownloadIndeterminate = true
      vm.sampleFileinfo.forEach(function (v, idx) {
        if (v.filename === filename) {
          vm.sampleFileinfo[idx].selected = !vm.sampleFileinfo[idx].selected
          console.log('selected: ' + JSON.stringify(vm.sampleFileinfo[idx]))
        }
      })
    },
    sampleFileChangeSort: function (column) {
      console.log('sampleFileChangeSort: ' + column)
      if (this.samplefilepagination.sortBy === column) {
        this.samplefilepagination.descending = !this.samplefilepagination.descending
      } else {
        this.samplefilepagination.sortBy = column
        this.samplefilepagination.descending = false
      }
    },
    sampleClick: function (sample) {
      let func = 'sampleClick'
      let vm = this
      vm.setLoading()
      setTimeout(function () {
        vm.sampleFileinfo = []
        vm.samplesHideSelector = true
        console.log('sampleClick - title: ' + sample.title + ' ' + sample.schemaId)
        vm.sampleSelected = sample
        vm.getFilesList(sample)
          .then(function () {
            try {
              vm.sampleObj = xmljs.xml2js(sample.xml_str, {
                'compact': true,
                ignoreDeclaration: true,
                ignoreAttributes: true
              })
              if (vm.sampleObj['PolymerNanocomposite']) {
                vm.sampleObj = vm.sampleObj.PolymerNanocomposite
              }
            } catch (err) { // L138_S1
              console.log('error occurred attempting to xml to json convert sample: ' + sample.title + ' ' + sample.schemaId + ' err: ' + err)
              vm.sampleObj = {'Error': 'Unable to display: ' + sample.title}
            }
            console.log(vm.sampleObj)
            // delete vm.sampleObj['_declaration']
            window.sampleObj = vm.sampleObj
            // let indent = 2
            // vm.sample2Tree(vm.sampleObj, vm.sampleTree, indent)
            vm.resetLoading()
          })
          .catch(function (err) {
            let msg = func + ' - error loading sample files.' + err
            console.log(msg)
            vm.myPageError = true
            vm.myPageErrorMsg = msg
            vm.resetLoading()
          })
      }, 20)
    },
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
    padding-top:2px;
    padding-bottom:2px;
    width:100%;
  }

  .admin-header {
    background-color: #03A9F4;
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

  .samples-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }
  .sample-file-download-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }
  .download-footer {
    background-color: #03A9F4;
    color: #000000;
    font-size: 22px;
    font-weight: bold;
  }

</style>
