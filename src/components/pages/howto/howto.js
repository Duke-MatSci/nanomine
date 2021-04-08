export default {
  name: 'HowTo',
  data: () => ({
    videos: []
  }),
  methods: {
    showBox () {
      console.log(this.filter)
    },
    hideVideos (idx) {
      let vm = this
      let noTouch = null
      if (idx >= 0) {
        noTouch = idx
      }
      vm.videos.forEach(function (v, i) {
        if (i !== noTouch) {
        // vm.videos[i].hide = true
          let o = vm.videos[i]
          o.hide = true
          vm.$set(vm.videos, i, o)
        }
      })
    },
    displayVideo (idx, link) {
      if(link){
        return window.open('https://youtu.be/o2FA1yM85M8', '_blank');
      }
      let vm = this
      vm.hideVideos(idx)
      let isHidden = vm.videos[idx].hide
      let o = vm.videos[idx]
      o.hide = !isHidden
      vm.$set(vm.videos, idx, o)
      console.log('Hidden(' + idx + ') = ' + vm.videos[idx].hide)
    }
  },
  mounted() {
    let vm = this;
    let vids = vm.$store.getters.getCmsAllVideos
    Object.keys(vids).forEach((v, idx) => {
      let key = v
      let o = vids[key]
      o.hide = true
      o.nm = key
      vm.videos.push(o)
    })
    vm.hideVideos()
  },
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'smart_display', name: 'How To'})
  }
}