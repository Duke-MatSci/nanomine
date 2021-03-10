// const AppMixin = {
//     methods: {
//         links(args) {
//             return window.open(args, '_self');
//         }
//     }
// }

// export default AppMixin;

import {Auth} from '@/modules/Auth.js'

export default {
  name: 'PageHeader',
  beforeMount: function () {
    let vm = this
    vm.auth = new Auth()
    vm.$store.subscribe(vm.handleLoginDialogChange)
    console.log('query = ' + JSON.stringify(vm.$route.query))
    let qlogout = vm.$route.query.logout
    if (qlogout && qlogout.match(/(true).*/)) {
      setTimeout(function () {
        vm.logoutRouted = true
        // vm.logoutDialog = true
        vm.$store.commit('setLoginLogout')
        console.log('set logoutDialog to true')
      }, 50)
    } else {
      console.log('logout not requested')
    }
    let qlogin = vm.$route.query.login
    if (qlogin && qlogin.match(/(true).*/)) {
      setTimeout(function () {
        vm.loginRouted = true
        vm.loginDialog = true
        vm.$store.commit('setLoginLogout')
        console.log('set loginDialog to true')
      }, 50)
    } else {
      console.log('login not requested')
    }
  },
  created: function () {
    let vm = this
    setInterval(function () {
      if (vm.auth) {
        vm.loggedInStatus = vm.isLoggedIn()
      }
    }, 1000)
  },
  methods: {
    links(args,options) {
      if(options){
        return window.location = `${window.location.origin}/wi/about?view=view&uri=http://semanticscience.org/resource/Chart`
      }
      return window.open(args, '_self');
    },
    setSite (siteId) {
      let vm = this
      if (siteId === 'mm') {
        vm.resetLeftMenu()
      }
      vm.site = siteId
    },
    log: function (msg) {
      console.log(msg)
    },
    logout: function () {
      let vm = this
      vm.auth.logout()
      vm.logoutUrl = '/nmr/doLogout'
      vm.$refs.logoutLink.click()
      vm.logoutDialog = false
    },
    getLoginLink: function () {
      let vm = this
      let rv = '/secure'
      if (vm.auth.isTestUser() === true) {
        rv = '/nmr/nmdevlogin'
      }
      return rv
    },
    cancelLogout: function () {
      let vm = this
      vm.logoutDialog = false
      if (vm.logoutRouted) {
        vm.logoutRouted = false
        vm.$router.push('/')
      }
    },
    searchEnabled: function () {
      return true
    },
    toggleLeftMenu: function () {
      this.$store.commit('toggleLeftMenu')
    },
    resetLeftMenu: function () {
      this.$store.commit('resetLeftMenu')
    },
    toggleAdminAvailable: function () {
      this.$store.commit('toggleAdminActive')
    },
    handleLoginDialogChange: function (mutation, state) {
      let vm = this
      console.log('handleLoginDialogChange: ' + mutation.type)
      if (mutation.type === 'setLoginLogout') {
        if (state.loginLogout && !vm.isLoggedIn()) {
          vm.loginDialog = true
        } else {
          vm.loginDialog = false
        }
        if (state.loginLogout && vm.isLoggedIn()) {
          vm.logoutDialog = true
        } else {
          vm.logoutDialog = false
        }
      } else if (mutation.type === 'resetLoginLogout') {
        vm.loginDialog = false
        vm.logoutDialog = false
      }
    },
    isLoggedIn: function () {
      return this.auth.isLoggedIn()
    },
    isTestUser: function () {
      return this.auth.isTestUser()
    },
    // openGallery: function () {
    //   window.location = `${window.location.origin}/wi/about?view=view&uri=http://semanticscience.org/resource/Chart`
    // }
  },
  computed: {
    loginStatus: function () { // reactive isLoggedIn to keep status updated in page header
      console.log('Updating login status')
      return this.loggedInStatus
    },
    userId: function () {
      return this.auth.getUserId()
    },
    userName: function () {
      return this.auth.getGivenName()
    },
    isAdmin: function () {
      return this.auth.isAdmin()
    },
    isRunAs: function () {
      return this.$store.getters.runAsUser != null
    } },
  data () {
    return {
      msg: 'PageHeader',
      site: 'nano', // mm - main site, nano - NanoMine, meta - MetaMine
      auth: null,
      loggedInStatus: false,
      loginDialog: false,
      logoutDialog: false,
      logoutRouted: false,
      logoutUrl: null
    }
  }
}