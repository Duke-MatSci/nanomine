import Vue from 'vue'
import Router from 'vue-router'
import NanoMine from '@/components/NanoMine'
import Database from '@/components/Database'
import ModuleTools from '@/components/ModuleTools'
import SimTools from '@/components/SimTools'
import NmEditor from '@/components/Editor'
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'NanoMine',
      component: NanoMine
    },
    {
      path: '/db',
      name: 'Database',
      component: Database
    },
    {
      path: '/simtools',
      name: 'SimTools',
      component: SimTools
    },
    {
      path: '/mtools',
      name: 'ModuleTools',
      component: ModuleTools
    },
    {
      path: '/editor',
      name: 'NmEditor',
      component: NmEditor
    }
  ]
})
