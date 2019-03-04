<!--
################################################################################
#
# File Name: Niblack.vue
# Application: templates
#
# Created by: Akshay Iyer, August 18, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="Niblack">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-flex xs12>
          <h3>Description</h3>
          <br>
            <p>Upload a grayscale micrograph image in .jpg/.png/.tif format and click "Binarize" to perform dynamic niblack binarization. A default window size of 5 pixels (i.e. 5 x 5 pixel window) will be used. </p>
            <p>After binarization is complete, this page will be updated to show the results. You can change window size and retry binarization until you get satisfactory result. </p>
      </v-flex>
          <h2> Create Agent to accept user uploaded files and process it in MATLAB</h2>

    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
        <p>W. Niblack, An Introduction to Image Processing. Englewood Cliffs, NJ: Prentice-Hall, 1986, pp. 115-116.</p>
        <p>Khurshid, K.,Siddiqi, I., Faure, C. and Vincent, N., 2009. Comparison of Niblack inspired Binarization methods for ancient document. DRR, 7247, pp.1-10</p>
    </v-flex>
  </div>
</template>

<script>
export default {
  name: 'Niblack',
  data () {
    return {
      msg: 'Niblack Binarization Method'
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
  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

</style>
