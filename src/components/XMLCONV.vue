<template>
  <div class="xmlconv">
    <h1>Data Uploader</h1>
    <v-container>
      <h3 class="text-xs-left">Description</h3>
      <br>
      <p class="text-xs-left">The simplest method to curate your sample into the database is by uploading an MS Excel spreadsheet. An online web-form is also available for the advanced user (<router-link to="/curate">click here</router-link>). For each sample, upload a template Excel file using the first uploading box and other supplementary image and raw data files using the second uploading box. The master Excel template contains all possible fields for nanocomposite sample data and therefore many fields will remain blank for your sample. Fill in only the parameters applicable to your sample. Customized templates are available upon request, please contact <a href="mailto:nanominenu@gmail.com">the administrator</a>.</p>
      <br>
      <h5 class="text-xs-left">Steps</h5>
      <p class="text-xs-left">Step 1: Click <a href="{% static 'XMLCONV/master_template.zip' %}" download>here</a> to download the blank MS Excel template (137 kB).
       (Click <a href="{% static 'XMLCONV/example.zip' %}" download>here</a> to see an example, 263 kB)<br>
      Step 2: Fill in the parameters for all applicable cells in the template Excel file. Prepare the supplementary images and raw data files.<br>
      Step 3: Select the template Excel file in the first uploading box.<br>
      Step 4: Select the supplementary images and other raw data files in the second uploading box (press "Ctrl" or "Command" when selecting multiple files), then click Submit to upload your data.<br>
      Step 5: Wait for the feedback message. Please read the message and follow the instructions if an error message is displayed.</p>
      <h5 class="text-xs-left">Note</h5>
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
        <div><v-text-field label="Select the Excel Template File" @click.stop='pickTemplate' v-model='templateName' prepend-icon='attach_file'></v-text-field>
        <input
          type="file"
          style="display: none"
          accept=".xlsx, .xls"
          ref="myTemplate"
          @change="onTemplatePicked"
        ></div>
      </v-flex>
      <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
        <div><v-text-field label="Select Other Files (including raw data files and image files)" @click.stop='pickFile' v-model='fileName' prepend-icon='attach_file'></v-text-field>
        <input
          type="file"
          style="display: none"
          multiple="true"
          ref="myUpload"
          @change="onFilePicked"
        ></div>
      </v-flex>
      <v-btn v-on:click="submit()">Submit</v-btn>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import Axios from 'axios'

export default {
  name: 'XMLCONV',
  data: () => ({
    title: 'File Upload',
    dialog: false,
    templateName: '',
    templateUrl: '',
    fileName: '',
    template: null,
    files: [],
    uploadError: false,
    uploadErrorMsg: ''
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

    onTemplatePicked (e) {
      const files = e.target.files
      let file = {}
      let f = files[0]
      if (f !== undefined) {
        this.templateName = f.name
        file.fileName = this.templateName
        if (this.templateName.lastIndexOf('.') <= 0) {
          console.log("Error No Extension: " + this.templateName)
        }
        const fr = new FileReader()
        fr.readAsDataURL(f)
        fr.addEventListener('load', () => {
          this.templateUrl = fr.result
          file.fileUrl = this.templateUrl
          this.template = file
        })
      } else {
        this.templateName = ''
        this.templateUrl = ''
      }
    },

    onFilePicked (e) {
      const files = e.target.files
      for (let i = 0; i < files.length; i ++) {
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
          })
        } else {
          console.log("File Undefined")
        }
      }
    },

    submit () {
      let vm = this
      vm.files.forEach(function (v){
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
      let url = '/nmr/XMLCONV'
      return Axios.post(url, vm.files)
        .then(function (resp) {
          console.log('response: ' + JSON.stringify(resp))
          vm.resetLoading()
        })
        .catch(function (err) {
          console.log('error: ' + err)
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
