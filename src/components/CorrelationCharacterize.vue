<!--
################################################################################
#
# File Name: CorrelationCharacterize.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, November 18, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div>
    <a-header :info="info"></a-header>
    <div class="main">
      <McrJobsTemplate v-bind:job='jobInfo'></McrJobsTemplate>
    </div>
    <a-footer></a-footer>
  </div>
</template>

<script>

import {} from 'vuex'
import McrJobsTemplate from './McrJobsTemplate.vue'
import * as Util from './utils'
export default {

  name: 'CorrelationCharacterize',

  components: {
    aHeader: Util.Header,
    aFooter: Util.Footer,
    McrJobsTemplate
  },

  data: () => {
    return {
      info: {icon: 'fa-bullseye', name: 'Microstructure Characterization'},
      jobInfo: {

        jobTitle: 'Correlation Characterize',

        pageTitle: 'Correlation Function Approach',

        description: [
          'Upload a binarized image / ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Characterize". All correlation functions are evaluated for the "white" phase in image.'
        ],

        aspectRatio: 'square',

        getImageDimensions: true,

        submit: {
          submitButtonTitle: 'Characterize',
          submitJobTitle: 'CorrelationCharacterize'
        },

        uploadOptions: [
          {
            title: 'Single image',
            description: 'Supported image formats are .jpg, .tif and .png.'
          },
          {
            title: 'Single image in .mat format',
            description: 'The .mat file must contain ONLY ONE variable named "Input" - which contains the image.'
          },
          {
            title: 'ZIP file with multiple images (Coming soon!)',
            description: 'Submit a ZIP file containing multiple images (supported formats: .jpg, .tif, .png) of same size (in pixels). DO NOT ZIP the folder containing images; select all images and ZIP them directly.'
          }
        ],

        acceptableFileTypes: '.jpg, .png, .tif, .zip, .mat',

        useWebsocket: false,

        references: [
          'Rintoul, M.D. and Torquato, S., 1997. Reconstruction of the structure of dispersions. Journal of Colloid and Interface Science, 186(2), pp.467-476.',
          'Yeong,C. and Torquato,S., 1998. Reconstructing random media Physical Review E, vol. 57, no. 1, p. 495'
        ],

        selects: [
          {
            title: 'Correlation Name',
            submitJobTitle: 'CorrelationType',
            options: ['Autocorrelation', 'Lineal Path Correlation', 'Cluster Correlation', 'Surface Correlation']
          }
        ]

      }
    }
  }
}

</script>
