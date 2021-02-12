import * as Util from '../utils'
const AppMixin = Util.AppMixin;
/** NEEDED FOR NANOMINE */
const LOCAL_DEV_SERVER = 'http://localhost:8000/nmr/chart';
const SERVER = `${window.location.origin}/nmr/chart`;
const URL = LOCAL_DEV_SERVER;

export default {
  name: 'LandingPage',
  mixins: [AppMixin],
  data: () => {
    return {
      exploreChart: []
    }
  },
  components: {
    aFooter: Util.Footer,
  },
  methods: {
    showBox () {
      console.log(this.filter)
    },
    nav(args) {
      return window.location = `/nm#/${args}`
    },
    async restCallFn(){
      try {
        let result = await fetch(`${URL}/retrievecharts`, {
          method: "GET",
          headers: {
            Accept: '*/*',
            'Content-Type': 'application/json',
            // Authorization: 'Bearer' + cookies
          }
        })
        if(result.status == 201) {
          result = await result.json()
          result = result.charts.map((el) => {
            el.backup = JSON.parse(el.backup)
            return el
          })
          result.map((e,i) => {
            if(i <= 4){
              this.exploreChart.push(e);
            }
          })
        }
      } catch(err){
        throw err;
      }
    },
    linkChart(args) {
      return window.location = args
    }
  },
  created() {
    this.restCallFn();
    console.log("hello world", this.filter)
  }
}