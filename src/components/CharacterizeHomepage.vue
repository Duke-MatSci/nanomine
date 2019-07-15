<!--
################################################################################
#
# File Name: CharacterizeHomepage.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, August 15, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="characterization_homepage">
    <h1>{{ msg }}</h1>
    <v-container class="text-xs-left">
          <div>
            <p> Choose the characterization method from the options below.</p>
          </div>
          <p><strong>NOTE: Uploaded images will be binarized using Otsu method</strong></p>
      <v-layout align-space-between justify-center row fill-height>
        <v-flex>
            <div>
              <h2> Correlation Functions </h2>
              <div class="text-xs-left"> They are statistical descriptors that quantitatively connect the macroscopic properties of a heterogeneous image to its complex microstructure.
                  Mathematically, they quantify the conditional probability of finding two randomly chosen points in the same phase (autocorrelation). Currently, our webtool can evaluate four widely used two-point
                  correlation functions - autocorrelation, lineal path, cluster and surface correlation.</div>
              <router-link to="/CorrelationCharacterize">Use Correlation Function Webtool</router-link>
            </div>
          <p></p>
            <div>
              <h2> Physical Descriptors </h2>
              <div class="text-xs-left"> Physical descriptors (aka features/predictors) provide a meaningful and convenient approach for direct elucidation of Processing-Structure-Property relations.
                  Descriptors are important structural parameters that are highly related to material properties and provide a reduced dimension representation of microstructure. Extracting descriptors from a microstructure
                  image involves application of image segmentation techniques to identify clusters of filler material followed by analysis of individual cluster. Although one can consider several descriptors, our webtool
                  evaluates four descriptors - volume fraction, number of white phase aggregates, aspect ratio and nearest neighbor distance. This method is best suited for materials with particulate filler clusters that are speherical/ellipsoidal in shape.</div>
              <router-link to="/DescriptorCharacterize">Use Physical Descriptor Webtool</router-link>
            <p></p>
            </div>
            <div>
              <h2> Spectral Density Function </h2>
              <div class="text-xs-left"> The Spectral Density Function (SDF) is a frequency domain microstructure representation where different frequencies represent real
              space features at different length scales. SDF provides a low-dimensional microstructure representation for quasi-random materials which have arbitrary filler geometry but its distribution is governed by an
              underlying spatial correlation. The inverse Fourier Transform of SDF is the two-point autocorrelation function.</div>
              <router-link to="/SDFCharacterize">Use Spectral Density Function Webtool</router-link>
            <p></p>
            </div>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'CharacterizeHomepage',
  data () {
    return {
      msg: 'Microstructure Characterization'
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
