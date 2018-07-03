<template>
  <div class="footer">
    &copy; 2014-2018 NanoMine | <router-link to="/privacy-policy">Privacy Policy</router-link> |
    <router-link to="/terms-of-use">Terms of Use</router-link>
    | <router-link to="/help">Help</router-link>
    | <router-link to="/contact">Contact</router-link>
  </div>
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
  z-index:1000;
  background-color: #c0c0c0;
}
a {
  color: #505050;
}

</style>
