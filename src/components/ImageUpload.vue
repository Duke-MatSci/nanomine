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
            <template v-for="(file, index) in filesDisplay">

                <v-list-tile
                :key="file.fileName"
                >
                    <v-list-tile-avatar>
                        <v-icon color="primary">check_circle_outline</v-icon>
                    </v-list-tile-avatar>
                    <v-list-tile-content>
                        <v-list-tile-title v-text="file.fileName"></v-list-tile-title>
                    </v-list-tile-content>

                    <span v-if='fileName.split(".").pop() !== "mat"' :key='file.fileName'>
                        <v-btn :key='index' v-on:click="openImageEditor(index)" color="primary">Edit image</v-btn>
                        <EditImage v-model='imageEditorOpen[index]' v-bind:img='file.fileUrl' v-bind:imgName='file.fileName' v-on:setCroppedImage="setCroppedImage"></EditImage>
                    </span>

                </v-list-tile>

            </template>
        </v-list>

    </v-flex>
</template>

<script>
    import {} from 'vuex'
    import EditImage from './EditImage.vue';
    import jszip from 'jszip';
    import pako from 'pako';

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
                imageEditorOpen: [false]
            }
        },
        methods: {
            openImageEditor: function (index) {
                this.imageEditorOpen[index] = true // toggle the image editor modal being open and closed
            },

            setCroppedImage: async function (...args) {    
                for (let i = 0; i < this.filesDisplay.length; i++){
                    if (this.filesDisplay[i].fileName == args[1]){

                        this.filesDisplay[i].fileUrl = args[0];
                        this.filesDisplay[i].fileName = "cropped_" + this.filesDisplay[i].fileName; // to ensure that the list of images reloads since they are binded to filenames.
                        
                        if (this.files[0].fileName.split('.').pop() == 'zip'){
                            await this.cropAllImages(args[2], args[1])
                            this.rezipFiles()
                        } else {
                            this.files[0].fileUrl = args[0];
                            this.$emit('setFiles', this.files, this.fileName)
                        }

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
                            this.fileUploaded = true

                            if (file.fileName.split('.').pop() != 'zip'){
                                this.filesDisplay.push(file)
                            }
                        })

                    } else {
                        console.log('File Undefined')
                    }
                }

                if (files[0].name.split('.').pop() == 'zip') {
                    this.unzipFiles(files[0])
                }

                this.$emit('setFiles', this.files, this.fileName)
            },

            unzipFiles (input_file) {
                const vm = this;
                vm.filesDisplay = [];
                vm.imageEditorOpen = [];
                const jszip_obj = new jszip();

                jszip_obj.loadAsync(input_file)
                .then(async function(zip) {
                    for (var key in zip.files){

                        // get file data
                        var filename = zip.files[key].name;
                        var filetype = filename.split('.').pop();

                        // uncompress
                        var raw_data = await pako.inflateRaw(zip.files[key]._data.compressedContent);

                        // convert from uint8array to base64
                        var binary = '';
                        for (var i = 0; i < raw_data.byteLength; i++){
                            binary += await String.fromCharCode(raw_data[i]);
                        }
                        var base64 = 'data:image/' + filetype + ';base64,' + window.btoa(binary);

                        // set to reactive variables
                        vm.filesDisplay.push({fileName: filename, fileUrl: base64});      
                        vm.imageEditorOpen.push(false);
                    }
                });
            },

            rezipFiles () {
                let jszip_obj = new jszip()
                let vm = this
                
                // add images to zip file
                for(let i = 0; i < this.filesDisplay.length; i++){
                    jszip_obj.file(this.filesDisplay[i].fileName, this.filesDisplay[i].fileUrl)
                }
                
                // create zip file
                jszip_obj.generateAsync({type: 'base64'})
                .then(function (base64) {
                    vm.files[0].fileUrl = "data:application/zip;base64," + base64;
                    this.$emit('setFiles', this.files, this.fileName)
                })
            },

            cropAllImages (coordinates, fileName) {
                
                var canvas = document.createElement('canvas')

                for (let i = 0; i < this.filesDisplay.length; i++){
                    if (this.filesDisplay[i].fileName != fileName){

                        canvas.width = coordinates.width;
                        canvas.height = coordinates.height;
    
                        var ctx = canvas.getContext('2d');
                        var image = new Image();
                        image.src = this.filesDisplay[i].fileUrl
                        ctx.drawImage(image, -coordinates.left, -coordinates.top);

                        this.filesDisplay[i].fileUrl = canvas.toDataURL();

                    }
                }
            }
        }
    }
</script>

<style scoped>
</style>