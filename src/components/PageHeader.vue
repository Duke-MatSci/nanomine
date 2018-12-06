<template>
  <div class="header">
    <v-toolbar app dense>
      <!--v-toolbar-side-icon @click="toggleLeftMenu()"></v-toolbar-side-icon-->
      <v-btn flat to="/">
        <v-toolbar-title><i class="material-icons nm-home-icon">home</i>NanoMine</v-toolbar-title>
      </v-btn>
      <v-spacer></v-spacer>
      <v-toolbar-items class="hidden-sm-and-down">
        <v-btn flat to="/db">Database</v-btn>
        <v-btn flat to="/mtools">Module Tools</v-btn>
        <v-btn flat to="/simtools">Simulation Tools</v-btn>
        <v-btn flat @click="toggleAdminAvailable()"><i class="material-icons nm-search-icon" v-if="searchEnabled()">search</i></v-btn>
        <v-btn v-if="isLoggedIn()" flat v-on:click="logoutDialog = true"><i class="material-icons nm-user-icon" v-bind:class="{'nm-admin-icon': isAdmin}">perm_identity</i><span v-if="!isTestUser()">&nbsp;Logout&nbsp;</span> {{userName}}</v-btn>
      </v-toolbar-items>
    </v-toolbar>
    <v-dialog
      v-model="logoutDialog"
      max-width="290"
    >
      <v-card>
        <v-card-title class="headline blue lighten-2" primary-title>Log out</v-card-title>

        <v-card-text>
          Log out of NanoMine?
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue darken-1"
            flat="flat"
            @click="logoutDialog = false"
          >
            No
          </v-btn>

          <v-btn
            color="blue darken-1"
            flat="flat"
            v-bind:href="logoutUrl"
          >
            Yes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>

import {} from 'vuex'
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'PageHeader',
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    vm.auth.getLogoutUrl()
      .then(function (logoutUrl) {
        vm.logoutUrl = logoutUrl
      })
      .catch(function (err) {
        console.log('error getting logout URL: ' + err)
        vm.logoutUrl = '#'
      })
  },
  methods: {
    logout: function () {
      this.auth.logout()
    },
    searchEnabled: function () {
      return false
    },
    toggleLeftMenu: function () {
      this.$store.commit('toggleLeftMenu')
    },
    toggleAdminAvailable: function () {
      this.$store.commit('toggleAdminActive')
    },
    isLoggedIn: function () {
      return this.auth.isLoggedIn()
    },
    isTestUser: function () {
      return this.auth.isTestUser()
    }
  },
  computed: {
    userId: function () {
      return this.auth.getUserId()
    },
    userName: function () {
      return this.auth.getGivenName()
    },
    isAdmin: function () {
      return this.auth.isAdmin()
    }
  },
  data () {
    return {
      msg: 'PageHeader',
      auth: null,
      logoutDialog: false,
      logoutUrl: null
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
  .nm-admin-icon {
    background-color: #00ffff66;
    color: red;
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
