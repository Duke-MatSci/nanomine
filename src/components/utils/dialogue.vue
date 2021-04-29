<template>
    <v-dialog>
        <slot></slot>
    </v-dialog>
</template>

<script>
    export default {
        name: 'dialogueBox',
        methods: {
            closeDisplay: () => {
                return this.$store.commit('toggleDialogBox')
            }
        }
    }
</script>