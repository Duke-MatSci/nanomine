import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    leftMenuActive: false,
    adminAvailable: false,
    isWaiting: false,
    loginLogout: false, // used to toggle either login or logout in pageheader (actually does logout, dialog for login)
    runAsUser: null,
    'editor': { // editor store should contain all editor state including tabs and data for each tab
      'tab': [
      ],
      'currentTab': -1,
      'schemas': []
    },
    sampleList: [], // editor still has dependency -- need to remove when samples get read

    editorActive: false, // move to editor object
    config: {
      baseServicesUrl: ''
    },
    cms: { // CMS object contains references to urls by name that can be loaded. At some point, this will be dyn loaded.
      images: {},
      videos: {
        'nanomine/visualization_tutorial': {
          url: 'https://materialsmine.org/nmf/nanomine-vis.mp4',
          title: 'Visualization Tutorial',
          text: 'This video tutorial show basic usage of the search and visualization tool. (no audio)'
        },
        'nanomine/mcr/intelligent_characterization_tutorial': {
          url: 'https://materialsmine.org/nmf/Intelligent_Characterization_Tutorial_by_Umar.mp4',
          title: 'Intelligent Characterization Tutorial',
          text: 'This narrated video tutorial shows how to use the Intelligent Characterization tool and view results.'
        },
        'nanomine/mcr/basic_module_tool_tutorial': {
          url: 'https://materialsmine.org/nmf/NanoMine_Demo_by_Akshay.mp4',
          title: 'Basic Module Characterization/Reconstruction Tool Usage',
          text: 'This video tutorial shows overall Module Characterization and Reconstruction tool usage. (no audio)'
        }
      },
      templates: {}
    }
  },
  mutations: {
    addSchemas: function (state, toAdd) {
      // console.log('state.addSchemas: ' + JSON.stringify(toAdd))
      state.editor.schemas = toAdd // Overwrite since call is made that returns all data to client at once
    },
    baseServicesUrl: function (state, value) {
      state.config.baseServicesUrl = value
      console.log('set state.config.baseServicesUrl: ' + value)
    },
    isLoading: function (state) {
      state.isWaiting = true
    },
    notLoading: function (state) {
      state.isWaiting = false
    },
    setRunAsUser: function (state, userId) {
      state.runAsUser = userId // runAsUser will be checked on server side, so override non-admin will not work
    },
    resetRunAsUser: function (state) {
      state.runAsUser = null
    },
    newEditorTab: function (state, toAdd) {
      // let toAdd = {'name': name, 'xmlText': xmlText, 'schemaIndex': schemaIndex}
      if (state.editor.tab.length > 0) {
        // for now only 1 tab
        state.editor.tab.pop() // throw away the old tab state for now :(
      }
      state.editor.tab.push(toAdd)
      // console.log('pushed state: ' + JSON.stringify(toAdd))
      state.editor.currentTab = (state.editor.tab.length - 1)
      console.log('set data for tab: ' + state.editor.currentTab)
    },
    editorUpdateXml: function (state, newXml) {
      if (state.editor.currentTab >= 0) {
        console.log('editorUpdateXml: current tab is: ' + state.editor.currentTab)
        state.editor.tab[state.editor.currentTab].xmlText = newXml
      } else {
        console.log('editorUpdateXml: could not find current tab.')
      }
    },
    setSampleList: function (state, sampleList) {
      state.sampleList = sampleList
    },
    setLoginLogout: function (state) {
      state.loginLogout = true
    },
    resetLoginLogout: function (state) {
      state.loginLogout = false
    },
    toggleLeftMenu: function (state) {
      state.leftMenuActive = !state.leftMenuActive
    },
    resetLeftMenu: function (state) {
      state.leftMenuActive = false
    },
    toggleAdminActive: function (state) {
      state.adminAvailable = !state.adminAvailable
    },
    setEditorActive: function (state) {
      state.editorActive = true
    },
    setEditorInactive: function (state) {
      state.editorActive = false
    }
  },
  getters: {
    baseServicesUrl: (state) => {
      console.log('state returning baseServicesUrl: ' + state.config.baseServicesUrl)
      return state.config.baseServicesUrl
    },
    getCmsVideo: (state) => (id) => {
      return state.cms.videos[id]
    },
    getCmsAllVideos: (state) => {
      return state.cms.videos
    },
    loginLogout: function (state) {
      return state.loginLogout
    },
    isLoading: function (state) {
      return state.isWaiting
    },
    runAsUser: function (state) {
      return state.runAsUser
    },
    isLeftMenuActive: function (state) {
      return state.leftMenuActive
    },
    sampleList: function (state) {
      return state.sampleList
    },
    editorFileName: function (state) {
      let rv = '<untitled>'
      if (state.editor.currentTab >= 0) {
        rv = state.editor.tab[state.editor.currentTab].name
      }
      return rv
    },
    editorSchemaName: function (state) {
      let rv = ''
      if (state.editor.currentTab >= 0) {
        console.log('editorSchemaName: current tab is: ' + state.editor.currentTab)
        let schemaId = state.editor.tab[state.editor.currentTab].schemaId
        state.editor.schemas.forEach(function (v) {
          if (v.current === schemaId) {
            rv = v.currentRef.title
            console.log('$store.getters.editorSchemaName - set rv:' + rv)
          } else {
            console.log('$store.getters.editorSchemaName - skipped: ' + v.currentRef.title)
          }
        })
      } else {
        console.log('editorSchemaName: could not find current tab.')
      }
      return rv
    },
    editorSchemaJson: function (state) {
      let rv = ''
      if (state.editor.currentTab >= 0) {
        console.log('editorSchemaJson: current tab is: ' + state.editor.currentTab)
        let schemaId = state.editor.tab[state.editor.currentTab].schemaId
        state.editor.schemas.forEach(function (v) {
          if (v.current === schemaId) {
            rv = v.currentRef.contentJson
            console.log('$store.getters.editorSchemaJson - set rv:' + rv)
          } else {
            console.log('$store.getters.editorSchemaJson - skipped: ' + v.currentRef.title)
          }
        })
      } else {
        console.log('editorSchemaJson: could not find current tab.')
      }
      return rv
    },
    editorSchemaId: function (state) {
      let rv = null
      if (state.editor.currentTab >= 0) {
        console.log('editorSchemaText: current tab is: ' + state.editor.currentTab)
        rv = state.editor.tab[state.editor.currentTab].schemaId
      } else {
        console.log('editorSchemaId: could not find current tab.')
      }
      return rv
    },
    editorSchemaText: function (state) {
      let rv = ''
      if (state.editor.currentTab >= 0) {
        console.log('editorSchemaText: current tab is: ' + state.editor.currentTab)
        let schemaId = state.editor.tab[state.editor.currentTab].schemaId
        state.editor.schemas.forEach(function (v) {
          if (v.current === schemaId) {
            rv = v.currentRef.content
            console.log('$store.getters.editorSchemaText - set rv:' + rv)
          } else {
            console.log('$store.getters.editorSchemaText - skipped: ' + v.currentRef.title)
          }
        })
      } else {
        console.log('editorSchemaText: could not find current tab.')
      }
      return rv
    },
    editorXmlText: function (state) {
      let rv = '<?xml version="1.0" encoding="utf-8"?>\n<PolymerNanocomposite>\n</PolymerNanocomposite>'
      if (state.editor.currentTab >= 0) {
        console.log('editorXmlText: current tab is: ' + state.editor.currentTab)
        let tv = state.editor.tab[state.editor.currentTab].xmlText
        if (tv) {
          rv = tv
        }
      } else {
        console.log('editorXmlText: could not find current tab.')
      }
      return rv
    },
    editorLatestSchemaId: function (state) {
      let rv = null
      // console.log(state.editor.schemas)
      if (state.editor.schemas.length > 0) {
        rv = state.editor.schemas[0].currentRef._id // TODO NOTE: if sort failed for /nmr/templates/versions/select/allactive this will NOT be the latest schema-- REST needs to indicate this
      }
      return rv
    },
    editorSchemaIds: function (state) {
      let rv = []
      state.editor.schemas.forEach(function (v) {
        rv.push(v.currentRef._id)
      })
      return rv
    },
    editorTabCount: function (state) {
      return state.editor.tab.length
    },
    currentEditorTab: function (state) {
      return state.editor.currentTab
    },
    isAdminActive: function (state) {
      return state.adminAvailable
    },
    isEditorActive: function (state) {
      return state.editorActive
    }
  }
})
export default store
