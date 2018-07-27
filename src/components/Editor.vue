<template>
  <div class="nmeditor">
    <h1>
      {{msg}}
    </h1>
    <v-container fluid justify-start fill-height>
      <v-layout row wrap align-start fill-height>
        <v-flex fill-height xs10>
          <div id="editor" ref="editor"></div>
        </v-flex>
        <v-flex xs2 fill-height>
          <v-card align-end fill-height>
            <v-btn color="info" v-on:click="refreshButton()">Refresh</v-btn>
            <v-btn color="info" v-on:click="testButton()">Test</v-btn>
            <v-btn color="info" v-on:click="samplesButton()">List</v-btn>
          </v-card>
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
      var self = this
      var url = '/nmr/test1'
      // let url = 'http://localhost:3000'
      self.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response)
          if (response.data.head !== null) {
            self.xml_text = JSON.stringify(response.data.results.bindings)
          }
          self.refreshEditor()
          self.resetLoading()
        })
        .catch(function (err) {
          self.resetLoading()
          self.fetchError = err
          console.log(err)
          alert(err)
        })
    },
    samplesButton: function () {
      var self = this
      var url = '/nmr/samples'
      // let url = 'http://localhost:3000'
      self.setLoading()
      return Axios.get(url)
        .then(function (response) {
          console.log(response.data)
          console.log(response.data.results.bindings.length)
          let sampleList = []
          response.data.results.bindings.forEach(function (v) {
            let sampleID = v.sample.value.split('/').pop()
            console.log(sampleID + ' ' + v.sample.value)
            sampleList.push({'uri': v.sample.value, 'id': sampleID})
          })
          self.$store.commit('sampleList')
          setTimeout(function () {
            self.resetLoading()
          }, 1000)
        })
        .catch(function (err) {
          self.fetchError = err
          console.log(err)
          alert(err)
          self.resetLoading()
        })
    },
    refreshButton: function () {
      var self = this
      var url = '/nmr'
      // let url = 'http://localhost:3000'
      self.resetLoading()
      return Axios.get(url)
        .then(function (response) {
          self.xml_text = vkbeautify.xml(response.data.xml, 1)
          self.refreshEditor()
          setTimeout(function () {
            self.resetLoading()
          }, 1000)
        })
        .catch(function (err) {
          self.fetchError = err
          console.log(err)
          alert(err)
          self.resetLoading()
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

  h1 {
    text-transform: uppercase;
  }
</style>
