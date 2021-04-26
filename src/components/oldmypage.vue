<template>
  <div class="main">
    <v-flex class="mypage">
      <h1><i class="material-icons">ballot</i> Reports</h1>
      <h1><i class="material-icons">laptop</i> Administrative Tools</h1>
      <h1><i class="material-icons">dashboard</i> Featured Tools + Resources</h1>
      <v-container grid-list-xl>
      </v-container>
    </v-flex>
  </div>
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
        {text: '', align: 'left', value: 'null'},
        {text: '', align: 'left', value: 'null'},
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
        sortBy: 'metadata.filename'
      },
      headerFileName: null,
      fileSelected: null,
      fileObj: '',
      fileImageDataUri: '',
      filesDialogActive: false,
      filesDownloadIndeterminate: false,
      filesDownloadSelected: [],
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
    logDebug (msg) {
      console.log(msg)
    },
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
              let schemaId = v.currentRef._id
              let title = v.currentRef.title
              vm.schemas.push({'schemaId': schemaId, 'title': title})
              vm.logDebug('schemaId: ' + schemaId + ' title: ' + title)
            })
            vm.selectedSchemaTitle = vm.schemas.title
            vm.selectedSchemaId = vm.schemas.schemaId
            resolve()
          })
          .catch(function (err) {
            vm.logDebug('error getting schemas: ' + err)
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
          vm.logDebug(resp.data)
          vm.resetSchemaError()
          vm.setSchemaSuccess(vm.schemaFileName + ' uploaded successfully.')
          vm.schemaFileName = ''
          vm.schemaFileText = ''
          vm.getActiveSchemas()
            .then(function () {
              vm.logDebug('re-read schemas successfully.')
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
      vm.logDebug('selected schema schemaId: ' + vm.selectedSchemaId + ' title: ' + vm.selectedSchemaTitle)
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
          vm.logDebug(vm.schemaFileText)
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
      vm.logDebug('users selected: ' + JSON.stringify(vm.userselected))
      vm.userselected = []
      vm.userindeterminate = false
      vm.users.forEach(function (v) {
        v.selected = false
      })
      vm.auth.resetRunAsUser()
    },
    usersChangeSort: function (column) {
      let vm = this
      vm.logDebug('usersChangeSort: ' + column)
      if (this.userpagination.sortBy === column) {
        this.userpagination.descending = !this.userpagination.descending
      } else {
        this.userpagination.sortBy = column
        this.userpagination.descending = false
      }
    },
    userSelect: function (userid) {
      let vm = this
      vm.logDebug('selected: ' + userid)
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
      vm.logDebug('showMineOnly is now: ' + vm.showMineOnly)
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
      vm.logDebug('dataset selected: ' + entry.seq)
      vm.datasetSelected = entry
      vm.datasetTransformed = vm.transformDataset(entry)
      vm.logDebug(JSON.stringify(vm.datasetTransformed))
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
      vm.logDebug(func + ' - ' + JSON.stringify(fileset))
      vm.filesetSelected = fileset
      if (fileset) {
        vm.filesList = fileset.files
      } else {
        vm.filesList = []
      }
      vm.filesList.forEach(function (v, idx) {
        vm.filesList[idx].selected = false // add the field and set it to false
      })
      vm.logDebug('filesList: ' + JSON.stringify(vm.filesList))
      vm.filesHideSelector = false
      vm.headerFilesetName = fileset.fileset
      vm.filesList = fileset.files
      vm.filesetsHideSelector = true
    },

    // samples / files
    getFileFilename: function (item) {
      let vm = this
      let rv = 'N/A'
      vm.logDebug('getFileFilename item: ' + JSON.stringify(item) + ' type of item: ' + typeof item)
      if (item.metadata && item.metadata.filename) {
        rv = item.metadata.filename
      }
      vm.logDebug('getFileFilename rv: ' + rv)
      return rv
    },
    isFileSampleXml (item) {
      return item.type === 'xmldata'
    },
    isFileTemplateXls (item) {
      return item.metadata && item.metadata.is_completed_pnc_template
    },
    isFileViewable (item) {
      let vm = this
      let rv = false
      let viewable = ['PNG', 'JPG', 'XML']
      let displayType = vm.getFileDisplayType(item)
      let typeViewable = viewable.includes(displayType)
      if (displayType === 'XML') {
        rv = vm.isFileSampleXml(item)
      } else {
        rv = typeViewable
      }
      return rv
    },
    getFileDisplayType (item) {
      let vm = this
      let cv = vm.getFileContentType(item)
      let rv = cv
      if (cv.match(/[Tt][Ii][Ff]/)) {
        rv = 'TIFF'
      }
      if (cv.match(/[Tt][Ee][Xx][Tt]/)) {
        rv = 'TEXT'
      }
      if (cv.match(/[Cc][Ss][Vv]/)) {
        rv = 'CSV'
      }
      if (cv.match(/[Xx][Mm][Ll]/)) { // needs to come before xls check
        rv = 'XML'
      }
      if (cv.match(/[Xx][Ll][Ss]/)) {
        rv = 'Spreadsheet'
      }
      if (cv.match(/spreadsheet/)) {
        rv = 'Spreadsheet'
      }
      if (cv.match(/[Jj][Ss][Oo][Nn]/)) {
        rv = 'JSON'
      }
      if (cv.match(/[Pp][Nn][Gg]/)) {
        rv = 'PNG'
      }
      if (cv.match(/([Jj][Pp][Gg])|([Jj][Pp][Ee][Gg])/)) {
        rv = 'JPG'
      }
      if (rv === 'Spreadsheet' && vm.isFileTemplateXls(item)) {
        rv = 'Template Spreadsheet'
      }
      vm.logDebug('getFileDisplayType: ' + rv)
      return rv
    },
    getFileContentType: function (item) {
      let vm = this
      let rv = 'N/A'
      vm.logDebug('getFileContentType item: ' + JSON.stringify(item) + ' type of item: ' + typeof item)
      if (item.metadata && item.metadata.contentType) {
        rv = item.metadata.contentType
      }
      vm.logDebug('getFileContentType rv: ' + rv)
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
      vm.logDebug('filesetsHideSelector: ' + vm.filesetsHideSelector)
    },
    getDownloadName (fileInfo) {
      let vm = this
      let rv = ''
      let func = 'getDownloadName'
      vm.logDebug(func + ': ' + JSON.stringify(fileInfo))
      if (fileInfo.type === 'blob') {
        if (fileInfo.metadata.is_completed_pnc_template) {
          vm.logDebug('Template!')
        }
        rv = '/nmr/blob?id=' + fileInfo.id
      } else if (fileInfo.type === 'xmldata') {
        rv = '/nmr/xml?id=' + fileInfo.id + '&format=xml'
      }
      vm.logDebug(func + ' - rv = ' + rv)
      return rv
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
      vm.logDebug('filesHideSelector: ' + vm.filesHideSelector)
    },
    getXmlData: function (fileInfo) {
      // file info is assumed to be the fileset/file info from the dataset
      let func = 'getXmlData'
      let vm = this
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
              vm.logDebug(msg)
              reject(err)
            })
        }
      })
    },
    getBlobData: function (fileInfo) {
      // fileInfo is assumed to be the fileset/file info from the dataset
      let vm = this
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
            vm.logDebug('name: ' + fileInfo.nameFromHeader + ' content-type ' + fileInfo.contentTypeFromHeader)
            resolve(fileInfo)
          })
          .catch(function (err) {
            let msg = 'unable to retrieve blob id: ' + id + ' error: ' + err.message
            vm.logDebug(msg)
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
    //         vm.logDebug('unable to obtain sample\'s file list. Error: ' + err)
    //         reject(err)
    //       })
    //   })
    // },
    // sampleFileDownload: function () {
    //   let vm = this
    //   vm.logDebug('--------')
    //   vm.filesDownloadSelected.forEach(function (v) {
    //     vm.logDebug('download: ' + v.basename)
    //     Axios.get('/nmr/blob?bucketname=curateinput&filename=' + v.filename)
    //       .then(function (data) {
    //         vm.logDebug('downloaded: ' + v.filename)
    //       })
    //       .catch(function (err) {
    //         vm.logDebug('error downloading: ' + v.filename + ' error: ' + err)
    //       })
    //   })
    // },
    sampleFileToggleAll: function () {
      let vm = this
      vm.filesDownloadIndeterminate = false
      if (vm.filesDownloadSelected.length) {
        vm.filesDownloadSelected = []
        vm.filesList.forEach(function (v, idx) {
          vm.filesList[idx].selected = false
        })
      } else {
        vm.filesDownloadSelected = vm.filesList.slice()
        vm.filesList.forEach(function (v, idx) {
          vm.filesList[idx].selected = true
        })
      }
      vm.logDebug('sample files selected: ' + JSON.stringify(vm.filesDownloadSelected))
    },
    fileSelectForDownload: function (filename) {
      let vm = this
      vm.filesDownloadIndeterminate = true
      vm.filesList.forEach(function (v, idx) {
        if (v.metadata.filename === filename) {
          vm.filesList[idx].selected = !vm.filesList[idx].selected
          vm.logDebug('selected: ' + JSON.stringify(vm.filesList[idx]))
        }
      })
    },
    filesChangeSort: function (column) {
      let vm = this
      vm.logDebug('filesChangeSort: ' + column)
      if (vm.filespagination.sortBy === column) {
        vm.filespagination.descending = !vm.filespagination.descending
      } else {
        vm.filespagination.sortBy = column
        vm.filespagination.descending = false
      }
    },
    fileClick: function (file) {
      let func = 'fileClick'
      let vm = this
      vm.logDebug(func + ' - ' + JSON.stringify(file))
      vm.fileSelected = file
      vm.headerFileName = file.metadata.filename
      vm.filesHideSelector = true
      let p = null
      switch (file.type) {
        case 'blob':
          vm.logDebug('file is blob')
          vm.setLoading()
          p = vm.getBlobData(file)
          break
        case 'xmldata':
          vm.logDebug('file is xmldata')
          vm.setLoading()
          p = vm.getXmlData(file)
          break
        default:
          vm.logDebug('file is unknown type')
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
                  // vm.logDebug('ab = ' + ab)
                  // --b64 = btoa(String.fromCharCode.apply(null, ab))
                  // b64 = btoa(ab)
                  // vm.logDebug('new b64: ' + b64)
                  b64 = base64js.fromByteArray(ab)
                } catch (err) {
                  // vm.logDebug('data: ' + fileInfo.fileData.toString() + ' length: ' + fileInfo.fileData.byteLength)
                  let msg = 'Error viewing file. Error: ' + err.message
                  vm.fileError = true
                  vm.fileErrorMsg = msg
                }
                vm.fileImageDataUri = 'data:' + contentType + ';base64,' + b64
                // vm.logDebug('dataUri: ' + vm.fileImageDataUri)
              } else {
                let msg = 'cannot display images of contentType: ' + contentType + '. Please download instead.'
                vm.fileImageDataUri = null
                vm.fileError = true
                vm.fileErrorMsg = msg
                vm.logDebug(msg)
              }
              break
            case 'xmldata':
              //   setTimeout(function () {
              //     vm.sampleFileinfo = []
              //     vm.samplesHideSelector = true
              //     vm.logDebug('sampleClick - title: ' + sample.title + ' ' + sample.schemaId)
              //     vm.sampleSelected = sample
              //     // vm.getFilesList(sample)
              //     //   .then(function () {
              let sample = fileInfo.xmldata
              vm.logDebug(JSON.stringify(sample))
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
                vm.logDebug(func + ' error occurred attempting to xml to json convert sample: ' + sample.title + ' ' + sample.schemaId + ' err: ' + err)
                vm.fileObj = {'Error': 'Unable to display: ' + sample.title}
              }
              //     vm.logDebug(func)
              //     vm.logDebug(vm.sampleObj)
              //     // delete vm.sampleObj['_declaration']
              //     // window.sampleObj = vm.sampleObj
              //     // let indent = 2
              //     // vm.sample2Tree(vm.sampleObj, vm.sampleTree, indent)
              //     vm.resetLoading()
              //     // })
              //     // .catch(function (err) {
              //     //   let msg = 'Error loading sample file: ' + err
              //     //   vm.logDebug(msg)
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
    //     vm.logDebug('sampleClick - title: ' + sample.title + ' ' + sample.schemaId)
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
    //       vm.logDebug(func + ' error occurred attempting to xml to json convert sample: ' + sample.title + ' ' + sample.schemaId + ' err: ' + err)
    //       vm.sampleObj = {'Error': 'Unable to display: ' + sample.title}
    //     }
    //     vm.logDebug(func)
    //     vm.logDebug(vm.sampleObj)
    //     // delete vm.sampleObj['_declaration']
    //     // window.sampleObj = vm.sampleObj
    //     // let indent = 2
    //     // vm.sample2Tree(vm.sampleObj, vm.sampleTree, indent)
    //     vm.resetLoading()
    //     // })
    //     // .catch(function (err) {
    //     //   let msg = 'Error loading sample file: ' + err
    //     //   vm.logDebug(msg)
    //     //   vm.myPageError = true
    //     //   vm.myPageErrorMsg = msg
    //     //   vm.resetLoading()
    //     // })
    //   }, 20)
    // },
    // sample2Tree: function (node, sampleTree, indent) {
    //   let vm = this
    //   Object.keys(node).forEach(function (v) {
    //     vm.logDebug( ' '.repeat(indent) + v)
    //   })
    // },
    // utils
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    }
  },
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'house', name: 'My Portal'})
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
    padding-bottom: .1rem;
    border-bottom: .2rem solid black;
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

  .mypage {
    padding: 2rem 4rem;
  }

</style>
