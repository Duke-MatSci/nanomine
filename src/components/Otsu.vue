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
  <div class="Otsu">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-flex xs12>
          <h3>Description</h3>
          <br>
            <p>Upload a image / ZIP file containing set of images (Supported file formats: .jpg, .tif, .png) and click "Binarize" to binarize image using Otsu's Mehtod.</p>
            <h4> Input Options:</h4>
                  <p><strong> 1) Single image: </strong>Supported image formats are .jpg, .tif and .png.
                  <p><strong> 2) Single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named "Input" - which contains the image.</p>
                  <p><strong> 3) Multiple images in ZIP File:</strong> Submit a ZIP file containing multiple images (supported formats: .jpg, .tif, .png) of same size (in pixels).
                DO NOT ZIP the folder containing images; select all images and ZIP them directly.</p>
      </v-flex>

          <h2> Create Agent to accept user uploaded files and process it in MATLAB</h2>

    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
        <p> N. Otsu, A threshold selection method from gray-level histograms, IEEE transactions on systems, man, and cybernetics, vol. 9, no. 1, pp. 62-66, 1979.</p>
    </v-flex>
  </div>
</template>

<script>
export default {
  name: 'Otsu',
  data () {
    return {
      msg: 'Otsu Image Binarization Method'
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
