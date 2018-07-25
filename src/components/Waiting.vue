<template>
  <div class="waiting" v-if="show()">
  </div>
</template>

<script>

import {} from 'vuex'

export default {
  name: 'Waiting',
  methods: {
    show: function () {
      return (
        this.$store.state.isWaiting
      )
    }
  },
  data () {
    return {
      msg: 'Waiting'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .waiting {
    height: 100%;
    width: 100%;
    z-index: 1000;
    top: 0;
    left: 0;
    position: fixed;
    background-color: rgba(140,180,240,0.60)
  }

</style>
