/*
 See usage notes below code
*/

import {} from 'vuex'
// import Axios from 'axios'
import jwt from 'jsonwebtoken'
import Vue from '../main'
import Moment from 'moment'

export function Auth () {
  this.err = null
  this.getAuthPath = '/nmr/auth'
  this.permissions = []
  this.tokenValues = this.getTokenValues(this.getCookieToken())
}
Auth.prototype = {
  getCookieToken: function () {
    let cookie = document.cookie
    let rv = null
    if (cookie && cookie.length > 0) {
      let kvp = cookie.split(';')
      if (kvp) {
        kvp.forEach(function (v) {
          let kv = v.split('=')
          if (kv) {
            if (kv[0] === 'token') {
              rv = kv[1]
            }
          }
        })
      }
    }
    return rv
  },
  setRunAsUser: function (userid) {
    Vue.$store.commit('setRunAsUser', userid)
  },
  resetRunAsUser: function () {
    Vue.$store.commit('resetRunAsUser')
  },
  getRunAsUser: function () {
    let rv = null
    try {
      rv = Vue.$store.getters.runAsUser
    } catch (err) {
      console.log('error getting runAsUser')
    }
    return rv
  },
  isSessionExpired () {
    let expiration = this.getSessionExpiration()
    if (!expiration) {
      expiration = 0
    }
    let now = Moment().unix()
    let isExpired = (now > expiration)
    // console.log('isSessionExpired: ' + isExpired + ' expiration: ' + expiration + ' now: ' + now)
    return isExpired
  },
  isLoggedIn: function () {
    let vm = this
    return (vm.getUserId() !== null && !vm.isSessionExpired())
  },
  isTestUser: function () {
    let vm = this
    let rv = false
    if (vm.tokenValues && vm.tokenValues && typeof vm.tokenValues.isTestUser === 'boolean' && vm.tokenValues.isTestUser === true) {
      rv = true
    }
    console.log('Auth.isTestUser() returning: ' + rv + ' tokenValues is: ' + JSON.stringify(vm.tokenValues))
    return rv
  },
  isAdmin: function () {
    let vm = this
    let rv = false
    let tv = vm.tokenValues
    if (tv && tv.isAdmin) {
      rv = !vm.isSessionExpired()
    }
    return rv
  },
  isUser: function () {
    let vm = this
    let rv = false
    let tv = vm.tokenValues
    if (tv && tv.isUser) {
      rv = true
    }
    return rv
  },
  isAnonymous: function () {
    let vm = this
    let rv = false
    let tv = vm.tokenValues
    if (tv && tv.isAnonymous) {
      rv = true
    }
    return rv
  },
  deleteTokenCookie: function () {
    let cookieDate = new Date()
    cookieDate.setTime(cookieDate.getTime() - 1)
    document.cookie = 'token=; expires=' + cookieDate.toGMTString()
  },
  deleteSessionCookie: function () {
    let cookieDate = new Date()
    cookieDate.setTime(cookieDate.getTime() - 1)
    document.cookie = 'session=; expires=' + cookieDate.toGMTString()
  },
  getGivenName: function () {
    let vm = this
    let tv = vm.tokenValues
    let rv = null
    if (tv && tv.givenName && tv.givenName.length > 0) {
      rv = tv.givenName
    }
    return rv
  },
  getSessionExpiration: function () {
    let vm = this
    let tv = vm.tokenValues
    let rv = null
    // console.log('getSessionExpiration: tv.exp = ' + tv.exp + ' tv.exp.length: ' + tv.exp.length + ' +(tv.exp): ' + +(tv.exp))
    if (tv && tv.exp) {
      rv = +(tv.exp)
    }
    return rv
  },
  getUserId: function () {
    let vm = this
    let tv = vm.tokenValues
    let rv = null
    if (tv && tv.sub && tv.sub.length > 0) {
      rv = tv.sub
    }
    return rv
  },
  getSurName: function () {
    let vm = this
    let tv = vm.tokenValues
    let rv = null
    if (tv && tv.sn && tv.sn.length > 0) {
      rv = tv.sn
    }
    return rv
  },
  getTokenValues: function (token) {
    let rv = null
    if (token && token.length > 0) {
      rv = jwt.decode(token) // client cannot and does not need to verify signature
    }
    return rv
  },
  handleErr: function (err, failureFunction) {
    let vm = this
    if (err.config) {
      console.log(err.config)
    }
    if (err.response) {
      if (err.config && err.config.data) {
        let data = JSON.parse(err.config.data)
        if (data.jobFileInfo) {
          vm.jobInputFiles[data.jobFileInfo.idx].statusCode = err.response.status
          vm.jobInputFiles[data.jobFileInfo.idx].statusText = err.response.statusText
        }
      }
      return failureFunction(err.response.status, err.response.statusText)
    } else if (err.request) {
      return failureFunction(500, err)
    } else {
      return failureFunction(500, err)
    }
  },
  login: function (successFunction, failureFunction) {
    // Obtains userId, userName and permissions
  },
  logout: function (successFunction, failureFunction) {
    this.deleteTokenCookie()
    this.deleteSessionCookie()
  },
  notAuthorizedHandler: function (successFunction, failureFunction) {
    // call this if the user does something that returns 403, or that user is not permitted to do based on permissions
  },
  notAuthenticatedHandler: function (successFunction, failureFunction) {
    // call this if user does something that returns 401, or where isLogged() was called and failed
  },
  getPermissions: function (successFunction, failureFunction) {
    // refresh permissions for this user
  }
  // setJobType: function (jobType) {
  //   this.jobType = jobType
  // },
  // getJobType: function () {
  //   return this.jobType
  // },
  // getFileCount: function () {
  //   return this.jobInputFiles.length
  // },
  // getFileInfo: function (idx) {
  //   let rv = null
  //   if (idx >= 0 && idx < this.jobInputFiles.length) {
  //     rv = this.jobInputFiles[idx]
  //   }
  //   return rv
  // },
  // addInputFile: function (fileName, dataUri) {
  //   let idx = this.jobInputFiles.length
  //   this.jobInputFiles.push({ 'idx': idx, 'fileName': fileName, 'dataUri': dataUri, 'statusCode': null, 'statusText': null })
  // },
  // setJobParameters: function (paramsObject) {
  //   this.jobParameters = paramsObject
  // }
}

/*
  Using this class
  import {Auth} from '@/modules/Auth.js'
  let auth = new Auth()
  let userid = auth.getUserId()
  let isAdmin = auth.isAdmin()
  etc...
*/
