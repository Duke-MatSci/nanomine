<template>
  <div class="datasets">
    <v-alert
      v-model="datasetsError"
      type="error"
      dismissible
    >
      {{datasetsErrorMsg}}
    </v-alert>
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
      <v-card xs6 v-if="addDatasetDialogActive">
        <v-text-field v-model="addDatasetComment" label="Enter a comment to describe this dataset as uniquely as possible"></v-text-field>
        <v-btn @click="addDatasetDialogActive=false; addDatasetComment=''" small>Cancel</v-btn>
        <v-btn @click="addDatasetSave()" small color="primary" class="white--text">Save</v-btn>
      </v-card>
      <v-card-title v-show="!datasetHideSelector">
        <span v-if="mineOnlyAlways" class="font-weight-black">Datasets you've created</span>
        <v-checkbox
          v-if="isLoggedIn() && !mineOnlyAlways"
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
      <v-data-table v-show="!datasetHideSelector" :headers="datasetHeaders" :items="datasetsFiltered" :search="datasetSearch">
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

  </div>
</template>

<script>
import {} from 'vuex'
import Axios from 'axios'
import {Auth} from '@/modules/Auth.js'
import * as _ from 'lodash'

export default {
  name: 'DatasetCreateOrSelect',
  props: {
    datasetOptions: { // Valid options: {mineOnly: 'true'|'false'|'always'}
      type: Object,
      default: () => {
        return {}
      }
    },
    selectHeader: {
      type: String,
      default: 'Choose a dataset'
    },
    selectedHandler: {
      type: Function,
      default: null
    }
  },
  data () {
    return {
      msg: 'Hi',
      showMineOnly: true,
      mineOnlyAlways: false,
      addDatasetDialogActive: false,
      addDatasetComment: '',
      datasetsError: false,
      datasetsErrorMsg: '',
      datasetTransformed: {},
      datasetHideSelector: true,
      datasetList: [],
      datasetSearch: null,
      datasetHeaders: [
        {text: 'ID', align: 'left', value: 'seq'},
        {text: 'DOI', align: 'left', value: 'doi'},
        {text: 'Title', align: 'left', value: 'title'},
        {text: 'Comment', align: 'left', value: 'datasetComment'}
      ],

      datasetSelected: null,
      datasetInfoDialogActive: false,
      datasetDialogInfo: {}
    }
  },
  watch: {
    datasetOptions: function (options) {
      let vm = this
      if (options) {
        vm.overrideOptions(vm.datasetOptions)
      } else {
        vm.datasetOptions = {}
      }
    }
  },
  computed: {
    datasetsFiltered () {
      let rv = true
      let vm = this
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
    },
    datasetsHeaderTitle () {
      let vm = this
      let rv = null
      if (vm.datasetSelected) {
        rv = 'Selected Dataset:'
      } else {
        rv = vm.selectHeader
      }
      return rv
    },
    datasetsHeaderInfoIcon () {
      let vm = this
      let rv = false
      if (vm.datasetSelected) {
        rv = true
      }
      return rv
    },
    headerDOI () {
      let rv = null
      let vm = this
      if (vm.datasetSelected) {
        rv = vm.datasetSelected.doi
        if (!rv || rv.length < 1 || rv === 'unpublished-initial-create') { // TODO need a remote config call to get values like this from server
          rv = vm.datasetSelected.datasetComment
        }
      }
      return rv
    }
  },
  beforeMount () {
    let vm = this
    vm.auth = new Auth()
    vm.getDatasets()
    vm.overrideOptions(vm.datasetOptions)
  },
  methods: {
    overrideOptions (datasetOptions) {
      let vm = this
      console.log('overriding datasetOptions: ' + JSON.stringify(datasetOptions))
      vm.mineOnlyAlways = false
      if (datasetOptions.mineOnly === 'always') {
        vm.mineOnlyAlways = true
        vm.mineOnly = true
      } else if (datasetOptions.mineOnly === 'true') {
        vm.mineOnly = true
      } else {
        vm.mineOnly = false
      }
    },
    isLoggedIn () {
      let vm = this
      return vm.auth.isLoggedIn()
    },
    datasetInfoDialog: function () {
      let vm = this
      vm.datasetInfoDialogActive = true
    },
    toggleDatasetHide () {
      let vm = this
      vm.datasetHideSelector = !vm.datasetHideSelector
      vm.datasetSelected = null
      if (vm.selectedHandler && typeof vm.selectedHandler === 'function') {
        vm.selectedHandler(vm.datasetSelected)
      }
    },
    getDatasets () {
      let vm = this
      Axios.get('/nmr/dataset', {
        params: {}
      })
        .then(function (resp) {
          resp.data.data.forEach(function (v) {
            vm.datasetList.push(v)
          })
          vm.resetLoading()
        })
        .catch(function (err) {
          vm.datasetsError = true
          vm.datasetsErrorMsg = 'fetching datasets: ' + err
          vm.resetLoading()
        })
    },
    transformDataset (entry) {
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
    datasetClick (entry) {
      let vm = this
      console.log('dataset selected: ' + entry.seq)
      vm.datasetSelected = entry
      vm.datasetTransformed = vm.transformDataset(entry)
      console.log(JSON.stringify(vm.datasetTransformed))
      vm.datasetHideSelector = true
      vm.filesetsList = vm.datasetSelected.filesets
      vm.Selected = null
      vm.datasetsError = false
      vm.datasetsErrorMsg = ''
      if (vm.selectedHandler && typeof vm.selectedHandler === 'function') {
        vm.selectedHandler(vm.datasetSelected)
      }
    },
    addDataset () {
      let vm = this
      vm.addDatasetDialogActive = !vm.addDatasetDialogActive
    },
    addDatasetSave () {
      let vm = this
      let comment = vm.addDatasetComment
      vm.setLoading()
      Axios.post('/nmr/dataset/create', {dsInfo: {datasetComment: comment}})
        .then(function (resp) {
          console.log(resp.data)
          vm.addDatasetComment = ''
          vm.datasetsError = false
          vm.datasetsErrorMsg = ''
          vm.addDatasetDialogActive = false
          vm.getDatasets()
        })
        .catch(function (err) {
          console.log(err.message)
          vm.datasetsError = true
          vm.datasetsErrorMsg = err.message
          vm.resetLoading()
        })
    },
    // utils
    setLoading () {
      this.$store.commit('isLoading')
    },
    resetLoading () {
      this.$store.commit('notLoading')
    }

  }

}
</script>

<style scoped>
  .datasets {
  }

  .dataset-header {
    background-color: #03A9F4;
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
  }

</style>
