<!--
################################################################################
#
# File Name: ReconstructionHomepage.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, August 17, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="reconstruction_homepage">
    <h1>{{ msg }}</h1>
    <v-container>
          <div>
            <p> Choose the reconstruction method from the options below.</p>
          </div>
          <p><strong>NOTE: Images must be binarized</strong></p>
      <v-layout align-space-between justify-center row fill-height>
        <v-flex>
            <div>
              <h2> Correlation Functions </h2>
              <p> Reconstruction using correlation functions employs the Yeong-Torquato method which involves Simulated Annealing based random pixel swapping
                  to match the correlation function of 2D reconstructed image to that of 2D input image. The choice of correlation function to be matched and the number of reconstructed images can be chosen by user.
                  This method is well-suited for porous, isotropic materials. The reconstruction time depends on choice of correlation function chosen and volume (area) fraction of white phase.</p>
              <router-link to="/CorrelationReconstruct">Use Correlation Function Webtool</router-link>
            </div>
            <div>
              <h2> Physical Descriptors </h2>
              <p> This webtool creates a 3D reconstruction from the 2D input image. It follows a four step hierarchical reconstruction methodology to match descriptors - Volume fraction, nearest neighbor distance, equivalent radius and aspect ratio
                  of white phase in 3D reconstruction to those in input microstructure. Please refer to articles by Xu et.al. (see references) for more details. This technique is best suited for isotropic microstructures with
                  spherical/ellipsoidal filler aggregates. Time required for reconstruction depends on number of filler aggregates contained in input image.</p>
              <router-link to="/Niblack_Submit">Use Physical Descriptor Webtool</router-link>
            </div>
            <div>
              <h2> Spectral Density Function </h2>
              <p> The reconstruction method involves level-cutting a Gaussian Random Field which has the same spectral density function (SDF) as the input image.
              The level-cut parameter is defined by the volume fraction of white phase. Please refer to article by Yu et.al.(see references) for more details. This method is best suited for porous, isotropic, stationary microstructure.</p>
              <router-link to="/SDFReconstruct">Use Spectral Density Function Webtool</router-link>
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
  name: 'ReconstructionHomepage',
  data () {
    return {
      msg: 'Microstructure Reconstruction'
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
