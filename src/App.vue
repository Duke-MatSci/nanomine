<template>
  <div v-if="versionNew">
    <v-app id="app" app class="meta">
      <waiting/>
      <LeftMenu/>
      <page-header/>
      <page-subheader/>
      <router-view />
      <page-footer v-if="$route.path === '/mm'" />
    </v-app>
  </div>
  <div v-else>
    <v-app id="app" app>
      <div>
        <a-header :info="info" v-if="$route.path != '/'"></a-header>
        <router-view />
        <a-footer></a-footer>
      </div>
    </v-app>
  </div>
</template>
<script>
import * as Util from './components/utils'
// import {} from 'vuex'
const mmPages = [
  '/mm', '/mm/db', '/mm/tutorials', '/mm/binarization_homepage', '/mm/mcr_homepage', '/mm/XMLCONV', '/mm/contact', '/mm/mtools', '/mm/Otsu', '/mm/pixelunit50', '/mm/characterization_homepage',
  '/mm/Dynamfit', '/mm/DynamfitExample', '/mm/DynamfitExampleInput', '/mm/DynamfitResult', '/mm/pixelunit', '/mm/ChemProps', '/mm/ChemPropsAPIToken', '/mm/reconstruction_homepage', '/mm/IntelligentCharacterize',
  '/mm/CorrelationCharacterize', '/mm/DescriptorCharacterize', '/mm/SDFCharacterize', '/mm/Niblack'
];
export default {
  name: 'App',
  computed: {
    versionNew(){
      return this.$store.state.versionNew;
    },
    info() {
      return this.$store.state.appHeaderInfo
    }
  },
  watch: {
    '$route.path': function(newPath, oldPath){
      this.checkVersion(newPath,oldPath, undefined)
    }
  },
  components: {
    aHeader: Util.Header,
    aFooter: Util.Footer,
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

<style lang="scss">
  @import './css/styles.css';
  @import './css/old_css.scss';
  #app {
    margin-top: 0!important;
    background-color: #08233c;
  }
  .meta {
    background-color: #ffffff !important;
  }
</style>
