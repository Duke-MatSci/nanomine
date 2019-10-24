import Vue from 'vue'
import Router from 'vue-router'
import BinarizeHomepage from '@/components/BinarizeHomepage'
import Database from '@/components/Database'
import Contact from '@/components/Contact'
import Dynamfit from '@/components/Dynamfit'
import DynamfitExample from '@/components/DynamfitExample'
import DynamfitExampleInput from '@/components/DynamfitExampleInput'
import DynamfitResult from '@/components/DynamfitResult'
import ModuleTools from '@/components/ModuleTools'
import MyPage from '@/components/MyPage'
import MaterialsMine from '@/components/MaterialsMine'
import MetaMine from '@/components/metamine/MetaMine'
import MetaMineTools from '@/components/metamine/MetaMineTools'
import NanoMine from '@/components/NanoMine'
import PixelUnit from '@/components/metamine/PixelUnit'
import SimTools from '@/components/SimTools'
import XMLCONV from '@/components/XMLCONV'
import McrHomepage from '@/components/McrHomepage'
import Otsu from '@/components/Otsu'
import NanoTutorials from '@/components/nanomine/NanoTutorials'
import NuExampleUnitCell from '@/components/metamine/NuExampleUnitCell'
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
import ThreeDModelViewer from '@/components/metamine/ThreeDModelViewer'
// import NmEditor from '@/components/Editor'
// import Visualization from '@/components/Visualization'
import ChemProps from '@/components/ChemProps'
// DISABLED FOR NOW import XmlUploader from '@/components/XmlUploader'

Vue.use(Router)

export default new Router({
  scrollBehavior () {
    return { x: 0, y: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'MaterialsMine',
      component: MaterialsMine
    },
    {
      path: '/nano',
      name: 'NanoMine',
      component: NanoMine
    },
    {
      path: '/meta',
      name: 'MetaMine',
      component: MetaMine
    },
    {
      path: '/meta/tools',
      name: 'MetaMineTools',
      component: MetaMineTools
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
      path: '/metamine/pixelunit50',
      name: 'NuExampleUnitCell',
      component: NuExampleUnitCell
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
      path: '/meta/pixelunit',
      name: 'PixelUnit',
      component: PixelUnit
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
      path: '/OtsuResult',
      name: 'OtsuResult',
      component: OtsuResult
    },
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
      path: '/meta/threedmodelviewer',
      name: 'ThreeDModelViewer',
      component: ThreeDModelViewer
    },
    {
      path: '/ChemProps',
      name: 'ChemProps',
      component: ChemProps
    } // ,
    // DISABLED FOR NOW {
    //   path: '/XmlUploader',
    //   name: 'XmlUploader',
    //   component: XmlUploader
    // }
  ]
})
