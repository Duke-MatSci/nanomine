export default {
  name: 'SimmTools',
  methods: {
    showBox () {
      console.log(this.filter)
    }
  },
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Tools'})
  }
}