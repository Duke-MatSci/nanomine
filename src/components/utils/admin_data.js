
const datas = {
    formInView: 'block',
    msg: 'My Page',
    showAdmin: false,
    myPageError: false,
    myPageErrorMsg: '',
    fileError: false,
    fileErrorMsg: '',
    // Schema mgt
    showSchemaMgt: false,
    schemaFileText: '',
    schemaFileName: '',
    schemaError: false,
    schemaErrorMsg: '',
    schemaSuccess: false,
    schemaSuccessMsg: '',
    // schemas
    firstSchemaTitle: 'first',
    selectedSchemaId: '',
    selectedSchemaTitle: '',
    schemas: [],
    // Users
    showBecomeUser: false,
    userall: true,
    userpagination: {
    sortBy: 'userid'
    },
    userindeterminate: true,
    userselected: [],
    userheaders: [
    {text: 'User ID', align: 'right', sortable: true, value: 'userid'},
    {text: 'Full Name', align: 'right', sortable: false, value: 'displayName'},
    {text: 'Email Address', align: 'right', sortable: false, value: 'email'}
    ],
    users: [
    {value: false, selected: false, userid: 'A101', displayName: 'John Doe', email: 'john.doe@example.com'},
    {value: false, selected: false, userid: 'A102', displayName: 'Jane Doe', email: 'jane.doe@example.com'},
    {value: false, selected: false, userid: 'A103', displayName: 'Manny Doe', email: 'manny.doe@example.com'}
    ],
    // Datasets
    showMineOnly: false,
    datasetSearch: '',
    datasetHeaders: [
    {text: 'ID', align: 'left', value: 'seq'},
    {text: 'DOI', align: 'left', value: 'doi'},
    {text: 'Title', align: 'left', value: 'title'},
    {text: 'Comment', align: 'left', value: 'datasetComment'}
    ],
    datasetList: [],
    datasetInfoDialogActive: false,
    datasetDialogInfo: {}, // re-structured information from dataset
    datasetHideSelector: false,
    datasetSelected: null,
    datasetTransformed: {},
    // Filesets
    filesetsSearch: '',
    headerFilesetName: '',
    filesetsHeaders: [
    {text: 'Fileset Name', align: 'left', value: 'datasetSelected.filesets'}
    ],
    filesetsList: [],
    filesetsHideSelector: false,
    filesetsPagination: {
    sortBy: 'filesets'
    },
    filesetSelected: null,
    // Samples
    filesSearch: '',
    filesHeaders: [
    {text: '', align: 'left', value: 'null'},
    {text: '', align: 'left', value: 'null'},
    {text: 'File Name', align: 'left', value: 'metadata.filename'},
    {text: 'Type', align: 'left', value: 'metadata.contentType'},
    {text: 'ID', align: 'left', value: 'id'}
    // {text: 'Published', align: 'left', value: 'ispublished'},
    // {text: 'Public', align: 'left', value: 'isPublic'},
    // {text: 'Edit State', align: 'left', value: 'entityState'},
    // {text: 'Curate State', align: 'left', value: 'curateState'}
    ],
    filesList: [],
    filesHideSelector: true,
    // sampleFileAll: true,
    filespagination: {
    sortBy: 'metadata.filename'
    },
    headerFileName: null,
    fileSelected: null,
    fileObj: '',
    fileImageDataUri: '',
    filesDialogActive: false,
    filesDownloadIndeterminate: false,
    filesDownloadSelected: [],
    sampleTree: {},
    sampleTreeModel: null
}

export default datas