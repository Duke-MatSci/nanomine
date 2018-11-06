/*
 See usage notes below code
*/

import {} from 'vuex'
import Axios from 'axios'
import jwt from 'jsonwebtoken'
export function Auth () {
  this.userId = null
  this.userName = null
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
  getTokenValues: function (token) {
    let rv = null
    if (token && token.length > 0) {
      rv = jwt.decode(token) // client cannot and does not need to verify signature
    }
    return rv
  },
  getUserId: function () {
    return this.userId
  },
  saveAuthToken: function (bearer) {
    if (bearer.startsWith !== 'Bearer ') {
      throw new Error('invalid auth token format')
    }
    let ts = bearer.split(' ')
    let token = ts[1]
    window.localStorage.setItem('bearer', token)
  },
  getAuthToken: function () {
    let bearer = window.localStorage.getItem('bearer')
    return bearer
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
    // Logs out of server, clears userId, userName and permissions
  },
  notAuthorizedHandler: function (successFunction, failureFunction) {
    // call this if the user does something that returns 403, or that user is not permitted to do based on permissions
  },
  notAuthenticatedHandler: function (successFunction, failureFunction) {
    // call this if user does something that returns 401, or where isLogged() was called and failed
  },
  getPermissions: function (successFunction, failureFunction) {
    // this.jobId = SET by remote call
    let vm = this
    if (vm.jobType === null) {
      setTimeout(failureFunction(400, 'Job type required'), 0) // don't do this on main path -- it's supposed to be async
    } else {
      // create job to get jobId and initialize job directory
      let fileSends = []
      if (vm.jobParameters) { // TODO : once there is a security layer extract the user and put it here (SHOULD BE DONE SERVER SIDE!!)
        vm.jobParameters.user = 'testuser'
      } else {
        vm.jobParameters = {'user': 'testuser'}
      }
      try {
        Axios.post(vm.createJobPath, {
          'jobParameters': vm.jobParameters,
          'jobType': vm.jobType
        })
          .then(function (res) {
            vm.jobId = res.data.data.jobId
            vm.jobInputFiles.forEach(function (v) {
              // send each file in a separate request and wait for all to complete successfully before submitting job
              fileSends.push(Axios.post(vm.postJobFilePath, {
                'jobId': vm.jobId,
                'jobType': vm.jobType,
                'jobFileInfo': v
              }))
            })
            Axios.all(fileSends)
              .then((p) => {
                console.log(p)
                // wait for all files to be sent then submit job
                p.forEach(function (v) {
                  // console.log('logging response info below: ')
                  // console.log(v)
                  // set status and status text vm.jobInputFiles[idx].statusCode=p.
                  let reqData = JSON.parse(v.config.data)
                  let index = reqData.jobFileInfo.idx
                  vm.jobInputFiles[index].statusCode = v.status
                  vm.jobInputFiles[index].statusText = v.statusText
                })
                Axios.post(vm.submitJobPath, {
                  'jobId': vm.jobId,
                  'jobType': vm.jobType
                })
                  .then(function (res) {
                    console.log('submit job success - statusCode: ' + res.status + ' statusText: ' + res.statusText)
                    return successFunction(vm.jobId)
                  })
                  .catch(function (err) {
                    console.log('submit job failure' + err)
                    vm.handleErr(err, failureFunction)
                  })
              })
              .catch(function (err) {
                console.log('Axios.all catch' + err)
                vm.handleErr(err, failureFunction)
              })
          })
          .catch(function (err) {
            console.log('createJob failed - catch' + err)
            vm.handleErr(err, failureFunction)
          })
      } catch (err) {
        console.log('Try failed - catch' + err)
        vm.handleErr(err, failureFunction)
      }
    }
  },
  setJobType: function (jobType) {
    this.jobType = jobType
  },
  getJobType: function () {
    return this.jobType
  },
  getFileCount: function () {
    return this.jobInputFiles.length
  },
  getFileInfo: function (idx) {
    let rv = null
    if (idx >= 0 && idx < this.jobInputFiles.length) {
      rv = this.jobInputFiles[idx]
    }
    return rv
  },
  addInputFile: function (fileName, dataUri) {
    let idx = this.jobInputFiles.length
    this.jobInputFiles.push({ 'idx': idx, 'fileName': fileName, 'dataUri': dataUri, 'statusCode': null, 'statusText': null })
  },
  setJobParameters: function (paramsObject) {
    this.jobParameters = paramsObject
  }
}

/*
  Using this class
  import {JobMgr} from '@/modules/JobMgr.js'
  let jm = new JobMgr()
  jm.addInputFile(fileName[0], dataUrl[0])
  jm.addInputFile(fileName[N], dataUrl[N])
  jm.setJobParameters( {'testField': val1, 'myField2': val2 })
  jm.setJobType( jobType )
  jm.submitJob( function success (jobid) {
      console.log(jobId)
      console.log('Success')
    }, function failure (err) {
      console.log(err)
      for( let i=0; i < jm.getFileCount(); ++i) {
        let fileInfo = jm.getFileInfo(i)
        console.log('file name: ' + fileInfo.fileName + ' statusCode: ' + fileInfo.statusCode + ' statusText: ' + fileInfo.statusText)
      }
  })

*/
