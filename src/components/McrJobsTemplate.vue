<!--
################################################################################
#
# File Name: McrJobsTemplate.vue
# Application: templates
# Description: Reusable component for all the MCR jobs
#
# Created by: Atul Jalan, July 1, 2020
# Customized for NanoMine
#
################################################################################
-->

<template>
<div>

  <h1>{{ job.pageTitle }}</h1>

  <v-container class="text-xs-left">

    <!-- Error for when user is not logged in -->
    <v-alert v-model="loginRequired" type="error" outline>{{ loginRequiredMsg }}</v-alert>

    <v-layout row wrap>

      <v-flex xs12>
        <h3>Description</h3>
        <div v-for='(sentence, index) in job.description' v-bind:key='index'>
          <p v-html='sentence' >{{ sentence }}</p>
        </div>
      </v-flex>

      <v-flex xs12>
        <h3>Input Options</h3>
        <div v-for='(uploadOption, index) in job.uploadOptions' v-bind:key='uploadOption.title'>
          <p><strong>{{ index + 1 }}. {{ uploadOption.title }}:</strong> <span v-html='uploadOption.description'>{{ uploadOption.description }}</span></p>
        </div>
      </v-flex>

    </v-layout>

    <!-- Modal that shows up upon file submission that shows a successful submission and the Job ID -->
    <v-dialog v-model="successDlg" persistent max-width="500px">
      <v-card>

        <v-card-title>
          <span>{{ job.jobTitle }} Binarization Job Submitted Successfully</span>
          <v-spacer></v-spacer>
        </v-card-title>

        <v-card-text>
          Your {{ job.jobTitle }} job is: {{jobId}} <br/> You should receive an email with a link to the job output.
        </v-card-text>

        <v-card-actions>
          <v-btn color="primary" flat @click="successDlgClicked()">Close</v-btn>
        </v-card-actions>

      </v-card>
    </v-dialog>

    <!-- Error for when there are issues with submitting the uploaded files -->
    <v-alert v-model="errorAlert" type="error" dismissible>{{ errorAlertMsg }}</v-alert>

    <v-flex v-if='"results" in job' xs12>
      <h3>Results</h3>
      <div v-for='(result, index) in job.results' v-bind:key='index'>
        <p v-html='result' >{{ result }}</p>
      </div>
    </v-flex>

    <h3>Image Upload</h3>
    <ImageUpload
      class='imageUpload'
      v-on:setFiles="setFiles"
      v-on:set-selectors="setSelectors"
      :aspectRatio="job.aspectRatio"
      :selects='selects'
      :collectDimensions='job.getImageDimensions'
    ></ImageUpload>

    <v-flex class="text-xs-center">
      <v-btn v-on:click="submit()" color="primary">{{ job.submit.submitButtonTitle }}</v-btn>
    </v-flex>

    <v-flex xs12 v-if='results.submitted'>

      <h3>Submission Results - {{ results.jobid }}</h3>

      <div v-if='results.obtained'>

        <v-btn class='resultsButton' v-if='results.obtained' v-on:click="download()" color="primary">Download results</v-btn>

        <div class='resultsContainer'>
          
          <div>
            <h4 class='resultsSubtitle'>Inputs</h4>
            <div v-for='(file, index) in results.files.input' v-bind:key='index'>
              <img class='resultsImage' :src='getResultImage(index, "input")'>
            </div>
          </div>
          
          <div>
            <h4 class='resultsSubtitle'>Outputs</h4>
            <div v-for='(file, index) in results.files.output' v-bind:key='index'>
              <img class='resultsImage' :src='getResultImage(index, "output")'>
            </div>
          </div>

        </div>

      </div>

      <p v-else>Loading...</p>

    </v-flex>

    <v-flex xs12>
      <h3>References</h3>
      <div v-for='(reference, index) in job.references' v-bind:key='index'>
        <p v-html='reference' >{{ reference }}</p>
      </div>
    </v-flex>

  </v-container>

</div>
</template>

<script>

import ImageUpload from './ImageUpload.vue'
import {Auth} from '@/modules/Auth.js'
import {JobMgr} from '@/modules/JobMgr.js'
import {} from 'vuex'
import io from 'socket.io-client'
var socket = io({path: '/nmr/socket.io', port: 3000})
import Axios from 'axios'

