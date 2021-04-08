export default {
  name: 'Tools',
  created () {
    this.$store.commit('setAppHeaderInfo', {icon:'workspaces', name: 'Tools'})
  }
}