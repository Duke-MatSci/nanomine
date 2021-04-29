<!--
################################################################################
#
# File Name: BinarizeHomepage.vue
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
  <h1 v-if="this.$store.state.versionNew" class="header-mm">Image Binarization</h1>
    <div class="binarization_homepage">
      <v-container class="text-xs-left">
            <div>
              <p> Choose the Binarization method from the options below.</p>
            </div>
        <v-layout align-space-between justify-left row fill-height>
          <v-flex>
              <div style="margin-bottom:2rem;">
                <h2>Otsu's Method </h2>
                <p> Otsu's thresholding method involves iterating through all the possible threshold values and calculating a measure of spread for the pixel levels each side of the threshold,
                    i.e. the pixels that either fall in foreground (white) or background (black). The aim is to find the global threshold that minimizes intraclass variance of the thresholded
                    black and white pixels. It works well for relatively noise free images having significant contrast between filler and matrix material.
                </p>
                <router-link v-if="this.$store.state.versionNew" to="/mm/Otsu">Use Otsu's Binarization Webtool</router-link>
                <router-link v-if="!this.$store.state.versionNew" to="/Otsu">Use Otsu's Binarization Webtool</router-link>
              </div>
              <div>
                <h2> Niblack's Method </h2>
                <p> 
                  Niblack's method is an adaptive thresholding algorithm which calculates a pixel-wise threshold by sliding a rectangular window over the image.
                  It works well for gray-level images with low contrast between filler and matrix material.
                </p>
                <router-link v-if="this.$store.state.versionNew" to="/mm/Niblack">Use Niblack Binarization Webtool</router-link>
                <router-link v-if="!this.$store.state.versionNew" to="/Niblack">Use Niblack Binarization Webtool</router-link>
              </div>
          </v-flex>
        </v-layout>
        <h4 v-if="referenceOpen" @click="refOpen">References <i class="material-icons icon-adjust">keyboard_arrow_up</i></h4>
        <h4 v-else @click="refOpen">References <i class="material-icons icon-adjust">keyboard_arrow_down</i></h4>
        <v-flex xs12 v-if="referenceOpen">
          <p>N. Otsu, A threshold selection method from gray-level histograms, IEEE transactions on systems, man, and cybernetics, vol. 9, no. 1, pp. 62-66, 1979.</p>
          <p>W. Niblack, An Introduction to Image Processing. Englewood Cliffs, NJ: Prentice-Hall, 1986, pp. 115-116.</p>
          <p>Khurshid, K.,Siddiqi, I., Faure, C. and Vincent, N., 2009. Comparison of Niblack inspired Binarization methods for ancient document. DRR, 7247, pp.1-10</p>
        </v-flex>
      </v-container>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BinarizeHomepage',
  data () {
    return {
      referenceOpen: false,
    }
  },
  methods: {
    refOpen () {
      return this.referenceOpen = !this.referenceOpen;
    }
  },
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Image Binarization'})
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 240px;
  }
  h3 {
    margin-top: 0px;
    color: #096ff4;
    margin-bottom: 10px;
  }
  h4 {
    text-transform: uppercase;
  }

</style>
