<template>
  <div>
    <a-header :info="info"></a-header>
    <div class="main">
      <div class="dynamfit">
        <v-container>
          <h1>Dynamfit - Prony Series coefficient fitting</h1>
          <v-alert
            v-model="loginRequired"
            type="error"
            outline
          >
            {{loginRequiredMsg}}
          </v-alert>
          <h3 class="text-xs-left">Description</h3>
          <br>
          <p class="text-xs-left">This program fits a viscoelastic mastercurve from DMA experiments with a Prony Series. The Prony Series coefficients can be used as baseline properties for the matrix in a FEA simulation of nanocomposites.
          </p>
          <br>
          <p class="text-xs-left">If this tool is new to you, please click <v-btn class="text-xs-left" small color="primary" to="/DynamfitExample">Example of Dynamfit</v-btn>
          to get familiar with this tool.
          </p>
          <br>
          <h3 class="text-xs-left">Instructions</h3>
          <p class="text-xs-left"><b>Function Name:</b> Dynamfit</p>
          <p class="text-xs-left"><b>Description:</b> Fit mastercurve (tan &#948; vs. frequency) by Prony Series</p><br>

          <p class="text-xs-left"><b>1. Upload #.X_T file containing three values per line (Frequency X' X''):</b></p>
          <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
            <p class="text-xs-left">Upload #.X_T file here:
              <v-btn class="text-xs-left" small color="primary" @click='pickTemplate'>Browse</v-btn>
              <input
                type="file"
                style="display: none"
                accept=".X_T"
                ref="myTemplate"
                @change="onTemplatePicked"
              >
            </p>
            <v-list v-model="templateName" subheader="true" v-if="templateUploaded">
              <v-list-tile
                :key="templateName"
              >
                <v-list-tile-avatar>
                  <v-icon color="primary">check_circle_outline</v-icon>
                </v-list-tile-avatar>
                <v-list-tile-content>
                  <v-list-tile-title v-text="templateName"></v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
            </v-list>
          </v-flex>

          <p class="text-xs-left"><b>2. Factor For Weighting X' and X'' data:</b></p>
          <p class="text-xs-left">0.0 Means Consider Only X'' Data</p>
          <p class="text-xs-left">2.0 Means Consider Only X' Data</p>
          <p class="text-xs-left">1.0 Means Weight Evenly X' and X''<p>
          <p class="text-xs-left">All Other Values Represent Uneven Weighting</p>
          <v-flex xs12 sm6 md3>
            <v-text-field v-model="weight" label='Enter the weighting parameter you wish to use:' value='1.0' outline></v-text-field>
          </v-flex>
          <p class="text-xs-left"><b>3. Standard deviation: </b></p>
          <v-flex xs12 sm6 md3>
            <v-radio-group v-model="stdRadios">
              <v-radio label="Data point values" value="std1"></v-radio>
              <v-radio label="Unity" value="std2"></v-radio>
            </v-radio-group>
          </v-flex>
          <p class="text-xs-left"><b>4. Number of elements (should larger than 2 and should NOT be too large):</b></p>
          <v-flex xs12 sm6 md3>
            <v-text-field v-model="nEle" label='Enter the number of elements to use:' value='20' outline></v-text-field>
          </v-flex>
          <p class="text-xs-left"><b>5. Data type:</b></p>
          <v-flex xs12 sm6 md3>
            <v-radio-group v-model="dtRadios">
              <v-radio label="Compliance" value="dt1"></v-radio>
              <v-radio label="Modulus" value="dt2"></v-radio>
            </v-radio-group>
          </v-flex>
          <v-alert
            v-model="uploadError"
            type="error"
            dismissible
          >
            {{uploadErrorMsg}}
          </v-alert>
          <v-dialog v-model="successDlg" persistent max-width="500px">
            <v-card>
              <v-card-title>
                <span>Dynamfit Job Submitted Successfully</span>
                <v-spacer></v-spacer>
              </v-card-title>
              <v-card-text>
                Your uploader job is: {{jobId}} <br/> You should receive an email with a link to the job output.
              </v-card-text>
              <v-card-actions>
                <v-btn color="primary" flat @click="successDlgClicked()">Close</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-btn v-on:click="submit()" color="primary">Run Simulation</v-btn>
          <br>
          <h4 class="text-xs-left">Reference</h4>
          <p class="text-xs-left">Bradshaw et al., <i><a href="http://link.springer.com/article/10.1023/A:1009772018066">A Sign Control Method for Fitting and Interconverting Material Functions for Linearly Viscoelastic Solids</a></i>, Mechanics of Time-Dependent Materials. 1997 1(1)</p>
        </v-container>
      </div>
    </div>
    <a-footer></a-footer>
  </div>
</template>

<script>
import {} from 'vuex'
import {JobMgr} from '@/modules/JobMgr.js'
import {Auth} from '@/modules/Auth.js'
import * as Util from './utils'
export default {
  name: 'Dynamfit',
  data () {
    return {
      info: {icon: 'fa-bullseye', name: 'Dynamfit'},
      // title: 'Dynamfit',
      dialog: false,
      templateName: '',
      templateUrl: '',
      template: null,
      templateUploaded: false,
      weight: 1.0,
      stdRadios: '',
      nEle: 20,
      dtRadios: '',
      uploadError: false,
      uploadErrorMsg: '',
      loginRequired: false,
      loginRequiredMsg: '',
      successDlg: false,
      jobId: ''
    }
  },
  components: {
    aHeader: Util.Header,
    aFooter: Util.Footer,
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    if (!vm.auth.isLoggedIn()) {
      vm.loginRequired = true
      vm.loginRequiredMsg = 'Login is required.'
    }
  },
  methods: {
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    pickTemplate () {
      this.$refs.myTemplate.click()
    },
    resetTemplate: function () {
      this.templateName = ''
      this.templateUrl = ''
      this.template = null
      this.templateUploaded = false
    },
    onTemplatePicked (e) {
      console.log('inside onTemplatePicked')
      this.resetTemplate()
      const files = e.target.files
      console.log('shouldnt reach here')
      let file = {}
      let f = files[0]
      if (f !== undefined) {
        this.templateName = f.name
        file.fileName = this.templateName
        if (this.templateName.lastIndexOf('.') <= 0) {
          console.log('Error No Extension: ' + this.templateName)
        }
        const fr = new FileReader()
        fr.readAsDataURL(f)
        fr.addEventListener('load', () => {
          this.templateUrl = fr.result
          file.fileUrl = this.templateUrl
          this.template = file
          this.templateUploaded = true
        })
      } else {
        this.resetTemplate()
      }
    },
    successDlgClicked: function () {
      let vm = this
      console.log('Success dlg button clicked')
      // vm.$router.go(-1) // go back to previous page
      vm.successDlg = false
    },
    submit: function () {
      let vm = this
      if (!vm.templateUploaded) {
        vm.uploadError = true
        vm.uploadErrorMsg = 'Please upload the .X_T file.'
        return
      }
      if (vm.weight === '') {
        vm.uploadError = true
        vm.uploadErrorMsg = 'Please input the weighting parameter.'
        return
      }
      if (vm.stdRadios === '') {
        vm.uploadError = true
        vm.uploadErrorMsg = 'Please select the type of the standard deviation.'
        return
      }
      if (vm.nEle === '') {
        vm.uploadError = true
        vm.uploadErrorMsg = 'Please input the number of Prony elements.'
        return
      }
      if (vm.dtRadios === '') {
        vm.uploadError = true
        vm.uploadErrorMsg = 'Please select the data type.'
        return
      }
      console.log('Job Submitted!')
      vm.setLoading()
      let jm = new JobMgr()
      jm.setJobType('dynamfit')
      jm.setJobParameters({'templateName': vm.templateName, 'weight': vm.weight, 'stddev': vm.stdRadios, 'nEle': vm.nEle, 'dt': vm.dtRadios})
      jm.addInputFile(vm.templateName, vm.templateUrl)
      return jm.submitJob(function (jobId) {
        console.log('Success! JobId is: ' + jobId)
        vm.jobId = jobId
        vm.resetLoading()
        vm.successDlg = true
      }, function (errCode, errMsg) {
        console.log('error: ' + errCode + ' msg: ' + errMsg)
        vm.uploadError = true
        vm.uploadErrorMsg = 'Error submitting files for upload: errCode: ' + errCode + ' msg: ' + errMsg
        vm.resetLoading()
      })
    }
  }
}
</script>

<style scoped>

h1 {
  margin-top: 10px;
  padding-bottom: .1rem;
  border-bottom: .2rem solid black;
}

</style>
