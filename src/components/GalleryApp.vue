<template>
  <div>
    <h1 class="gheader">NanoMine Gallery of Interactive Charts</h1>
    <iframe class="galleryapp" src="https://duke-matsci.github.io/nmcharts/"></iframe>
  </div>
</template>

<script>
export default {
  name: 'GalleryApp',
  data () {
    return {}
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .gheader {
    margin-top: 10px;
    background-color: black;
    color: white;
    margin-bottom: 0px !important
  }
  .galleryapp {
    height: 100vh;
    width: 100%;
    border: none;
    margin: 0;
  }
</style>
