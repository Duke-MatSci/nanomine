<template>
  <div class="nmeditor">
    <v-toolbar dark color="primary">
      <v-toolbar-title class="white--text">{{msg}}</v-toolbar-title>
      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="lockButton()">
          <v-icon>lock_open</v-icon>
        </v-btn>
        <span>Unlocked</span>
      </v-tooltip>

      <v-spacer></v-spacer>

      <v-tooltip bottom>
        <v-btn icon slot="activator">
          <v-icon>transform</v-icon>
        </v-btn>
        <span>XML/Form view</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator">
          <v-icon>save</v-icon>
        </v-btn>
        <span>Save</span>
      </v-tooltip>

      <v-tooltip bottom>
      <v-btn icon slot="activator">
        <v-icon>open_in_browser</v-icon>
      </v-btn>
        <span>Open</span>
      </v-tooltip>

      <v-tooltip bottom>
      <v-btn icon slot="activator" v-on:click="test2Button()">
        <v-icon>settings</v-icon>
      </v-btn>
        <span>Settings</span>
      </v-tooltip>

      <v-tooltip bottom>
      <v-btn icon slot="activator" v-on:click="searchButton()">
        <v-icon>find_in_page</v-icon>
      </v-btn>
        <span>Find In Editor</span>
      </v-tooltip>

      <!--<v-tooltip bottom>-->
      <!--<v-btn icon slot="activator" v-on:click="appsButton()">-->
        <!--<v-icon>apps</v-icon>-->
      <!--</v-btn>-->
        <!--<span>Apps</span>-->
      <!--</v-tooltip>-->

      <v-tooltip bottom>
      <v-btn icon slot="activator" v-on:click="samplesButton()">
        <v-icon>list</v-icon>
      </v-btn>
        <span>List data and schemas</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="infoButton()">
        <v-icon>info</v-icon>
      </v-btn>
        <span>Info</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="refreshButton()">
        <v-icon>refresh</v-icon>
        </v-btn>
        <span>Refresh</span>
      </v-tooltip>

      <v-tooltip bottom>
        <v-btn icon slot="activator" v-on:click="testButton()">
        <v-icon>more_vert</v-icon>
      </v-btn>
        <span>More</span>
      </v-tooltip>

    </v-toolbar>
    <v-container fluid justify-start fill-height>
      <v-layout row wrap align-start fill-height>
        <v-flex fill-height xs12>
          <div id="editor" ref="editor"></div>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import CodeMirror from '@/utils/codemirror'
import Axios from 'axios'
import vkbeautify from 'vkbeautify'

export default {
  name: 'Editor',
  data () {
    return {
      msg: '<untitled>',
      content: null,
      xml_text: '<PolymerNanocomposite>\n</PolymerNanocomposite>'
    }
  },
  beforeDestroy: function () {
    let vm = this
    vm.$nextTick(function () {
      vm.$store.commit('setEditorInactive')
    })
  },
  mounted: function () {
    let vm = this
    vm.$nextTick(function () {
      vm.$store.commit('setEditorActive')
    })
    vm.content = CodeMirror(vm.$refs['editor'], {
      lineNumbers: true,
      mode: 'xml',
      autofocus: true,
      smartIndent: true,
      indentUnit: 1,
      matchTags: {
        bothTags: true
      },
      extraKeys: {
        'Ctrl-J': 'toMatchingTag',
        /* "Cmd-B": vm.beautify,
        "Ctrl-B": vm.beautify,
        "Cmd-Z": vm.undo,
        "Ctrl-Z": vm.undo,
        "Shift-Cmd-Z": vm.redo,
        "Shift-Ctrl-Z": vm.redo, */
        "'<'": vm.completeAfter,
        "'/'": vm.completeIfAfterLt,
        "' '": vm.completeIfInTag,
        "'='": vm.completeIfInTag
        // "Cmd-C": "autocomplete",
        // "Ctrl-C": "autocomplete"
      },
      hintOptions: {
        // schemaInfo: vm.state.xmlSchemaList
      },
      foldGutter: true,
      gutters: [
        'CodeMirror-linenumbers',
        'CodeMirror-foldgutter'
      ]

    })
    vm.refreshEditor()
  },
  methods: {
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    testButton: function () {
      var vm = this
      var url = '/nmr/test1'
      // let url = 'http://localhost:3000'
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response)
          if (response.data.head !== null) {
            vm.xml_text = JSON.stringify(response.data.results.bindings)
          }
          vm.refreshEditor()
          vm.resetLoading()
        })
        .catch(function (err) {
          vm.resetLoading()
          vm.fetchError = err
          console.log(err)
          alert(err)
        })
    },
    test2Button: function () {
      var vm = this
      var url = '/nmr/fullgraph'
      // let url = 'http://localhost:3000'
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response.data)
          console.log(response.data.results.bindings.length)
          // let x = []
          // response.data.results.bindings.forEach(function (v) {
          //   let sampleID = v.sample.value.split('/').pop()
          //   console.log(sampleID + ' ' + v.sample.value)
          //   sampleList.push({'uri': v.sample.value, 'id': sampleID})
          // })
          // vm.$store.commit('sampleList')
          setTimeout(function () {
            vm.resetLoading()
          }, 1000)
        })
        .catch(function (err) {
          vm.resetLoading()
          vm.fetchError = err
          console.log(err)
          alert(err)
        })
    },
    infoButton: function () {
      var vm = this
      console.log(vm.msg + ' info button')
    },
    appsButton: function () {
      var vm = this
      console.log(vm.msg + ' apps button')
    },
    lockButton: function () {
      return false
    },
    samplesButton: function () {
      var vm = this
      var url = '/nmr/samples'
      // let url = 'http://localhost:3000'
      vm.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response.data)
          console.log(response.data.data.length)
          let sampleList = []
          // response.data.results.bindings.forEach(function (v) {
          //   let sampleID = v.sample.value.split('/').pop()
          //   console.log(sampleID + ' ' + v.sample.value)
          //   sampleList.push({'uri': v.sample.value, 'id': sampleID})
          // })
          response.data.data.forEach(function (v) {
            let sampleID = v.split('/').pop()
            console.log(sampleID + ' ' + v)
            sampleList.push({'uri': v, 'id': sampleID})
          })
          vm.$store.commit('sampleList')
          vm.resetLoading()
        })
        .catch(function (err) {
          vm.fetchError = err
          console.log(err)
          alert(err)
          vm.resetLoading()
        })
    },
    searchButton: function () {
      console.log('Search button.')
    },
    refreshButton: function () {
      var vm = this
      var url = '/nmr'
      // let url = 'http://localhost:3000'
      vm.resetLoading()
      return Axios.get(url)
        .then(function (response) {
          vm.xml_text = vkbeautify.xml(response.data.xml, 1)
          vm.refreshEditor()
          setTimeout(function () {
            vm.resetLoading()
          }, 1000)
        })
        .catch(function (err) {
          vm.fetchError = err
          console.log(err)
          alert(err)
          vm.resetLoading()
        })
    },
    refreshEditor: function () {
      var vm = this
      vm.content.setValue(vm.xml_text)
      // vm.content.setValue('<xml></xml>')
      vm.content.setSize('100%', '100%')
      setTimeout(function () {
        vm.content.refresh()
        vm.content.execCommand('goDocStart')
        vm.content.clearHistory()
      }, 0)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .nmeditor {
    //height: 100%;
    text-align: left;
  }
  #editor {
  }
  h1 {
    text-transform: uppercase;
  }
</style>
