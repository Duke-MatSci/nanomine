<template>
   <div :style="style">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
      <!-- Greeting -->
      <h1>{{greeting}}</h1>
      <!-- Call-to-action -->
      <v-btn v-if="rawData" v-on:click="download_raw()" download=title color="primary" @click.prevent>Download raw data</v-btn>
      <!-- xml data -->
      <!-- <p v-if="rawData">{{rawData}}</p> -->
      <!-- <v-btn v-on:click="displayResult()" color="primary">Show</v-btn> -->
      <!-- <div id="treeData" class="text-xs-left"></div> -->
      <v-container v-if="rawData" fluid justify-start fill-height>
      <v-layout row wrap align-start fill-height>
        <v-flex fill-height xs12 align-start justify-start>
          <div id="feditor" ref="feditor">
            <div>
              <tree-view style="text-align: left;" :data="jsonSource"
                         :options="{maxDepth: 99, rootObjectKey: 'PolymerNanocomposite', modifiable: true}"></tree-view>
            </div>
          </div>
        </v-flex>
      </v-layout>
    </v-container>
   </div>
</template>

<script>
import Axios from 'axios'
import * as xmljs from 'xml-js'
export default {
  name: 'ViewData',
  data: () => ({
    rawData: null,
    jsonSource: null
  }),
  props: ['title'],
  watch: {
    title: function (newVal, oldVal) { // watch it
      console.log('Prop changed: ', newVal, ' | was: ', oldVal)
      this.get_raw()
    }
  },
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
          vm.displayResult()
        })
        .catch(function (error) {
          console.log(error)
          vm.rawData = null
        })
        .then(function () {
          // always executed
        })
    },

    displayResult: function () {
      console.log('displayResult called')
      let vm = this
      // var domParser = new DOMParser()
      // var xmlText = domParser.parseFromString(vm.rawData, 'text/xml')
      // var xsltDoc = domParser.parseFromString(vm.xsl, 'text/xml')
      // // var xsl = vm.loadXMLDoc('/cdn/xml2html.xsl', 'XML')
      // console.log(xmlText)
      // console.log(xsltDoc)
      // var xsltProcessor = new XSLTProcessor()
      // xsltProcessor.importStylesheet(xsltDoc)
      // var resultDocument = xsltProcessor.transformToFragment(xml, document)
      // console.log(resultDocument)
      // document.getElementById('treeData').appendChild(resultDocument)
      vm.jsonSource = xmljs.xml2js(vm.rawData, {compact: true, ignoreDeclaration: true, ignoreAttributes: true})
      // console.log(vm.jsonSource)
      setTimeout(function () {
        let vals = document.getElementsByClassName('tree-view-item-value')
        // console.log('transform: found ' + vals.length + ' input elements.')
        for (let i = 0; i < vals.length; ++i) { // can't use forEach on dom nodes
          vals[i].setAttribute('size', '240')
        }
      }, 500) // vm.$nextTick was not sufficient for some reason
      // data = data.replace(/,\s+$/,'') // kludge to get rid of trailing comma
      // data = JSON.parse(data)
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
