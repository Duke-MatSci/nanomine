<template>
<div>

    <h1>{{ job.pageTitle }}</h1>

    <v-container class="text-xs-left">

        <v-layout row wrap>

            <v-flex xs12>
                <h3>Description</h3>
                <p>{{ job.description }}</p>
            </v-flex>

            <v-flex xs12>
                <h3>Input Options</h3>
                <div v-for='(uploadOption, index) in job.uploadOptions' v-bind:key='uploadOption.title'>
                    <p><strong>{{ index + 1 }}. {{ uploadOption.title }}:</strong> {{ uploadOption.description }}</p>
                </div>
            </v-flex>
            
        </v-layout>

        <v-alert v-model="loginRequired" type="error" outline>{{ loginRequiredMsg }}</v-alert>

        <v-alert v-model="errorAlert" type="error" dismissible>{{ errorAlertMsg }}</v-alert>
      
        <v-dialog v-model="successDlg" persistent max-width="500px">
            <v-card>

                <v-card-title>
                    <span>{{ job.jobTitle }} Binarization Job Submitted Successfully</span>
                    <v-spacer></v-spacer>
                </v-card-title>

                <v-card-text>
                    Your {{ job.jobTitle }} job is: {{jobId}} <br/> You should receive an email with a link to the job output.
                </v-card-text>

                <v-card-actions>
                    <v-btn color="primary" flat @click="successDlgClicked()">Close</v-btn>
                </v-card-actions>

            </v-card>
        </v-dialog>

        <h3>Image Upload</h3>
        <ImageUpload v-on:setFiles="setFiles" :aspectRatio="job.aspectRatio"></ImageUpload>

        <v-flex class="text-xs-center">
            <v-btn id="binarize-button" v-on:click="submit()" color="primary">{{ job.submitButtonTitle }}</v-btn>
        </v-flex>

        <v-flex xs12>
            <h3>References</h3>
            <div v-for='(reference, index) in job.references' v-bind:key='index'>
                <p>{{ reference }}</p>
            </div>
        </v-flex>

    </v-container>

</div>
</template>

<script>
    
    import ImageUpload from './ImageUpload.vue'
    import {Auth} from '@/modules/Auth.js'
    import {JobMgr} from '@/modules/JobMgr.js'
    import {} from 'vuex'

    export default {

        name: 'McrJobsTemplate',

        components: {
            ImageUpload
        },

        props: {
            job: Object
        },

        data() {
            return {
                loginRequired: false,
                loginRequiredMsg: '',
                errorAlert: false,
                errorAlertMsg: '',
                successDlg: false,
                jobId: '',
                files: [],
                fileName: '',
            }
        },

        beforeMount: function () {
            let vm = this
            vm.auth = new Auth()
            if (!vm.auth.isLoggedIn()) {
                vm.loginRequired = true
                vm.loginRequiredMsg = 'Login is required.'
            }
        },

        methods: {

            setFiles: function (...files) {
                this.files = files[0]; // the actual file object
                this.fileName = files[1]; // the name of the file
            },

            setLoading: function () {
                this.$store.commit('isLoading')
            },

            resetLoading: function () {
                this.$store.commit('notLoading')
            },

            successDlgClicked: function () {
                let vm = this
                console.log('Success dlg button clicked')
                vm.$router.go(-2) // go back to mcr homepage page
            },

            submit: function () {
                let vm = this
                vm.files.forEach(function (v) {
                    console.log(JSON.stringify(v))
                })

                vm.setLoading()
                console.log('Loading..')
                let jm = new JobMgr()
                console.log('Called Job Manager')
                jm.setJobType('otsu')
                jm.setJobParameters({'InputType': vm.fileName.split('.').pop()}) // Figure out which input type
                if (vm.files && vm.files.length >= 1) {
                    vm.files.forEach(function (v) {
                    jm.addInputFile(v.fileName, v.fileUrl)
                    console.log('Job Manager added file: ' + v.fileName)
                    })
                    return jm.submitJob(function (jobId) {
                    console.log('Success! JobId is: ' + jobId)
                    vm.jobId = jobId
                    vm.resetLoading()
                    vm.successDlg = true
                    }, function (errCode, errMsg) {
                    let msg = 'error: ' + errCode + ' msg: ' + errMsg
                    console.log(msg)
                    vm.errorAlertMsg = msg
                    vm.errorAlert = true
                    vm.resetLoading()
                    })
                } else {
                    let msg = 'Please select a file to process.'
                    vm.errorAlertMsg = msg
                    vm.errorAlert = true
                    vm.resetLoading()
                }
            }

        }

    }
</script>

<style scoped>

    h1 {
        margin-top: 10px;
        background-color: black;
        color: white;
    }

    h3 {
        margin-bottom: 10px;
        margin-top: 15px;
    }

    p {
        margin-left: 15px;
    }

</style>