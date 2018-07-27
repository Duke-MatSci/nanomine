<template>
  <v-footer app class="footer">
    <v-flex align-center>
    &copy; 2014-{{ new Date().getFullYear() }} NanoMine &nbsp;|&nbsp; <router-link to="/privacy-policy">Privacy Policy</router-link>
    &nbsp;|&nbsp; <router-link to="/terms-of-use">Terms of Use</router-link>
    &nbsp;|&nbsp; <router-link to="/help">Help</router-link>
    &nbsp;|&nbsp; <router-link to="/contact">Contact</router-link>
    </v-flex>
  </v-footer>
</template>

<script>
export default {
  name: 'PageFooter',
  data () {
    return {
      msg: 'PageFooter'
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
