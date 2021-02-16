<template>
  <v-footer app v-bind:class="footerfont" v-if="show()">
    <v-flex align-center>
    &copy; 2014-{{ new Date().getFullYear() }} MaterialsMine
    &nbsp;|&nbsp; <a href="https://oarc.duke.edu/privacy/duke-university-privacy-statement" target="_blank">Privacy Policy</a>
    &nbsp;|&nbsp; <a href="https://security.duke.edu/node/82" target="_blank">Terms of Use</a>
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
  computed: {
    footerfont () {
      // console.log('breakpoint info: ' + JSON.stringify(this.$vuetify.breakpoint))
      return {
        'footer-font-small': this.$vuetify.breakpoint.xsOnly, // smAndDown
        'footer-font': this.$vuetify.breakpoint.smAndUp
      }
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
.footer {
  background-color: #505050;
}
.footer-font-small {
  font-size: 12px;
}
.footer-font {
  font-size: 20px;
}
a {
  color: #505050;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

</style>
