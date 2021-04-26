<template>
  <div>
    <div class="main">
      <div class="curationplot">
        <v-container fluid grid-list-md>
          <h1 v-if="!this.$store.state.versionNew" class="header-nm">{{ title }}</h1>
          <v-layout row wrap>
            <v-flex d-flex xs4 sm4 md4>
              <v-card
                elevation="7"
                class="upload"
                @dragover="dragover"
                @dragleave="dragleave"
                @drop="drop"
                v-bind:style="{ 'background-color': boxColor }"
              >
                <input type="file" multiple name="fields[assetsFieldHandle][]" id="assetsFieldHandle" 
                   @change="onChange" ref="myUpload" accept=".csv" />
                <label for="assetsFieldHandle" class="block cursor-pointer">
                  <br>
                  <br>
                  <br>
                  <p class="font-weight-black text-center text--secondary" align="center" justify="center" style="font-size:3em">
                    Drop csv files here or <span class="text-decoration-underline">click here</span> to upload and plot
                  </p>
                </label>
                <ul class="mt-4" v-if="this.csvName.length" v-cloak style="list-style-type:none">
                  <li class="text-sm p-1" style="font-size:2em">
                    {{csvName}}
                    <v-btn class="ml-2" color="red" dark @click="remove()" title="Remove file">
                      remove
                      <v-icon dark>mdi-delete</v-icon> 
                    </v-btn>
                  </li>
                </ul>
              </v-card>
            </v-flex>
        <!-- Line chart -->
            <v-flex d-flex>
              <v-card elevation="7">
                <v-layout align-center justify-center>
                  <div id="viz" class="chart">
                    <nm-linechart
                      :options="{ width: 500, height: 400 }"
                      :dataset="dataset"
                      :xlabel="xlabel"
                      :ylabel="ylabel"
                    ></nm-linechart>
                  </div>
                </v-layout>
              </v-card>
            </v-flex>
          </v-layout>
        </v-container>
      </div>
    </div>
  </div>
</template>

<script>
import {} from 'vuex'
import { max } from "d3";
import LineChart from "./nanomine/LineChart";
import {Auth} from '@/modules/Auth.js'
export default {
  name: "CurationPlot",
  data() {
    // let margin = {
    //   top: 10,
    //   right: 30,
    //   bottom: 30,
    //   left: 60
    // };
    // let width = 460 - margin.left - margin.right;
    // let height = 400 - margin.top - margin.bottom;
    return {
      title: 'Curation Plot',
      dialog: false,
      boxColor: '#e3e3e3',
      csv: null,
      csvName: '',
      csvText: '',
      data: [],
      dataset: null,
      xlabel: '',
      ylabel: ''
      // // set the dimensions and margins of the graph
      // margin: margin,
      // width: width,
      // height: height
    };
  },
  components: {
    "nm-linechart": LineChart
  },
  methods: {
    reset() {
      let vm = this;
      vm.boxColor = '#e3e3e3';
      vm.csv = null;
      vm.csvName = '';
      vm.csvText = '';
      vm.data = [];
      vm.dataset = null;
      vm.xlabel = '';
      vm.ylabel = '';
    },
    onChange() {
      let vm = this;
      vm.csv = vm.$refs.myUpload.files[0];
      console.log(vm.csv)
      vm.csvName = vm.csv.name;
      console.log(vm.csvName)
      const fr = new FileReader();
      // fr.readAsDataURL(vm.csv);
      fr.readAsText(vm.csv);
      fr.addEventListener('load', () => {
        vm.csvText = fr.result;
        vm.csv2xy(vm.csvText);
      });
    },
    remove() {
      this.reset();
    },
    dragover(event) {
      event.preventDefault();
      this.boxColor = '#c4c4c4';
      // Add some visual fluff to show the user can drop its files
      // if (!event.currentTarget.classList.contains('bg-green-300')) {
      //   event.currentTarget.classList.remove('bg-gray-100');
      //   event.currentTarget.classList.add('bg-green-300');
      // }
    },
    dragleave(event) {
      this.boxColor = '#e3e3e3';
      // Clean up
      // event.currentTarget.classList.add('bg-gray-100');
      // event.currentTarget.classList.remove('bg-green-300');
    },
    drop(event) {
      event.preventDefault();
      this.boxColor = '#97fc83';
      this.$refs.myUpload.files = event.dataTransfer.files;
      this.onChange(); // Trigger the onChange event manually
      // Clean up
      // event.currentTarget.classList.add('bg-gray-100');
      // event.currentTarget.classList.remove('bg-green-300');
    },
    csv2xy(csvText) {
      let vm = this;
      var result = {};
      var rows = csvText.split(/\r\n|\r|\n/);
      let length = rows.length-1;
      var data = [];
      var xlabel = '';
      var ylabel = '';
      [xlabel, ylabel] = rows[0].split(',');
      for (var i = 1; i<length; ++i) {
        var rowV = rows[i].split(',');
        data.push({
          'x':+rowV[0],
          'y':+rowV[1]
        });
      };
      vm.xlabel = xlabel;
      vm.ylabel = ylabel;
      vm.data = data;
    }
  },
  // computed: {
  //   /**
  //    * dataset: Will organize data according to the filter rules
  //    */
  //   dataset() {
  //     // Default
  //     return this.transformData(data);
  //   }
  // // },
  // // created() {
  // //   this.maxValue = max(data, d => d.high).toFixed(2);
  // },
  watch: {
    data(newData) {
      console.log("xlabel: " + this.xlabel);
      console.log("ylabel: " + this.ylabel);
      console.log(newData[0]["x"]);
      console.log(newData[0]["y"]);
      console.log(newData);
      // console.log("data: " + this.data);
      console.log("watch run");
      this.dataset = {
        data: newData,
        xlabel: this.xlabel,
        ylabel: this.ylabel,
      };
    }
  },
  created(){
    this.$store.commit('setAppHeaderInfo', {icon: 'workspaces', name: 'Curation Plot'})
  }
};
</script>

<style scoped>
  .upload {
    border: 5px dashed #777777;
    min-height: 400px;
  }
</style>