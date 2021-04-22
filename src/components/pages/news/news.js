export default {
  name: 'News',
  methods: {
    link (args) {
      return window.open(args, '_blank');
    }
  },
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'text_snippet', name: 'Research + News'})
  }
}