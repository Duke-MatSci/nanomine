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
    <v-container>
          <div>
            <p> Choose the characterization method from the options below.</p>
          </div>
          <p><strong>NOTE: Images must be binarized</strong></p>
      <v-layout align-space-between justify-center row fill-height>
        <v-flex>
            <div>
              <h2> Correlation Functions </h2>
              <p> They are statistical descriptors that quantitatively connect the macroscopic properties of a heterogeneous image to its complex microstructure.
                  Mathematically, they quantify the conditional probability of finding two randomly chosen points in the same phase (autocorrelation). Currently, our webtool can evaluate four widely used two-point
                  correlation functions - autocorrelation, lineal path, cluster and surface correlation.</p>
              <router-link to="/CorrelationCharacterize">Use Correlation Function Webtool</router-link>
            </div>
            <div>
              <h2> Physical Descriptors </h2>
              <p> Physical descriptors (aka features/predictors) provide a meaningful and convenient approach for direct elucidation of Processing-Structure-Property relations.
                  Descriptors are important structural parameters that are highly related to material properties and provide a reduced dimension representation of microstructure. Extracting descriptors from a microstructure
                  image involves application of image segmentation techniques to identify clusters of filler material followed by analysis of individual cluster. Although one can consider several descriptors, our webtool
                  evaluates four descriptors - volume fraction, number of white phase aggregates, aspect ratio and nearest neighbor distance. This method is best suited for materials with particulate filler clusters that are speherical/ellipsoidal in shape.</p>
              <router-link to="/DescriptorCharacterize">Use Physical Descriptor Webtool</router-link>
            </div>
            <div>
              <h2> Spectral Density Function </h2>
              <p> The Spectral Density Function (SDF) is a frequency domain microstructure representation where different frequencies represent real
              space features at different length scales. SDF provides a low-dimensional microstructure representation for quasi-random materials which have arbitrary filler geometry but its distribution is governed by an
              underlying spatial correlation. The inverse Fourier Transform of SDF is the two-point autocorrelation function.</p>
              <router-link to="/SDFCharacterize">Use Spectral Density Function Webtool</router-link>
            </div>
        </v-flex>
      </v-layout>
    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
        <p>Rintoul, M.D. and Torquato, S., 1997. Reconstruction of the structure of dispersions. Journal of Colloid and Interface Science, 186(2), pp.467-476. </p>
        <p>Yeong,C. and Torquato,S., 1998. Reconstructing random media Physical Review E., vol. 57, no. 1, p. 495. </p>
        <p>Liu, Y., Greene, M.S., Chen, W., Dikin, D., Liu, W.K., <i>Computational Microstructure Characterization and Reconstruction for Stochastic Multiscale Design</i>, Computer Aided Design, 45 (1), 65-76, 2013. </p>
        <p>Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017. Characterization and design of functional quasi-random nanostructured materials using spectral density function. Journal of Mechanical Design, 139(7), p.071401. </p>
        <p>Xu, H., Li, Y., Brinson, C. and Chen, W., 2014. A descriptor-based design methodology for developing heterogeneous microstructural materials system. Journal of Mechanical Design, 136(5), p.051007. </p>
        <p>Xu, H., Dikin, D.A., Burkhart, C. and Chen, W., 2014. Descriptor-based methodology for statistical characterization and 3D reconstruction of microstructural materials. Computational Materials Science, 85, pp.206-216. </p>
     </v-flex>
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
</style>
