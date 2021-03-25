import Data from '../../data'
import * as Util from '../../utils'
export default {
  name: 'Contactus',
  data: () => ({
    info: {icon: 'mail', name: 'Contact Us'},
    msg: 'Contact the MaterialsMine Team',
    helpText: 'Enter problem description',
    textData: '',
    contactType: 'comments',
    confirmationDialog: false,
    errorState: false,
    errorMsg: 'xyz'
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