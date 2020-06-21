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
            <cropper class='cropper' :src='source_image' @change='onChange'></cropper>
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
            image
        },
        data:() => {
            return {
                title: "Edit Image",
                source_image: image.fileUrl,
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
                this.$emit('croppedImage', this.cropped_image, image)
                this.closeModal()
            }
        }
    }
</script>

<style scoped>
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
    }
    
    .modal-container {
        width: 700px;
        height: 700px;
        max-width: 90%;
        max-height: 90%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        background-color: white;
        border: 2px solid black;
        border-radius: 8px;
        z-index: 1; /* ensures that the modal appears on top of other elements */
    }

    .cropper {
        width: 500px;
        height: 500px;
        max-width: 90%;
        max-height: 90%;
    }

    .modal-container-buttons {
        margin-top: 10px;
    }
</style>