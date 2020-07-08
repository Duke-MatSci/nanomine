<!--
################################################################################
#
# File Name: EditImage.vue
# Application: templates
# Description: a modal that allows the user to edit the selected image. Current functionality includes cropping the image and setting the phase.
#
# Created by: Atul Jalan 6/20/20
# Customized for NanoMine
#
################################################################################
-->

<template>
    <div class='modal' v-if='value'>
        <div class='image-cropper-container'>

            <h1>{{ computedTitle }}</h1>

            <div class='cropper-wrapper' v-if='type === "crop"'>
                <cropper :src='file.fileUrl' :stencil-props='stencil_props' @change='onChange'></cropper>
            </div>

            <p v-if='type === "phase"'><strong>Instructions:</strong> click on the phase within the image that you would like to be analyzed.</p>

            <div class='phaseWrapper' v-if='type === "phase"'>
                <img :src='file.fileUrl' @click='phaseImageClicked($event)'>     
                <div class='phaseDot' v-bind:style="{ top: computedTop, left: computedLeft, backgroundColor: computedBackground, border: computedBorder}"></div>
            </div>

            <div class='image-cropper-container-buttons'>
                <p v-if='type === "phase"'>x-offset: {{ phase.x_offset }}</p>
                <p v-if='type === "phase"'> y-offset: {{ phase.y_offset }}</p>
                <v-btn color="primary" v-on:click='closeModal()'>Cancel</v-btn>
                <v-btn color="primary" v-on:click='saveImage()'>Save</v-btn>
            </div>

        </div>
    </div>
</template>

<script>
    import { Cropper } from 'vue-advanced-cropper';

    export default {
        name: 'EditImage',
        components: {
            Cropper
        },
        props: {
            value: {
                required: true
            },
            file: Object,
            type: String,
            aspectRatio: String
        },
        watch: {
            file: {
                deep: true,
                handler(newValue, oldValue) {
                    if (newValue.phase.x_offset > 0 || newValue.phase.y_offset > 0) {
                        this.phaseDotStyle.top = newValue.phase.x_offset + "px";
                        this.phaseDotStyle.left = newValue.phase.y_offset + "px";
                        this.phaseDotStyle.backgroundColor = "white";
                        this.phaseDotStyle.border = "1px solid black";
                    } else {
                        this.phaseDotStyle.backgroundColor = "transparent";
                        this.phaseDotStyle.border = "1px solid transparent"
                    }
                }
            },
            type: {
                handler(newValue, oldValue) {
                    if (newValue === 'phase') {
                        this.phase = this.file.phase;
                    }
                }
            }
        },
        mounted() {

            if (this.aspectRatio === 'square') {
                this.stencil_props.aspectRatio = 1;
            } else if (this.aspectRatio === 'free') {
                if ('aspectRatio' in this.stencil_props) {
                    delete this.stencil_props.aspectRatio;
                }
            }

        },
        data() {
            return {
                title: "",
                cropped_image: null,
                coordinates: null,
                stencil_props: {},
                phase: {x_offset: 0, y_offset: 0},
                phaseDotStyle: {top: "0px", left: "0px", backgroundColor: "transparent", border: "1px solid transparent"}
            }
        },
        methods: {
            phaseImageClicked (e) {

                this.phase.x_offset = e.offsetX;
                this.phase.y_offset = e.offsetY;

                this.phaseDotStyle.top = (e.offsetY - 4) + "px";
                this.phaseDotStyle.left = (e.offsetX - 4) + "px";
                this.phaseDotStyle.backgroundColor = "white";
                this.phaseDotStyle.border = "1px solid black"

            },
            onChange ({ coordinates, canvas}) {
                this.cropped_image = canvas.toDataURL();
                this.coordinates = coordinates;
            },
            closeModal() {
                this.$emit("input", !this.value);
            },
            saveImage() {
                if (this.type === 'crop'){
                    this.$emit('setCroppedImage', this.cropped_image, this.file.fileName, this.coordinates)
                } else if (this.type === 'phase'){
                    this.$emit('setPhase', this.file.fileName, this.phase)
                }
                this.closeModal()
            }
        },
        computed: {
            computedTop: function () {
                return this.phaseDotStyle.top;
            },
            computedLeft: function () {
                return this.phaseDotStyle.left;
            },
            computedBackground: function () {
                return this.phaseDotStyle.backgroundColor;
            },
            computedBorder: function () {
                return this.phaseDotStyle.border;
            },
            computedTitle: function () {
                if (this.type === 'crop') {
                    return 'Crop image';
                } else if (this.type === 'phase') {
                    return 'Set phase'
                }
            }
        }
    }
</script>

<style scoped>

    h1 {
        margin-top: 0px;
        background-color: black;
        color: white;
        width: 100%;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
    }

    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.3); /* dims the entire screen to make the modal stand out */
        display: flex; 
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1; /* ensures that the modal appears on top of other elements */
    }

    .cropper-wrapper {
        width: 90%;
    }

    .phaseWrapper {
        position: relative;
    }

    .phaseDot {
        position: absolute;
        width: 6px;
        height: 6px; 
        border-radius: 50%;
    }
    
    .image-cropper-container {
        width: 700px;
        margin-top: 48px;
        max-width: 90%;
        max-height: calc(90% - 48px);
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        background-color: white;
        border: 2px solid black;
        border-radius: 8px;
    }

    .image-cropper-container-buttons {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        margin-top: 25px;
        margin-bottom: 25px;
    }

    .image-cropper-container-buttons p {
        margin-bottom: 0px;
        font-weight: 700;
        margin-left: 8px;
        margin-right: 8px;
    }

</style>

<style>
    .image-cropper-container img {
        margin-top: 0px;
    }
</style>