<template>
  <div class="waiting" v-if="show()">
    <v-layout align-center justify-center row fill-height>
      <div></div>
      <atom-spinner
        :animation-duration="1000"
        :size="60"
        :color="'#ff1d5e'"
      />
      <div></div>
    </v-layout>
  </div>
</template>

<script>

import {} from 'vuex'
import {AtomSpinner} from 'epic-spinners'

export default {
  name: 'Waiting',
  components: {
    AtomSpinner
  },
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
    z-index: 1001;
    top: 0;
    left: 0;
    position: fixed;
    background-color: rgba(140,180,240,0.60)
  }

</style>
