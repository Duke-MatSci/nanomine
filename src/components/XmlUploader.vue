<template>
  <div class="xml-uploader">
    <h1>{{ msg }}</h1>
    <v-container grid-list-xl>
      <v-alert
        v-model="adminError"
        type="error"
      >
        {{adminErrorMsg}}
      </v-alert>
      <v-alert
        v-model="uploadError"
        type="error"
        dismissible
      >
        {{uploadErrorMsg}}
      </v-alert>
      <v-alert
        v-model="submittedJobAlert"
        type="success"
        dismissible
      >
        {{submittedJobMsg}}
      </v-alert>
      <v-layout row wrap>
        <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
          <p class="text-xs-left">Select XML files to upload
            <v-btn class="text-xs-left" small color="primary" @click='pickFile'>Browse</v-btn>
            <input
              type="file"
              style="display: none"
              :multiple="true"
              accept=".xml"
              ref="xmlfilebrowser"
              @change="onFilePicked"
            >
          </p>
          <v-list v-model="xmlFiles" subheader="true">
            <v-list
              v-for="(file, idx) in xmlFiles"
              :key="file.fileName"
            >
              <v-list-tile
                v-if="dsInfo(idx)['isFirst']"
                :key="dsInfo(idx)['dsid']"
              >
                <v-subheader>
                  Dataset {{ dsInfo(idx)['dsid'] }}
                </v-subheader>
                <v-btn color="primary" @click="selectUseIdForDs(idx)" v-if="!isReassigned(idx)&&!isUseIdForDs(idx)">Use ID for Dataset Sequence</v-btn>
<!--                <v-btn color="primary" @click="reassign(idx)" v-if="!isReassigned(idx)&&!isUseIdForDs(idx)">Assign new Dataset ID</v-btn>-->
                <v-list-tile-title v-if="!uploaded(idx) && isUseIdForDs(idx)">Will use ID for DS {{ dsInfo(idx)['dsid'] }}</v-list-tile-title>
<!--                <v-list-tile-title v-else-if="!uploaded(idx) && reassign(idx)">Will Reassign New DS ID</v-list-tile-title>-->
<!--                <v-list-tile-title v-else>DS reassigned to {{ getNewDsid(idx) }}</v-list-tile-title>-->
                <v-btn @click="upload(idx)" v-if="(isReassigned(idx) || isUseIdForDs(idx)) && !uploaded(idx)">Upload</v-btn>
              </v-list-tile>
              <v-divider
                v-if="dsInfo(idx)['isFirst']"
                :key="idx"
                :inset="false"
              ></v-divider>
              <v-list-tile>
                <v-list-tile-avatar>
                  <v-icon color="primary">check_box_outline_blank</v-icon>
                </v-list-tile-avatar>
                <v-list-tile-content>
                  <v-list-tile-title>{{ file.fileName }}</v-list-tile-title>
                  <v-list-tile-sub-title v-if="isReassigned(idx)">New name: {{ file.newFileName }}</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
            </v-list>
          </v-list>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
// import Vue from 'vue'
import {Auth} from '@/modules/Auth.js'
// import * as xmljs from 'xml-js'
import * as _ from 'lodash'
import Axios from 'axios'
import {JobMgr} from '@/modules/JobMgr.js'

/*
  This code uploads all files selected to a directory on the server named by jobid
   and starts a job to update the files in the db along with creating a new dataset if necessary.
 */
