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
import _ from 'lodash'

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
    formulaHandler: {
      type: Function,
      default: null
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
      smilesOptionsAdjusted: null,
      smilesDrawer: null,
      smilesValue: '',
      smilesTheme: this.theme,
      smilesComputeOnly: this.computeOnly
    }
  },

  watch: {
    smilesOptions: function (v) {
      let vm = this
      vm.overrideOptions(vm.smilesOptions)
    },
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
    this.overrideOptions(this.smilesOptions)
    this.smilesDrawer = new SmilesDrawer.Drawer(this.smilesOptionsAdjusted)
  },
  methods: {
    getMolecularFormula () {
      return this.smilesDrawer.getMolecularFormula()
    },
    overrideOptions (opts) {
      let vm = this
      let parentDims = this.$refs['canvas-wrapper'].getParentDimensions()
      if (opts) {
        vm.smilesOptionsAdjusted = _.clone(opts)
      } else {
        vm.smilesOptionsAdjusted = {}
      }
      vm.smilesOptionsAdjusted.height = parentDims.height
      vm.smilesOptionsAdjusted.width = parentDims.width
    },
    setInput (inputStr) {
      let vm = this
      if (inputStr) {
        vm.inputStr = inputStr
        SmilesDrawer.parse(vm.smilesValue, function (tree) {
          vm.smilesDrawer.draw(tree, vm.canvasId)
          if (vm.onSuccessHandler) {
            vm.onSuccessHandler()
          }
          if (vm.formulaHandler) {
            vm.formulaHandler(vm.getMolecularFormula())
          }
        }, function (err) {
          if (vm.formulaHandler) {
            vm.formulaHandler('*Error*')
          }
          if (vm.onErrorHandler) {
            vm.onErrorHandler(err)
          } else {
            console.log('smilesDrawer error: ' + err)
          }
        })
      } else { // clear values on empty input
        if (vm.onSuccessHandler) {
          vm.onSuccessHandler()
        }
        if (vm.formulaHandler) {
          vm.formulaHandler('')
        }
        vm.$refs['canvas-wrapper'].clearCanvas() // clear the smiles image
      }
    }
  }

}
</script>

<style scoped>
  .smiles {
  }
</style>
