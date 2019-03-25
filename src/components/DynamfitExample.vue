<template>
  <div class="dynamfitExample">
    <h1>Dynamfit - Prony Series coefficient fitting</h1>
    <v-container>
      <h3 class="text-xs-left">An Example - Part I</h3>
      <br>
      <p class="text-xs-left">Please click <a href="cdn/dynamfit/EXAMPLE.X_T">here</a> to download example data file. This file is a .X_T file with three columns per line (Frequency, X', X'').
      </p>
      <br>
      <h3 class="text-xs-left">Instructions</h3>
      <p class="text-xs-left"><b>Function Name:</b> Dynamfit</p>
      <p class="text-xs-left"><b>Description:</b> Fit mastercurve (tan &#948; vs. frequency) by Prony Series</p><br>

      <p class="text-xs-left"><b>1. Upload #.X_T file containing three values per line (Frequency X' X''):</b></p>
      <p class="text-xs-left">EXAMPLE.X_T is preloaded in this example. For general use, you will need to upload your .X_T file.</p>

      <p class="text-xs-left"><b>2. Factor For Weighting X' and X'' data:</b></p>
      <v-flex xs12 sm6 md3>
        <v-text-field label='Enter the weighting parameter you wish to use:' value='1.0' readonly=true outline></v-text-field>
      </v-flex>
      <p class="text-xs-left"><b>3. Standard deviation: </b></p>
      <v-flex xs12 sm6 md3>
        <v-radio-group v-model="stdRadios">
          <v-radio label="Data point values" value="std1"></v-radio>
          <v-radio label="Unity" value="std2" readonly=true></v-radio>
        </v-radio-group>
      </v-flex>
      <p class="text-xs-left"><b>4. Number of elements (should larger than 2 and should NOT be too large):</b></p>
      <v-flex xs12 sm6 md3>
        <v-text-field label='Enter the number of elements to use:' value='20' readonly=true outline></v-text-field>
      </v-flex>
      <p class="text-xs-left"><b>5. Data type:</b></p>
      <v-flex xs12 sm6 md3>
        <v-radio-group v-model="dtRadios">
          <v-radio label="Compliance" value="dt1" readonly=true></v-radio>
          <v-radio label="Modulus" value="dt2"></v-radio>
        </v-radio-group>
      </v-flex>
      <h3 class="text-xs-left">The fitting result is shown below:</h3>
      <v-layout justify-space-around>
        <v-flex xs5>
          <v-layout column>
            <div class="subheading">Epsilon Prime</div>
            <v-img src="cdn/img/dynamfit_example_E.jpg" contain></v-img>
          </v-layout>
        </v-flex>
        <v-flex xs5>
          <v-layout column>
            <div class="subheading">Epsilon Double Prime</div>
            <v-img src="cdn/img/dynamfit_example_EE.jpg" contain></v-img>
          </v-layout>
        </v-flex>
      </v-layout>

      <p class="text-xs-left">Now please click the arrow to advance to the next part of the example, where you can change the parameters of simulation, compare your result with result above and get familiar with the tool.</p>
      <v-layout row wrap>
        <v-flex offset-xs10 offset-md10 offset-lg10>
          <v-btn color="primary" dark to="/DynamfitExampleInput" target="_blank">
            Part II<v-icon dark right>arrow_forward</v-icon>
          </v-btn>
        </v-flex>
      </v-layout>
      <br>
      <h4 class="text-xs-left">Reference</h4>
      <p class="text-xs-left">Bradshaw et al., <i><a href="http://link.springer.com/article/10.1023/A:1009772018066">A Sign Control Method for Fitting and Interconverting Material Functions for Linearly Viscoelastic Solids</a></i>, Mechanics of Time-Dependent Materials. 1997 1(1)</p>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'

export default {
  data () {
    return {
      stdRadios: 'std1',
      dtRadios: 'dt2'
    }
  }
}
</script>

<style scoped>

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

</style>
