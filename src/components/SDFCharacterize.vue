<!--
################################################################################
#
# File Name: SDFCharacterize.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, November 1, 2018
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

    name: 'SDFCharacterize',

    components: {
      McrJobsTemplate
    },

    data: () => {
      return {
        jobInfo: {

          jobTitle: 'SDF Characterization',

          pageTitle: 'Microstructure Characterization - Spectral Density Function',

          description: [
            'Upload a binarized image / ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Characterize". All correlation functions are evaluated for the "white" phase in image.'
          ],
          
          aspectRatio: 'square',

          getImageDimensions: true,

          submit: {
            submitButtonTitle: 'Characterize',
            submitJobTitle: 'SDFCharacterize'
          },
                    
          uploadOptions: [
            {
              title: 'Single image', 
              description: 'Supported image formats are .jpg, .tif and .png.The results will include the 2D SDF and it\'s radially averaged 1D version in CSV file format.'
            },
            {
              title: 'Single image in .mat format',
              description: 'The .mat file must contain ONLY ONE variable named "Input" - which contains the image.The results will include the 2D SDF and it\'s radially averaged 1D version in CSV file format.'
            },
            {
              title: 'ZIP file with multiple images',
              description: 'Submit a ZIP file containing multiple images (supported formats: .jpg, .tif, .png) of same size (in pixels). DO NOT ZIP the folder containing images; select all images and ZIP them directly. DO NOT ZIP the folder containing images; select all images and ZIP them directly. The results will include a folder "input" which contains all images submitted by user, one folder for each input image that comprises the 2D and 1D SDF (in CSV format) of the respective image. Additionally, the mean 2D and 1D SDF, averaged over all input images is provided in CSV file along with a plot of the mean 2D SDF in "SDF_2D.jpg".'
            }
          ],

          references: [
            'Ghumman, U.F., Iyer, A., Dulal, R., Munshi, J., Wang, A., Chien, T., Balasubramanian, G., and Chen, W., A Spectral Density Function Approach for Active Layer Design of Organic Photovoltaic Cells, Journal of Mechanical Design, Special Issue on Design of Engineered Materials and Structures, accepted July 2018. doi:10.1115/1.4040912.',
            'Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017. Characterization and design of functional quasi-random nanostructured materials using spectral density function. Journal of Mechanical Design, 139(7), p.071401.',
            'Lee, W. K., Yu, S., Engel, C. J., Reese, T., Rhee, D., Chen, W., & Odom, T. W. (2017). Concurrent design of quasi-random photonic nanostructures. Proceedings of the National Academy of Sciences, 114(33), 8734-8739.'
          ]

        }
      }
    }
  }

</script>
