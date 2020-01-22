<template>
  <div class="canvas-wrapper">
    <canvas :id="canvasId" ref="wrapped-canvas"></canvas>
    <slot></slot>
  </div>
</template>

<script>
import uniqueId from 'lodash/uniqueId'
export default {
  data () {
    return {
      provider: {
        context: null
      }
    }
  },

  computed: {
    canvasId () {
      return uniqueId('canvasId')
    }
  },

  provide () {
    return {
      provider: this.provider
    }
  },

  mounted () {
    this.provider.context = this.$refs['wrapped-canvas'].getContext('2d')
    this.$refs['wrapped-canvas'].width = this.$refs['wrapped-canvas'].parentElement.clientWidth
    this.$refs['wrapped-canvas'].height = this.$refs['wrapped-canvas'].parentElement.clientHeight
  },

  methods: {
    getCanvas () {
      return this.$refs['wrapped-canvas']
    }
  }
}
</script>
<style scoped>
  .canvas-wrapper {
    padding: 0;
    margin: 0;
  }
</style>
