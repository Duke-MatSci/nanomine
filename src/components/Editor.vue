<template>
  <div class="nmeditor">
    <h1>
      {{msg}}
    </h1>
    <v-btn color="info" v-on:click="refreshButton()" >Refresh</v-btn>
    <v-btn color="info" v-on:click="testButton()" >Test</v-btn>
    <div id="editor" ref="editor"></div>
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
  mounted: function () {
    let vm = this
    this.content = CodeMirror(vm.$refs['editor'], {
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
    this.refreshEditor()
  },
  methods: {
    testButton: function () {
      var self = this
      var url = '/nmr/test1'
      // let url = 'http://localhost:3000'
      self.$store.commit('isLoading')
      return Axios.get(url)
        .then(function (response) {
          console.log(response)
          if (response.data.head !== null) {
            self.xml_text = JSON.stringify(response.data.results.bindings)
          }
          self.refreshEditor()
          self.$store.commit('notLoading')
        })
        .catch(function (err) {
          self.$store.commit('notLoading')
          self.fetchError = err
          console.log(err)
          alert(err)
        })
    },
    refreshButton: function () {
      var self = this
      var url = '/nmr'
      // let url = 'http://localhost:3000'
      self.$store.commit('isLoading')
      return Axios.get(url)
        .then(function (response) {
          self.xml_text = vkbeautify.xml(response.data.xml, 1)
          self.refreshEditor()
          self.$store.commit('notLoading')
        })
        .catch(function (err) {
          self.fetchError = err
          console.log(err)
          alert(err)
          self.$store.commit('notLoading')
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
    height: 100%;
    text-align: left;
  }
  h1 {
    text-transform: uppercase;
  }
</style>
