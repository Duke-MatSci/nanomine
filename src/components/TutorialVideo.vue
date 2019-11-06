<template>
  <!-- TO USE THIS COMPONENT, place it on the page using:
    <tutorial-video tutorialName="the_global_name_of_the_video"/>
  -->
  <div class="tutorial-video">
    <v-tooltip bottom>
      <template v-slot:activator="{on}">
      <div v-on="on"  @click="toggleVisible()">
        <v-btn v-on="on" color="primary" fab normal ><v-icon>video_library</v-icon></v-btn>
        <span v-if="visible">{{text}} <span class="font-italic font-weight-bold">(click to close)</span></span>
      </div>
      </template>
      <span>{{title}}</span>
    </v-tooltip>
    <div v-if="visible">
      <v-playback :url="url"></v-playback>
    </div>
  </div>
</template>

<script>
import {} from 'vuex'
export default {
  name: 'TutorialVideo',
  data () {
    return ({
      visible: false,
      url: null,
      title: null,
      text: null
    })
  },
  props: ['tutorialName'],
  mounted () {
    let vm = this
    let info = vm.$store.getters.getCmsVideo(vm.tutorialName)
    if (typeof info === 'object') {
      vm.url = info.url
      vm.title = info.title
      vm.text = info.text
    }
  },
  methods: {
    toggleVisible () {
      let vm = this
      vm.visible = !vm.visible
    }
  }
}
</script>

<style scoped>
  .tutorial-video {
  }
</style>
