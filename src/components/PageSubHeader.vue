<template>
  <div v-if="doShow()">
    <div class="subheader">
      <div>{{ msg }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageSubHeader',
  methods: {
    doShow: function doShow () {
      // Only show the subheader if not on the home page
      if (this.$route.path === '/') {
        console.log('Home - ' + this.$route.path)
        // return false
      } else {
        console.log('Not HOME - ' + this.$route.path)
        // return true
      }
      return false
    }
  },
  data () {
    return {
      msg: 'NanoMine'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.subheader {
  //position: relative;
  top: 0;
  width: 100%;
  justify-content: flex-center;
  background-color: #000000;
  color: #ffffff;
  font-size: 30px;
  // z-index:-1;
}
</style>
