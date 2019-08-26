<template>
  <div class="pixelunit">
    <h1>{{ msg }}</h1>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <v-flex d-flex xs12>
          <v-layout row wrap>
            <v-flex d-flex xs12 style="align-self: start;">
              <v-flex d-flex xs2>
                <v-btn class="text-xs-left" color="primary" flat @click="handleReset()">Reset</v-btn>
              </v-flex>
              <v-flex d-flex xs10></v-flex>
            </v-flex>
            <v-flex d-flex xs12 sm12 md3 lg3 xl3 justify-left style="min-width:302px;">
              <canvas id="unit-cell" width="300" height="300"></canvas>
            </v-flex>
            <v-data-iterator
              :items="geometryitems"
              :rows-per-page-items="rowsPerPageItems"
              :pagination.sync="pagination"
              content-tag="v-layout"
              hide-actions
              row
              wrap
            >
              <template v-slot:header>
                <v-toolbar
                  class="mb-2"
                  color="cyan darken-5"
                  dark
                  flat
                >
                  <v-toolbar-title>Geometry Details</v-toolbar-title>
                </v-toolbar>
              </template>
              <template v-slot:item="props">
                <v-flex
                  xs12
                  sm8
                  md6
                  lg4
                >
                  <v-card>
                    <v-card-title color="cyan darken-5" class="subheading font-weight-bold">{{props.item.name}}</v-card-title>

                    <v-divider></v-divider>

                    <v-list dense>
                      <v-list-tile>
                        <v-list-tile-content class="align-end">{{props.item.value}}</v-list-tile-content>
                      </v-list-tile>
                    </v-list>
                  </v-card>
                </v-flex>
              </template>
            </v-data-iterator>
          </v-layout>
        </v-flex>
      </v-layout>
      <v-data-iterator
        :items="bgitems"
        :rows-per-page-items="rowsPerPageItems"
        :pagination.sync="pagination"
        content-tag="v-layout"
        hide-actions
        row
        wrap
      >
        <template v-slot:header>
          <v-toolbar
            class="mb-2"
            color="cyan darken-5"
            dark
            flat
          >
            <v-toolbar-title>Bandgap Values</v-toolbar-title>
          </v-toolbar>
        </template>
        <template v-slot:item="props">
          <v-flex
            xs12
            sm6
            md4
            lg3
          >
            <v-card>
              <v-card-title class="subheading font-weight-bold">{{ props.item.name }}</v-card-title>

              <v-divider></v-divider>

              <v-list dense v-for="bgpair in bgPairs" :key="bgpair.id">
                <v-list-tile>
                  <v-list-tile-content v-if="props.item.name === 'SH'" class="align-end">{{getBgValue(bgpair.sh)}}</v-list-tile-content>
                  <v-list-tile-content v-if="props.item.name === 'PSV'" class="align-end">{{getBgValue(bgpair.psv)}}</v-list-tile-content>
                </v-list-tile>
              </v-list>
            </v-card>
          </v-flex>
        </template>
      </v-data-iterator>
    </v-container>
  </div>
</template>

<script>
import Axios from 'axios'
import PixelUnit from '../../modules/metamine/PixelUnit'

export default {
  name: 'PixelUnit',
  data: () => ({
    msg: 'C4v 10 x 10 Geometry Explorer',
    c: null,
    ctx: null,
    borderColor: 'black',
    setColor: 'red',
    resetColor: '#c0c0c0',
    bgColor: 'rgb(192,192,192)',
    lw: 4,
    pixels: null,
    // pixelString: '',
    size: 10, // default to 10x10 matrix
    pixelStrElem: null,
    matlabStr: '',
    effYmStr: '',
    effPrStr: '',
    psvStr: '',
    shStr: '',
    bgPairs: [],
    rowsPerPageItems: [4, 8, 12],
    pagination: {
      rowsPerPage: 4
    },
    geometryitems: [
      {
        name: 'Geometry',
        value: ''
      },
      {
        name: 'Effective Young\'s Modulus (Pa):',
        value: ''
      },
      {
        name: 'Effective Poisson\'s ratio:',
        value: ''
      }
    ],
    bgitems: [
      {
        name: 'SH'
      },
      {
        name: 'PSV'
      }
    ]
  }),

  mounted: function () {
    let vm = this
    vm.c = document.getElementById('unit-cell')
    vm.ctx = vm.c.getContext('2d')
    vm.lw = 4 // line width

    vm.c.addEventListener('click', ev => {
      let pixel = vm.pixelUnit.pt2pixel(ev.layerX, ev.layerY)
      vm.pixelUnit.handleClick(pixel)
      vm.updateFields()
    })
    Axios.get('/nmstatic/metamine/lin-bilal-liu-10x10-c4v-15bit-static-dynamic.txt')
      .then(function (resp) {
        vm.pixelUnit = new PixelUnit(resp.data, vm.c, vm.ctx, vm.size,
          vm.lw, vm.borderColor,
          vm.setColor, vm.resetColor, null, null)
        vm.pixelUnit.drawGrid()
        vm.updateFields()
      })
      .catch(function (err) {
        let msg = 'error obtaining pixelunit data. Error: ' + err
        console.trace(msg)
      })
  },
  methods: {
    updateFields () {
      let vm = this
      vm.showMatlabString()
      vm.showPSVString()
      vm.showSHString()
      vm.updateBgPairs()
      vm.showYoungsModulusString()
      vm.showPoissonsRatioString()
    },
    getBgValue (s) {
      let v = Number.parseFloat(s).toFixed(8)
      if (v === Number.NaN) {
        v = 'N/A'
      }
      return v
    },
    handleReset () {
      let vm = this
      vm.size = 10
      vm.pixelUnit.clearCanvas()
      vm.pixelUnit.drawGrid()
      vm.pixelUnit.resetPixels()
      vm.updateFields()
    },
    updateBgPairs () {
      let vm = this
      let psv = this.pixelUnit.getPsv()
      let sh = this.pixelUnit.getSh()
      vm.bgPairs = []
      psv.forEach(function (v, idx) {
        let p = {'id': idx, 'sh': sh[idx], 'psv': v}
        vm.bgPairs.push(p)
      })
    },
    showMatlabString () {
      let vm = this
      console.log('showMatlabString')
      vm.matlabStr = vm.pixelUnit.getMatlabString()
      vm.geometryitems[0].value = vm.matlabStr
    },
    showPSVString () {
      let vm = this
      vm.psvStr = vm.pixelUnit.getPsvString()
    },
    showSHString () {
      let vm = this
      vm.shStr = vm.pixelUnit.getShString()
    },
    showYoungsModulusString () {
      let vm = this
      vm.effYmStr = vm.pixelUnit.getYmString()
      vm.geometryitems[1].value = vm.effYmStr
    },
    showPoissonsRatioString () {
      let vm = this
      vm.effPrStr = vm.pixelUnit.getPrString()
      vm.geometryitems[2].value = vm.effPrStr
    }
  }
}
</script>

<style scoped>
  #sz-label {
    position: absolute;
    top: 5px;
    left: 30px;
  }

  #sz {
    position: absolute;
    top: 5px;
    left: 170px;
  }

  #doset {
    position: absolute;
    top: 8px;
    left: 340px;
  }
  .list-tight {
    padding-top: 1px;
    padding-bottom: 1px;
  }
  #unit-cell {
    background-color: #c0c0c0;
    position: relative;
    margin-left: 0px;
    margin-top: 0px;
    min-width: 300px;
    min-height: 300px;
    max-width: 300px;
    max-height: 300px;
  }

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }
</style>
