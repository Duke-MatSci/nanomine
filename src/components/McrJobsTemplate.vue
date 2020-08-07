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
var socket = io('http://localhost/nmr')

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
      console.log('received')
      console.log(data)
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
      selectedOptions: {}
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
      vm.$router.go(-2) // go back to mcr homepage page
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
        jobParameters[key] = vm.selectedOptions[key]
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

  .imageUpload {
    margin-left: 15px;
  }

</style>
