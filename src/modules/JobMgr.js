// See usage notes below code

import {} from 'vuex'
import Axios from 'axios'
export function JobMgr () {
  this.jobType = null
  this.jobId = null
  this.err = null
  this.jobInputFiles = []
  this.jobParameters = null
  this.createJobPath = '/nmr/jobcreate'
  this.postJobFilePath = '/nmr/jobpostfile'
  this.submitJobPath = '/nmr/jobsubmit'
}
JobMgr.prototype = {
  getJobId: function () {
    return this.jobId
  },
  handleErr: function (err, failureFunction) {
    if (err.response) {
      failureFunction(err.response.status, err.response.statusText)
    } else if (err.request) {
      failureFunction(500, err)
    }
    console.log(err.config)
  },
  submitJob: function (successFunction, failureFunction) {
    // this.jobId = SET by remote call
    let vm = this
    if (vm.jobType === null) {
      setTimeout(failureFunction(400, 'Job type required'), 0) // don't do this on main path -- it's supposed to be async
    } else {
      // create job to get jobId and initialize job directory
      Axios.post(vm.createJobPath, {
        'jobParameters': vm.jobParameters,
        'jobType': vm.jobType
      })
        .then(function (res) {
          vm.jobId = res.data.data.jobId
          // still need to send files
          // still need to send parameters and submit job
          successFunction(vm.jobId)
        })
        .catch(function (err) {
          vm.handleErr(err, failureFunction)
        })
    }
  },
  setJobType: function (jobType) {
    this.jobType = jobType
  },
  getJobType: function () {
    return this.jobType
  },
  addInputFile: function (fileName, dataUrl) {
    this.jobInputFiles.push({'fileName': fileName, 'dataUrl': dataUrl})
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
  })

*/
