import Loader  from '../../utils/loading'
export default {
  name: 'Upload',
  data: () => ({
    title: 'Image Gallery',
    loading: true,
    error: 'mmms',
    gifChart: [
      {
        img: "/nmstatic/img/test/characterization-radial.gif",
        title: "Tooltips",
        url: "https://materialsmine.org/wi/viz/16fb67daba5c4c39"
      },
      {
        img: "/nmstatic/img/test/crossfiltering.gif",
        title: "Crossfiltering",
        url: "https://materialsmine.org/wi/viz/a66e1f86fe47ef6d"
      },
      {
        img: "/nmstatic/img/test/matrix-filler-combo.gif",
        title: "Dynamic Selection",
        url: "https://materialsmine.org/wi/viz/598daf9fd610e982"
      },
      {
        img: "/nmstatic/img/test/meta-analysis.gif",
        title: "Pan & Zoom",
        url: "https://materialsmine.org/wi/viz/6675f5b909cf5059"
      },
      {
        img: "/nmstatic/img/test/tensile-chart.gif",
        title: "Conditional Highlighting",
        url: "https://materialsmine.org/wi/viz/fca5e763f0284284"
      },
    ],
  }),
  components: {
    appLoader: Loader
  },
  methods: {
    showBox () {
      console.log(this.filter)
    },
    reduceDescription(args) {
      let arr, arrSplice, res
      arr = args.split(" ")
      arr.splice(15)
      arrSplice = arr.reduce((a,b) => `${a} ${b}`, "")
      return `${arrSplice}...`
    },
    mmm(arg){
      console.log(arg)
    }
  },
  computed: {
    returnFetchedImages(){
      this.mmm(this.$store.getters['imageSearch/returnFetchedImages'])
      return this.$store.getters['imageSearch/returnFetchedImages']
    },
    returnResponseError(){
      return this.$store.getters['imageSearch/returnResponseError']
    }
  },
  async mounted(){
    this.loading = true;
    const vm = this;
    const actionPayload = {
      // limit: this.limit,
      query: null
    }
    try {
      await vm.$store.dispatch('imageSearch/loadImages', actionPayload)
    } catch(error){
      vm.error = error || 'Something failed'
    }
    this.loading = false;
  },
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'search', name: 'Image Gallery'})
  }
}