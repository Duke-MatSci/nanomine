<template>
  <div class="nmeditor">
    <h1>
      {{msg}}
    </h1>
    <div id="editor" ref="editor"></div>
  </div>
</template>

<script>
import {} from 'vuex'
import CodeMirror from '@/utils/codemirror'
export default {
  name: 'Editor',
  data () {
    return {
      msg: 'Editor',
      content: null,
      xml_text: '<xml></xml>'
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
      gutters: ['CodeMirror-linenumbers',
        'CodeMirror-foldgutter'
      ]

    })
    this.refreshEditor()
  },
  methods: {
    refreshEditor: function () {
      let vm = this
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
  @import 'codemirror/lib/codemirror.css';
  @import 'codemirror/theme/ttcn.css';
  .nmeditor {
    height: 100%;
  }
  h1 {
    text-transform: uppercase;
  }
</style>
