import Loader  from '../../utils/loading'
import pagination  from '../../utils/pagination'
export default {
  name: 'Upload',
  data: () => ({
    title: 'Image Gallery',
    loading: true,
    error: 'mmms',
    query: null,
    contentDisplay: [],
    limit: 0,
    totalPages: 1,
    basePage: 10,
    perPage: 10,
  }),
  components: {
    appLoader: Loader,
    pagination
  },
  methods: {
    reduceDescription(args) {
      let arr, arrSplice
      arr = args.split(" ")
      arr.splice(15)
      arrSplice = arr.reduce((a,b) => `${a} ${b}`, "")
      return `${arrSplice}...`
    },
    async showResults(){
      this.perPage = this.returnCurrentContentPage * this.basePage
      console.log('running show result',this.perPage)
      const newArr = [];
      await this.returnFetchedImages.map((e,i) => {
        if(i+1 <= this.perPage && i+1 > this.perPage - this.basePage){
          newArr.push(e)
        }
      })
      console.log(newArr)
      return this.contentDisplay = newArr;
    },
    async submitImageSearch(){
      this.loading = true;
      this.limit = 0;
      const vm = this;
      const actionPayload = {
        limit: this.limit,
        query: this.query,
      }
      try {
        await vm.$store.commit('imageSearch/toggleCurrentContentPage', 1)
        await vm.$store.dispatch('imageSearch/loadImages', actionPayload)
      } catch(error){
        vm.error = error || 'Something failed'
      }
      this.loading = false;
    }
  },
  computed: {
    returnFetchedImages(){
      return this.$store.getters['imageSearch/returnFetchedImages']
    },
    returnResponseError(){
      return this.$store.getters['imageSearch/returnResponseError']
    },
    returnCurrentContentPage(){
      return this.$store.getters['imageSearch/returnCurrentContentPage']
    }
  },
  watch: {
    returnFetchedImages(newValue, oldValue){
      if(newValue.length > oldValue.length){
        this.limit = this.limit += 1
      }
      if(newValue && newValue != oldValue){
        const length = newValue.length;
        let tpages = Math.round(length/this.basePage)
        if(length <= this.basePage){
          this.totalPages = 1;
        } else if(length%this.basePage == 0){
          this.totalPages = tpages;
        } else if(length%this.basePage <= 4) {
          this.totalPages = tpages + 1;
        } else {
          this.totalPages = tpages;
        }
      }
      this.showResults()
    },
    returnCurrentContentPage(newValues, oldValues){
      if(newValues != oldValues){
        this.showResults()
      }
    }
  },
  async mounted(){
    this.loading = true;
    const vm = this;
    const actionPayload = {
      limit: this.limit,
      query: this.query,
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