<template>
  <div class="xmlconv">
    <h1>Data Uploader</h1>
    <v-container>
      <h3 class="text-xs-left">Description</h3>
      <br>
      <p class="text-xs-left">The simplest method to curate your sample into the database is by uploading an MS Excel spreadsheet. An online web-form is also available for the advanced user (<router-link to="/curate">click here</router-link>). For each sample, upload a template Excel file using the first uploading box and other supplementary image and raw data files using the second uploading box. The master Excel template contains all possible fields for nanocomposite sample data and therefore many fields will remain blank for your sample. Fill in only the parameters applicable to your sample. Customized templates are available upon request, please contact <a href="mailto:nanominenu@gmail.com">the administrator</a>.</p>
      <br>
      <h3 class="text-xs-left">Steps</h3>
      <p class="text-xs-left">Step 1: Click <a href="{% static 'XMLCONV/master_template.zip' %}" download>here</a> to download the blank MS Excel template (137 kB).
       (Click <a href="{% static 'XMLCONV/example.zip' %}" download>here</a> to see an example, 263 kB)<br>
      Step 2: Fill in the parameters for all applicable cells in the template Excel file. Prepare the supplementary images and raw data files.<br>
      Step 3: Select the template Excel file in the first uploading box.<br>
      Step 4: Select the supplementary images and other raw data files in the second uploading box (press "Ctrl" or "Command" when selecting multiple files), then click Submit to upload your data.<br>
      Step 5: Wait for the feedback message. Please read the message and follow the instructions if an error message is displayed.</p>
      <h3 class="text-xs-left">Note</h3>
      <p class="text-xs-left">1. We recommend you to upload your control sample first and remember its sample ID.<br>
      2. Upload one sample data at a time (one template Excel file along with supplementary files).<br>
      3. Rows or sections followed by a "#" sign in the template Excel file can be duplicated. Copy them into additional rows if needed.<br>
      4. Acceptable image file format: JPG, PNG, TIF(F). Indicate the full image file name including the extensions in the corresponding cells in the template Excel file.
      </p>
      <h3 class="text-xs-left">Inputs</h3><br>
      <v-alert
        v-model="uploadError"
        type="error"
        dismissible
      >
        {{uploadErrorMsg}}
      </v-alert>
      <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
        <p class="text-xs-left">Select the Excel Template File
          <v-btn class="text-xs-left" small color="primary" @click='pickTemplate'>Browse</v-btn>
          <input
            type="file"
            style="display: none"
            accept=".xlsx, .xls"
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
        <v-list v-model="filesDisplay" subheader="true">
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
      <v-btn v-on:click="submit()" color="primary">Submit</v-btn>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import {JobMgr} from '@/modules/JobMgr.js'

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
    templateUploaded: false
  }),
  methods: {
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
      jm.setJobParameters({'templateName': vm.templateName})
      vm.files.forEach(function (v) {
        jm.addInputFile(v.fileName, v.fileUrl)
      })
      return jm.submitJob(function (jobId) {
        console.log('Success! JobId is: ' + jobId)
        vm.resetLoading()
      }, function (errCode, errMsg) {
        console.log('error: ' + errCode + ' msg: ' + errMsg)
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
</style>
