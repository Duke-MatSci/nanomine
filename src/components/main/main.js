import Data from '../data'
export default {
  name: 'LandingPage',
  data: Data.MainData,
  components: {
    
  },
  methods: {
    showBox () {
      console.log(this.filter)
    }
  },
  created() {
    console.log("hello world", this.filter)
  }
}