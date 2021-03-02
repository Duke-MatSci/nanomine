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
  name: 'DescriptorReconstruct',
  components: {
    aHeader: Util.Header,
    aFooter: Util.Footer,
    McrJobsTemplate
  },

  data: () => {
    return {
      info: {icon: 'fa-bullseye', name: 'Microstructure Reconstruction'},
      jobInfo: {

        jobTitle: 'Descriptor Reconstruction',

        pageTitle: 'Physical Descriptors',

        description: [
          'Upload a binarized image in JPEG/PNG/TIF format to generate a statistically equivalent 3D reconstruction.',
          'The webtool first evaluates all necessary descriptors for the input image. Assuming filler aggregates to be ellipsoidal and isotropic microstructure, the descriptors obtained from input image are used to estimate the values of corresponding descriptors for 3D reconstruction. The reconstruction procedure follows a four-step hierarchical methodology outlined in articles by Xu et.al. (see references). The 3D reconstruction has the same resolution as the input image; i.e. the edge length of a voxel in 3D reconstruction has the same physical size as that of a pixel in the 2D input image.'
        ],

        aspectRatio: 'free',

        getImageDimensions: true,

        submit: {
          submitButtonTitle: 'Reconstruct',
          submitJobTitle: 'DescriptorReconstruct'
        },

        uploadOptions: [
          {
            title: 'Note',
            description: 'Images must be binarized.'
          },
          {
            title: 'Single image',
            description: 'Supported file formats are JPEG, PNG and TIF.'
          },
          {
            title: 'Single image in .mat format',
            description: 'The .mat file must contain ONLY ONE variable named "Input" - which contains pixel values (only 0 or 1).'
          },
          {
            title: 'ZIP file with multiple images (Coming soon!)',
            description: 'Submit a ZIP file containing multiple JPEG images of same size (in pixels). DO NOT ZIP the folder containing images; select all images and ZIP them directly. The mean value of each descriptor (averaged over all images) will be used for reconstruction.'
          }
        ],

        acceptableFileTypes: '.jpg, .png, .tif, .zip, .mat',

        useWebsocket: false,

        results: [
          'The results will include 3D reconstructed image (Input_3D_recon.mat), a list of coordinates of cluster (white phase) centroids in "Input_3D_recon_center_list.mat", the input image and a random 2D cross-section (Slice.jpg) from the 3D reconstructed image. Additionally, a plot (Autocorrelation_comparison.jpg) comparing the autocorrelation of input image with 10 randomly chosen 2D slices from reconstruction is provided to validate the accuracy of reconstruction.'
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
