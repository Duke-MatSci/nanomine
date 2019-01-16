<template>
  <div class="admin">
    <h1>{{ msg }}</h1>
    <v-container grid-list-xl>
      <v-layout row wrap>
        <v-flex xs4 v-on:click="$router.push('/admin')">
          <img src="/cdn/img/admin-icon.jpg" />
          <h4>
            Administrative Functions
          </h4>
          <p>
            You have administrative privileges.
          </p>
        </v-flex>
      </v-layout>
    </v-container>
  </div>

</template>

<script>
import {Auth} from '@/modules/Auth.js'

export default {
  name: 'Admin',
  data () {
    return {
      msg: 'Administration' //       this.$store.commit('setRunAsUser', '999999999A') // TODO remove this. It's for testing
    }
  },
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
  },
  methods: {
    isAdmin: function () {
      let vm = this
      return vm.auth.isAdmin()
    }
  }
}
</script>

<style scoped>
  img {
    width: 50px;
    height: auto;
  }
  h4 {
    text-transform: uppercase;
  }
  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

</style>
