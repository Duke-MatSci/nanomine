import Data from '../../data'
import * as Util from '../../utils'
export default {
  name: 'News',
  data: () => ({
    info: {icon: 'fa-edit', name: 'Research + News'},
  }),
  components: {
    aFooter: Util.Footer,
    aHeader: Util.Header
  },
  methods: {
    link (args) {
      return window.open(args, '_blank');
    }
  }
}