<template>
  <div>
  <!--label id="sz-label" for="sz"> size: </label> <input type="number" id="sz" name="sz" required minlength="1" maxlength="3" size="3"-->
  <button id="doset">reset</button>
  <canvas id="unit-cell" width="800" height="800"></canvas>
  <div>Matlab string: <div id="matlab-string"></div></div>
  <div>Pixel string: <div id="pixel-string"></div></div>
  <div>Youngs Modulus (Pa): <div id="youngs-modulus"></div></div>
  <div>Poisson's Ratio: <div id="poissons-ratio"></div></div>
  <div>PSV bandgap: <div id="psv-bandgap"></div></div>
  <div>SH bandgap: <div id="sh-bandgap"></div></div>
  </div>
</template>

<script>
import Axios from 'axios'
import PixelUnit from '../../modules/metamine/PixelUnit'
export default {
  name: 'PixelUnit',
  data: () => ({
    c: null,
    ctx: null,
    // psv: [], // 16 floats
    // sh: [], // 16 floats
    borderColor: 'black',
    setColor: 'red',
    resetColor: '#c0c0c0',
    bgColor: 'rgb(192,192,192)',
    lw: 4,
    // szInput: null,
    doSet: null,
    p: 0,
    pixels: null,
    pixelString: '',
    size: 10, // default to 10x10 matrix
    pixelStrElem: null,
    matlabStr: null,
    matlabStrElem: null,
    psvElem: null,
    dataDict: null,
    data: null
  }),

  mounted: function () {
    let vm = this
    vm.c = document.getElementById('unit-cell')
    vm.ctx = vm.c.getContext('2d')
    vm.lw = 4 // line width
    // vm.szInput = document.getElementById('sz')
    vm.doset = document.getElementById('doset')
    vm.p = 0
    // old vm.pixels = vm.pixelUnit.resetPixels()
    // vm.szInput.value = '' + vm.size
    vm.pixelStrElem = document.getElementById('pixel-string')
    vm.matlabStrElem = document.getElementById('matlab-string')
    vm.psvElem = document.getElementById('psv-bandgap')
    vm.shElem = document.getElementById('sh-bandgap')
    vm.ymElem = document.getElementById('youngs-modulus')
    vm.prElem = document.getElementById('poissons-ratio')
    // c.addEventListener('mousemove', (ev) => {
    //     let pixel = pt2pixel(c.width, c.height, size, ev.layerX, ev.layerY)
    //     console.log('x: ' + ev.layerX + ' y: ' + ev.layerY + ' pixel: ' + JSON.stringify(pixel))
    // })

    vm.c.addEventListener('click', ev => {
      let pixel = vm.pixelUnit.pt2pixel(ev.layerX, ev.layerY)
      console.log('clicked x: ' + pixel.x + ' y: ' + pixel.y)
      console.log(' pixels[' + pixel.x + '][' + pixel.y + '] was: ' + ' ' + vm.pixelUnit.getPixels()[pixel.x][pixel.y])
      vm.pixelUnit.handleClick(pixel)
      console.log(' pixels[' + pixel.x + '][' + pixel.y + '] now: ' + ' ' + vm.pixelUnit.getPixels()[pixel.x][pixel.y])
      vm.updateFields()
    })
    vm.doset.addEventListener('click', () => {
      vm.size = 10 // parseInt(vm.szInput.value)
      console.log('size change: ' + vm.size + ' ' + ' canvas width: ' + vm.c.width + ' height: ' + vm.c.height)
      vm.pixelUnit.clearCanvas()
      vm.pixelUnit.drawGrid()
      vm.pixelUnit.resetPixels()
      vm.updateFields()
    })
    Axios.get('/nmstatic/metamine/lin-bilal-liu-10x10-c4v-15bit-static-dynamic.txt')
      .then(function (resp) {
        vm.pixelUnit = new PixelUnit(resp.data, vm.c, vm.ctx, vm.size,
          vm.c.width, vm.c.height, vm.lw, vm.borderColor,
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
      vm.showPixelString()
      vm.showPSVString()
      vm.showSHString()
      vm.showYoungsModulusString()
      vm.showPoissonsRatioString()

      // vm.generate_table()
    },
    showPixelString () {
      let vm = this
      vm.pixelStrElem.innerText = vm.pixelUnit.getPixelString()
    },
    showMatlabString () {
      let vm = this
      console.log('showMatlabString')
      vm.matlabStrElem.innerText = vm.pixelUnit.getMatlabString()
    },
    showPSVString () {
      let vm = this
      vm.psvElem.innerText = vm.pixelUnit.getPsvString()
    },
    showSHString () {
      let vm = this
      vm.shElem.innerText = vm.pixelUnit.getShString()
    },
    showYoungsModulusString () {
      let vm = this
      vm.ymElem.innerText = vm.pixelUnit.getYmString()
    },
    showPoissonsRatioString () {
      let vm = this
      vm.prElem.innerText = vm.pixelUnit.getPrString()
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
    margin-left: 10px;
    margin-top: 30px;
  }
</style>
