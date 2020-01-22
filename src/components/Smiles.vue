<template>
  <div class="smiles">
    <CanvasWrapper ref="canvas-wrapper"></CanvasWrapper>
  </div>
</template>
/*
  Uses code from: https://github.com/reymond-group/smilesDrawer
  TODO: overrides for theme and computeOnly do not seem to be working and removed from sample
*/
<script>
import CanvasWrapper from './CanvasWrapper'
// eslint-disable-next-line no-unused-vars
import * as SmilesDrawer from 'smiles-drawer'
export default {
  components: {
    CanvasWrapper
  },
  name: 'Smiles',
  inject: ['provider'],
  props: {
    smilesOptions: {
      type: Object,
      default: () => {
        return {}
      }
    },
    smilesInput: {
      type: String,
      default: ''
    },
    theme: {
      type: String,
      default: 'light'
    },
    computeOnly: {
      type: Boolean,
      default: false
    },
    onSuccessHandler: {
      type: Function,
      default: null
    },
    onErrorHandler: {
      type: Function,
      default: null
    }
  },
  data () {
    return {
      canvasId: null,
      smilesDrawer: new SmilesDrawer.Drawer(this.smilesOptions),
      smilesValue: '',
      smilesTheme: this.theme,
      smilesComputeOnly: this.computeOnly
    }
  },

  watch: {
    smilesInput: function (v) {
      let vm = this
      console.log('smiles input: ' + v)
      vm.smilesValue = v
      vm.setInput(v)
    },
    theme: function (v) {
      this.smilesTheme = v
    },
    computeOnly: function (v) {
      this.smilesComputeOnly = v
    }
  },

  mounted () {
    this.canvasId = this.$refs['canvas-wrapper'].canvasId
    console.log('canvas-id: ' + this.canvasId)
  },
  methods: {
    getMolecularFormula () {
      return this.smilesDrawer.getMolecularFormula()
    },
    setInput (inputStr) {
      let vm = this
      if (inputStr && inputStr.length > 0) {
        vm.inputStr = inputStr
        SmilesDrawer.parse(vm.smilesValue, function (tree) {
          vm.smilesDrawer.draw(tree, vm.canvasId)
          if (vm.onSuccessHandler) {
            vm.onSuccessHandler()
          }
        }, function (err) {
          if (vm.onErrorHandler) {
            vm.onErrorHandler(err)
          } else {
            console.log('smilesDrawer error: ' + err)
          }
        })
      }
    }
  }

}
</script>

<style scoped>
  .smiles {
  }
</style>
