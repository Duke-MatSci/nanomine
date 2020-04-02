<template>
  <v-app id="app" app>
    <waiting/>
    <LeftMenu/>
    <page-header v-if="['gallery'].indexOf($route.name) > -1" />
    <page-subheader v-if="['gallery'].indexOf($route.name) > -1" />
    <router-view class="app-router"/>
    <page-footer v-if="['gallery'].indexOf($route.name) > -1" />
  </v-app>
</template>

<script>

import {} from 'vuex'

export default {
  name: 'App',
  data () {
    return {}
  },
  beforeMount: function () {
    console.log('beforeMount of App.vue')
  },
  methods: {
    showLeftMenu: function () {
      return this.$store.state.leftMenuActive
    }
  }
}
</script>

<style>
@import './css/styles.css';
  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 48px;
    background-color: white;
  }
  .app-router {
    // margin-bottom: 75px;
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
  }
</style>
