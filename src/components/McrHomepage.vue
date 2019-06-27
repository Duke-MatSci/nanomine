<!--
################################################################################
#
# File Name: McrHomepage.vue
# Application: templates
# Description: The landing page for MCR library; categorizes methods and provides description
#
# Created by: Akshay Iyer, July 17, 2018
# Customized for NanoMine
#
################################################################################
-->
<template>
  <div class="mcr_homepage">
    <h1>{{ msg }}</h1>
    <v-container class="text-xs-left">
          <div>
            <p> Microstructure Characterization and Reconstruction (MCR) is an essential component of computational material design as it helps in understanding structure - property
                relationships. This page allows you to characterize and reconstruct images of polymer nanocomposites.
                All webtools accept inputs in multiple formats and allow users to download results. Please click on the appropriate button.
            </p>
          </div>
    </v-container>
    <v-container>
      <v-layout align-space-between justify-left row fill-height>
      <v-flex xs8>
          <!-- Binarization -->
          <div>
            <h2> Image Binarization </h2>
            <p> Binarization is the process of converting a micrograph to a black & white image (assuming there are only 2 phases) by removing noise and thus simplifying its analysis.
                All Characterization and Reconstruction algorithms work with binarized images only.
            </p>
            <router-link to="/binarization_homepage">Binarize Image</router-link>
          </div>

          <!-- Characterization -->
          <div>
            <h2> Microstructure Characterization </h2>
            <p> Microstructure Characterization refes to a statistical quantification of morphology. It essentially converts multi-dimensional microstructure recorded in images
                into a set of functions (aka features/descriptors/predictors) that encode significant morphological details.
                The functions obtained as a result are useful in developing insights on structure - property relationships and serve as the basis for reconstruction algorithms.
                Upload a binarized microstructure image / set of images and obtain characterization data of your choice.
            </p>
            <router-link to="/characterization_homepage">Characterize Microstructure</router-link>
          </div>

          <!-- Reconstruction -->
          <div>
            <h2> Microstructure Reconstruction </h2>
            <p> Reconstruction involves constructing a statistically equivalent microstructure image given some statistical characterization. In most cases,
                reconstruction is cast as an optimization problem; with the goal of matching characteristics of reconstructed image to that of input image.
                In this section, you can upload a binary microstructure image / set of images and obtain 2D/3D reconstructions using method of your choice.
            </p>
            <router-link to="/reconstruction_homepage">Reconstruct Microstructure</router-link>
          </div>
      </v-flex>
      </v-layout>
      <h4 justify-left>References</h4>
      <v-flex xs12>
        <p>Khurshid, K., Siddiqi, I., Faure, C. and Vincent, N., 2009. Comparison of Niblack inspired binarization methods for ancient documents. DRR, 7247, pp.1-10.</p>
        <p>Rintoul, M.D. and Torquato, S., 1997. Reconstruction of the structure of dispersions. Journal of Colloid and Interface Science, 186(2), pp.467-476.</p>
        <p>Yeong,C. and Torquato,S., 1998. Reconstructing random media Physical Review E, vol. 57, no. 1, p. 495</p>
        <p>Liu, Y., Greene, M.S., Chen, W., Dikin, D., Liu, W.K., <i>Computational Microstructure Characterization and Reconstruction for Stochastic Multiscale Design</i>, Computer Aided Design, 45 (1), 65-76, 2013 </p>
        <p>Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017. Characterization and design of functional quasi-random nanostructured materials using spectral density function. Journal of Mechanical Design, 139(7), p.071401.</p>
        <p>Xu, H., Li, Y., Brinson, C. and Chen, W., 2014. A descriptor-based design methodology for developing heterogeneous microstructural materials system. Journal of Mechanical Design, 136(5), p.051007.</p>
        <p>Xu, H., Dikin, D.A., Burkhart, C. and Chen, W., 2014. Descriptor-based methodology for statistical characterization and 3D reconstruction of microstructural materials. Computational Materials Science, 85, pp.206-216.</p>
      </v-flex>
    </v-container>


  </div>
</template>

<script>
export default {
  name: 'McrHomepage',
  data () {
    return {
      msg: 'Microstructure Characterization and Reconstruction'
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
