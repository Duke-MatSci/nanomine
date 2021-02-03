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
  <div class="main">
    <v-jumbotron src="/nmstatic/img/random_network.png" style="height: 180px;">
      <v-container fill-height>
        <v-layout align-center>
          <v-flex>
            <h3 class="mainheading">Microstructure Characterization and Reconstruction</h3>
          </v-flex>
        </v-layout>
      </v-container>
    </v-jumbotron>
    <div class="mcr_homepage">
      <v-container fluid grid-list-md>
        <v-flex xs12 class="body bold text-xs-center" style="padding-right:10rem; padding-left: 10rem;">
          Microstructure Characterization and Reconstruction (MCR) is an essential component of computational material
          design as it helps in understanding structure - property
          relationships. This page allows you to characterize and reconstruct images of polymer nanocomposites.
          All webtools accept inputs in multiple formats and allow download of results. Please click on the appropriate
          button.
        </v-flex>
      </v-container>
      <v-container class="text-xs-left">
        <v-layout row wrap>
          <v-flex xs10>
              <!-- Binarization -->
            <div class="links">
              <div class="links-icon"><img src="/nmstatic/img/Image Binarization.png"/></div>
              <div>
                <v-flex class="title heavy skip"><router-link to="/binarization_homepage">Image Binarization</router-link></v-flex>
                <v-flex class="body">Binarization is the process of converting a micrograph to a black & white image
                    (assuming there are only 2 phases) by removing noise and thus simplifying its analysis.
                    All Characterization and Reconstruction algorithms work with binarized images only.
                </v-flex>
              </div>
            </div>
            <!-- Characterization -->
              <div class="links">
                <div class="links-icon"><img src="/nmstatic/img/Microstructure Characterization.png" /></div>
                <div>
                  <v-flex class="title heavy skip"><router-link to="/characterization_homepage">Microstructure Characterization</router-link></v-flex>
                  <v-flex class="body"> Microstructure Characterization refes to a statistical quantification of morphology.
                    It essentially converts multi-dimensional microstructure recorded in images
                    into a set of functions (aka features/descriptors/predictors) that encode significant morphological
                    details.
                    The functions obtained as a result are useful in developing insights on structure - property relationships
                    and serve as the basis for reconstruction algorithms.
                    Upload a binarized microstructure image / set of images and obtain characterization data of your choice. <span class="block"><a href='/nm#/how'>Tutorial</a></span>
                  </v-flex>
                </div>
              </div>
            <!-- Reconstruction -->
              <div class="links">
                <div class="links-icon"><img src="/nmstatic/img/Microstructure Reconstruction.png" /></div>
                <div>
                  <v-flex class="title heavy skip"><router-link to="/reconstruction_homepage">Microstructure Reconstruction</router-link></v-flex>
                  <v-flex class="body">Reconstruction involves constructing a statistically equivalent microstructure image
                    given some statistical characterization. In most cases,
                    reconstruction is cast as an optimization problem; with the goal of matching characteristics of
                    reconstructed image to that of input image.
                    In this section, you can upload a binary microstructure image / set of images and obtain 2D/3D
                    reconstructions using method of your choice. <span class="block"><a href='/nm#/how'>Tutorial</a></span>
                  </v-flex>
                </div>
              </div>
          <!-- Intelligent Characterization -->
            <div class="links">
              <div class="links-icon"><img src="/nmstatic/img/Intelligent Characterization.png" /></div>
              <div>
                <v-flex class="title heavy skip"><router-link to="/IntelligentCharacterize">Intelligent Characterization</router-link></v-flex>
                <v-flex class="body">The intelligent characterization tool selects the most suitable characterization
                  method between the “physical descriptors” and the “spectral density function (SDF)”
                  approaches based on analyzing the user uploaded image(s). Results generated can be easily passed to the NanoMine Database. <span class="block"><a href='/nm#/how'>Tutorial</a></span>
                </v-flex>
              </div>
            </div>
            
          </v-flex>
          <!-- references -->
          <v-flex xs12>
              <v-flex class="body cap heavy skip"><a href="#reference" class="reference-link">References <i class="fa fa-angle-down"></i></v-flex>
              <div class="reference" id="reference">
                <v-flex class="body">Bostanabad, R., Zhang, Y., Li, X., Kearney, T., Brinson, L. C., Apley, D., Wing K., and Chen, W.,
                    Computational Microstructure Characterization and Reconstruction: Review of the State-of-the-art Techniques,
                  <i>Progress in Materials Science</i>, 95, June 2018.</v-flex>
                <v-flex class="body">Li, X., Zhang, Y., Zhao, H., Burkhart, C., Brinson, L.C., Chen, W., A Transfer Learning Approach for
                  Microstructure Reconstruction and Structure-property Predictions, <i>Scientific Report</i>, accepted 2018.
                </v-flex>
                <v-flex class="body">Ghumman, U.F., Iyer, A., Dulal, R., Munshi, J., Wang, A., Chien, T., Balasubramanian, G., and Chen, W.,
                    A Spectral Density Function Approach for Active Layer Design of Organic Photovoltaic Cells,
                  <i>Journal of Mechanical Design</i>, Special Issue on Design of Engineered Materials and Structures, accepted
                      July 2018. doi:10.1115/1.4040912.</v-flex>
                <v-flex class="body">Khurshid, K., Siddiqi, I., Faure, C. and Vincent, N., 2009. Comparison of Niblack inspired binarization
                  methods for ancient documents. DRR, 7247, pp.1-10.</v-flex>
                <v-flex class="body">Rintoul, M.D. and Torquato, S., 1997. Reconstruction of the structure of dispersions. Journal of
                  Colloid and Interface Science, 186(2), pp.467-476.</v-flex>
                <v-flex class="body">Yeong,C. and Torquato,S., 1998. Reconstructing random media <i>Physical Review E</i>, vol. 57, no. 1, p.
                  495</v-flex>
                <v-flex class="body">Liu, Y., Greene, M.S., Chen, W., Dikin, D., Liu, W.K., Computational Microstructure Characterization
                  and Reconstruction for Stochastic Multiscale Design, <i>Computer Aided Design</i>, 45 (1), 65-76, 2013 </v-flex>
                <v-flex class="body">Yu, S., Zhang, Y., Wang, C., Lee, W.K., Dong, B., Odom, T.W., Sun, C. and Chen, W., 2017.
                    Characterization and design of functional quasi-random nanostructured materials using spectral density
                  function. <i>Journal of Mechanical Design</i>, 139(7), p.071401.</v-flex>
                <v-flex class="body">Xu, H., Li, Y., Brinson, C. and Chen, W., 2014. A descriptor-based design methodology for developing
                  heterogeneous microstructural materials system. <i>Journal of Mechanical Design</i>, 136(5), p.051007.</v-flex>
                <v-flex class="body">Xu, H., Dikin, D.A., Burkhart, C. and Chen, W., 2014. Descriptor-based methodology for statistical
                    characterization and 3D reconstruction of microstructural materials. <i>Computational Materials Science</i>,
                  85, pp.206-216.</v-flex>
              </div>
          </v-flex>
        </v-layout>
      </v-container>
    </div>
  </div>
</template>

<script>
export default {
  name: 'McrHomepage',
  method: {

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  .mainheading { /* class of large text in jumbotron*/
    font-size: 40px;
    color: white;
  }
  .skip {
    margin-top: 25px;
  }
  .title {
    margin-bottom: 5px;
  }
  .cap {
    text-transform: uppercase;
  }
  .bold {
    font-weight: 500;
  }
  .heavy {
    font-weight: 600;
  }
  .body {
    margin-bottom: 5px;
  }
  img {
    width: 240px;
  }

  h4 {
    text-transform: uppercase;
  }

  .block {
    display: block;
  }

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

  .reference {
    opacity: 0;
    visibility: hidden;

    &-link {
      text-decoration: none;
      color: #096ff4;
    }

    &:target {
      opacity: 1;
      visibility: visible;
    }
  }

  .links {
    display: grid;
    grid-gap: 1rem;
    grid-template-columns: 1fr 2fr;
    margin-bottom: 3rem;

    &-icon {
      & > img {
        height: 7.5rem;
        width: auto;
        margin-right: 3rem;
        box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0, .24);
        border-radius: .5rem;
        padding: .5rem;
        margin-top: 2rem;
      }
    }
  }
</style>