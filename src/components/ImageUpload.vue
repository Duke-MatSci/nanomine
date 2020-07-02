<!--
################################################################################
#
# File Name: ImageUpload.vue
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
            <input type="file" style="display: none" accept=".jpg, .png, .tif, .mat, .zip" ref="myUpload" @change="onFilePicked">
        </p>

        <!-- Image Cropper Modal -->
        <EditImage 
            v-model='imageEditorOpen' 
            v-bind:img='imageEditorData.fileUrl' 
            v-bind:imgName='imageEditorData.fileName' 
            v-bind:aspectRatio='aspectRatio' 
            v-on:setCroppedImage="setCroppedImage"
        ></EditImage>
        
        <div v-if="fileUploaded && selects.length > 0" class='selectDropdowns'>

            <h4>Parameters</h4>

            <div class='selectDropdownsWrapper'>
                <div class='singleSelectDropdown' v-for="(select, index) in selects" :key='index'>
                    <v-select
                        filled 
                        :label="select.title" 
                        :items="select.options" 
                        v-model="selectedOptions[select.submitJobTitle]" 
                        v-on:change="$emit('setSelectors', selectedOptions)" 
                    ></v-select>
                </div>
            </div>

        </div>

        <v-list v-model="fileName" subheader: true v-if="fileUploaded">
            <template v-for="(file, index) in filesDisplay">
                <v-list-tile :key="file.fileName">

                    <v-list-tile-avatar>
                        <v-icon color="primary">check_circle_outline</v-icon>
                    </v-list-tile-avatar>

                    <v-list-tile-content>
                        <v-list-tile-title v-text="file.fileName"></v-list-tile-title>
                    </v-list-tile-content>

                    <span v-if='fileType !== "mat"' :key='file.fileName'>
                        <v-btn :key='index' v-on:click="openImageEditor(index)" color="primary">Edit image</v-btn>
                    </span>

                </v-list-tile>
            </template>
        </v-list>

    </v-flex>
</template>

<script>
    import {} from 'vuex'
    import EditImage from './EditImage.vue'; // image cropping modal
    import jszip from 'jszip'; // for unzipping and rezipping files
    import pako from 'pako'; // for uncompressing files

    export default {
        name: 'ImageUpload',

        components: {
            EditImage
        },

        props: {
            aspectRatio: String,
            selects: Object
        },

        data() {
            return {
                files: [],
                filesDisplay: [],
                fileType: '',
                fileName: '',
                fileUploaded: false,
                imageEditorOpen: false,
                imageEditorData: {fileUrl: null, fileName: null},
                selectedOptions: {}
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
                    if (this.filesDisplay[i].fileName === args[1]){

                        this.filesDisplay[i].fileUrl = args[0];
                        this.filesDisplay[i].fileName = "cropped_" + this.filesDisplay[i].fileName; // to ensure that the list of images reloads since they are binded to filenames.
                        
                        if (this.fileType == 'zip'){
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
            
            async cropAllImages (coordinates, fileName) {

                for (let i = 0; i < this.filesDisplay.length; i++){
                    if (this.filesDisplay[i].fileName !== fileName){

                        var canvas = document.createElement('canvas')
                        canvas.width = coordinates.width;
                        canvas.height = coordinates.height;

                        var ctx = canvas.getContext('2d');
                        var image = new Image();
                        let vm = this;
            
                        image.src = this.filesDisplay[i].fileUrl;

                        function awaitImageCrop(image) {
                            return new Promise((resolve, reject) => {
                                image.onload = function () {
                                    ctx.drawImage(image, (-1) * coordinates.left, (-1) * coordinates.top);
                                    vm.filesDisplay[i].fileUrl = canvas.toDataURL();
                                    vm.filesDisplay[i].fileName = 'cropped_' + vm.filesDisplay[i].fileName;
                                    resolve()
                                }
                            })
                        }
                        await awaitImageCrop(image); // done to ensure that all images are cropped before files are rezipped
                    }
                }

                console.log('applied crop to all images')
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

                this.resetFiles();
                const input_file = e.target.files[0];
                let file = {};

                // set filename
                if (input_file !== undefined) {
                    file.fileName = input_file.name;
                    this.fileName = input_file.name;
                }

                // check for acceptable filetype
                const accepted_types = ['jpg', 'jpeg', 'tif', 'png', 'mat', 'zip'];
                const fileType = input_file.name.split('.').pop();
                this.fileType = fileType;
                if (accepted_types.includes(fileType) === false) {
                    return;
                }

                // extract data from uploaded file
                const fr = new FileReader();
                fr.readAsDataURL(input_file)
                fr.addEventListener('load', () => {
                    file.fileUrl = fr.result
                    this.files.push(file)
                    this.filesUploaded = true

                    if (fileType !== 'zip'){
                        this.filesDisplay.push(file)
                    }
                })

                if (fileType === 'zip') {
                    this.unzipFiles(input_file)
                }

                this.fileUploaded = true;
                this.$emit('setFiles', [file], file.fileName)

            },

            unzipFiles (input_file) {

                const vm = this;
                vm.filesDisplay = [];
                const jszip_obj = new jszip();

                jszip_obj.loadAsync(input_file)
                .then(async function(zip) {

                    for (var key in zip.files){

                        // get file data
                        var filename = zip.files[key].name;
                        var filetype = filename.split('.').pop();

                        // uncompress
                        var raw_data = undefined;
                        if (zip.files[key]._data.compressedSize == zip.files[key]._data.uncompressedSize) {
                            raw_data = zip.files[key]._data.compressedContent
                        } else {
                            raw_data = await pako.inflateRaw(zip.files[key]._data.compressedContent);
                        }

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
                let jszip_obj = new jszip();
                let vm = this;
                
                // add images to zip file
                for(let i = 0; i < this.filesDisplay.length; i++){
                    jszip_obj.file(this.filesDisplay[i].fileName, this.filesDisplay[i].fileUrl.split(',').pop(), {base64: true});
                }
                
                // create zip file
                jszip_obj.generateAsync({type: 'base64', compression: 'DEFLATE'})
                .then(function (base64) {
                    vm.files[0].fileUrl = "data:application/zip;base64," + base64;
                    vm.$emit('setFiles', vm.files, vm.fileName);
                    console.log('rezipped files');
                })
            }
        }
    }
</script>

<style scoped>

    .selectDropdowns h4 {
        text-align: left;
        margin-bottom: 5px;
    }

    .selectDropdownsWrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: flex-start;
    }

    .singleSelectDropdown {
        width: 48%;
        margin-right: 2%;
    }

</style>