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
  <div class="main">
    <McrJobsTemplate v-bind:job='jobInfo'></McrJobsTemplate>
  </div>
</template>

<script>

import {} from 'vuex'
import McrJobsTemplate from './McrJobsTemplate.vue'
export default {

  name: 'Niblack',

  components: {
    McrJobsTemplate,
  },

  data: () => {
    return {
      jobInfo: {

        jobTitle: 'Niblack',

        pageTitle: 'Binarization - Niblack Method',

        description: [
          'Niblack is a local thresholding method for binarization that is particularly useful for images without uniform backgrounds and images where calculating a global threshold does not yield good results.',
          'WINDOW SIZE: Niblack involves computing, for each pixel in the grayscale image, the mean and standard devation of the colors of the neighboring pixels in an area (i.e. window size) of predefined size. Window size is generally between 1-50, depending on the size of the particles of interest.',
          'K: an image dependent manually selected parameter (generally, the value is -0.2 for dark foreground and +0.2 for dark background).',
          'OFFSET: an offset value that is applied when computing the mean and standard deviation for threshold values for pixels in an image (to separate foreground and background pixels.) Most of the time, the offset value can be 0.',
          'Upload a grayscale micrograph image in .jpg/.png/.tif format and click "Binarize" to perform dynamic niblack binarization. A default window size of 5 pixels (i.e. 5 x 5 pixel window) will be used.',
          'After binarization is complete, this page will be updated to show the results. You can change window size and retry binarization until you get satisfactory result.'
        ],

        aspectRatio: 'free',

        getImageDimensions: false,

        submit: {
          submitButtonTitle: 'Binarize',
          submitJobTitle: 'otsu',
          submitJobType: 'niblack'
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

        acceptableFileTypes: '.jpg, .png, .tif, .mat',

        useWebsocket: true,

        references: [
          'W. Niblack, An Introduction to Image Processing. Englewood Cliffs, NJ: Prentice-Hall, 1986, pp. 115-116.',
          'Khurshid, K.,Siddiqi, I., Faure, C. and Vincent, N., 2009. Comparison of Niblack inspired Binarization methods for ancient document. DRR, 7247, pp.1-10'
        ],

        selects: [
          {
            title: 'Window Size (usually between 1 and 50)',
            submitJobTitle: 'WindowSize',
          },
          {
            title: 'K (Optional, usually between -0.2 and +0.2)',
            submitJobTitle: 'KNiblack'
          },
          {
            title: 'Offset (Optional, usually set to 0)',
            submitJobTitle: 'OffsetNiblack'
          }
        ]

      }
    }
  },
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Binarization - Niblack Method'})
  }
}
</script>