import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    leftMenuActive: false,
    adminAvailable: false,
    isWaiting: false,
    'editor': { // editor store should contain all editor state including tabs and data for each tab
      'tab': [
      ],
      'currentTab': -1
    },
    sampleList: [], // editor still has dependency -- need to remove when samples get read

    editorActive: false // move to editor object
  },
  mutations: {
    addSchema: function (state, schemaName, schemaId, schemaXsd) {

    },
    isLoading: function (state) {
      state.isWaiting = true
    },
    notLoading: function (state) {
      state.isWaiting = false
    },
    newEditorTab: function (state, toAdd) {
      // let toAdd = {'name': name, 'xmlText': xmlText, 'schemaText': schemaText}
      if (state.editor.tab.length > 0) {
        // for now only 1 tab
        state.editor.tab.pop() // throw away the old tab state for now :(
      }
      state.editor.tab.push(toAdd)
      // console.log('pushed state: ' + JSON.stringify(toAdd))
      state.editor.currentTab = (state.editor.tab.length - 1)
      console.log('set data for tab: ' + state.editor.currentTab)
    },
    setSampleList: function (state, sampleList) {
      state.sampleList = sampleList
    },
    toggleLeftMenu: function (state) {
      state.leftMenuActive = !state.leftMenuActive
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
    isLoading: function (state) {
      return state.isWaiting
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
    editorTabCount: function (state) {
      return state.editor.tab.length
    },
    editorXmlText: function (state) {
      let rv = '<?xml version="1.0" encoding="utf-8"?>\n<xml>\n</xml>'
      if (state.editor.currentTab >= 0) {
        rv = state.editor.tab[state.editor.currentTab].xmlText
      }
      return rv
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
