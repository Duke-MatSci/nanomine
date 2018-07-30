import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    leftMenuActive: false,
    adminAvailable: false,
    isWaiting: false,
    'editor': [
    ],
    sampleList: [], // editor still has dependency -- need to remove when samples get read

    editorActive: false
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
    isAdminActive: function (state) {
      return state.adminAvailable
    },
    isEditorActive: function (state) {
      return state.editorActive
    }
  }
})
export default store
