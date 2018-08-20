import Vue from 'vue'
import Router from 'vue-router'
import NanoMine from '@/components/NanoMine'
import Database from '@/components/Database'
import ModuleTools from '@/components/ModuleTools'
import SimTools from '@/components/SimTools'
import NmEditor from '@/components/Editor'
import McrHomepage from '@/components/McrHomepage'
import BinarizeHomepage from '@/components/BinarizeHomepage'
import Otsu from '@/components/Otsu'
import Visualization from '@/components/Visualization'
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
    },
    {
      path: '/mcr_homepage',
      name: 'McrHomepage',
      component: McrHomepage
    },
    {
      path: '/binarization_homepage',
      name: 'BinarizeHomepage',
      component: BinarizeHomepage
    },
    {
      path: '/Otsu',
      name: 'Otsu',
      component: Otsu
    },
    {
      path: '/Visualization',
      name: 'Visualization',
      component: Visualization
    }
  ]
})
