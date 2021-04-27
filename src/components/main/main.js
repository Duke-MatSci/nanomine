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
      screen: 0,
      gifChart: [
        {
          img: "/nmstatic/img/test/characterization-radial.gif",
          title: "Characterization Radial Chart"
        },
        {
          img: "/nmstatic/img/test/crossfiltering.gif",
          title: "Cross Filtering Chart"
        },
        {
          img: "/nmstatic/img/test/matrix-filler-combo.gif",
          title: "Matrix Filler Combo Chart"
        },
        {
          img: "/nmstatic/img/test/meta-analysis.gif",
          title: "Meta Analysis Chart"
        },
        {
          img: "/nmstatic/img/test/tensile-chart.gif",
          title: "Tensile Chart"
        },
      ]
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
          // this.exploreChart.unshift(movedChart);
          this.gifChart.unshift(movedChart);
          this.pushedCharts.pop();
        }
      } else {
        if(!this.gifChart.length){
          return;
        } else if(this.gifChart.length <= this.screen){
          return;
        } else {
          movedChart = this.gifChart[0];
          this.pushedCharts.push(movedChart);
          this.gifChart.shift();
        }
      }
    }
  },
  created() {
    this.restCallFn();
    this.$store.commit('setAppHeaderInfo', undefined)
  }
}