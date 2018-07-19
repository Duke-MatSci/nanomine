<template>
  <v-card class="rvwm elevation-12" v-if="show()">
    <v-navigation-drawer floating stateless value="show()">
      <v-list dense>

        <v-list-group prepend-icon="account_circle" value="true" v-if="showAcctMgt()">
          <v-list-tile slot="activator"><v-list-tile-title>Users</v-list-tile-title></v-list-tile>

          <v-list-group no-action sub-group value="true">
            <v-list-tile slot="activator"><v-list-tile-title>Admin</v-list-tile-title></v-list-tile>
            <v-list-tile v-for="(admin, i) in admins" :key="i" @click="x">
              <v-list-tile-title v-text="admin[0]"></v-list-tile-title>
              <v-list-tile-action>
                <v-icon v-text="admin[1]"></v-icon>
              </v-list-tile-action>
            </v-list-tile>
          </v-list-group>

          <v-list-group sub-group no-action>
            <v-list-tile slot="activator"><v-list-tile-title>Actions</v-list-tile-title></v-list-tile>

            <v-list-tile v-for="(crud, i) in cruds" :key="i" @click="x">
              <v-list-tile-title v-text="crud[0]"></v-list-tile-title>
              <v-list-tile-action><v-icon v-text="crud[1]"></v-icon></v-list-tile-action>
            </v-list-tile>
          </v-list-group>
        </v-list-group>

        <v-list-group prepend-icon="edit" value="true" v-if="showAcctMgt()">
          <v-list-tile slot="activator"><v-list-tile-title>File</v-list-tile-title></v-list-tile>

          <v-list-group no-action sub-group value="true">
            <v-list-tile slot="activator"><v-list-tile-title>XML</v-list-tile-title></v-list-tile>
            <v-list-tile v-for="(xml, i) in xmls" :key="i" @click="x">
              <v-list-tile-title v-text="xml[0]"></v-list-tile-title>
              <v-list-tile-action>
                <v-icon v-text="xml[1]"></v-icon>
              </v-list-tile-action>
            </v-list-tile>
          </v-list-group>

          <v-list-group sub-group no-action>
            <v-list-tile slot="activator"><v-list-tile-title>Actions</v-list-tile-title></v-list-tile>

            <v-list-tile v-for="(fileaction, i) in fileactions" :key="i" @click="x">
              <v-list-tile-title v-text="fileaction[0]"></v-list-tile-title>
              <v-list-tile-action><v-icon v-text="fileaction[1]"></v-icon></v-list-tile-action>
            </v-list-tile>
          </v-list-group>
        </v-list-group>
      </v-list>
    </v-navigation-drawer>
  </v-card>
</template>

<script>

import {} from 'vuex'

export default {
  name: 'LeftMenu',
  methods: {
    show: function () {
      return (
        this.$store.state.leftMenuActive
      )
    },
    showAcctMgt: function () {
      return this.$store.state.adminAvailable
    },
    x: function () {

    },
    xy: function () {
    }
  },
  computed: {},
  data () {
    return {
      msg: 'LeftMenu',
      admins: [
        ['Article', 'user'], /* item name, icon name */
        ['Job output', 'settings']
      ],
      cruds: [
        ['Delete Record', 'user'],
        ['Add Article', 'update']
      ],
      editor: [
        ['New', 'star']
      ],
      xmls: [
        ['New', 'arrow']
      ],
      fileactions: [
        ['Delete Record', 'user'],
        ['Add Article', 'update']
      ]
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .rvwm {
    height: 100%;
    z-index: 100;
    top: 50;
    position: fixed;
  }

  h1 {
    text-transform: uppercase;
  }
</style>
