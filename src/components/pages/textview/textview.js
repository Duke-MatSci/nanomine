import Data from '../../data'
import * as Util from '../../utils'
export default {
  name: 'Textview',
  data: () => ({
    info: {icon: 'local_library', name: 'Research'},
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