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

            <!-- displayed when user opens image cropper -->
            <div class='imageWrapper' v-if='type === "crop"'>
                <cropper :src='file.url' :stencil-props='stencil_props' @change='onCropChange'></cropper>
            </div>

            <!-- displayed when user opens phase select  -->
            <p v-if='type === "phase"'><strong>Instructions:</strong> click on the phase within the image that you would like to be analyzed.</p>

            <!-- displayed when user opens phase select  -->
            <div class='phaseWrapper imageWrapper' v-if='type === "phase"' ref='imageWrapperDiv'>
                <img class='image' :src='file.url' @click='onPhaseChange($event)' ref='phaseImage'>     
                <div class='phaseDot' v-bind:style="{ top: computedTop, left: computedLeft, backgroundColor: computedBackground, border: computedBorder}"></div>
            </div>

            <div class='image-cropper-container-buttons'>
                <p v-if='type === "phase"'>x-offset: {{ phase.x_offset }}</p> <!-- only displayed when user opens phase select -->
                <p v-if='type === "phase"'> y-offset: {{ phase.y_offset }}</p> <!-- only displayed when user opens phase select -->
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

            // update phase dot information when new image is opened in modal
            file: {
                deep: true,
                handler(newValue, oldValue) {
                    if (newValue.name !== oldValue.name) {
                        this.phaseDotVisibility = false
                    }
                    this.phase = newValue.phase;
                }
            },

        },
        mounted() {
            
            // locks the aspect ratio at which the user can crop an image
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
                cropped_url: null,
                coordinates: null,
                stencil_props: {},
                phase: {x_offset: 0, y_offset: 0},
                phaseDotVisibility: false
            }
        },
        methods: {
            onPhaseChange (e) {
                
                // takes the click offset from top left of image and multiplies that by how much the image is scaled up/down to fit the modal
                this.phase.x_offset = parseInt(e.offsetX * (this.file.pixelSize.width / e.path[0].clientWidth));
                this.phase.y_offset = parseInt(e.offsetY * (this.file.pixelSize.height / e.path[0].clientHeight));
                
                this.phaseDotVisibility = true;

            },
            onCropChange ({ coordinates, canvas}) {
                this.cropped_url = canvas.toDataURL();
                this.coordinates = coordinates;
            },
            closeModal() {
                this.$emit("input", !this.value);
            },
            saveImage() {
                if (this.type === 'crop'){
                    this.$emit('setCroppedImage', this.cropped_url, this.file.name, this.coordinates);
                } else if (this.type === 'phase'){
                    this.$emit('setPhase', this.file.name, this.phase);
                }
                this.closeModal();
            }
        },

        // computed variables are for the phase dot (to determine position and toggle visibility), and modal title
        computed: {

            // phase dot position is calculated from the offset from the top left corner of its parent div

            // gives the y offset of the phase dot
            computedTop: function () {
                if (this.$refs.phaseImage === undefined) { return this.phase.y_offset * 0  } // refs are not yet rendered on first run
                var scaleFactor = this.$refs.phaseImage.clientHeight / this.file.pixelSize.height; // image might be scaled up/down to fit the modal.
                return ((this.phase.y_offset * scaleFactor) - 3) + "px"; // -3 pixels to center dot on where they click
            },

            // gives the x offset of the phase dot
            computedLeft: function () {
                if (this.$refs.phaseImage === undefined) { return this.phase.x_offset * 0 } // refs are not yet rendered on first run
                var scaleFactor = this.$refs.phaseImage.clientWidth / this.file.pixelSize.width; // image might be scaled up/down to fit the modal.
                var extraOffset = (this.$refs.imageWrapperDiv.clientWidth - this.$refs.phaseImage.clientWidth) / 2; // phase dot is anchored to the div that contains img. Div width may be larger than img width.
                return ((this.phase.x_offset * scaleFactor) + extraOffset - 3)  + "px"; // -3 pixels to center dot on where they click
            },

            // computed background and computed border determine whether phase dot is displayed 

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

            // determines the title of the modal
            computedTitle: function () {
                if (this.type === 'crop') {
                    return 'Crop image';
                } else if (this.type === 'phase') {
                    return 'Set phase';
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