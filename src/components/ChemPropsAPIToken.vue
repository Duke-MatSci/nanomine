<template>
  <div class="requestToken">
    <h1>Request token here for ChemProps - A growing polymer name and filler name standardization database</h1>
    <v-container>
      <v-alert
        v-model="submitError"
        type="error"
        outline
      >
        {{loginRequiredMsg}}
      </v-alert>
      <h3 class="text-xs-left">Instructions</h3>
      <p class="text-xs-left"><b>Put instructions here!!!!!!</b></p>
      <div>
        <div v-if="loginRequired">
          <p class="text-xs-left">If you already have a Duke University account, proceed to login.  Otherwise create a <a href="https://accounts.oit.duke.edu/onelink/register" target="_blank">Duke OneLink</a> account.</p>
          <v-btn :href="getUserLoginLink()" color="primary">Login</v-btn>
        </div>
        <div v-else>
          <v-card style="box-shadow:none" v-if="!accessAuth">
            <p class="text-xs-left"><b>2. Create Access Token</b></p>
            <form>
              <v-text-field
                name="domainsecret"
                v-model="domainsecret"
                label="Enter A Secret"
                :append-icon="sValue ? 'visibility' : 'visibility_off'"
                @click:append="() => (sValue = !sValue)"
                :type="sValue ? 'password' : 'text'"
              ></v-text-field>
              <v-btn class="mr-4" @click="submitRequest">Request Token</v-btn>
            </form>
          </v-card>
          <v-card style="box-shadow:none" v-else>
            <kbd class="text-xs-left" style="padding:0.6rem 1.2rem; margin-top:1.5rem; width:100%">
              <span class="text-xs-left" style="display:block"><strong>API URL:</strong> {{address}}/nmr/api/chemprops </span>
              <div class="text-xs-left" style="display:block; color:palevioletred; max-width: 98%; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical;"><strong>API Token:</strong> {{accessAuth}} </div>
            </kbd>
            <p class="text-xs-left" style="margin-top:1rem">
              To access this protected api resource, the user agent should send the API Token, 
              typically in the Authorization header using the Bearer schema. The content of the header should look like the following:<br />
              <kbd class="text-xs-left" style="margin-top:1rem; display:block; margin-bottom:1rem; padding:0 0.6rem">
                <span class="text-xs-left" style="display:block">'Content-Type': 'application/json',</span>
                <span class="text-xs-left" style="display:block">Authorization: Bearer &lt;token&gt;</span>
              </kbd>
              Copy and keep the above token safe.
            </p>
          </v-card>
        </div>
      </div>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import {Auth} from '@/modules/Auth.js'
import Axios from 'axios'

const LOCAL = 'http://localhost/nmr/api';
const SERVER = `${window.location.origin}/nmr/api`;
const URL = SERVER;

export default {
  name: 'ChemPropsAPIToken',
  data () {
    return {
      title: 'ChemPropsAPIToken',
      auth: null,
      accessAuth: false,
      domainsecret: null,
      submitError: false,
      sValue: true,
      address: window.location.origin,
      chempropsToken: null,
      loginRequired: false,
      loginRequiredMsg: ''
    }
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    if (!vm.auth.isLoggedIn()) {
      vm.loginRequired = true
    }
  },
  async mounted () {
    let vm = this
    vm.checkIfApiExist()
  },
  methods: {
    getUserLoginLink () {
      let rv = '/secure'
      if (this.auth.isTestUser() === true) {
        rv = '/nmr/nmdevlogin'
      }
      return rv
    },
    async submitRequest () {
      this.submitError = false
      this.loginRequiredMsg = null
      if (this.auth.isLoggedIn() && this.domainsecret != null){
        try{
          let cookies = this.auth.getCookieToken()
          let result = await fetch(`${URL}/create`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + cookies
            },
            body: JSON.stringify({domain: this.domainname, token: this.domainsecret})
          })
          if (result && result.status == 201) {
            result = await result.json()
            return this.accessAuth = result
          } else {
            result = await result.json()
            this.submitError = true
            return this.loginRequiredMsg = result.mssg
          }
        } catch (err) {
          this.submitError = true
          this.loginRequiredMsg = err
          console.log(err)
          throw err
        }
      } else {
        this.submitError = true
        this.loginRequiredMsg = "Secret fields are required!"
      }
    },
    async checkIfApiExist(){
      if (this.auth.isLoggedIn()) {
        try{
          let cookies = this.auth.getCookieToken()
          let result = await fetch(`${URL}/check`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + cookies
            },
          })
          if (result && result.status == 201) {
            result = await result.json()
            if (result && result.token) {
              return this.accessAuth = result
            }
          }
        } catch (err) {
          throw err
        }
      }
    }
  }
}
</script>

<style scoped>

h1 {
  margin-top: 10px;
  background-color: black;
  color: white;
}

</style>
