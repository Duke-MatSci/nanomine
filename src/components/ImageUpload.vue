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

        <EditImage v-model='imageEditorOpen' v-bind:img='imageEditorData.fileUrl' v-bind:imgName='imageEditorData.fileName' v-on:setCroppedImage="setCroppedImage"></EditImage>

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
                imageEditorOpen: false,
                imageEditorData: {fileUrl: null, fileName: null}
            }
        },
        methods: {
            openImageEditor: function (index) {
                this.imageEditorData = this.filesDisplay[index]
                this.imageEditorOpen = !this.imageEditorOpen // toggle the image editor modal being open and closed
            },

            // args: [cropped image, filename of cropped image, coordinates]
            setCroppedImage: async function (...args) {    
                for (let i = 0; i < this.filesDisplay.length; i++){
                    if (this.filesDisplay[i].fileName == args[1]){

                        this.filesDisplay[i].fileUrl = args[0];
                        this.filesDisplay[i].fileName = "cropped_" + this.filesDisplay[i].fileName; // to ensure that the list of images reloads since they are binded to filenames.
                        
                        if (this.files[0].fileName.split('.').pop() == 'zip'){
                            await this.cropAllImages(args[2], "cropped_" + args[1])
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
                const jszip_obj = new jszip();

                jszip_obj.loadAsync(input_file)
                .then(async function(zip) {
                    console.log('unzipped file')
                    let count = 0;
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
                    }
                    console.log('finished extracting images')
                });
            },

            async rezipFiles () {
                let jszip_obj = new jszip()
                let vm = this
                
                // compress images and them to zip file
                for(let i = 0; i < this.filesDisplay.length; i++){
                    // var compressed_file = await pako.deflateRaw(this.filesDisplay[i].fileUrl)
                    jszip_obj.file(this.filesDisplay[i].fileName, compressed_file)
                }
                
                // create zip file
                jszip_obj.generateAsync({type: 'blob'})
                .then(function (content) {
                    vm.files[0].fileUrl = URL.createObjectURL(content)
                    vm.$emit('setFiles', vm.files, vm.fileName)
                    console.log('rezipped files')
                })
            },

            async cropAllImages (coordinates, fileName) {
                for (let i = 0; i < this.filesDisplay.length; i++){
                    if (this.filesDisplay[i].fileName != fileName){
                    
                        var canvas = document.createElement('canvas')
                        canvas.width = coordinates.width;
                        canvas.height = coordinates.height;
    
                        var ctx = canvas.getContext('2d');
                        var image = new Image();
                        image.src = this.filesDisplay[i].fileUrl
                        console.log(i)
                        await ctx.drawImage(image, (-1) * coordinates.left, (-1) * coordinates.top);
                        console.log(i)
                        this.filesDisplay[i].fileUrl = canvas.toDataURL();

                    }
                }

                console.log('applied crop to all images')
            }
        }
    }
</script>

<style scoped>
</style>