<template>
  <div class="header">
    <v-toolbar app dense>
      <!--v-toolbar-side-icon></v-toolbar-side-icon-->
      <v-btn flat to="/">
        <v-toolbar-title><i class="material-icons nm-home-icon">home</i>NanoMine</v-toolbar-title>
      </v-btn>
      <v-spacer></v-spacer>
      <v-toolbar-items class="hidden-sm-and-down">
        <v-btn flat to="/db">Database</v-btn>
        <v-btn flat to="/mtools">Module Tools</v-btn>
        <v-btn flat to="/simtools">Simulation Tools</v-btn>
        <v-btn flat><i class="material-icons nm-search-icon">search</i></v-btn>
        <v-btn flat to="/loginlogout"><i class="material-icons nm-user-icon">perm_identity</i>Login</v-btn>
      </v-toolbar-items>
    </v-toolbar>
  </div>
</template>

<script>
export default {
  name: 'PageHeader',
  data () {
    return {
      msg: 'PageHeader'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .header {
    position: fixed;
    top: 0;
    width: 100%;
    justify-content: flex-end;
    z-index: 100;
    opacity: 1.0;
    background-color: #8CB2CA;
  }
  .header .v-toolbar {
    background-color: #8CB2CA;
  }

  .nm-home-icon {
    font-size: 20px;
    display: inline-flex;
    vertical-align: bottom;
    padding-bottom: 6px;
  }

  .nm-user-icon {
    font-size: 18px;
    display: inline-flex;
    vertical-align: bottom;
    padding-bottom: 4px;
  }

  /*.nm-search-icon {*/
    /*font-size: 18px;*/
    /*display: inline-flex;*/
    /*vertical-align: bottom;*/
    /*padding-bottom: 2px;*/
  /*}*/

  .bg-nm-info {
    background-color: #8CB2CA;
  }
</style>
