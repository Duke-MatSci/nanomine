<template>
  <div class="OtsuResult">
    <h1>{{msg}}</h1>
    <v-container>
      <v-layout>
        <v-flex xs6>
          <h4>Uploaded Image</h4>
          <img :src="getInputImage()"/>
          {{inputImage}}
          <p></p>
        </v-flex>
        <v-flex xs6>
          <h4>Binarized Image</h4>
          <img :src="getOutputImage()"/>
          {{outputImage}}
          <p></p>
        </v-flex>
      </v-layout>
    </v-container>
    <h4>Reference</h4>
    <v-flex xs12>
      <p> N. Otsu, A threshold selection method from gray-level histograms, IEEE transactions on systems, man, and
        cybernetics, vol. 9, no. 1, pp. 62-66, 1979.</p>

    </v-flex>
  </div>
</template>

<script>
export default {
  name: 'OtsuResult',
  data: () => {
    return ({
      msg: 'Otsu Binarization Results'
    })
  },
  methods: {
    getInputImage: function () {
      let vm = this
      return vm.$route.query.refuri + '/output/Input1.jpg'
    },
    getOutputImage: function () {
      let vm = this
      return vm.$route.query.refuri + '/output/Binarized_Input1.jpg'
    },
    getZipFile: function () {
      let vm = this
      return vm.$route.query.refuri + '/output/Results.zip'
    }
  }
}
</script>

<style scoped>
  img {
    width: 240px;
    height: auto;
  }

  h4 {
    text-transform: uppercase;
  }
</style>
