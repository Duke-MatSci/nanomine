<template>
  <div class="main">
    <v-flex class="mypage">
      <v-container>
        <app-profile> </app-profile>
        <app-tool> </app-tool>
        <app-dataset> </app-dataset>
      </v-container>
    </v-flex>
    <dialogue-box>
      <v-layout row>
          <v-flex xs12 sm6 offset-sm3 >
              <v-card>
                  <v-toolbar color="cyan" dark>
                      <v-toolbar-title>Dataset Information</v-toolbar-title>

                      <v-spacer></v-spacer>

                      <v-btn icon @click="closeDisplay"> <v-icon>close</v-icon> </v-btn>
                  </v-toolbar>
              </v-card>
          </v-flex>
      </v-layout>
    </dialogue-box>
  </div>
</template>

<script>
import AdminDataset from './pages/admin_dataset/admin_dataset.vue'
import AdminTools from './pages/admin_tools/admin_tools.vue'
import Profile from './pages/admin_profile/profile.vue'
import datas from './utils/admin_data'
import dialogueBox from './utils/dialogue.vue'
export default {
  name: "MyPage",
  data: () => ({...datas}),
  components: {
    appProfile: Profile,
    appTool: AdminTools,
    appDataset: AdminDataset,
    dialogueBox
  },
  created () {
    this.$store.commit('setAppHeaderInfo', {icon: 'house', name: 'My Portal'})
  },
}
</script>

