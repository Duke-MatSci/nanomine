<template>
  <div class="nmeditor">
    <h1>{{ msg }}</h1>
    <v-container>
      <div>
      </div>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'Editor',
  data () {
    return {
      msg: 'Editor'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .nmeditor {
    height: 100%;
  }
  h4 {
    text-transform: uppercase;
  }
</style>
