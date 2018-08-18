<!--
################################################################################
#
# File Name: CorrelationReconstruct.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, August 18, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="CorrelationReconstruct">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-flex xs12>
          <h3>Description</h3>
          <br>
            <p>Upload a binarized image / ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Reconstruct" to reconstruct statistically equivalent image.
            All correlation functions are evaluated for the "white" phase in image.</p>
            <h4> Input Options:</h4>
                  <p><strong> NOTE: Images must be binarized.</strong></p>
                  <p><strong> 1) Single image: </strong>Supported image formats are .jpg, .tif and .png.(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option1.zip'>Sample</a>)</p>
                  <p><strong> 2) Single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named "Input" - which contains pixel values(only 0 or 1)(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option2.zip'>Sample</a>).</p>
                  <p><strong> 3) Multiple images in ZIP File:</strong> Submit a ZIP file containing multiple images (supported formats: .jpg, .tif, .png) of same size (in pixels). DO NOT ZIP the folder containing images; select all images and ZIP them directly.(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option3.zip'>Sample</a>).
                  <strong> The mean value of chosen correlation (averaged over all images) will be used for reconstruction.</strong> </p>
      </v-flex>
          <h2> Create Agent to accept user uploaded files and process it in MATLAB</h2>

    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
        <p>Rintoul, M.D. and Torquato, S., 1997. Reconstruction of the structure of dispersions. Journal of Colloid and Interface Science, 186(2), pp.467-476.</p>
        <p>Yeong,C. and Torquato,S., 1998. Reconstructing random media Physical Review E, vol. 57, no. 1, p. 495</p>
    </v-flex>
  </div>
</template>

<script>
export default {
  name: 'CorrelationReconstruct',
  data () {
    return {
      msg: 'Microstructure Reconstruction - Correlation Function Approach'
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
