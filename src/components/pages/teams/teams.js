export default {
  name: 'TeamsPage',
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'groups', name: 'Our Team'})
  }
}