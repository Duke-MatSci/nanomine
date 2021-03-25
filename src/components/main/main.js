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
      exploreChart: [],
      pushedCharts: [],
      screen: 0
    }
  },
  components: {
    aFooter: Util.Footer,
  },
  methods: {
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
    pushChart(args){
      let movedChart, vm = this;
      if(window.matchMedia("(max-width: 40.5em)").matches){
        vm.screen = 1;
      } else if(window.matchMedia("(max-width: 56.25em)").matches) {
        vm.screen = 2;
      } else {
        vm.screen = 3;
      }
      if(args == 'prev'){
        if(!this.pushedCharts.length){
          return;
        } else {
          movedChart = this.pushedCharts[this.pushedCharts.length-1];
          console.log(movedChart);
          this.exploreChart.unshift(movedChart);
          this.pushedCharts.pop();
        }
      } else {
        console.log(this.screen);
        if(!this.exploreChart.length){
          return;
        } else if(this.exploreChart.length <= this.screen){
          return;
        } else {
          console.log('before exploreChart: ', this.exploreChart)
          movedChart = this.exploreChart[0];
          console.log(movedChart);
          this.pushedCharts.push(movedChart);
          this.exploreChart.shift();
          console.log('exploreChart: ', this.exploreChart);
        }
      }
    }
  },
  created() {
    this.restCallFn();
  }
}