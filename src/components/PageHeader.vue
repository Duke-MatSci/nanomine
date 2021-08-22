<template>
  <div class="header">
    <analytics/>
    <v-toolbar app dense>
      <v-toolbar-side-icon @click="toggleLeftMenu()" class="hidden-md-and-up"></v-toolbar-side-icon>
      <v-btn flat to="/" @click="setSite('nano')">
        <v-toolbar-title><i class="material-icons nm-home-icon">home</i></v-toolbar-title>
      </v-btn>
      <v-btn flat to="/mm" @click="setSite('meta')">
        <v-toolbar-title>MetaMine</v-toolbar-title>
      </v-btn>
      <v-spacer></v-spacer>
      <v-toolbar-items class="hidden-sm-and-down">
        <!--<v-btn flat to="/teams">Team</v-btn>-->
        <!--<v-btn flat @click="links('/home')">Visualize</v-btn>
        <v-btn flat @click="links(null, true)">Gallery</v-btn>-->
        <!-- Begin Test New Menu Options-->
      <v-menu offset-y open-on-hover transition="slide-x-transition" bottom right>
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" flat>About</v-btn>
        </template>
        <v-list dense class="menu-vlist">
          <!--<v-list-item v-for="(item, index) in listMenu" :key="index" router :to="item.link">-->
          <v-list-item @click="links('/nm#/mm/teams')">
            <v-list-item-action>
                <v-list-item-title class="list_menu">About Us</v-list-item-title>
            </v-list-item-action>
          </v-list-item>
          <v-list-item @click="links('/nm#/mm/tutorials')">
            <v-list-item-action>
                <v-list-item-title class="list_menu">Learn</v-list-item-title>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu offset-y open-on-hover transition="slide-x-transition" bottom right>
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" flat>Visualize</v-btn>
        </template>
        <v-list dense class="menu-vlist">
          <!--<v-list-item v-for="(item, index) in listMenu" :key="index" router :to="item.link">-->
          <v-list-item @click="links('/home')">
            <v-list-item-action>
                <v-list-item-title class="list_menu">Browse Data</v-list-item-title>
            </v-list-item-action>
          </v-list-item>
          <v-list-item @click="links(null, true)">
            <v-list-item-action>
                <v-list-item-title class="list_menu">Explore Gallery</v-list-item-title>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu offset-y open-on-hover transition="slide-x-transition" bottom right>
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" flat>Tools</v-btn>
        </template>
        <v-list dense class="menu-vlist">
          <!--<v-list-item v-for="(item, index) in listMenu" :key="index" router :to="item.link">-->
          <v-list-item v-for="(item, index) in listMenu" :key="index" @click="links(item.link)">
            <v-list-item-action>
                <v-list-item-title class="list_menu">{{ item.title }}</v-list-item-title>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-menu>
      <!-- End of Test -->
        <!--<v-btn flat to="/db">Database</v-btn>
        <v-btn flat to="/mtools">Module Tools</v-btn>
        <v-btn flat to="/simtools">Simulation Tools</v-btn>
        <v-btn flat @click="openGallery">Gallery</v-btn>
        <v-btn fab flat href="/home"><i class="material-icons nm-search-icon" v-if="searchEnabled()">search</i>
        </v-btn>-->
        <!--<v-btn v-if="isLoggedIn()" flat to="/mypage">Portal</v-btn>-->
        <!--<v-btn flat to="/mm/tutorials">Learn</v-btn>-->
        <v-btn flat to="/mm/contact">Contact</v-btn>
        <!--<v-btn v-if="isLoggedIn()" flat to="/mypage">My Page</v-btn>-->
        <v-btn v-if="loginStatus" flat v-on:click="$store.commit('setLoginLogout')">
          <i class="material-icons nm-user-icon" v-bind:class="{'nm-admin-icon': (isAdmin && !isRunAs), 'nm-runas-icon': isRunAs}">perm_identity</i>
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
          <span>&nbsp;&nbsp;Login/Register</span>
        </v-btn>
      </v-toolbar-items>
    </v-toolbar>
    <v-dialog v-model="logoutDialog" max-width="290">
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
          <br/><strong>Coming Soon:</strong> InCommon support for using your own university's credentials for login. <a href="https://www.incommon.org/federation/incommon-federation-participants/" target="_blank">What is InCommon?</a>
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
            :href="getLoginLink()"
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
import { AppMixin } from './utils'
// import {Auth} from '@/modules/Auth.js'

export default {
  name: 'PageHeader',
  mixins: [AppMixin],
  data () {
    return {
      listMenu: [
        // {title: "MCR Tools", link:"/nm#/mm/mtools"},
        // {title: "ChemProps", link:"/nm#/mm/ChemProps"},
        {title: "Geometry Explorer", link:"/nm#/mm/pixelunit"},
        // {title: "Geometry Sample Explorer", link:"/nm#/mm/pixelunit50"}
      ]
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
  
  .menu-vlist {
    width: 15rem !important;
  }
</style>
