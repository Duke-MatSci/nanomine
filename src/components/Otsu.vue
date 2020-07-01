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
  <McrJobsTemplate :job='jobInfo'></McrJobsTemplate>
</template>

<script>

  import {} from 'vuex'

  export default {

    name: 'Otsu',

    components: {
      McrJobsTemplate
    },

    data: () => {
      return {
        jobInfo: {

          jobTitle: 'Otsu',

          pageTitle: 'Binarization - Otsu Method',

          description: 'Upload an image or ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Binarize" to binarize image using Otsu\'s Method.',
          
          aspectRatio: 'free',
          
          submitButtonTitle: 'Binarize',
          
          uploadOptions: [
            {
              title: 'Single image', 
              description: 'Supported image formats are .jpg, .tif and .png.'
            },
            {
              title: 'Single image in .mat format',
              description: 'The .mat file must contain ONLY ONE variable named "Input," which contains the image.'
            },
            {
              title: 'ZIP file with multiple images',
              description: 'Submit a ZIP file containing multiple images (supported formats: .jpg, .tif, .png) of same size (in pixels). DO NOT ZIP the folder containing images; select all images and ZIP them directly.'
            }
          ],

          references: [
            'N. Otsu, A threshold selection method from gray-level histograms, IEEE transactions on systems, man, and cybernetics, vol. 9, no. 1, pp. 62-66, 1979.'
          ]

        }
      }
    }
  }
</script>

