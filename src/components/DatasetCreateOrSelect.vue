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
  </div>
</template>

<script>
import {} from 'vuex'
import Axios from 'axios'
// import {Auth} from '@/modules/Auth.js'

export default {
  name: 'DatasetCreateOrSelect',
  data () {
    return {
      msg: 'Hi',
      datasetsError: false,
      datasetsErrorMsg: '',
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
      headerDOI: null
    }
  },
  computed: {
    datasetsHeaderTitle () {
      return 'Dataset: '
    },
    datasetsHeaderInfoIcon () {
      let vm = this
      let rv = false
      if (vm.datasetSelected) {
        rv = true
      }
      return rv
    }
  },
  beforeMount () {
    let vm = this
    vm.getDatasets()
  },
  methods: {
    isLoggedIn () {
    },
    toggleDatasetHide () {
      let vm = this
      vm.datasetHideSelector = !vm.datasetHideSelector
      vm.datasetSelected = null
    },
    datasetsFiltered () {
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
        })
        .catch(function (err) {
          vm.datasetsError = true
          vm.datasetsErrorMsg = 'fetching datasets: ' + err
        })
    }
  }

}
</script>

<style scoped>
  .datasets {
  }
</style>
