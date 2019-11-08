<template>
  <!-- TO USE THIS COMPONENT, place it on the page using:

    <video-link videoName="the_global_name_of_the_video" btnColor="color spec" btnSize="x-small | small | normal | large | x-large"/>

    The component will place a floating action button with a video_library icon that when pressed,
    will open a modal dialog containing the specified video.

    NOTE: Color spec can be: primary, secondary, a color like 'red' or an rgb/rgba value like '#ffeeoo' or 'rgba(255, 200, 200,0.3)'
  -->
  <div class="video-link">
    <v-tooltip bottom>
      <template v-slot:activator="{on}">
      <div @click.stop="toggleVisible()">
        <v-btn icon :color="btnColor" x-small v-on="on" v-if="btnSize === 'x-small'"><v-icon>video_library</v-icon></v-btn>
        <v-btn icon v-else-if="btnSize === 'small'" small :color="btnColor" v-on="on"><v-icon>video_library</v-icon></v-btn>
        <v-btn icon v-else-if="btnSize === 'large'" large :color="btnColor" v-on="on"><v-icon>video_library</v-icon></v-btn>
        <v-btn icon v-else-if="btnSize === 'x-large'" x-large :color="btnColor" v-on="on"><v-icon>video_library</v-icon></v-btn>
        <v-btn icon v-else :color="btnColor" normal="true" v-on="on"><v-icon>video_library</v-icon></v-btn>
      </div>
      </template>
      <span>{{title}}</span>
    </v-tooltip>
    <v-flex d-flex v-if="visible">
      <v-row justify="center">
        <v-dialog v-model="visible" persistent max-width="80%">
          <v-card>
            <v-card-title class="justify-space-between headline">
              {{title}}
              <span @click="toggleVisible()"><v-icon class="vl-close-btn">close</v-icon></span>
            </v-card-title>
            <v-card-text class="text-xs-left title">{{text}}</v-card-text>
            <v-playback :url="url"></v-playback>
            <!--v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="secondary" text @click="toggleVisible()">Close</v-btn>
            </v-card-actions-->
          </v-card>
        </v-dialog>
      </v-row>
    </v-flex>
  </div>
</template>

<script>
import {} from 'vuex'
export default {
  name: 'VideoLink',
  data () {
    return ({
      visible: false,
      url: null,
      title: null,
      text: null
    })
  },
  props: {
    videoName: {
      type: String,
      required: true
    },
    btnSize: {
      type: String,
      required: false,
      default: 'normal',
      validator: function (value) {
        return ['x-large', 'large', 'normal', 'small', 'x-small'].indexOf(value) !== -1
      }
    },
    btnColor: {
      type: String,
      required: true,
      default: 'primary'
    }
  },
  beforeMount () {
    let vm = this
    let info = vm.$store.getters.getCmsVideo(vm.videoName)
    if (typeof info === 'object') {
      vm.url = info.url
      vm.title = info.title
      vm.text = info.text
    }
    window.appData = vm
    console.log('vm.btnSize: ' + vm.btnSize)
  },
  methods: {
    toggleVisible () {
      let vm = this
      vm.visible = !vm.visible
      console.log('Visible: ' + vm.visible)
    }
  }
}
</script>

<style scoped>
  .video-link {
  }
  .vl-close-btn {
    font-size: 60px;
    padding: 15px;
  }
</style>
