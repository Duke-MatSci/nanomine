<!--
################################################################################
#
# File Name: SDFCharacterize.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, August 18, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="SDFCharacterize">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-flex xs12>
          <h3>Description</h3>
          <br>
            <p>Upload a binarized image / ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Characterize".
            All correlation functions are evaluated for the "white" phase in image.</p>
            <p><strong> NOTE: Images must be binarized.</strong></p>
            <h4> Input Options:</h4>
                  <p><strong> 1) Single image: </strong>Supported image formats are .jpg, .tif and .png (Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option1.zip'>Sample</a>).
                  The results will include the 2D SDF and it's radially averaged 1D version in CSV file format.</p>
                  <p><strong> 2) Single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named "Input" - which contains the image (Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option2.zip'>Sample</a>). The results will include the 2D SDF and it's radially averaged 1D version in CSV file format.</p>
                  <p><strong> 3) Multiple images in ZIP File:</strong> Submit a ZIP file containing multiple images (supported formats: .jpg, .tif, .png) of same size (in pixels) (Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option3.zip'>Sample</a>).
                  DO NOT ZIP the folder containing images; select all images and ZIP them directly. The results will include a folder "input" which contains all images submitted by user,
                  one folder for each input image that comprises the 2D and 1D SDF (in CSV format) of the respective image. Additionally, the mean 2D and 1D SDF, averaged over all input images is provided in CSV file along with
                  a plot of the mean 2D SDF in "SDF_2D_mean.jpg". </p>
      </v-flex>
          <h2> Create Agent to accept user uploaded files and process it in MATLAB</h2>

    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
    <p>Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017. Characterization and design of functional quasi-random nanostructured materials using spectral density function. Journal of Mechanical Design, 139(7), p.071401.</p>
    <p>Lee, W. K., Yu, S., Engel, C. J., Reese, T., Rhee, D., Chen, W., & Odom, T. W. (2017). Concurrent design of quasi-random photonic nanostructures. Proceedings of the National Academy of Sciences, 114(33), 8734-8739.</p>

    </v-flex>
  </div>
</template>

<script>
export default {
  name: 'SDFCharacterize',
  data () {
    return {
      msg: 'Microstructure Characterization - Spectral Density Function'
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
</style>
