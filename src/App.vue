<template>
  <v-app id="app" light>
    <page-header/>
    <page-subheader/>
    <router-view class="app-router"/>
    <page-footer/>
  </v-app>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 48px;
  }
  .app-router {
    margin-bottom: 75px;
    margin-top: -10px;
  }
  h1 {
    margin-top: 25px;
    margin-bottom: 15px;
  }

  h4 {
    margin-top: 25px;
  }

  img {
    margin-top: 30px;
  }

  .container {
    max-width: 600px;
  }
</style>
