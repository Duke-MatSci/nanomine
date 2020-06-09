<template>
  <div></div>
</template>

<script>
  export default {
    name: 'Gallery',
    created: function() {
      window.location = `${window.location.origin}/wi/about?view=gallery&uri=http://semanticscience.org/resource/Chart`;
      return;
    }
  }
</script>


