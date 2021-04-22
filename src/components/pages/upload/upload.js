export default {
  name: 'Upload',
  data: () => ({
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
  methods: {
    showBox () {
      console.log(this.filter)
    }
  },
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'cloud_upload', name: 'Uploads'})
  }
}