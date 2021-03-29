<template>
  <div v-if="versionNew">
    <v-app id="app" app>
      <waiting/>
      <LeftMenu/>
      <page-header/>
      <page-subheader/>
      <router-view />
      <page-footer v-if="$route.path === '/'" />
    </v-app>
  </div>
  <div v-else>
    <v-app id="app" app>
      <router-view />
    </v-app>
  </div>
</template>
<script>
// import {} from 'vuex'
const mmPages = ['/mm'];
export default {
  name: 'App',
  computed: {
    versionNew(){
      return this.$store.state.versionNew;
    }
  },
  watch: {
    '$route.path': function(newPath, oldPath){
      this.checkVersion(newPath,oldPath, undefined)
    }
  },
  methods: {
    showLeftMenu: function () {
      return this.$store.state.leftMenuActive
    },
    checkVersion (newPath,oldPath, path) {
      if(path) {
        if (mmPages.includes(path)) {
          return this.$store.state.versionNew = true;
        }
        return this.$store.state.versionNew = false;
      } else if(newPath) {
        if (mmPages.includes(newPath)) {
          return this.$store.state.versionNew = true;
        }
        return this.$store.state.versionNew = false;
      } else if(newPath !== oldPath && !newPath) {
        if (mmPages.includes(oldPath)) {
          return this.$store.state.versionNew = true;
        }
        return this.$store.state.versionNew = false;
      }
    }
  },
  beforeMount(){
    let path = this.$router.history.current.path
    path = path.trim()
    return this.checkVersion(undefined, undefined, path);
  }
}
</script>

<style>
  @import './css/styles.css';
  @import './css/old_css.css';
  #app {
    margin-top: 0!important;
    background-color: #08233c;
  }
</style>
