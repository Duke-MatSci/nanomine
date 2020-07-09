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

            <div class='imageWrapper' v-if='type === "crop"'>
                <cropper :src='file.fileUrl' :stencil-props='stencil_props' @change='onChange'></cropper>
            </div>

            <p v-if='type === "phase"'><strong>Instructions:</strong> click on the phase within the image that you would like to be analyzed.</p>

            <div class='phaseWrapper imageWrapper' v-if='type === "phase"' ref='imageWrapperDiv'>
                <img class='image' :src='file.fileUrl' @click='phaseImageClicked($event)' ref='phaseImage'>     
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
                    if (newValue.fileName !== oldValue.fileName) {
                        this.phaseDotVisibility = false
                    }
                    this.phase = newValue.phase;
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
                phaseDotVisibility: false
            }
        },
        methods: {
            phaseImageClicked (e) {
                
                // the stuff in the parenthesis is to account for the fact that the image may be scaled upon being displayed, thus we figure out the scale factor to get the correct offset
                this.phase.x_offset = parseInt(e.offsetX * (this.file.pixelSize.width / e.path[0].clientWidth))
                this.phase.y_offset = parseInt(e.offsetY * (this.file.pixelSize.height / e.path[0].clientHeight))
                
                this.phaseDotVisibility = true;

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
                if (this.$refs.phaseImage === undefined) { return this.phase.y_offset * 0  } // refs are not yet rendered on first run
                var scaleFactor = this.$refs.phaseImage.clientHeight / this.file.pixelSize.height // image might be scaled up/down to fit the modal.
                return ((this.phase.y_offset * scaleFactor) - 3) + "px"; // -3 pixels to center dot on where they click
            },
            computedLeft: function () {
                if (this.$refs.phaseImage === undefined) { return this.phase.x_offset * 0 } // refs are not yet rendered on first run
                var scaleFactor = this.$refs.phaseImage.clientWidth / this.file.pixelSize.width; // image might be scaled up/down to fit the modal.
                var extraOffset = (this.$refs.imageWrapperDiv.clientWidth - this.$refs.phaseImage.clientWidth) / 2 // phase dot is anchored to the div that contains img. Div width may be larger than img width.
                return ((this.phase.x_offset * scaleFactor) + extraOffset - 3)  + "px"; // -3 pixels to center dot on where they click
            },
            computedBackground: function () {
                if (this.phaseDotVisibility === true) {
                    return "white";
                } else {
                    return "transparent";
                }
            },
            computedBorder: function () {
                if (this.phaseDotVisibility === true) {
                    return "1px solid black";
                } else {
                    return "1px solid transparent";
                }
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

    .imageWrapper {
        width: 90%;
        height: 75%;
    }

    .image {
        max-width: 100%;
        max-height: 100%;
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
        margin-top: 20px;
        margin-bottom: 20px;
    }

    .image-cropper-container-buttons p {
        margin-bottom: 0px;
        font-weight: 700;
        margin-left: 8px;
        margin-right: 8px;
        background-color: rgba(192, 192, 192, 0.5);
        padding: 8px 12px;
        border-radius: 2px;
    }

</style>

<style>
    .image-cropper-container img {
        margin-top: 0px;
    }
</style>