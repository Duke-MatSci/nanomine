import Data from '../../data'
import * as Util from '../../utils'
export default {
  name: 'Contactus',
  data: () => ({
    info: {icon: 'mail', name: 'Contact Us'},
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