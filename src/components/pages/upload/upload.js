import Data from '../../data'
import * as Util from '../../utils'
export default {
  name: 'Upload',
  data: () => ({
    info: {icon: 'cloud_upload', name: 'Uploads'},
    title: 'File Upload',
    dialog: false,
    templateName: '',
    templateUrl: '',
    template: null,
    files: [],
    filesDisplay: [],
    uploadError: false,
    uploadErrorMsg: '',
    loginRequired: false,
    loginRequiredMsg: '',
    templateUploaded: false,
    successDlg: false,
    jobId: '',
    datasetOptions: {mineOnly: 'always'},
    datasetSelected: null
  }),
  components: {
    aFooter: Util.Footer,
    aHeader: Util.Header
  },
  methods: {
    showBox () {
      console.log(this.filter)
    }
  },
  created() {
    console.log("hello world", this.filter)
  }
}