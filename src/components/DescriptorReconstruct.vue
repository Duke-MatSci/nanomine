<!--
################################################################################
#
# File Name: DescriptorReconstruct.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, December 6, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="DescriptorReconstruct">
    <h1>{{ msg }}</h1>
    <v-container class="text-xs-left">
      <v-flex xs12>
          <h3>Description</h3>
          <br>
           <p>Upload a binarized image in JPEG/PNG/TIF format to generate a statistically equivalent 3D reconstruction.</p>
           <p>The webtool first evaluates all necessary descriptors for the input image. Assuming filler aggregates to be ellipsoidal and isotropic microstructure,
           the descriptors obtained from input image are used to estimate the values of corresponding descriptors for 3D reconstruction. The reconstruction procedure follows a
           four-step hierarchical methodology outlined in articles by Xu et.al. (see references).
           The 3D reconstruction has the same resolution as the input image; i.e. the edge length of a voxel in 3D reconstruction has the same physical size as that of a
           pixel in the 2D input image.</p>

          <h4> Input Options:</h4>
          <p><strong> NOTE: Images must be binarized.</strong></p>
                <p><strong> 1) Single image:</strong> Supported file formats are JPEG, PNG and TIF.(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option1.zip'>Sample</a>).</p>
                <p><strong> 2) Single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named "Input" - which contains pixel values(only 0 or 1)(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option2.zip'>Sample</a>).</p>
                <p><strong> 3) Multiple images in ZIP File (Coming Soon!):</strong> Submit a ZIP file containing multiple JPEG images of same size (in pixels). DO NOT ZIP the folder containing images;
                select all images and ZIP them directly.(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option3.zip'>Sample</a>).<strong>The mean value of each descriptor
                (averaged over all images) will be used for reconstruction.</strong> </p>
          <h3> Results </h3>
          <p>The results will include 3D reconstructed image (Input_3D_recon.mat), a list of coordinates of cluster (white phase) centroids in "Input_3D_recon_center_list.mat",
          the input image and a random 2D cross-section (Slice.jpg) from the 3D reconstructed image.
          Additionally, a plot (Autocorrelation_comparison.jpg) comparing the autocorrelation of input image with 10 randomly chosen 2D slices from reconstruction is
          provided to validate the accuracy of reconstruction.  </p>
       </v-flex>
      <v-alert
        v-model="loginRequired"
        type="error"
        outline
      >
        {{loginRequiredMsg}}
      </v-alert>
        <v-alert
          v-model="errorAlert"
          type="error"
          dismissible
        >
          {{errorAlertMsg}}
        </v-alert>
        <v-dialog v-model="successDlg" persistent max-width="500px">
          <v-card>
            <v-card-title>
              <span>Characterization Job Submitted Successfully</span>
              <v-spacer></v-spacer>
            </v-card-title>
            <v-card-text>
              Your characterization job is: {{jobId}} <br/> You should receive an email with a link to the job output.
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" flat @click="successDlgClicked()">Close</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">
          <p class="text-xs-left">Select File
            <v-btn class="text-xs-left" small color="primary" @click='pickFile'>Browse</v-btn>
            <input
              type="file"
              style="display: none"
              accept=".jpg, .png, .tif, .mat, .zip"
              ref="myUpload"
              @change="onFilePicked"
            >
          </p>
          <v-list v-model="fileName" subheader: true v-if="fileUploaded">
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
        </v-flex >
      <v-flex class="text-xs-center">
        <v-btn v-on:click="submit()" color="primary">Reconstruct</v-btn>
      </v-flex >
      <h4>References</h4>
      <v-flex xs12>
        <p> Xu, H., Li, Y., Brinson, C. and Chen, W., 2014. A descriptor-based design methodology for developing heterogeneous microstructural materials system. <i>Journal of Mechanical Design</i>, 136(5), p.051007.</p>
        <p>Xu, H., Dikin, D.A., Burkhart, C. and Chen, W., 2014. Descriptor-based methodology for statistical characterization and 3D reconstruction of microstructural materials. <i>Computational Materials Science</i>, 85, pp.206-216.</p>
      </v-flex>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import {JobMgr} from '@/modules/JobMgr.js'
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'DescriptorReconstruct',
  data: () => {
    return ({
      title: 'Input Upload',
      msg: 'Microstructure Reconstruction - Physical Descriptors',
      dialog: false,
      fileName: '',
      // file_type: [],
      files: [],
      filesDisplay: [],
      errorAlert: false,
      errorAlertMsg: '',
      loginRequired: false,
      loginRequiredMsg: '',
      fileUploaded: false,
      successDlg: false,
      jobId: ''
    })
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

    pickFile () {
      this.$refs.myUpload.click()
    },

    resetFiles: function () {
      this.files = []
      this.filesDisplay = []
      this.fileUploaded = false
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
          console.log(file.fileName)
          const fr = new FileReader()
          fr.readAsDataURL(f)
          fr.addEventListener('load', () => {
            file.fileUrl = fr.result
            this.files.push(file)
            this.filesDisplay.push(file)
            this.fileUploaded = true
          })
        } else {
          console.log('File Undefined')
        }
      }
    },
    successDlgClicked: function () {
      let vm = this
      console.log('Success dlg button clicked')
      vm.$router.go(-2) // go back to mcr homepage page
    },
    submit: function () {
      let vm = this
      vm.files.forEach(function (v) {
        console.log(JSON.stringify(v))
      })

      vm.setLoading()
      console.log('Loading..')
      let jm = new JobMgr()
      console.log('Called Job Manager')
      jm.setJobType('DescriptorReconstruct')
      jm.setJobParameters({'InputType': vm.fileName.split('.').pop()}) // Figure out which input type
      if (vm.files && vm.files.length >= 1) {
        vm.files.forEach(function (v) {
          jm.addInputFile(v.fileName, v.fileUrl)
          console.log('Job Manager added file: ' + v.fileName)
        })
        return jm.submitJob(function (jobId) {
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
      } else {
        let msg = 'Please select a file to process.'
        vm.errorAlertMsg = msg
        vm.errorAlert = true
        vm.resetLoading()
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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
