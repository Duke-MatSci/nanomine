<template>
  <v-card class="rvwm elevation-12" v-if="show()">
    <v-navigation-drawer floating stateless value="show()">
      <v-list dense>
       <v-list-tile>&nbsp;
        </v-list-tile>
        <v-list-tile  href="/nm#/mm/teams" v-on:click="clicked()">
          <v-list-tile-title>About Us</v-list-tile-title>
          <v-icon>people</v-icon>
        </v-list-tile>
        <v-list-tile  href="/home" v-on:click="clicked()">
          <v-list-tile-title>Browse Data</v-list-tile-title>
          <v-icon>search</v-icon>
        </v-list-tile>
        <v-list-tile  href="/wi/gallery" v-on:click="clicked()">
          <v-list-tile-title>Explore Gallery</v-list-tile-title>
          <v-icon>account_tree</v-icon>
        </v-list-tile>
        <v-list-tile  href="/wi/about?view=new&uri=http:%2F%2Fwww.w3.org%2Fns%2Fdcat%23Dataset" v-on:click="clicked()">
          <v-list-tile-title>Curate Data</v-list-tile-title>
          <v-icon>file_upload</v-icon>
        </v-list-tile>
        <v-list-tile to="/mm/pixelunit" v-on:click="clicked()">
          <v-list-tile-title>Module Tools</v-list-tile-title>
          <v-icon>insert_chart</v-icon>
        </v-list-tile>
        <!--<v-list-tile to="/simtools" v-on:click="clicked()">
          <v-list-tile-title>Simulation Tools</v-list-tile-title>
          <v-icon>waves</v-icon>
        </v-list-tile>-->
        <v-list-tile to="/mm/contact" v-on:click="clicked()">
          <v-list-tile-title>Contact Us</v-list-tile-title>
          <v-icon>contact_support</v-icon>
        </v-list-tile>
        <!--<v-list-tile to="/mypage" v-on:click="clicked()">
          <v-list-tile-title>My Page</v-list-tile-title>
          <v-icon>folder_shared</v-icon>
        </v-list-tile>-->
        <v-list-tile v-on:click="loginLogout()" v-if="isLoggedIn()">
          <v-list-tile-title>Logout</v-list-tile-title>
          <v-icon>perm_identity</v-icon>
        </v-list-tile>
        <v-list-tile v-on:click="loginLogout()" v-if="!isLoggedIn()">
          <v-list-tile-title>Login</v-list-tile-title>
          <v-icon>perm_identity</v-icon>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
  </v-card>
</template>

<script>

import {} from 'vuex'
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'LeftMenu',
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
  },
  methods: {
    show: function () {
      return this.$store.getters.isLeftMenuActive
    },
    clicked: function () {
      this.$store.commit('toggleLeftMenu')
    },
    isLoggedIn: function () {
      return this.auth.isLoggedIn()
    },
    loginLogout: function () {
      // defers to pageHeader to login and logout depending on current state since a dialog is presented for login
      this.clicked() // turn off left menu
      this.$store.commit('setLoginLogout') // defer to pageheader to do login/logout
    },
    data () {
      return {
        msg: 'LeftMenu'
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .rvwm {
    height: 100%;
    z-index: 100;
    top: 50;
    position: fixed;
  }

  h1 {
    text-transform: uppercase;
  }
</style>
