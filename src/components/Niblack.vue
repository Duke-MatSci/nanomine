<!--
################################################################################
#
# File Name: Otsu.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, July 23, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <McrJobsTemplate v-bind:job='jobInfo'></McrJobsTemplate>
</template>

<script>

import {} from 'vuex'
import McrJobsTemplate from './McrJobsTemplate.vue'

export default {

  name: 'Niblack',

  components: {
    McrJobsTemplate
  },

  data: () => {
    return {
      jobInfo: {

        jobTitle: 'Niblack',

        pageTitle: 'Binarization - Niblack Method',

        description: [
          'Upload a grayscale micrograph image in .jpg/.png/.tif format and click "Binarize" to perform dynamic niblack binarization. A default window size of 5 pixels (i.e. 5 x 5 pixel window) will be used.',
          'After binarization is complete, this page will be updated to show the results. You can change window size and retry binarization until you get satisfactory result.'
        ],

        aspectRatio: 'free',

        getImageDimensions: false,

        submit: {
          submitButtonTitle: 'Binarize',
          submitJobTitle: 'niblack'
        },

        uploadOptions: [
          {
            title: 'Single image',
            description: 'Supported image formats are .jpg, .tif and .png.'
          },
          {
            title: 'Single image in .mat format',
            description: 'The .mat file must contain ONLY ONE variable named "Input," which contains the image.'
          }
        ],

        references: [
          'W. Niblack, An Introduction to Image Processing. Englewood Cliffs, NJ: Prentice-Hall, 1986, pp. 115-116.',
          'Khurshid, K.,Siddiqi, I., Faure, C. and Vincent, N., 2009. Comparison of Niblack inspired Binarization methods for ancient document. DRR, 7247, pp.1-10'
        ],

        selects: [
          {
            title: 'Window Size',
            submitJobTitle: 'WindowSize',
          }
        ]

      }
    }
  }
}
</script>