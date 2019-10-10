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
                <v-btn color="primary" @click="reassign(idx)" v-if="!isReassigned(idx)">Reassign new DS</v-btn>
                <v-list-tile-title v-else-if="!uploaded(idx)">Will Reassign New DS</v-list-tile-title>
                <v-list-tile-title v-else>DS reassigned to {{ getNewDsid(idx) }}</v-list-tile-title>
                <v-btn @click="upload(idx)" v-if="isReassigned(idx) && !uploaded(idx)">Upload</v-btn>
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
// import Axios from 'axios'
import {JobMgr} from '@/modules/JobMgr.js'

/*
  WARNING WARNING WARNING
  NOTE: changing this code to simply upload to a url that knows to re-map all the data into new datasets

  The following discussion is relevant, but the client side does not do all of this any longer...
  For now, this code executes a degenerate scenario to get a few specific XML files uploaded that have a few issues:
    1. They all need new datasets assigned
    2. There are NO DOIs
    3. There's a related DOI field that's never been utilized before
 The current goal is NOT a generic XML uplaoder that can handle all problems and ...
    the approach should probably not be fully done as a set of Client-server interactions in the future as it is done
      here as both a test of some client-side xml updating and a way to get the data uploaded quickly.
      A better design is needed, but this code should help flush out some thoughts.
  So, do not use this code as a generic XML uploader. It needs way, way more work.
  General process for these XMLs that can be handled.
    1. Load the XMLs into memory
    2. For each set by current Dataset id, create a new dataset with as much info as available from the XMLs which
        also requires an unpublished DOI e.g. unpublished/RANDOM_SHORT_ID
    3. update the affected set of XMLs to reflect the new data set number
    4. iterate over all the sets of datasets i.e. all the xmls until done
    5. Upload the modified XMLs
  Issues:
    1. There is no DOI in the XML set being uploaded, so they'll need unpublished temporary DOIs
      1a. Also note that the Dataset information will be very lean for these XMLs as they have little/no provenance information
    2. Must ensure that the ID and  control_ID fields of the XML are set correctly before upload
    3. New filenames should be generated according to the new ID for upload
    4. IMPORTANT: once the files are uploaded, they should not be re-uploaded using this approach, or duplicate
         data will be created and it will not be clear that the data are duplicate nor which records are duplicated
         by the new data.
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
      return {
        dsid: dsid,
        isFirst: isFirst
      }
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
      // let data = {}
      // data.remap = true
      // data.xmls = []
      let jobParameters = {
        remapdataset: true,
        files: [
        ]
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
        vm.resetLoading()
      }, function (errCode, errMsg) {
        console.log('error: ' + errCode + ' msg: ' + errMsg)
        vm.uploadError = true
        vm.uploadErrorMsg = 'Error submitting files for upload: errCode: ' + errCode + ' msg: ' + errMsg
        vm.resetLoading()
      })

      // Axios.post('/nmr/curate/dsupload', data)
      //   .then(function (resp) {
      //     console.log(resp)
      //     let newDsid = resp.data.data.seq // dataset info is sent back
      //     console.log('New dataset id: ' + newDsid)
      //     vm.xmlFiles.forEach(function (v, idx) {
      //       if (v.dsid === dsid) {
      //         vm.$set(vm.xmlFiles[idx], 'uploaded', true)
      //         let newFilename = vm.replaceDatasetId(v.fileName, newDsid)
      //         vm.$set(vm.xmlFiles[idx], 'newFileName', newFilename)
      //         vm.$set(vm.xmlFiles[idx], 'newDsid', newDsid)
      //       }
      //     })
      //     vm.resetLoading()
      //   })
      //   .catch(function (err) {
      //     let msg = 'upload error: ' + err
      //     if (err.response.data.error && typeof err.response.data.error === 'string') {
      //       msg += ' msg:' + err.response.data.error
      //     }
      //     console.log(msg)
      //     vm.uploadErrorMsg = msg
      //     vm.uploadError = true
      //     vm.resetLoading()
      //   })
    },
    reassign (idx) {
      let vm = this
      vm.setLoading()
      console.log('reassign files for dataset: ' + vm.xmlFiles[idx].dsid + ' to new dataset id.')
      vm.$nextTick(function () {
        vm.setAllReassign(vm.xmlFiles[idx].dsid)
        // let oldDsid = vm.xmlFiles[idx].dsid

        // get indexes of records to reassign
        // let indexes = vm.getIndexes(oldDsid)
        // console.log('Count of files to re-assign: ' + indexes.length)

        // create new dataset id for use in filenames, IDs and Control_IDs
        // let newDsid = Math.floor(Math.random() * 250) + 300
        // run this synchronous operation asynchronously to leverage loader spinner (otherwise it doesn't show)
        // vm.xmlFiles.forEach(function (v, idx) { // cannot do this with data urls
        //   if (v.dsid === oldDsid) {
        //     let json = xmljs.xml2js(v.xml)
        //     console.log('  old ID: ' + vm.getID(json))
        //     console.log('  old Control ID: ' + vm.getControlID(json))
        //     console.log('  old DOI:  ' + vm.getDOI(json))
        //     console.log('  relatedDOI: ' + vm.getRelatedDOI(json))
        //   }
        // })
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
