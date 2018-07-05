<template>
  <div class="database">
    <h1>{{ msg }}</h1>
    <v-container>
      <div>
        <!--//{% if user|has_perm:'curate.curate_access' %}-->
        <img src="/cdn/img/excel.png" />
        <h4>
          <router-link to="/XMLCONV">Curate Using Uploader</router-link>
        </h4>
        <p>
          Download an Excel template, enter nanocomposite sample or simulation data into the template and upload. This is the simplest way.
        </p>
        <!--//{% endif %}-->

        <!--//{% if user|has_perm:'explore.explore_access' %}-->
        <img src="/cdn/img/edit-big.png" />
        <h4>
          <router-link to="/curate">Curate online</router-link>
        </h4>
        <p>
          Select a schema and fill out the corresponding form. Using the Excel template upload is usually simpler.
        </p>
        <!--//{% endif %}-->
      </div>

      <div>
        <!--//{% if user|has_perm:'compose.compose_access' %}-->
        <img src="/cdn/img/search-big.png" />
        <h4>
          <router-link to="/explore">Explore the repository</router-link>
        </h4>
        <p>Search this nanocomposite data resource using flexible queries.</p>
        <!--//{% endif %}-->

        <!--//{% if user|has_perm:'curate.curate_access' %}-->
        <img src="/cdn/img/edit-big.png"/>
        <h4>
          <router-link to="/compose">Compose a schema</router-link>
        </h4>
        <p>Compose your own schema.</p>
        <!--//{% endif %}-->
      </div>
      <img src="/cdn/img/visualize_data.png"/>
      <h4>
        <router-link to="/visualize">Visualize</router-link>
      </h4>
      <p>Visualize nanocomposite data.</p>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'Database',
  data () {
    return {
      msg: 'Database Options'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 50px;
    height: auto;
  }
h4 {
  text-transform: uppercase;
}
</style>
