<template>
  <div class="nano_tutorials">
    <h1>{{ msg }}</h1>
    <v-container fluid grid-list-md>
      <v-flex xs1></v-flex>
      <v-flex xs11 class="title bold text-xs-left">
        NanoMine usage hints and tips.
      </v-flex>
    </v-container>
    <v-container class="text-xs-left">
      <v-layout row wrap>
        <v-flex xs10>
          <div v-for="(video, idx) in videos" :key="idx">
            <div @click="displayVideo(idx)">
              <v-flex class="title heavy skip"><i class="video-icon material-icons">ondemand_video</i>&nbsp;{{video.title}}</v-flex>
              <v-flex class="body">{{video.text}}
              </v-flex>
            </div>
            <div v-if="!video.hide">
              <v-playback :url="video.url"></v-playback>
            </div>
          </div>
        </v-flex>
      </v-layout>
    </v-container>
  </div>

</template>

<script>
import {} from 'vuex'
export default {
  name: 'NanoTutorials',
  data () {
    return {
      msg: 'NanoMine Tutorials',
      videos: []
    }
  },
  mounted () {
    let vm = this
    // vm.videos = [
    //   {
    //     hide: true,
    //     url: 'https://materialsmine.org/nmf/nanomine-vis.mp4',
    //     title: 'Visualization Tutorial',
    //     text: 'This video tutorial show basic usage of the search and visualization tool. (no audio)'
    //   },
    //   {
    //     hide: true,
    //     url: 'https://materialsmine.org/nmf/Intelligent_Characterization_Tutorial_by_Umar.mp4',
    //     title: 'Intelligent Characterization',
    //     text: 'This narrated video tutorial shows how to use the Intelligent Characterization tool and view results.'
    //   },
    //   {
    //     hide: true,
    //     url: 'https://materialsmine.org/nmf/NanoMine_Demo_by_Akshay.mp4',
    //     title: 'Basic Module Characterization/Reconstruction Tool Usage',
    //     text: 'This video tutorial shows overall Module Characterization and Reconstruction tool usage. (no audio)'
    //   }
    // ]
    let vids = vm.$store.getters.getCmsAllVideos
    Object.keys(vids).forEach((v, idx) => {
      let key = v
      let o = vids[key]
      o.hide = true
      o.nm = key
      vm.videos.push(o)
    })
    vm.hideVideos()
  },
  methods: {
    hideVideos (idx) {
      let vm = this
      let noTouch = null
      if (idx >= 0) {
        noTouch = idx
      }
      vm.videos.forEach(function (v, i) {
        if (i !== noTouch) {
        // vm.videos[i].hide = true
          let o = vm.videos[i]
          o.hide = true
          vm.$set(vm.videos, i, o)
        }
      })
    },
    displayVideo (idx) {
      let vm = this
      vm.hideVideos(idx)
      let isHidden = vm.videos[idx].hide
      let o = vm.videos[idx]
      o.hide = !isHidden
      vm.$set(vm.videos, idx, o)
      console.log('Hidden(' + idx + ') = ' + vm.videos[idx].hide)
    }
  }
}
</script>

<style scoped>
  .skip {
    margin-top: 25px;
  }
  .title {
    margin-bottom: 5px;
  }
  .cap {
    text-transform: uppercase;
  }
  .video-icon {
    color: #8CB2CA;
    vertical-align: text-bottom;
  }
  .bold {
    font-weight: 500;
  }
  .heavy {
    font-weight: 600;
  }
  .body {
    margin-bottom: 5px;
  }
  img {
    width: 240px;
  }

  h4 {
    text-transform: uppercase;
  }

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

</style>
