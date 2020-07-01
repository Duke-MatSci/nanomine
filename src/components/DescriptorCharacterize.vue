<!--
################################################################################
#
# File Name: DescriptorCharacterize.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, November 1, 2018
# Rewritten by: Atul Jalan, June 30, 2020
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

    name: 'DescriptorCharacterize',

    components: {
      McrJobsTemplate
    },

    data: () => {
      return {
        jobInfo: {

          jobTitle: 'Descriptor Characterization',

          pageTitle: 'Microstructure Characterization - Physical Descriptors',

          descriptions: [
            'Upload a binarized image or a ZIP file containing set of images and click "Characterize" to get descriptors for filler material. The descriptors evaluated by this webtool are - filler volume fraction (equivalent to area fraction), number of filler clusters and area, aspect ratio & nearest neighbor distance of each filler cluster. Nearest neighbor distance of a cluster is the distance between its centroid and that of a cluster nearest to it. Except for volume fraction, number of clusters and aspect ratio (which are dimensionless), all descriptors have units of "pixels" ("pixel^2" for area descriptor).'
          ],
          
          aspectRatio: 'free',

          submit: {
            submitButtonTitle: 'Characterize',
            submitJobTitle: 'DescriptorCharacterize'
          },
                    
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
            'Xu, H., Li, Y., Brinson, C. and Chen, W., 2014. A descriptor-based design methodology for developing heterogeneous microstructural materials system. Journal of Mechanical Design, 136(5), p.051007.',
            'Xu, H., Dikin, D.A., Burkhart, C. and Chen, W., 2014. Descriptor-based methodology for statistical characterization and 3D reconstruction of microstructural materials. Computational Materials Science, 85, pp.206-216.'
          ]

        }
      }
    }
  }

</script>