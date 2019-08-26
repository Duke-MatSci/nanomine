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
            <v-flex d-flex xs12 sm12 md3 lg3 xl3 justify-left style="min-width:322px;">
              <canvas id="unit-cell" width="320" height="320"></canvas>
            </v-flex>
            <v-flex d-flex xs12 sm12 md9 lg9 xl9>
              <v-card light flat>
                <v-card-text>
                  <div class="title text-xs-left">Geometry: {{matlabStr}}</div>
                </v-card-text>
                <v-card-text>
                  <div class="title text-xs-left">Youngs Modulus (Pa): {{effYmStr}}</div>
                </v-card-text>
                <v-card-text>
                  <div class="title text-xs-left">Poissons Ratio: {{effPrStr}}</div>
                </v-card-text>
                <v-card-text>
                  <div class="title text-xs-left">Bandgap values: </div>
                  <div v-for="bgpair in bgPairs" :key="bgpair.id">
                    {{bgpair.sh}} {{bgpair.psv}}
                  </div>
                </v-card-text>
              </v-card>
            </v-flex>
          </v-layout>
        </v-flex>
      </v-layout>
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
    bgPairs: []
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
      vm.bgPairs = [
      ]
      psv.forEach(function (v, idx) {
        let p = {'id': idx, 'sh': sh[idx], 'psv': v}
        vm.bgPairs.push(p)
      })
    },
    showMatlabString () {
      let vm = this
      console.log('showMatlabString')
      vm.matlabStr = vm.pixelUnit.getMatlabString()
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
    },
    showPoissonsRatioString () {
      let vm = this
      vm.effPrStr = vm.pixelUnit.getPrString()
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

  #unit-cell {
    background-color: #c0c0c0;
    position: relative;
    margin-left: 0px;
    margin-top: 0px;
    min-width: 320px;
    min-height: 320px;
    max-width: 320px;
    max-height: 320px;
  }

  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }
</style>
