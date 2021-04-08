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
  <div>
    <a-header :info="info"></a-header>
      <div class="main">
        <div class="reconstruction_homepage">
          <!--<h1>{{ msg }}</h1>-->
          <v-container class="text-xs-left">
                <div>
                  <p> Choose the reconstruction method from the options below.</p>
                </div>
                <p><strong>NOTE: Uploaded images will be binarized using Otsu method</strong></p>
            <v-layout align-space-between justify-center row fill-height>
              <v-flex>
                  <div>
                    <h2> Correlation Functions </h2>
                    <div class="text-xs-left"> Reconstruction using correlation functions employs the Yeong-Torquato method which involves Simulated Annealing based random pixel swapping
                        to match the correlation function of 2D reconstructed image to that of 2D input image. The choice of correlation function to be matched and the number of reconstructed images can be chosen by user.
                        This method is well-suited for porous, isotropic materials. The reconstruction time depends on choice of correlation function chosen and volume (area) fraction of white phase.</div>
                    <router-link to="/CorrelationReconstruct">Use Correlation Function Webtool</router-link>
                  </div>
                <div class="mydivider">&nbsp;</div>
                  <div>
                    <h2> Physical Descriptors </h2>
                    <div class="text-xs-left"> This webtool creates a 3D reconstruction from the 2D input image. It follows a four step hierarchical reconstruction methodology to match descriptors - Volume fraction, nearest neighbor distance, equivalent radius and aspect ratio
                        of white phase in 3D reconstruction to those in input microstructure. Please refer to articles by Xu et.al. (see references) for more details. This technique is best suited for isotropic microstructures with
                        spherical/ellipsoidal filler aggregates. Time required for reconstruction depends on number of filler aggregates contained in input image.</div>
                    <router-link to="/DescriptorReconstruct">Use Physical Descriptor Webtool</router-link>
                  </div>
                <div class="mydivider">&nbsp;</div>
                  <div>
                    <h2> Spectral Density Function </h2>
                    <div class="text-xs-left"> The reconstruction method involves level-cutting a Gaussian Random Field which has the same spectral density function (SDF) as the input image.
                    The level-cut parameter is defined by the volume fraction of white phase. Please refer to article by Yu et.al.(see references) for more details. This method is best suited for porous, isotropic, stationary microstructure.</div>
                    <router-link to="/SDFReconstruct">Use Spectral Density Function Webtool</router-link>
                  </div>
                <div class="mydivider">&nbsp;</div>
                <div>
                  <h2> Transfer Learning </h2>
                  <div class="text-xs-left">Transfer learning captures spatial correlations for microstructure reconstruction by leveraging the superior capabilities of deep convolution networks. It incorporates an encoder-decoder process process and feature-match optimization algorithm using the pre-trained VGG19 model. It can handle complex microstructures, and has the potential of expediting the discovery of new materials. Please refer to the article by Li et. al. (see references) for more details.</div>
                    <div class="text-xs-left">The code package may be requested for research purposes by clicking on the link below. You will asked to fill in a form and we will email you following the form completion.</div>
                  <a href="https://ideal.mech.northwestern.edu/research/software/download/" target="_blank">Request Download</a>
                </div>
                <div class="mydivider">&nbsp;</div>
              </v-flex>
            </v-layout>
          </v-container>
        </div>
      </div>
    <a-footer></a-footer>
  </div>
</template>

<script>
export default {
  name: 'ReconstructionHomepage',
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Microstructure Reconstruction'})
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
  .reconstruction_homepage {
    padding-bottom: 40px;
  }
  .mydivider {
    padding:3px;
    width:100%;
  }
  .mycard {
    padding-top: 5px;
    padding-bottom: 5px;
  }
</style>
