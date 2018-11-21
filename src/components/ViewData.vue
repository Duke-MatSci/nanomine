<template>
   <div :style="style">
      <!-- Greeting -->
      <h1>{{greeting}}</h1>
      <!-- Call-to-action -->
      <v-btn v-if="rawData" v-on:click="download_raw()" download=title color="primary" @click.prevent>Download raw data</v-btn>
      <!-- xml data -->
      <p v-if="rawData">{{rawData}}</p>
   </div>
</template>

<script>
import Axios from 'axios'
export default {
  name: 'ViewData',
  data: () => ({
    rawData: null,
    dlink: null
  }),
  props: ['title'],
  methods: {
    setLoading: function () {
      this.$store.commit('isLoading')
    },

    resetLoading: function () {
      this.$store.commit('notLoading')
    },

    download_raw: function () {
      let vm = this
      console.log(vm.title + ' raw data downloaded.')
      let element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(vm.rawData))
      element.setAttribute('download', vm.title)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    },

    get_raw: function () {
      let vm = this
      Axios.get('/nmr//explore/select', {
        params: {
          title: vm.title
        }
      })
        .then(function (response) {
          console.log(JSON.stringify(response.data.data[0].content))
          console.log('get_raw complete!')
          vm.rawData = response.data.data[0].content
        })
        .catch(function (error) {
          console.log(error)
          vm.rawData = null
        })
        .then(function () {
          // always executed
        })
    }
  },
  created () {
    console.log('Loading the ViewData page...')
    this.get_raw()
  },
  computed: {
    greeting: function () {
      if (this.title) {
        return `Showing data for ${this.title}`
      } else {
        // No title is specified, display default message
        return 'Please specify the title of the data entry.'
      }
    }
  }
}
</script>
