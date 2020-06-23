<template>
    <v-dialog persistent max-width="500px">
        <v-card>
            <v-card-title>
                <span>{{ jobTitle }} Job Submitted Successfully</span>
                <v-spacer></v-spacer>
            </v-card-title>
            <v-card-text>Your {{ jobTitle }} job is: {{ jobId }} <br/> You should receive an email with a link to the job output.</v-card-text>
            <v-card-actions>
                <v-btn color="primary" flat @click="successDlgClicked">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
    export default {
        name: 'SuccessDialogue',
        props: {
            jobTitle: String,
            jobId: String
        },
        data() {
            return {
                jobTitle: this.jobTitle,
                jobId: this.jobId
            }
        },
        methods: {
            successDlgClicked: function () {
                this.$emit('close')
            }
        }
    }
</script>

<style scoped>
</style>