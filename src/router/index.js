import Vue from 'vue'
import Router from 'vue-router'
import Admin from '@/components/Admin'
import NanoMine from '@/components/NanoMine'
import Database from '@/components/Database'
// import Insight from '@/components/Insight'
import ModuleTools from '@/components/ModuleTools'
import MyPage from '@/components/MyPage'
import SimTools from '@/components/SimTools'
import XMLCONV from '@/components/XMLCONV'
// import NmEditor from '@/components/Editor'
import McrHomepage from '@/components/McrHomepage'
import BinarizeHomepage from '@/components/BinarizeHomepage'
import Otsu from '@/components/Otsu'
import NanoTutorials from '@/components/nanomine/NanoTutorials'
import OtsuResult from '@/components/OtsuResult'
import Niblack from '@/components/Niblack'
import CharacterizeHomepage from '@/components/CharacterizeHomepage'
import CorrelationCharacterize from '@/components/CorrelationCharacterize'
import SDFCharacterize from '@/components/SDFCharacterize'
import DescriptorCharacterize from '@/components/DescriptorCharacterize'
import ReconstructionHomepage from '@/components/ReconstructionHomepage'
import CorrelationReconstruct from '@/components/CorrelationReconstruct'
import SDFReconstruct from '@/components/SDFReconstruct'
import DescriptorReconstruct from '@/components/DescriptorReconstruct'
import IntelligentCharacterize from '@/components/IntelligentCharacterize'
import IntelligentCharacterizeResults from '@/components/IntelligentCharacterizeResults'
// import Visualization from '@/components/Visualization'
import SDFCharacterizeResults from '@/components/SDFCharacterizeResults'
import DescriptorCharacterizeResults from '@/components/DescriptorCharacterizeResults'
import CorrelationCharacterizeResults from '@/components/CorrelationCharacterizeResults'
import SDFReconstructResults from '@/components/SDFReconstructResults'
import CorrelationReconstructResults from '@/components/CorrelationReconstructResults'
import DescriptorReconstructResults from '@/components/DescriptorReconstructResults'
import ViewData from '@/components/ViewData'
import Contact from '@/components/Contact'
import Dynamfit from '@/components/Dynamfit'
import DynamfitExample from '@/components/DynamfitExample'
import DynamfitExampleInput from '@/components/DynamfitExampleInput'
import DynamfitResult from '@/components/DynamfitResult'
import ChemProps from '@/components/ChemProps'
import XmlUploader from '@/components/XmlUploader'
import SmilesTest from '@/components/nanomine/SmilesTest'

// For Nanomine Gallery of Interactive Chart (Req 04/01/2020)
import GalleryApp from '../external-app/galleryapp/index.html'

// DISABLED FOR NOW import XmlUploader from '@/components/XmlUploader'

Vue.use(Router)

export default new Router({
  scrollBehavior () {
    return { x: 0, y: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'NanoMine',
      component: NanoMine
    },
    {
      path: '/admin',
      name: 'Admin',
      component: Admin
    },
    {
      path: '/db',
      name: 'Database',
      component: Database
    },
    {
      path: '/contact',
      name: 'Contact',
      component: Contact
    },
    // {
    //   path: '/insight',
    //   name: 'Insight',
    //   component: Insight
    // },
    {
      path: '/simtools',
      name: 'SimTools',
      component: SimTools
    },
    {
      path: '/mypage',
      name: 'MyPage',
      component: MyPage
    },
    {
      path: '/mtools',
      name: 'ModuleTools',
      component: ModuleTools
    },
    {
      path: '/XMLCONV',
      name: 'XMLCONV',
      component: XMLCONV
    },
    // {
    //   path: '/editor',
    //   name: 'NmEditor',
    //   component: NmEditor
    // },
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
      path: '/nanomine/tutorials',
      name: 'NanoTutorials',
      component: NanoTutorials
    },
    {
      path: '/Otsu',
      name: 'Otsu',
      component: Otsu
    },
    {
      path: '/OtsuResult',
      name: 'OtsuResult',
      component: OtsuResult
    },
    {
      path: '/characterization_homepage',
      name: 'CharacterizeHomepage',
      component: CharacterizeHomepage
    },
    {
      path: '/reconstruction_homepage',
      name: 'ReconstructionHomepage',
      component: ReconstructionHomepage
    },
    {
      path: '/IntelligentCharacterize',
      name: 'IntelligentCharacterize',
      component: IntelligentCharacterize
    },
    {
      path: '/Niblack',
      name: 'Niblack',
      component: Niblack
    },
    {
      path: '/CorrelationCharacterize',
      name: 'CorrelationCharacterize',
      component: CorrelationCharacterize
    },
    {
      path: '/SDFCharacterize',
      name: 'SDFCharacterize',
      component: SDFCharacterize
    },
    {
      path: '/DescriptorCharacterize',
      name: 'DescriptorCharacterize',
      component: DescriptorCharacterize
    },
    {
      path: '/CorrelationReconstruct',
      name: 'CorrelationReconstruct',
      component: CorrelationReconstruct
    },
    {
      path: '/SDFReconstruct',
      name: 'SDFReconstruct',
      component: SDFReconstruct
    },
    {
      path: '/DescriptorReconstruct',
      name: 'DescriptorReconstruct',
      component: DescriptorReconstruct
    },
    // {
    //   path: '/Visualization',
    //   name: 'Visualization',
    //   component: Visualization
    // },
    {
      path: '/SDFCharacterizeResults',
      name: 'SDFCharacterizeResults',
      component: SDFCharacterizeResults
    },
    {
      path: '/DescriptorCharacterizeResults',
      name: 'DescriptorCharacterizeResults',
      component: DescriptorCharacterizeResults
    },
    {
      path: '/IntelligentCharacterizeResults',
      name: 'IntelligentCharacterizeResults',
      component: IntelligentCharacterizeResults
    },
    {
      path: '/CorrelationCharacterizeResults',
      name: 'CorrelationCharacterizeResults',
      component: CorrelationCharacterizeResults
    },
    {
      path: '/SDFReconstructResults',
      name: 'SDFReconstructResults',
      component: SDFReconstructResults
    },
    {
      path: '/CorrelationReconstructResults',
      name: 'CorrelationReconstructResults',
      component: CorrelationReconstructResults
    },
    {
      path: '/DescriptorReconstructResults',
      name: 'DescriptorReconstructResults',
      component: DescriptorReconstructResults
    },
    {
      path: '/ViewData',
      name: 'ViewData',
      component: ViewData,
      props: (route) => ({
        title: route.query.title
      })
    },
    {
      path: '/Dynamfit',
      name: 'Dynamfit',
      component: Dynamfit
    },
    {
      path: '/DynamfitExample',
      name: 'DynamfitExample',
      component: DynamfitExample
    },
    {
      path: '/DynamfitExampleInput',
      name: 'DynamfitExampleInput',
      component: DynamfitExampleInput
    },
    {
      path: '/DynamfitResult',
      name: 'DynamfitResult',
      component: DynamfitResult
    },
    {
      path: '/SmilesTest',
      name: 'SmilesTest',
      component: SmilesTest
    },
    {
      path: '/ChemProps',
      name: 'ChemProps',
      component: ChemProps
    },
    {
      path: '/XmlUploader',
      name: 'XmlUploader',
      component: XmlUploader
    },

    // Newly Added Line for Visualization Gallery App (Req 04/01/2020)
    {
      path: '/gallery',
      name: 'gallery',
      component: { template: GalleryApp }
    }
  ]
})
