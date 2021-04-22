export default {
  name: 'Contactus',
  data: () => ({
    msg: 'Contact the MaterialsMine Team',
    helpText: 'Enter problem description',
    textData: '',
    contactType: 'comments',
    confirmationDialog: false,
    errorState: false,
    errorMsg: 'xyz'
  }),
  methods: {
    showBox () {
      console.log(this.filter)
    }
  },
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'mail', name: 'Contact Us'})
  }
}