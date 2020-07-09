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

        <p class="text-xs-left fileButtonWrapper">
            <v-btn class="text-xs-left fileButton" color="primary" @click='pickFile'>Browse files</v-btn>
            <input type="file" style="display: none" accept=".jpg, .png, .tif, .mat, .zip" ref="myUpload" @change="onFilePicked">
        </p>

        <div v-if="fileUploaded && collectDimensions">

            <h4>Image Dimensions</h4>

            <div class='imageDimensionsWrapper'>
                
                <div class='imgDimWidth'>
                    <v-text-field outline label='width' v-model='originalSize.width' @change="imageDimensionPicked"></v-text-field>
                </div>

                <h3>x</h3>

                <div class='imgDimHeight'>
                    <v-text-field outline label='height' v-model='originalSize.height' @change="imageDimensionPicked"></v-text-field>
                </div>

                <div class='imgDimUnits'>
                    <v-select
                        label="units"
                        :items="['nanometers (nm)', 'micrometers (µM)', 'millimeters (mm)']"
                        v-model="originalSize.units"
                        @change="imageDimensionPicked"
                    ></v-select>
                </div>

            </div> 

        </div>
        
        <div v-if="fileUploaded && selects.length > 0">

            <h4>Parameters</h4>

            <div class='selectDropdownsWrapper'>
                <div class='singleSelectDropdown' v-for="(select, index) in selects" :key='index'>
                    <v-select
                        outline 
                        :label="select.title" 
                        :items="select.options" 
                        v-model="selectedOptions[select.submitJobTitle]" 
                        v-on:change="$emit('setSelectors', selectedOptions)" 
                    ></v-select>
                </div>
            </div>

        </div>

        <!-- Image Cropper Modal -->
        <EditImage 
            v-model='imageEditorOpen' 
            v-bind:file='imageEditorData' 
            v-bind:aspectRatio='aspectRatio' 
            v-bind:type='editImageType'
            v-on:setCroppedImage="setCroppedImage"
            v-on:setPhase="setPhase"
        ></EditImage>

        <div v-if="fileUploaded" class='imageTable'>

            <div class='imageTableHeader'>
                <h4>Name</h4>
                <h4>Size</h4>
                <h4>Selected phase</h4>
                <h4>Options</h4>
            </div>

            <div class='imageTableContents' v-for="(file, index) in filesDisplay" :key='file.fileName'>
                
                <p>{{ file.fileName }}</p>

                <p :key='file.pixelSize.width'><span v-if="dimensionsEntered" :key='file.size.height'>{{ file.size.width }} x {{ file.size.height }} {{ file.size.units }} / </span>{{ file.pixelSize.width }} x {{ file.pixelSize.height }} pixels</p>

                <p v-if="file.phase.x_offset !== 0 || file.phase.y_offset !== 0">Manually set (x-offset: {{ file.phase.x_offset }}px, y-offset: {{ file.phase.y_offset }}px)</p>
                <p v-else>Preset (bright phase)</p>

                <div class='imageTableButtons'>
                    <v-btn small class='imageTableButton' :key='index' v-on:click="openImageEditor(index, 'crop')" color="primary">Crop image</v-btn>
                    <v-btn small class='imageTableButton' :key='index' v-on:click="openImageEditor(index, 'phase')" color="primary">Set phase</v-btn>
                </div>

            </div>

        </div>

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
            selects: Object,
            collectDimensions: Boolean
        },

        data() {
            return {
                files: [],
                filesDisplay: [],
                fileType: '',
                fileName: '',
                fileUploaded: false,
                imageEditorOpen: false,
                imageEditorData: {fileUrl: null, fileName: null, phase: {x_offset: null, y_offset: null}},
                selectedOptions: {},
                originalSize: {units: null, width: 0, height: 0},
                originalPixelSize: {width: 0, height: 0},
                dimensionsEntered: false,
                editImageType: 'crop'
            }
        },

        methods: {

            openImageEditor: function (index, type) {
                this.editImageType = type;
                this.imageEditorData = this.filesDisplay[index];
                this.imageEditorOpen = !this.imageEditorOpen; // toggle the image editor modal being open and closed
            },

            imageDimensionPicked: function () {

                if (this.originalSize.units !== null && parseInt(this.originalSize.width) > 0 && parseInt(this.originalSize.height) > 0) {
    
                    this.dimensionsEntered = true;
                    if (this.filesDisplay.length > 0) {
                        this.updateImageDimensions(this.filesDisplay[0].pixelSize.width, this.filesDisplay[0].pixelSize.height);
                    }

                    this.selectionOptions['dimensions'] = this.originalSize;
                    this.$emit('setSelectors', this.selectedOptions);

                }

            },
            
            // args: [fileName, phase]
            setPhase: function (...args) {
                for (let i = 0; i < this.filesDisplay.length; i++) {
                    if (this.filesDisplay[i].fileName === args[0]) {

                        this.filesDisplay[i].phase = args[1];
                        this.filesDisplay[i].fileName = this.filesDisplay[i].fileName + " "; // force rerender
                        
                        this.selectedOptions['phase'][this.filesDisplay[i].originalFileName] = args[1];
                        this.$emit('setSelectors', this.selectedOptions);

                        break;

                    }
                }
            },

            // args: [cropped image, filename of cropped image, coordinates]
            setCroppedImage: async function (...args) {   
                
                for (let i = 0; i < this.filesDisplay.length; i++) {
                    if (this.filesDisplay[i].phase.x_offset !== 0 || this.filesDisplay[i].phase.y_offset !== 0) {
                        this.filesDisplay[i].phase.x_offset -= args[2].left;
                        this.filesDisplay[i].phase.y_offset -= args[2].top
                    }
                }

                for (let i = 0; i < this.filesDisplay.length; i++){
                    if (this.filesDisplay[i].fileName === args[1]){

                        this.filesDisplay[i].fileUrl = args[0];
                        this.filesDisplay[i].fileName = "cropped_" + this.filesDisplay[i].fileName; // to ensure that the list of images reloads since they are binded to filenames.
                        
                        await this.updateImageDimensions(args[2].width, args[2].height)

                        if (this.fileType == 'zip'){
                            await this.cropAllImages(args[2], "cropped_" + args[1] + " ")
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

                let vm = this;

                for (let i = 0; i < vm.filesDisplay.length; i++){
                    if (vm.filesDisplay[i].fileName !== fileName){

                        var canvas = document.createElement('canvas')
                        canvas.width = coordinates.width;
                        canvas.height = coordinates.height;

                        var ctx = canvas.getContext('2d');
                        var image = new Image();
            
                        image.src = vm.filesDisplay[i].fileUrl;

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

            updateImageDimensions (width, height, top, left) {
                
                for (let i = 0; i < this.filesDisplay.length; i++){
                    this.filesDisplay[i].pixelSize.width = width;
                    this.filesDisplay[i].pixelSize.height = height;

                    if (this.dimensionsEntered == true) {
                        this.filesDisplay[i].size.units = this.originalSize.units;
                        this.filesDisplay[i].size.width = parseInt((parseInt(this.originalSize.width) / this.originalPixelSize.width) * width);
                        this.filesDisplay[i].size.height = parseInt((parseInt(this.originalSize.height) / this.originalPixelSize.height) * height);
                    }

                    this.filesDisplay[i].fileName = this.filesDisplay[i].fileName + " "; // force rerender
                }

                this.files[0].pixelSize = this.filesDisplay[0].pixelSize;
                this.files[0].size = this.filesDisplay[0].size;

            },

            getImageDimensions () {
                
                let vm = this;
                var img = new Image();
                img.src = vm.filesDisplay[0].fileUrl;
                img.onload = function () {
                    vm.originalPixelSize = {width: img.width, height: img.height}
                    vm.updateImageDimensions(img.width, img.height);
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
                
                let vm = this;
                vm.resetFiles();
                const input_file = e.target.files[0];
                let file = {};

                // set filename
                if (input_file !== undefined) {
                    file.fileName = input_file.name;
                    vm.fileName = input_file.name;
                }

                // check for acceptable filetype
                const accepted_types = ['jpg', 'jpeg', 'tif', 'tiff', 'png', 'mat', 'zip'];
                const fileType = input_file.name.split('.').pop().toLowerCase();
                vm.fileType = fileType;
                if (accepted_types.includes(fileType) === false) {
                    return;
                }

                // extract data from uploaded file
                const fr = new FileReader();
                fr.readAsDataURL(input_file);
                fr.addEventListener('load', () => {

                    file.fileUrl = fr.result;
                    file.size = {width: 0, height: 0, units: null};
                    file.pixelSize = {width: 0, height: 0};

                    vm.files.push(file);
                    vm.filesUploaded = true;

                    if (fileType !== 'zip'){
                        vm.filesDisplay.push(file);
                        vm.filesDisplay[0].originalFileName = file.fileName
                    }

                    if (fileType !== 'zip' && fileType !== 'mat'){
                        vm.getImageDimensions();
                    }

                })

                if (fileType === 'zip') {
                    vm.unzipFiles(input_file)
                }

                vm.fileUploaded = true;
                vm.$emit('setFiles', [file], file.fileName)

            },

            unzipFiles (input_file) {

                const vm = this;
                vm.filesDisplay = [];
                const jszip_obj = new jszip();

                jszip_obj.loadAsync(input_file)
                .then(async function(zip) {

                    let count = 0
                    for (var key in zip.files){

                        // get file data
                        var filename = zip.files[key].name;
                        var filetype = filename.split('.').pop();

                        // uncompress
                        var raw_data = undefined;
                        if (zip.files[key]._data.compressedSize == zip.files[key]._data.uncompressedSize) {
                            raw_data = zip.files[key]._data.compressedContent;
                        } else {
                            raw_data = await pako.inflateRaw(zip.files[key]._data.compressedContent);
                        }

                        // convert from uint8array to base64
                        var binary = '';
                        for (var i = 0; i < raw_data.byteLength; i++){
                            binary += await String.fromCharCode(raw_data[i]);
                        }
                        var base64 = 'data:image/' + filetype + ';base64,' + window.btoa(binary);

                        // push to filesDisplay variable
                        var single_file = {fileName: filename, fileUrl: base64, originalFileName: filename};
                        single_file.size = {width: 0, height: 0, units: null};
                        single_file.pixelSize = {width: 0, height: 0};
                        single_file.phase = {x_offset: 0, y_offset: 0};
                        vm.filesDisplay.push(single_file);      
                        count += 1;

                    }

                    vm.getImageDimensions();
                    console.log('finished extracting images');

                });
            },

            async rezipFiles () {
                let jszip_obj = new jszip();
                let vm = this;
                
                // add images to zip file
                for(let i = 0; i < this.filesDisplay.length; i++){
                    jszip_obj.file(this.filesDisplay[i].originalFileName, this.filesDisplay[i].fileUrl.split(',').pop(), {base64: true});
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

    /* Browse files button */
    .fileButtonWrapper {
        margin-bottom: 0px;
    }
    
    .fileButton {
        margin-left: 0px;
        margin-bottom: 20px;
    }

    /* Subheaders such as 'Image dimensions' and 'Parameters' and 'Selected phase' */
    h4 {
        text-align: left;
        margin-bottom: 15px;
        margin-top: 0px;
        font-size: 15px;
        border-bottom: 1px solid gray;
    }

    /* 
    IMAGE TABLE 
    */
    .imageTable {
        margin-bottom: 20px;
    }

    .imageTableHeader, .imageTableContents {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
    }

    .imageTableContents {
        margin-bottom: 5px;
    }

    .imageTableHeader h4, .imageTableContents p {
        width: 25%;
        text-align: left;
    }

    .imageTableContents p {
        overflow: hidden;
        text-overflow: ellipsis;
        padding-right: 15px;
    }

    .imageTableButtons {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        flex-wrap: wrap;
        width: 25%;
    }

    .imageTableButton {
        margin-top: 0px;
        margin-left: 0px;
    }

    /* 
    PARAMETERS
    */
    .selectDropdownsWrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .singleSelectDropdown {
        width: 49%;
    }

    /* 
    IMAGE DIMENSIONS
     */
    .imageDimensionsWrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: flex-start;
        align-items: center;
    }

    /* giant x between width and height for image dimensions */
    h3 {
        font-size: 20px;
        margin-top: -28px;
    }

    .imgDimWidth {
        width: 20%;
        max-width: 225px;
        margin-right: 15px;
    }

    .imgDimHeight {
        width: 20%;
        max-width: 225px;
        margin-left: 15px;
        margin-right: 30px;
    }

    .imgDimUnits {
        width: 200px;
        max-width: 25%;
    }

</style>