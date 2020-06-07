<template>
  <div class="xmlconv">
    <h1>Data Uploader</h1>
    <v-container>
      <h3 class="text-xs-left">Description</h3>
      <br>
      <p class="text-xs-left">The simplest method to curate your sample into the database is by uploading an MS Excel
        spreadsheet. For each sample, select or create a dataset for your sample group, upload a completed Excel template
        file using the first uploading box and other supplementary image and
        raw data files using the second uploading box. The master Excel template contains all possible fields for
        nanocomposite sample data and therefore many fields will remain blank for your sample. Fill in only the
        parameters applicable to your sample. Customized templates are available upon request, please contact
        <router-link to="/contact">the NanoMine team</router-link> if customization is required.
      </p>
      <br>
      <h3 class="text-xs-left">Steps</h3>
      <p class="text-xs-left">
        <span class="font-weight-black">NOTE:</span>  Filesets for samples are grouped into datasets.
           The files for a sample (images, auxiliary spreadsheet data, completed Excel template, etc)
           are uploaded as a set called a fileset.  Uploading multiple samples requires multiple fileset uploads.<br/>
        <span class="font-weight-black">Step 1:</span> Create a new dataset for the control sample and its related files,
           <span class="font-weight-black">then when uploading each additional sample be
           sure to select the same dataset</span> that was used for the control sample of the sample group.<br/>
        <span class="font-weight-black">Step 2:</span> Click <a href="/nmstatic/xmlconv/master_template.zip" download>here</a> to download the
        blank MS Excel template (137 kB).
        (Click <a href="/nmstatic/xmlconv/example.zip" download>here</a> to see an example, 263 kB)<br>
        <span class="font-weight-black">Step 3:</span> Fill in the parameters for all applicable cells in the Excel template file. Prepare the supplementary
        images and raw data files.<br>
        <span class="font-weight-black">Step 4:</span> Select the completed Excel template file in the first uploading box.<br>
        <span class="font-weight-black">Step 5:</span> Select the supplementary images and other raw data files in the second uploading box (press "Ctrl" or
        "Command" when selecting multiple files), then click Submit to upload your data.<br>
        <span class="font-weight-black">Step 6:</span> Wait for the feedback message. Please read the message and follow the instructions if an error message
        is displayed.</p>
      <h3 class="text-xs-left">Note</h3>
      <p class="text-xs-left">1. We recommend you to upload your control sample first and remember its sample ID.<br>
        2. Upload one sample data at a time (one template Excel file along with supplementary files).<br>
        3. Rows or sections followed by a "#" sign in the template Excel file can be duplicated. Copy them into
        additional rows if needed.<br>
        4. Acceptable image file format: JPG, PNG, TIF(F). Indicate the full image file name including the extensions in
        the corresponding cells in the Excel template file.
      </p>
      <h3 class="text-xs-left">Inputs</h3><br>
      <v-alert
        v-model="loginRequired"
        type="error"
        outline
      >
        {{loginRequiredMsg}}
      </v-alert>
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
            <span>Uploader Job Submitted Successfully</span>
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
      <dataset-create-or-select selectHeader="Choose or create a dataset" :selectedHandler="datasetSelectedHandler"  :datasetOptions="datasetOptions"></dataset-create-or-select>
      <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
        <p class="text-xs-left">Select a completed Excel Template File
          <v-btn class="text-xs-left" small color="primary" @click='pickTemplate'>Browse</v-btn>
          <input
            type="file"
            style="display: none"
            accept=".xlsx, .xls"
            ref="myTemplate"
            @change="onTemplatePicked"
          >
        </p>
        <v-list v-model="templateName" subheader v-if="templateUploaded">
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
      <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
        <p class="text-xs-left">Select Other Files (including raw data files and image files)
          <v-btn class="text-xs-left" small color="primary" @click='pickFile'>Browse</v-btn>
          <input
            type="file"
            style="display: none"
            :multiple="true"
            ref="myUpload"
            @change="onFilePicked"
          >
        </p>
        <v-list v-model="filesDisplay" subheader>
          <v-list-tile
            v-for="file in filesDisplay"
            :key="file.fileName"
          >
            <v-list-tile-avatar>
              <v-icon color="primary">check_circle_outline</v-icon>
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title v-text="file.fileName"></v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-flex>
      <v-btn v-on:click="submit()" :disabled="templateName.length < 1 || !datasetSelected" color="primary">Submit</v-btn>
      <br>
      <h4 class="text-xs-left">Reference</h4>
      <p class="text-xs-left">Zhao, H., Li, X., Zhang, Y., Schadler, L. S., Chen, W., &amp; Brinson, L. C. (2016). <i><a href="https://aip.scitation.org/doi/abs/10.1063/1.4943679">Perspective: NanoMine: A material genome approach for polymer nanocomposites analysis and design</a></i>. APL Materials, 4(5), 053204.</p>
      <p class="text-xs-left">Zhao, H., Wang, Y., Lin, A., Hu, B., Yan, R., McCusker, J., ... &amp; Brinson, L. C. (2018). <i><a href="https://aip.scitation.org/doi/10.1063/1.5046839">NanoMine schema: An extensible data representation for polymer nanocomposites</a></i>. APL Materials, 6(11), 111108.</p>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import {JobMgr} from '@/modules/JobMgr.js'
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'XMLCONV',
  data: () => ({
    title: 'File Upload',
    dialog: false,
    templateName: '',
    templateUrl: '',
    template: null,
    files: [],
    filesDisplay: [],
    uploadError: false,
    uploadErrorMsg: '',
    loginRequired: false,
    loginRequiredMsg: '',
    templateUploaded: false,
    successDlg: false,
    jobId: '',
    datasetOptions: {mineOnly: 'always'},
    datasetSelected: null
  }),
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    if (!vm.auth.isLoggedIn()) {
      vm.loginRequired = true
      vm.loginRequiredMsg = 'Login is required before uploading files.'
    }
  },
  methods: {
    datasetSelectedHandler (dataset) {
      let vm = this
      if (dataset) {
        console.log('Selected dataset: ' + dataset._id)
      } else {
        console.log('Selected dataset is null.')
      }
      vm.datasetSelected = dataset
    },
    setLoading: function () {
      this.$store.commit('isLoading')
    },

    resetLoading: function () {
      this.$store.commit('notLoading')
    },

    pickFile () {
      this.$refs.myUpload.click()
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

    resetFiles: function () {
      this.files = []
      this.filesDisplay = []
    },

    onTemplatePicked (e) {
      this.resetTemplate()
      const files = e.target.files
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

    onFilePicked (e) {
      this.resetFiles()
      const files = e.target.files
      for (let i = 0; i < files.length; i++) {
        let file = {}
        let f = files[i]
        if (f !== undefined) {
          file.fileName = f.name
          if (file.fileName.lastIndexOf('.') <= 0) {
            return
          }
          const fr = new FileReader()
          fr.readAsDataURL(f)
          fr.addEventListener('load', () => {
            file.fileUrl = fr.result
            this.files.push(file)
            this.filesDisplay.push(file)
          })
        } else {
          console.log('File Undefined')
        }
      }
    },
    successDlgClicked: function () {
      let vm = this
      console.log('Success dlg button clicked')
      vm.$router.go(-1) // go back to previous page
    },

    submit: function () {
      let vm = this
      vm.files.forEach(function (v) {
        console.log(JSON.stringify(v))
      })
      if (vm.template != null) {
        vm.files.unshift(vm.template)
      } else {
        vm.uploadError = true
        vm.uploadErrorMsg = 'Missing Template File'
        return
      }
      console.log('Job Submitted!')
      vm.setLoading()
      let jm = new JobMgr()
      jm.setJobType('xmlconv')
      jm.setJobParameters({'datasetId': vm.datasetSelected._id, 'templateName': vm.templateName})
      vm.files.forEach(function (v) {
        jm.addInputFile(v.fileName, v.fileUrl)
      })
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
  img {
    width: 240px;
  }

  h4 {
    text-transform: uppercase;
  }
  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

</style>
