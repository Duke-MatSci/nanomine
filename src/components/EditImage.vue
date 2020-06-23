<!--
################################################################################
#
# File Name: EditImage.vue
# Application: templates
# Description: a modal that allows the user to edit the selected image. Current functionality includes cropping the image.
#
# Created by: Atul Jalan 6/20/20
# Customized for NanoMine
#
################################################################################
-->

<template>
    <div class='modal' v-if='value'>
        <div class='modal-container'>
            <h1>{{ title }}</h1>
            <cropper class='cropper' imageClassname='cropper-image' :src='source_image' @change='onChange'></cropper>
            <div class='modal-container-buttons'>
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
            img: Object,
        },
        data() {
            return {
                title: "Edit Image",
                source_image: this.img.fileUrl,
                cropped_image: null
            }
        },
        methods: {
            onChange ({ coordinates, canvas}) {
                this.cropped_image = canvas.toDataURL();
            },
            closeModal() {
                this.$emit("input", !this.value);
            },
            saveImage() {
                this.$emit('setCroppedImage', this.cropped_image, this.img)
                this.closeModal()
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
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1; /* ensures that the modal appears on top of other elements */
    }
    
    .modal-container {
        width: 700px;
        height: 700px;
        margin-top: 48px;
        max-width: 90%;
        max-height: (90% - 48px);
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        background-color: white;
        border: 2px solid black;
        border-radius: 8px;
    }

    .cropper-image {
        max-width: 80%;
    }

    #cropper img {
        margin-top: 0px;
    }

    .modal-container-buttons {
        margin-top: 10px;
    }
</style>