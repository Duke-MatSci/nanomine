<template>
  <div class="header">
    <v-toolbar app dense>
      <v-toolbar-side-icon @click="toggleLeftMenu()" class="hidden-md-and-up"></v-toolbar-side-icon>
      <v-btn flat to="/" @click="resetLeftMenu()">
        <v-toolbar-title><i class="material-icons nm-home-icon">home</i>NanoMine</v-toolbar-title>
      </v-btn>
      <v-spacer></v-spacer>
      <v-toolbar-items class="hidden-sm-and-down">
        <v-btn flat to="/db">Database</v-btn>
        <v-btn flat to="/mtools">Module Tools</v-btn>
        <v-btn flat to="/simtools">Simulation Tools</v-btn>
        <v-btn fab flat href="/home"><i class="material-icons nm-search-icon" v-if="searchEnabled()">search</i>
        </v-btn>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn fab flat to="/contact" v-on="on"><i class="material-icons nm-search-icon">contact_support</i></v-btn>
          </template>
          <span>Contact Us</span>
        </v-tooltip>
        <v-btn v-if="isLoggedIn()" flat to="/mypage">My Page</v-btn>
        <v-btn v-else flat to="/mypage">My Page</v-btn>
        <v-btn v-if="isLoggedIn()" flat v-on:click="$store.commit('setLoginLogout')">
          <i class="material-icons nm-user-icon" v-bind:class="{'nm-admin-icon': (isAdmin && !isRunAs), 'nm-runas-icon': isRunAs}">
            perm_identity
          </i>
          <span v-if="!isTestUser()">
            &nbsp;Logout&nbsp;
          </span>
          <span v-if="!isRunAs">
            &nbsp;&nbsp;{{userName}}
          </span>
          <span v-else>
            &nbsp;&nbsp;{{auth.getRunAsUser()}}
          </span>
        </v-btn>
        <v-btn v-else flat v-on:click="$store.commit('setLoginLogout')">
          <i class="material-icons nm-user-icon">
            perm_identity
          </i>
          <span>&nbsp;&nbsp;Login</span>
        </v-btn>
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
            @click="cancelLogout()"
          >
            No
          </v-btn>

          <v-btn
            color="blue darken-1"
            flat="flat"
            href="/nmr/doLogout"
          >
            Yes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="loginDialog"
      max-width="290"
    >
      <v-card>
        <v-card-title class="headline blue lighten-2" primary-title>Login</v-card-title>
        <v-card-text>
          Log into NanoMine?
        </v-card-text>
        <v-card-text>
          If you already have a Duke University account, proceed to login.  Otherwise create a <a href="https://accounts.oit.duke.edu/onelink/register" target="_blank">Duke OneLink</a> account.
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue darken-1"
            flat="flat"
            @click="$store.commit('resetLoginLogout')"
          >
            Cancel
          </v-btn>

          <v-btn
            color="blue darken-1"
            flat="flat"
            href="/secure"
          >
            Login
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
    vm.$store.subscribe(vm.handleLoginDialogChange)
    console.log('query = ' + JSON.stringify(vm.$route.query))
    let qlogout = vm.$route.query.logout
    if (qlogout && qlogout.match(/(true).*/)) {
      setTimeout(function () {
        vm.logoutRouted = true
        // vm.logoutDialog = true
        vm.$store.commit('setLoginLogout')
        console.log('set logoutDialog to true')
      }, 50)
    } else {
      console.log('logout not requested')
    }
    let qlogin = vm.$route.query.login
    if (qlogin && qlogin.match(/(true).*/)) {
      setTimeout(function () {
        vm.loginRouted = true
        vm.loginDialog = true
        vm.$store.commit('setLoginLogout')
        console.log('set loginDialog to true')
      }, 50)
    } else {
      console.log('login not requested')
    }
  },
  methods: {
    log: function (msg) {
      console.log(msg)
    },
    logout: function () {
      let vm = this
      vm.auth.logout()
      vm.logoutUrl = '/nmr/doLogout'
      vm.$refs.logoutLink.click()
      vm.logoutDialog = false
    },
    cancelLogout: function () {
      let vm = this
      vm.logoutDialog = false
      if (vm.logoutRouted) {
        vm.logoutRouted = false
        vm.$router.push('/')
      }
    },
    searchEnabled: function () {
      return true
    },
    toggleLeftMenu: function () {
      this.$store.commit('toggleLeftMenu')
    },
    resetLeftMenu: function () {
      this.$store.commit('resetLeftMenu')
    },
    toggleAdminAvailable: function () {
      this.$store.commit('toggleAdminActive')
    },
    handleLoginDialogChange: function (mutation, state) {
      let vm = this
      console.log('handleLoginDialogChange: ' + mutation.type)
      if (mutation.type === 'setLoginLogout') {
        if (state.loginLogout && !vm.isLoggedIn()) {
          vm.loginDialog = true
        } else {
          vm.loginDialog = false
        }
        if (state.loginLogout && vm.isLoggedIn()) {
          vm.logoutDialog = true
        } else {
          vm.logoutDialog = false
        }
      } else if (mutation.type === 'resetLoginLogout') {
        vm.loginDialog = false
        vm.logoutDialog = false
      }
    },
    isLoggedIn: function () {
      return this.auth.isLoggedIn()
    },
    isTestUser: function () {
      return this.auth.isTestUser()
    },
    refreshSession: function () {
      let vm = this
      vm.showSessionTimeoutDialog = false
      window.location.reload()
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
    },
    isRunAs: function () {
      return this.$store.getters.runAsUser != null
    } },
  data () {
    return {
      msg: 'PageHeader',
      auth: null,
      loginDialog: false,
      logoutDialog: false,
      logoutRouted: false,
      logoutUrl: null,
      showSessionTimeoutDialog: false
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
    color: yellow;
  }
  .nm-runas-icon {
    background-color: #ffffff;
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
