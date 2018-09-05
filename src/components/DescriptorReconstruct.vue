<!--
################################################################################
#
# File Name: DescriptorReconstruct.vue
# Application: templates
# Description:
#
# Created by: Akshay Iyer, August 18, 2018
# Customized for NanoMine
#
################################################################################
-->

<template>
  <div class="DescriptorReconstruct">
    <h1>{{ msg }}</h1>
    <v-container>
      <v-flex xs12>
          <h3>Description</h3>
          <br>
           <p>Upload a binarized image in JPEG/PNG/TIF format to generate a statistically equivalent 3D reconstruction.</p>
           <p>The webtool first evaluates all necessary descriptors for the input image. Assuming filler aggregates to be ellipsoidal and isotropic microstructure,
           the descriptors obtained from input image are used to estimate the values of corresponding descriptors for 3D reconstruction. The reconstruction procedure follows a
           four-step hierarchical methodology outlined in articles by Xu et.al. (see references).
           The 3D reconstruction has the same resolution as the input image; i.e. the edge length of a voxel in 3D reconstruction has the same physical size as that of a
           pixel in the 2D input image.</p>

          <h4> Input Options:</h4>
          <p><strong> NOTE: Images must be binarized.</strong></p>
                <p><strong> 1) Single image:</strong> Supported file formats are JPEG, PNG and TIF.(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option1.zip'>Sample</a>).</p>
                <p><strong> 2) Single image in .mat format :</strong> The .mat file must contain ONLY ONE variable named "Input" - which contains pixel values(only 0 or 1)(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option2.zip'>Sample</a>).</p>
                <p><strong> 3) Multiple images in ZIP File (Coming Soon!):</strong> Submit a ZIP file containing multiple JPEG images of same size (in pixels). DO NOT ZIP the folder containing images;
                select all images and ZIP them directly.(Download <a href='http://129.105.90.149/nm/Two_pt_MCR/Input Samples/Option3.zip'>Sample</a>).<strong>The mean value of each descriptor
                (averaged over all images) will be used for reconstruction.</strong> </p>
          <h3> Results </h3>
          <p>The results will include 3D reconstructed image (Input_3D_recon.mat), a list of coordinates of cluster (white phase) centroids in "Input_3D_recon_center_list.mat",
          the input image and a random 2D cross-section (Slice.jpg) from the 3D reconstructed image.
          Additionally, a plot (Autocorrelation_comparison.jpg) comparing the autocorrelation of input image with 10 randomly chosen 2D slices from reconstruction is
          provided to validate the accuracy of reconstruction.  </p>

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
  name: 'DescriptorReconstruct',
  data () {
    return {
      msg: 'Microstructure Reconstruction - Physical Descriptors'
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
