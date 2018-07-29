import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    leftMenuActive: false,
    adminAvailable: false
  },
  mutations: {
    toggleLeftMenu: function (state) { state.leftMenuActive = !state.leftMenuActive }
  }
})
export default store