export default {

  name: 'McrJobsTemplate',

  components: {
    ImageUpload
  },

  props: {
    job: Object
  },

  created () {
    socket.on('finished', data => {
      let vm = this
      vm.results.jobid = data
      vm.results.uri = '/nmf/jobdata/' + data
      vm.setLoading()
      return Axios.get(vm.results.uri + '/job_output_parameters.json')
        .then(function (response) {
          vm.results.files = response.data.files // use files array instead of individual file references
          vm.results.obtained = true
          vm.resetLoading()
        })
        .catch(function (err) {
          console.log(err)
          vm.resetLoading()
        })
    })
    socket.on('hello', data => {
      console.log(data)
    })
  },

  data () {
    return {
      loginRequired: false,
      loginRequiredMsg: '',
      errorAlert: false,
      errorAlertMsg: '',
      successDlg: false,
      jobId: '',
      files: undefined,
      selects: [],
      selectedOptions: {},
      results: {
        obtained: false,
        files: undefined,
        uri: undefined,
        jobid: undefined
      }
    }
  },

  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    if (!vm.auth.isLoggedIn()) {
      vm.loginRequired = true
      vm.loginRequiredMsg = 'Login is required.'
    }
  },

  mounted () {
    if ('selects' in this.job) {
      this.selects = this.job.selects
    }
  },

  methods: {

    getResultImage: function (index, type) {
      let vm = this
      if (type === 'input') {
        return vm.results.uri + '/' + vm.results.files[index].input
      } else {
        return vm.results.uri + '/' + vm.results.files[index].output
      }
    },

    setFiles: function (files) {
      this.files = files // the actual file object
    },

    setSelectors: function (selectedOptions) {
      this.selectedOptions = selectedOptions
    },

    setLoading: function () {
      this.$store.commit('isLoading')
    },

    resetLoading: function () {
      this.$store.commit('notLoading')
    },

    successDlgClicked: function () {
      let vm = this
      console.log('Success dlg button clicked')
      vm.successDlg = false
    },

    submit: function () {
      let vm = this
      vm.setLoading()
      console.log('Loading..')

      if (vm.files === undefined) {
        let msg = 'Please select a file to process.'
        vm.errorAlertMsg = msg
        vm.errorAlert = true
        vm.resetLoading()
        return
      }

      let jm = new JobMgr()
      console.log('Called Job Manager for ' + vm.job.submit.submitJobTitle)
      jm.setJobType(vm.job.submit.submitJobTitle)

      var jobParameters = {'InputType': vm.files.fileType} // Figure out which file type
      for (var key in vm.selectedOptions) {
        if (key === 'phase') {
          jobParameters[key] = vm.phaseToString(vm.selectedOptions[key])
        } else if (key === 'dimensions') {
          jobParameters[key] = vm.dimensionToString(vm.selectedOptions[key])
        } else {
          jobParameters[key] = vm.selectedOptions[key]
        }
      }
      jm.setJobParameters(jobParameters)

      jm.addInputFile(vm.files.name, vm.files.url)
      console.log('Job Manager added file: ' + vm.files.name)

      return jm.submitJob(function (jobId) {
        socket.emit('newJob', jobId)
        console.log('Success! JobId is: ' + jobId)
        vm.jobId = jobId
        vm.resetLoading()
        vm.successDlg = true
      }, function (errCode, errMsg) {
        let msg = 'error: ' + errCode + ' msg: ' + errMsg
        console.log(msg)
        vm.errorAlertMsg = msg
        vm.errorAlert = true
        vm.resetLoading()
      })
    },

    phaseToString: function (phaseObj) {
      var returnString = ''
      for (var key in phaseObj) {
        if (returnString !== '') {
          returnString += '|'
        }
        returnString += phaseObj[key]['x_offset'] + '*' + phaseObj[key]['y_offset']
      }
      return returnString
    },

    dimensionToString: function (dimensionObj) {
      return dimensionObj['width'] + '*' + dimensionObj['height'] + '*' + dimensionObj['units']
    }
  }

}
</script>

<style scoped>

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

  h3 {
    margin-bottom: 10px;
    margin-top: 15px;
  }

  p {
    margin-left: 15px;
  }

  .resultsButton {
    margin-left: 15px;
    margin-top: 0px;
    margin-bottom: 20px;
  }

  .resultsContainer {
    display: flex;
    flex-direction: column;
    margin-left: 15px;
    justify-content: space-between;
  }

  .resultsContainer div {
    width: 48%;
  }

  .resultsSubtitle {
    text-align: left;
  }

  .resultsImage {
    width: 100%;
  }

  .imageUpload {
    margin-left: 15px;
  }

</style>
