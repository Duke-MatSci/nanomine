<template>
  <v-footer app class="footer" v-if="show()">
    <v-flex align-center>
    &copy; 2014-{{ new Date().getFullYear() }} NanoMine
    &nbsp;|&nbsp; <a href="https://oarc.duke.edu/privacy/duke-university-privacy-statement" target="_blank">Privacy Policy</a>
    &nbsp;|&nbsp; <a href="https://security.duke.edu/node/82" target="_blank">Terms of Use</a>
    &nbsp;|&nbsp; <router-link to="/help">Help</router-link>
    &nbsp;|&nbsp; <router-link to="/contact">Contact</router-link>
    </v-flex>
  </v-footer>
</template>

<script>

import {} from 'vuex'

export default {
  name: 'PageFooter',
  data () {
    return {
      msg: 'PageFooter'
    }
  },
  methods: {
    show: function () {
      let vm = this
      // return !vm.$store.getters.isEditorActive
      if (vm.$route.path === '/') {
        // console.log('Home - ' + vm.$route.path)
        return true
      } else {
        // console.log('Not HOME - ' + vm.$route.path)
        return false
      }
    }

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.footer { // not used
  background-color: #505050;
}
a {
  color: #505050;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

</style>
