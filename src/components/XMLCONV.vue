<template>
  <div class="xmlconv">
    <h1>{{ msg }}</h1>
    <v-container>
      <h3 class="text-xs-left">Description</h3>
      <br>
      <p class="text-xs-left">The simplest method to curate your sample into the database is by uploading an MS Excel spreadsheet. An online web-form is also available for the advanced user (<router-link to="/curate">click here</router-link>). For each sample, upload a template Excel file using the first uploading box and other supplementary image and raw data files using the second uploading box. The master Excel template contains all possible fields for nanocomposite sample data and therefore many fields will remain blank for your sample. Fill in only the parameters applicable to your sample. Customized templates are available upon request, please contact <a href="mailto:nanominenu@gmail.com">the administrator</a>.</p>
      <br>

      <h5 class="text-xs-left">Steps</h5>
      <p class="text-xs-left">Step 1: Click <a href="{% static 'XMLCONV/master_template.zip' %}" download>here</a> to download the blank MS Excel template (137 kB).
       (Click <a href="{% static 'XMLCONV/example.zip' %}" download>here</a> to see an example, 263 kB)<br>
      Step 2: Fill in the parameters for all applicable cells in the template Excel file. Prepare the supplementary images and raw data files.<br>
      Step 3: Select the template Excel file in the first uploading box.<br>
      Step 4: Select the supplementary images and other raw data files in the second uploading box (press "Ctrl" or "Command" when selecting multiple files), then click Submit to upload your data.<br>
      Step 5: Wait for the feedback message. Please read the message and follow the instructions if an error message is displayed.</p>

      <h5 class="text-xs-left">Note</h5>
      <p class="text-xs-left">1. We recommend you to upload your control sample first and remember its sample ID.<br>
      2. Upload one sample data at a time (one template Excel file along with supplementary files).<br>
      3. Rows or sections followed by a "#" sign in the template Excel file can be duplicated. Copy them into additional rows if needed.<br>
      4. Acceptable image file format: JPG, PNG, TIF(F). Indicate the full image file name including the extensions in the corresponding cells in the template Excel file.
      </p>

      <h3 class="text-xs-left">Inputs</h3><br>

      <form method='POST' enctype='multipart/form-data'> {% csrf_token %}

      <p class="text-xs-left">Upload the Excel template file here:</p>
          <p class="text-xs-left">{{ form.non_field_errors }}</p>
          <p class="text-xs-left">{{ form.templatefile.label_tag }} {{ form.templatefile.help_text }}</p>
          <p class="text-xs-left">
              {{ form.templatefile.errors }}
              {{ form.templatefile }}
          </p>

      <p class="text-xs-left">Upload all other files here (including Excel raw data files and all related image or binary files):</p>
          <p class="text-xs-left">{{ form.docfile.label_tag }} {{ form.docfile.help_text }}</p>
          <p class="text-xs-left">
              {{ form.docfile.errors }}
              {{ form.docfile }}
          </p>
      </form>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'XMLCONV',
  data () {
    return {
      msg: 'Data Uploader'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 240px;
  }
  h4 {
    text-transform: uppercase;
  }
</style>
