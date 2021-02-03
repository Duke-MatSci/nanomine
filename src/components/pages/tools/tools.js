import Data from '../../data'
import * as Util from '../../utils'
export default {
  name: 'Tools',
  data: () => ({
    info: {icon: 'fa-external-link-square-alt', name: 'Tools'},
  }),
  components: {
    aFooter: Util.Footer,
    aHeader: Util.Header
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