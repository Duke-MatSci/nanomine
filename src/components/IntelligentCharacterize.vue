<!--
################################################################################
#
# File Name: IntelligentCharacterize.vue
# Application: templates
# Description:
#
# Created by: Henry Zhang, August 29, 2019
# Rewritten by: Atul Jalan, July 1, 2020
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

    name: 'IntelligentCharacterize',

    components: {
      McrJobsTemplate
    },

    data: () => {
      return {
        jobInfo: {

          jobTitle: 'Intelligent Characterization',

          pageTitle: 'Microstructure Characterization - Intelligent',

          description: [
            'This tool assesses the uploaded image(s) of microstructure and performs analysis to decide which characterization method suits the best. The process consists of three steps:',
            '(1) Calculate universal descriptors, i.e., void fraction, isotropy index, and interfacial area.',
            '(2) Determine whether Spheroidal Descriptors or Spectral Density Function (SDF) is more applicable, based on isotropy index and connectivity index. If the material is not isotropic or too connected, then the Spheroidal Descriptors are not applicable.',
            '(3) Generate results for either Spheroidal Descriptors or SDF representation. If Spheroidal Descriptor method is chosen, results of Nearest Neighbor Distance, Number of clusters, Compactness, Cluster Area, Cluster Radius, Elongation Ratio, Orientation Angle, and Rectangularity will be provided. If the SDF method is chosen, the following five different forms of SDF will be tested and the best fitted form will be chosen with output of the fitted parameters and the goodness of fit value.',
            'Chi-square fit: <math>y = a * f<sub>k</sub>(b * x, n)</math>, where <math>f<sub>k</sub></math> is the probability density function of chi-square distribution.',
            'Gamma fit: <math>y = a * f<sub>g</sub>(x - x<sub>0</sub>, b, c)</math>, where <math>f<sub>g</sub></math> is the probability density function of gamma distribution.',
            'Gaussian fit: <math>y = a * exp[-b * (x - x<sub>0</sub>)<sup>2</sup>]</math>',
            'Step function fit: <math>y = a * [h(x-x<sub>1</sub>) - h(x-x<sub>2</sub>)]</math>, where <math>h</math> is Heaviside function.',
            'Exponential fit: <math>y = a * exp[-b * (x - x<sub>0</sub>)]</math>',
            'Double peak fit: <math>y = a<sub>1</sub> * exp[-b<sub>1</sub> * (x - x<sub>1</sub>)<sup>2</sup>] +  a<sub>2</sub> * exp[-b<sub>2</sub> * (x - x<sub>2</sub>)<sup>2</sup>]</math>'
          ],
          
          aspectRatio: 'free',

          submit: {
            submitButtonTitle: 'Intelligent Characterization',
            submitJobTitle: 'IntelligentCharacterize'
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
            'Bostanabad, R. et al., 2018. Computational microstructure characterization and reconstruction: Review of the state-of-the-art techniques. Progress in Materials Science, 95, pp. 1-41.'
          ]

        }
      }
    }
  }

</script>