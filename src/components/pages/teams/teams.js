import * as Util from '../../utils'
export default {
  name: 'TeamsPage',
  data: () => ({
    info: {icon: 'fa-users', name: 'Our Team'},
  }),
  components: {
    aFooter: Util.Footer,
    aHeader: Util.Header
  }
}