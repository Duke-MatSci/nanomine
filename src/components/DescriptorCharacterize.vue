<!--
################################################################################
#
# File Name: DescriptorCharacterize.vue
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
            <p>Upload a binarized image or a ZIP file containing set of images and click "Characterize" to get descriptors for filler material. The descriptors evaluated by this webtool are -
            filler volume fraction (equivalent to area fraction), number of filler clusters and area, aspect ratio & nearest neighbor distance of each filler cluster. Nearest neighbor distance of a cluster is the distance
            between its centroid and that of a cluster nearest to it. Except for volume fraction, number of clusters and aspect ratio (which are dimensionless), all descriptors have units of "pixels" ("pixel^2" for area descriptor).</p>

            <h4> Input Options:</h4>
                  <p><strong> NOTE: Images must be binarized.</strong></p>
                  <p><strong> 1) Single image:</strong> Image must be in either JPG/TIF/PNG format. (Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option1.zip'>Sample</a>). </p>
                  <p><strong> 2) Single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named "Input" - which contains pixel values(only 0 or 1)
                  (Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option2.zip'>Sample</a>).</p>
                  <p><strong> 3) Multiple images in ZIP File:</strong> Submit a ZIP file containing multiple images of same size (in pixels). Images must be in either JPG/TIF/PNG format. DO NOT ZIP the folder containing images; select all images and ZIP them directly.
                  (Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option3.zip'>Sample</a>).</p>
      </v-flex>
          <h2> Create Agent to accept user uploaded files and process it in MATLAB</h2>

    </v-container>

    <h4>Reference</h4>
    <v-flex xs12>
        <p> Xu, H., Li, Y., Brinson, C. and Chen, W., 2014. A descriptor-based design methodology for developing heterogeneous microstructural materials system. Journal of Mechanical Design, 136(5), p.051007.</p>
        <p>Xu, H., Dikin, D.A., Burkhart, C. and Chen, W., 2014. Descriptor-based methodology for statistical characterization and 3D reconstruction of microstructural materials. Computational Materials Science, 85, pp.206-216.</p>

    </v-flex>
  </div>
</template>

<script>
export default {
  name: 'Otsu',
  data () {
    return {
      msg: 'Microstructure Characterization - Physical Descriptor'
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
