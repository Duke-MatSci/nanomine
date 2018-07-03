// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuetify from 'vuetify'
import App from './App'
import router from './router'
import 'vuetify/dist/vuetify.min.css'
import Header from '@/components/PageHeader'
import SubHeader from '@/components/PageSubHeader'
import Footer from '@/components/PageFooter'

Vue.config.productionTip = false
Vue.use(Vuetify, {
  theme: {
    secondary: '#B3E5FC',
    primary: '#03A9F4',
    accent: '#3D5AFE',
    error: '#f44336',
    warning: '#ffeb3b',
    info: '#82B1FF',
    success: '#4caf50'
  }
})
Vue.component('page-header', Header)
Vue.component('page-subheader', SubHeader)
Vue.component('page-footer', Footer)

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
