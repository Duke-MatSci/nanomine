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
import ModelViewer from '@/components/metamine/ModelViewer'
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
// import ThreeDModelViewer from '@/components/metamine/ThreeDModelViewer'
// import NmEditor from '@/components/Editor'
// import Visualization from '@/components/Visualization'
import ChemProps from '@/components/ChemProps'
import XmlUploader from '@/components/XmlUploader'
import SmilesTest from '@/components/nanomine/SmilesTest'
import ChemPropsAPIToken from '@/components/ChemPropsAPIToken'

// For Nanomine Gallery of Interactive Chart (Req 04/01/2020)
import GalleryApp from '@/components/GalleryApp'

// Nanomine Version 2
import LandingPage from '@/components/main/main.vue'
import TeamsPage from '@/components/pages/teams/teams.vue'
import HowTo from '@/components/pages/howto/howto.vue'
import News from '@/components/pages/news/news.vue'
import Tools from '@/components/pages/tools/tools.vue'
import SimmTools from '@/components/pages/simm/simm.vue'
import Upload from '@/components/pages/upload/upload.vue'
import Textview from '@/components/pages/textview/textview.vue'
import Contactus from '@/components/pages/contact/contact.vue'

// DISABLED FOR NOW import XmlUploader from '@/components/XmlUploader'

Vue.use(Router)

export default new Router({
  scrollBehavior () {
    return { x: 0, y: 0 }
  },
  routes: [
    {
      path: '/mm',
      name: 'NanoMine',
      component: NanoMine
    },
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage
    },
    {
      path: '/teams',
      name: 'TeamsPage',
      component: TeamsPage
    },
    {
      path: '/how',
      name: 'HowTo',
      component: HowTo
    },
    {
      path: '/news',
      name: 'News',
      component: News
    },
    {
      path: '/research',
      name: 'News',
      component: News
    },
    {
      path: '/tools',
      name: 'Tools',
      component: Tools
    },
    {
      path: '/simmtools',
      name: 'SimmTools',
      component: SimmTools
    },
    {
      path: '/upload',
      name: 'Upload',
      component: Upload
    },
    {
      path: '/single',
      name: 'Textview',
      component: Textview
    },
    {
      path: '/contact',
      name: 'Contactus',
      component: Contactus
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
    // {
    //   path: '/meta/modelviewer',
    //   name: 'ModelViewer',
    //   component: ModelViewer
    // },
    // {
    //   path: '/mm/db',
    //   name: 'Database',
    //   component: Database
    // },
    {
      path: '/mm/contact',
      name: 'Contact',
      component: Contact
    },
    // {
    //   path: '/simtools',
    //   name: 'SimTools',
    //   component: SimTools
    // },
    {
      path: '/mypage',
      name: 'MyPage',
      component: MyPage
    },
    {
      path: '/mm/mtools',
      name: 'ModuleTools',
      component: ModuleTools
    },
    {
      path: '/XMLCONV',
      name: 'XMLCONV',
      component: XMLCONV
    },
    {
      path: '/mm/XMLCONV',
      name: 'XMLCONV',
      component: XMLCONV
    },
    // Newly Added Line for Visualization Gallery App (Req 04/01/2020)
    {
      path: '/Gallery',
      name: 'Gallery',
      component: GalleryApp
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
      path: '/mm/mcr_homepage',
      name: 'McrHomepage',
      component: McrHomepage
    },
    {
      path: '/binarization_homepage',
      name: 'BinarizeHomepage',
      component: BinarizeHomepage
    },
    {
      path: '/mm/binarization_homepage',
      name: 'BinarizeHomepage',
      component: BinarizeHomepage
    },
    {
      path: '/mm/tutorials',
      name: 'NanoTutorials',
      component: NanoTutorials
    },
    {
      path: '/mm/pixelunit50',
      name: 'NuExampleUnitCell',
      component: NuExampleUnitCell
    },
    {
      path: '/Otsu',
      name: 'Otsu',
      component: Otsu
    },
    {
      path: 'mm/Otsu',
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
      path: '/mm/characterization_homepage',
      name: 'CharacterizeHomepage',
      component: CharacterizeHomepage
    },
    {
      path: '/reconstruction_homepage',
      name: 'ReconstructionHomepage',
      component: ReconstructionHomepage
    },
    {
      path: '/mm/reconstruction_homepage',
      name: 'ReconstructionHomepage',
      component: ReconstructionHomepage
    },
    {
      path: '/IntelligentCharacterize',
      name: 'IntelligentCharacterize',
      component: IntelligentCharacterize
    },
    {
      path: '/mm/IntelligentCharacterize',
      name: 'IntelligentCharacterize',
      component: IntelligentCharacterize
    },
    {
      path: '/Niblack',
      name: 'Niblack',
      component: Niblack
    },
    {
      path: '/pixelunit',
      name: 'PixelUnit',
      component: PixelUnit
    },
    {
      path: '/mm/pixelunit',
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
      path: '/mm/Dynamfit',
      name: 'Dynamfit',
      component: Dynamfit
    },
    {
      path: '/DynamfitExample',
      name: 'DynamfitExample',
      component: DynamfitExample
    },
    {
      path: '/mm/DynamfitExample',
      name: 'DynamfitExample',
      component: DynamfitExample
    },
    {
      path: '/DynamfitExampleInput',
      name: 'DynamfitExampleInput',
      component: DynamfitExampleInput
    },
    {
      path: '/mm/DynamfitExampleInput',
      name: 'DynamfitExampleInput',
      component: DynamfitExampleInput
    },
    {
      path: '/DynamfitResult',
      name: 'DynamfitResult',
      component: DynamfitResult
    },
    {
      path: '/mm/DynamfitResult',
      name: 'DynamfitResult',
      component: DynamfitResult
    },
    // Use ModelViewer instead {
    //   path: '/meta/threedmodelviewer',
    //   name: 'ThreeDModelViewer',
    //   component: ThreeDModelViewer
    // },
    {
      path: '/SmilesTest',
      name: 'SmilesTest',
      component: SmilesTest
    },
    {
      path: '/mm/ChemProps',
      name: 'ChemProps',
      component: ChemProps
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
    {
      path: '/ChemPropsAPIToken',
      name: 'ChemPropsAPIToken',
      component: ChemPropsAPIToken
    },
    {
      path: '/mm/ChemPropsAPIToken',
      name: 'ChemPropsAPIToken',
      component: ChemPropsAPIToken
    }
  ]
})
