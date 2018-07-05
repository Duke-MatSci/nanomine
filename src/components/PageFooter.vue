<template>
  <v-footer app class="footer pa-3">
    &copy; 2014-{{ new Date().getFullYear() }} NanoMine &nbsp;|&nbsp; <router-link to="/privacy-policy">Privacy Policy</router-link>
    &nbsp;|&nbsp; <router-link to="/terms-of-use">Terms of Use</router-link>
    &nbsp;|&nbsp; <router-link to="/help">Help</router-link>
    &nbsp;|&nbsp; <router-link to="/contact">Contact</router-link>
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
h1, h2 {
  font-weight: normal;
}
.footer {
  padding-top:10px;
  bottom:0;
  width:100%;
  height:50px;
  position:fixed;
  text-align: center;
  justify-content:center;
  flex:none;
  z-index:1000;
  background-color: #c0c0c0;
}
a {
  color: #505050;
}

</style>
