<template>
  <div v-if="versionNew">
    <router-view />
  </div>
  <div v-else>
    <v-app id="app" app>
      <waiting/>
      <LeftMenu/>
      <page-header/>
      <page-subheader/>
      <router-view class="app-router"/>
      <page-footer v-if="$route.path === '/'" />
    </v-app>
  </div>
</template>
<script>

// import {} from 'vuex'
const newDev = ['/home_v2', '/teams'];
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
        if (newDev.includes(path)) {
          return this.$store.state.versionNew = true;
        }
        return this.$store.state.versionNew = false;
      } else if(newPath) {
        if (newDev.includes(newPath)) {
          return this.$store.state.versionNew = true;
        }
        return this.$store.state.versionNew = false;
      } else if(newPath !== oldPath && !newPath) {
        if (newDev.includes(oldPath)) {
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

  /** h1 {
    margin-top: 25px;
    margin-bottom: 15px;
  }

  h4 {
    margin-top: 25px;
  }

  .utility_old {
    img {
      margin-top: 30px;
    }
  }


  .utility_old_mg {
    margin-top: 38px;
  }

  .utility_old_align {
    text-align: center;
  }

  .container {

  } */ 
</style>