export default {
  name: 'XmlUploader',
  data () {
    return {
      msg: 'XML Uploader',
      adminErrorMsg: 'Administrative authority is required for this function',
      uploadError: false,
      uploadErrorMsg: '',
      submittedJobAlert: false,
      submittedJobMsg: '',
      xmlFiles: []
    }
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
  },
  computed: {
    adminError: function () {
      return !this.isAdmin()
    }
  },
  methods: {
    dsInfo: function (idx) {
      let vm = this
      // console.log('idx: ' + JSON.stringify(idx))
      let dsid = vm.xmlFiles[idx].dsid
      let isFirst = (idx === 0)
      if (idx > 0) {
        isFirst = !(vm.xmlFiles[idx - 1].dsid === dsid)
      }
      let cuType = vm.xmlFiles[idx].cuType
      return ({
        dsid: dsid,
        isFirst: isFirst,
        createOrUpdateType: cuType
      })
    },
    matchValidXmlTitle (title) {
      // console.log('matchValidXmlTitle: ' + title)
      // Evil copy of rest/modules/utils.js version -- need to refactor -- TODO
      let rv = title.match(/^[A-Z]([0-9]+)[_][S]([0-9]+)[_]([\S]+)[_](\d{4})([.][Xx][Mm][Ll])?$/) // e.g. L183_S12_Poetschke_2003.xml
      return rv
    },
    isAdmin: function () {
      let vm = this
      return vm.auth.isAdmin()
    },
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    resetXmlFiles () {
      this.xmlFiles = []
    },
    pickFile () {
      let vm = this
      vm.$refs.xmlfilebrowser.click()
    },
    onFilePicked (e) {
      let vm = this
      vm.setLoading()
      console.log('on file picked')
      vm.resetXmlFiles()
      let newFiles = []
      const files = e.target.files
      let loadPromises = []
      for (let i = 0; i < files.length; i++) {
        let file = {}
        let f = files[i]
        if (f !== undefined) {
          file.fileName = f.name.toUpperCase()
          if (file.fileName.lastIndexOf('.') <= 0) {
            return
          }
          const fr = new FileReader()
          let loaderPromise = new Promise(function (resolve, reject) {
            fr.addEventListener('load', function () {
              file.xml = fr.result
              file.error = false
              let m = vm.matchValidXmlTitle(file.fileName)
              if (m) {
                file.dsid = +(m[1])
              } else {
                console.log('there is an issue with file: ' + file.fileName + '. The title is invalid.')
                file.error = true
                file.dsid = -1
              }
              // let json = xmljs.xml2js(file.xml)
              // console.log('type of json: ' + typeof json)
              // console.log('Processing: ' + JSON.stringify(file))
              // file.ID = vm.getID(json)
              // console.log('ID: ' + file.ID)
              // file.controlID = vm.getControlID(json)
              // console.log('Control_ID: ' + file.controlID)
              // console.log('DOI: ' + vm.getDOI(json))
              // console.log('relatedDOI: ' + vm.getRelatedDOI(json))
              newFiles.push(file)
              resolve()
            })
          })
          loadPromises.push(loaderPromise)
          // fr.readAsText(f)
          fr.readAsDataURL(f)
          // vm.xmlFiles.push(file) // needs to be inside callback if callback is used
        } else {
          console.log('File Undefined')
        }
      }
      console.log('Before waiting loadPromises.length = ' + loadPromises.length)
      Promise.all(loadPromises).then(function (values) {
        console.log('Loading done. files = ' + loadPromises.length)
        vm.xmlFiles = newFiles.sort(function (a, b) {
          let dsa = a.dsid
          let dsb = b.dsid
          if (+(dsa) < +(dsb)) return -1
          else if (+(dsa) > +(dsb)) return 1
          else return 0
        })
        window.xmlFiles = vm.xmlFiles
        vm.resetLoading()
      })
    },
    setAllReassign (dsid) {
      let vm = this
      vm.xmlFiles.forEach(function (v, idx) {
        if (v.dsid === dsid) {
          vm.$set(vm.xmlFiles[idx], 'reassign', true) // ensure that Vue know about the new property to trigger GUI update
        }
      })
    },
    setAllUseIdForDs (dsid) {
      let vm = this
      vm.xmlFiles.forEach(function (v, idx) {
        if (v.dsid === dsid) {
          vm.$set(vm.xmlFiles[idx], 'createDsType', 'useId') // ensure that Vue know about the new property to trigger GUI update
        }
      })
    },
    isUseIdForDs (idx) {
      let vm = this
      return vm.xmlFiles[idx].createDsType === 'useId'
    },
    isReassigned (idx) {
      let vm = this
      return vm.xmlFiles[idx].reassign
    },
    uploaded (idx) {
      let vm = this
      return vm.xmlFiles[idx].uploaded
    },
    replaceDatasetId (id, newDsid) {
      // given an id of the regex form .[0-9]{n}_S[0-9]{n}_AUTHOR_YYYY replace the dsid component (first set of number)
      let vm = this
      let newId = null
      let m = vm.matchValidXmlTitle(id)
      if (m) {
        let oldDsid = m[1]
        newId = id[0] + newDsid + '_S' + m[2] + '_' + m[3] + '_' + m[4]
        console.log('oldId: ' + id + ' old dsid: ' + oldDsid + ' new id: ' + newId)
      }
      return newId
    },
    getNewDsid (idx) {
      let vm = this
      return vm.xmlFiles[idx].newDsid
    },
    upload (idx) {
      // uploads all xmls with the same dataset id
      let vm = this
      vm.setLoading()
      let dsid = vm.xmlFiles[idx].dsid
      let dsInfo = {
        seq: dsid,
        isPublic: true, // SPECIAL CASE for now
        datasetComment: 'XmlUploader create dataset for: ' + dsid
      }
      Axios.post('/nmr/dataset/create', {dsInfo: dsInfo})
        .then(function (result) {
        // let data = {}
        // data.remap = true
        // data.xmls = []
        //
          // console.log(result)
          let jobParameters = {
            datasetId: result.data.data.datasetId,
            datasetCreateOrUpdateType: vm.xmlFiles[idx]['createDsType'], // remap or useId
            files: []
          }
          vm.xmlFiles.forEach(function (v, idx) {
            if (v.dsid === dsid) {
            // data.xmls.push(v.xml)
              jobParameters.files.push(v.fileName)
            }
          })
          console.log('Submitting job.')
          let jm = new JobMgr()
          jm.setJobType('curateDatasetUpload')
          jm.setJobParameters(jobParameters)
          vm.xmlFiles.forEach(function (v) {
            if (v.dsid === dsid) {
              jm.addInputFile(v.fileName, v.xml) // xml is really a data url
            }
          })
          return jm.submitJob(function (jobId) {
            console.log('Success! JobId is: ' + jobId)
            vm.submittedJobAlert = true
            vm.submittedJobMsg = 'CurateDatasetUpload job submitted.  JobID: ' + jobId
            vm.xmlFiles.forEach(function (v, i) {
              if (v.dsid === dsid) {
                vm.$set(vm.xmlFiles[i], 'uploaded', true) // ensure GUI reacts to change
              }
            })
            vm.resetLoading()
          }, function (errCode, errMsg) {
            console.log('error: ' + errCode + ' msg: ' + errMsg)
            vm.uploadError = true
            vm.uploadErrorMsg = 'Error submitting files for upload: errCode: ' + errCode + ' msg: ' + errMsg
            vm.resetLoading()
          })
        })
        .catch(function (err) {
          let msg = 'error creating dataset.' + err
          console.log(msg)
          vm.uploadError = true
          vm.uploadErrorMsg = msg
          vm.resetLoading()
        })
    },
    selectUseIdForDs (idx) {
      let vm = this
      vm.setLoading()
      console.log('select Create Dataset files for dataset: ' + vm.xmlFiles[idx].dsid + ' to create ds using id.')
      vm.$nextTick(function () {
        vm.setAllUseIdForDs(vm.xmlFiles[idx].dsid)
        vm.resetLoading()
      })
    },
    reassign (idx) {
      let vm = this
      vm.setLoading()
      console.log('reassign files for dataset: ' + vm.xmlFiles[idx].dsid + ' to new dataset id.')
      vm.$nextTick(function () {
        vm.setAllReassign(vm.xmlFiles[idx].dsid)
        vm.resetLoading()
      })
    },
    getNamedElement (curElem, name) {
      let rv = _.find(curElem, {'name': name})
      // console.log('getNamedElement(' + name + ') returning: ' + JSON.stringify(rv))
      if (!rv) {
        console.log('getNamedElement(' + name + ') not found')
      }
      return rv
    },
    getElement (json, path) {
      let vm = this
      let rv = null
      let cv = json
      if (typeof path === 'string' && path.length > 0) {
        cv = json
        // console.log('initially cv = ' + JSON.stringify(cv))
        let pc = path.split('.') // path components
        for (let i = 0; i < pc.length; ++i) {
          cv = vm.getNamedElement(cv.elements, pc[i])
        }
        rv = cv
      }
      return rv
    },
    getElementText (json, field) {
      let rv = null
      try {
        rv = this.getElement(json, field).elements[0].text
      } catch (ex) {
        console.log('unable to get ' + field)
      }
      return rv
    },
    getID (json) {
      let rv = this.getElementText(json, 'PolymerNanocomposite.ID')
      return rv
    },
    setID (json, newId) {
      this.setElementText(json, 'PolymerNanocomposite.ID', newId)
    },
    getControlID (json) {
      let rv = this.getElementText(json, 'PolymerNanocomposite.Control_ID')
      return rv
    },
    getDOI (json) {
      let rv = this.getElementText(json, 'PolymerNanocomposite.DATA_SOURCE.Citation.CommonFields.DOI')
      return rv
    },
    getRelatedDOI (json) {
      let rv = this.getElementText(json, 'PolymerNanocomposite.DATA_SOURCE.LabGenerated.relatedDOI')
      return rv
    }
  }
}
</script>

<style scoped>
  img {
    width: 50px;
    height: auto;
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
