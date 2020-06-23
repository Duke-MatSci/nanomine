<!--
################################################################################
#
# File Name: EditImage.vue
# Application: templates
# Description: A reusable component that allows users to upload files. Used for Microstructure Characterization & Reconstruction jobs.
#
# Created by: Atul Jalan 6/23/20
# Customized for NanoMine
#
################################################################################
-->

<template>
    <v-flex xs12 class="text-xs-center text-sm-center text-md-center text-lg-center">

        <p class="text-xs-left">Select File
            <v-btn class="text-xs-left" small color="primary" @click='pickFile'>Browse</v-btn>
            <input
            type="file"
            style="display: none"
            accept=".jpg, .png, .tif, .mat, .zip"
            ref="myUpload"
            @change="onFilePicked"
            >
        </p>

        <v-list v-model="fileName" subheader: true v-if="fileUploaded">
            <v-list-tile
            v-for="file in filesDisplay"
            :key="file.fileName"
            >
            <v-list-tile-avatar>
                <v-icon color="primary">check_circle_outline</v-icon>
            </v-list-tile-avatar>
            <v-list-tile-content>
                <v-list-tile-title v-text="file.fileName"></v-list-tile-title>
            </v-list-tile-content>
            <v-btn v-on:click="openImageEditor()" color="primary">Edit image</v-btn>
            <EditImage v-model='imageEditorOpen' v-bind:img='file' v-on:setCroppedImage="setCroppedImage"></EditImage>
            </v-list-tile>
        </v-list>

    </v-flex>
</template>

<script>
    import {} from 'vuex'
    import EditImage from './EditImage.vue';

    export default {
        name: 'ImageUpload',
        components: {
            EditImage
        },
        data() {
            return {
                files: [],
                filesDisplay: [],
                fileName: '',
                fileUploaded: false,
                imageEditorOpen: false
            }
        },
        methods: {
            openImageEditor: function () {
                this.imageEditorOpen = !this.imageEditorOpen // toggle the image editor modal being open and closed
            },

            setCroppedImage: function (...args) {    
                for (let i = 0; i < this.files.length; i++){
                    if (this.files[i].fileName == args[1].fileName){

                    this.files[i].fileUrl = args[0];
                    this.filesDisplay[i].fileUrl = args[0];
                    this.filesDisplay[i].fileName = "cropped_" + this.filesDisplay[i].fileName; // to ensure that the list of images reloads since they are binded to filenames.
                    
                    this.$emit('setFiles', this.files, this.fileName)
                    console.log('image succesfully cropped.')
                    
                    return;
                    }
                }
            },

            pickFile () {
                this.$refs.myUpload.click()
            },

            resetFiles: function () {
                this.files = []
                this.filesDisplay = []
                this.fileUploaded = false
                this.$emit('setFiles', this.files, this.fileName)
            },

            onFilePicked (e) {
                this.resetFiles()
                const files = e.target.files
                for (let i = 0; i < files.length; i++) {
                    let file = {}
                    let f = files[i]
                    if (f !== undefined) {
                        file.fileName = f.name
                        this.fileName = f.name
                        if (file.fileName.lastIndexOf('.') <= 0) {
                            return
                        }
                        console.log(file.fileName)
                        const fr = new FileReader()
                        fr.readAsDataURL(f)
                        fr.addEventListener('load', () => {
                            file.fileUrl = fr.result
                            this.files.push(file)
                            this.filesDisplay.push(file)
                            this.fileUploaded = true
                        })
                    } else {
                        console.log('File Undefined')
                    }
                }
                this.$emit('setFiles', this.files, this.fileName)
            }
        }
    }
</script>

<style scoped>
</style>