/*
 See usage notes below code
*/

import {} from 'vuex'
// import Axios from 'axios'
import Vue from '../main'
// import Moment from 'moment'

export function Config () {
  this.err = null
  this.baseServicesUrl = null
  this.servicesPath = '/nmr/'
  this.filesPath = '/nmf/'
}
Config.prototype = {
  clientInit: function () {
    this.getBaseServicesUrl()
  },
  getServicesPath: function () {
    return this.baseServicesUrl + this.servicesPath
  },
  getFilesPath: function () {
    return this.baseServicesUrl + this.filesPath
  },
  setBaseServicesUrl: function (baseServicesUrl) {
    this.baseServicesUrl = baseServicesUrl
    Vue.$store.commit('baseServicesUrl', baseServicesUrl)
  },
  getBaseServicesUrl: function () {
    let rv = null
    try {
      rv = Vue.$store.getters.baseServicesUrl
      this.baseServicesUrl = rv
    } catch (err) {
      console.trace('error getting baseServiceUrl: ' + err.message)
    }
    return rv
  },
  init: function (baseServicesUrl) {
    if (baseServicesUrl) {
      this.setBaseServicesUrl(baseServicesUrl)
    } else {
      this.setBaseServicesUrl('')
    }
  }
}

/*
  Using this class
*/
