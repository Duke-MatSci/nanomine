<template>
  <!-- This module was converted to vue from Claire's https://github.com/anqiclaire/metaviz repository-->
  <div>
  <label id="sz-label" for="sz"> size: </label> <input type="number" id="sz" name="sz" required minlength="1" maxlength="3" size="3">
  <button id="doset">reset</button>
  <canvas id="unit-cell" width="800" height="800"></canvas>
  <div>Matlab string: <div id="matlab-string"></div></div>
  <div>Pixel string: <div id="pixel-string"></div></div>
  <div>PSV bandgap: <div id="psv-bandgap"></div></div>
  <div>SH bandgap: <div id="sh-bandgap"></div></div>
  </div>
</template>

<script>
import Axios from 'axios'
export default {
  name: 'PixelUnit',
  data: () => ({
    c: null,
    ctx: null,
    psv: [], // 16 floats
    sh: [], // 16 floats
    borderColor: 'black',
    setColor: 'red',
    resetColor: '#c0c0c0',
    bgColor: 'rgb(192,192,192)',
    lw: 4,
    szInput: null,
    doSet: null,
    p: 0,
    pixels: null,
    pixelString: '',
    size: 10, // default to 10x10 matrix
    pixelStrElem: null,
    matlabStrElem: null,
    psvElem: null,
    dataDict: null,
    data: null
  }),
  mounted: function () {
    let vm = this
    vm.c = document.getElementById('unit-cell')
    vm.ctx = vm.c.getContext('2d')
    vm.ctx.fillStyle = vm.bgColor
    vm.ctx.fillRect(0, 0, vm.c.width, vm.c.height)
    vm.lw = 4 // line width
    vm.szInput = document.getElementById('sz')
    vm.doset = document.getElementById('doset')

    vm.p = 0
    vm.pixels = vm.resetPixels(vm.size)
    vm.szInput.value = '' + vm.size
    vm.pixelStrElem = document.getElementById('pixel-string')
    vm.matlabStrElem = document.getElementById('matlab-string')
    vm.psvElem = document.getElementById('psv-bandgap')
    vm.shElem = document.getElementById('sh-bandgap')
    // c.addEventListener('mousemove', (ev) => {
    //     let pixel = pt2pixel(c.width, c.height, size, ev.layerX, ev.layerY)
    //     console.log('x: ' + ev.layerX + ' y: ' + ev.layerY + ' pixel: ' + JSON.stringify(pixel))
    // })

    vm.c.addEventListener('click', ev => {
      let pixel = vm.pt2pixel(vm.c.width, vm.c.height, vm.size, ev.layerX, ev.layerY)
      console.log('clicked x: ' + pixel.x + ' y: ' + pixel.y)
      console.log(' pixels[' + pixel.x + '][' + pixel.y + '] was: ' + ' ' + vm.pixels[pixel.x][pixel.y])
      if (vm.pixels[pixel.x][pixel.y]) {
        vm.resetSymmetric(pixel, vm.size)
      } else {
        vm.setSymmetric(pixel, vm.size)
      }
      console.log(' pixels[' + pixel.x + '][' + pixel.y + '] now: ' + ' ' + vm.pixels[pixel.x][pixel.y])
    })
    vm.doset.addEventListener('click', () => {
      vm.size = parseInt(vm.szInput.value)
      console.log('size change: ' + vm.size + ' ' + ' canvas width: ' + vm.c.width + ' height: ' + vm.c.height)
      vm.clear(vm.c)
      vm.drawGrid(vm.lw, vm.c.width, vm.c.height, vm.size, vm.p)
      vm.pixels = vm.resetPixels(vm.size)
      vm.showMatlabString()
      vm.showPixelString()
      vm.updatePSV()
      vm.updateSH()
      vm.showPSVString()
      vm.showSHString()
      vm.generate_table()
    })
    Axios.get('/nmstatic/metamine/osama-bilal-claire-lin-10x10-sym-c4v-15bit-dynamic.txt')
      .then(function (resp) {
        // console.log('pixelunit.txt data: ')
        // console.log(resp.data)
        vm.dataDict = vm.readLocalData(resp.data) // read local PSV, SH data
        console.log(vm.dataDict)
        vm.drawGrid(vm.lw, vm.c.width, vm.c.height, parseInt(vm.size), vm.p)
        vm.showMatlabString()
        vm.showPixelString()
        vm.updatePSV()
        vm.updateSH()
        vm.showPSVString()
        vm.showSHString()
        vm.generate_table()
      })
      .catch(function (err) {
        let msg = 'error obtaining pixelunit data. Error: ' + err
        console.log(msg)
      })
    // Initial drawing on page
  },
  methods: {
    pt2pixel (w, h, vxsz, pointerX, pointerY) {
      let vxw = Math.floor(w / vxsz)
      let vxh = Math.floor(h / vxsz)
      let x = Math.floor(pointerX / vxw)
      let y = Math.floor(pointerY / vxh)
      return {'x': x, 'y': y}
    },
    pixelRect (pos, lw, sz, w, h) {
      let vm = this
      let x = pos.x
      let y = pos.y
      let x1 = Math.floor(x * w / vm.size) + lw / 2
      let y1 = Math.floor(y * w / vm.size) + lw / 2
      let sx = Math.floor(w / vm.size) - lw
      let sy = Math.floor(h / vm.size) - lw
      console.log('x: ' + x1 + ' y: ' + y1 + ' sx: ' + sx + ' sy: ' + sy)
      return {'x': x1, 'y': y1, 'sx': sx, 'sy': sy}
    },
    getSymmetric (pos, sz) {
      let pos1 = {}
      let pos2 = {}
      let pos3 = {}
      let pos4 = {}
      let pos5 = {}
      let pos6 = {}
      let pos7 = {}
      pos1.x = (sz - 1) - pos.x
      pos1.y = pos.y

      pos2.x = pos.x
      pos2.y = (sz - 1) - pos.y

      pos3.x = (sz - 1) - pos.x
      pos3.y = (sz - 1) - pos.y

      pos4.x = (sz - 1) - pos.y
      pos4.y = pos.x

      pos5.x = pos.y
      pos5.y = (sz - 1) - pos.x

      pos6.x = (sz - 1) - pos.y
      pos6.y = (sz - 1) - pos.x

      pos7.x = pos.y
      pos7.y = pos.x
      return [pos, pos1, pos2, pos3, pos4, pos5, pos6, pos7]
    },
    resetSymmetric (pos, sz) {
      let vm = this
      let a = vm.getSymmetric(pos, sz)
      a.forEach(function (v) {
        vm.resetPixel(v)
      })
    },
    setSymmetric (pos, sz) {
      let vm = this
      let a = vm.getSymmetric(pos, sz)
      a.forEach(function (v) {
        vm.setPixel(v)
      })
    },
    setPixel (pos) {
      let vm = this
      let vr = vm.pixelRect(pos, vm.lw, vm.size, vm.c.width, vm.c.height)
      let x = pos.x
      let y = pos.y
      vm.pixels[x][y] = 1
      vm.ctx.fillStyle = vm.setColor
      vm.ctx.fillRect(vr.x, vr.y, vr.sx, vr.sy)
      vm.showMatlabString()
      vm.showPixelString()
      vm.updatePSV()
      vm.updateSH()
      vm.showPSVString()
      vm.showSHString()
      vm.generate_table()
    },
    resetPixel (pos) {
      let vm = this
      let vr = vm.pixelRect(pos, vm.lw, vm.size, vm.c.width, vm.c.height)
      let x = pos.x
      let y = pos.y
      vm.pixels[x][y] = 0
      vm.ctx.fillStyle = vm.resetColor
      vm.ctx.fillRect(vr.x, vr.y, vr.sx, vr.sy)
      vm.showMatlabString()
      vm.showPixelString()
      vm.updatePSV()
      vm.updateSH()
      vm.showPSVString()
      vm.showSHString()
      vm.generate_table()
    },
    resetPixels (size) {
      let rv = []
      for (let x = 0; x < size; ++x) {
        let yvals = []
        rv[x] = yvals
        for (let y = 0; y < size; ++y) {
          rv[x][y] = 0
        }
      }
      // console.log('pixels length: ' + rv.length)
      return rv
    },
    showPixelString () {
      let vm = this
      let vs = ''
      for (let x = 0; x < vm.size; ++x) {
        for (let y = 0; y < vm.size; ++y) {
          vs += ('' + vm.pixels[x][y])
        }
      }
      vm.pixelStrElem.innerText = vs
    },
    clear (canvas) {
      let ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
    },
    drawGrid (lw, bw, bh, size, p) {
      let vm = this
      for (let x = 0; x <= bw; x += bw / size) {
        vm.ctx.moveTo(0.5 + x + p, p)
        vm.ctx.lineTo(0.5 + x + p, bh + p)
      }
      for (let x = 0; x <= bh; x += bh / size) {
        vm.ctx.moveTo(p, 0.5 + x + p)
        vm.ctx.lineTo(bw + p, 0.5 + x + p)
      }
      vm.ctx.lineWidth = lw
      vm.ctx.strokeStyle = vm.borderColor
      vm.ctx.stroke()
    },
    sumFromOne (num) {
      let sum = 0
      for (let x = 0; x <= num; x++) {
        sum += x
      }
      return sum
    },
    indexToCoord (index) {
      let vm = this
      let sumOfInc = 0
      let unitNum = vm.size / 2
      let realIndex = vm.sumFromOne(unitNum) - index
      let row = unitNum - 1
      let col = unitNum - 1
      for (let y = 1; y <= unitNum; y++) {
        sumOfInc += y
        if (sumOfInc > realIndex) {
          col = y - 1
          row = realIndex - (sumOfInc - y)
          return {'x': row, 'y': col}
        }
      }
    },
    showMatlabString () {
      let vm = this
      let ml = ''
      for (let index = 1; index <= vm.sumFromOne(vm.size / 2); index++) {
        let coord = vm.indexToCoord(index)
        ml += ('' + vm.pixels[coord.x][coord.y])
      }
      vm.matlabStrElem.innerText = ml
    },
    readLocalData (text) {
      // let reader = new XMLHttpRequest() // || new ActiveXObject('MSXML2.XMLHTTP')
      // reader.open('GET', 'file:///Users/erikd/git/nanomine/src/claire-metamine/data.txt', false)
      // reader.send(null)
      // let text = reader.responseText
      console.log(text)
      let textByLine = text.split('\n')
      let dataDict = {'PSV': {}, 'SH': {}}
      for (let r = 0; r < textByLine.length; r++) {
        let line = textByLine[r].split('/')
        dataDict['PSV'][line[0]] = line[1]
        dataDict['SH'][line[0]] = line[2]
      }
      return dataDict
    },
    showPSVString () {
      let vm = this
      if (vm.matlabStrElem.innerText in vm.dataDict.PSV) {
        vm.psvElem.innerText = vm.dataDict.PSV[vm.matlabStrElem.innerText]
      } else {
        vm.psvElem.innerText = 'N/A'
      }
    },
    showSHString () {
      let vm = this
      if (vm.matlabStrElem.innerText in vm.dataDict.SH) {
        vm.shElem.innerText = vm.dataDict.SH[vm.matlabStrElem.innerText]
      } else {
        vm.shElem.innerText = 'N/A'
      }
    },
    updatePSV () {
      let vm = this
      if (vm.matlabStrElem.innerText in vm.dataDict.PSV) {
        vm.psvString = vm.dataDict.PSV[vm.matlabStrElem.innerText]
        vm.psv = vm.psvString.substring(1, vm.psvString.length - 1).split(/\s+/)
      } else {
        vm.psv = []
        for (let i = 0; i < vm.sumFromOne(vm.size / 2) + 1; i++) {
          vm.psv.push('N/A')
        }
      }
    },
    updateSH () {
      let vm = this
      if (vm.matlabStrElem.innerText in vm.dataDict.SH) {
        vm.shString = vm.dataDict.SH[vm.matlabStrElem.innerText]
        vm.sh = vm.shString.substring(1, vm.shString.length - 1).split(/\s+/)
      } else {
        vm.sh = []
        for (let i = 0; i < vm.sumFromOne(vm.size / 2) + 1; i++) {
          vm.sh.push('N/A')
        }
      }
    },
    generate_table () {
      let vm = this
      // get the reference for the body
      let body = document.getElementsByTagName('body')[0] // TODO cannot use body here
      // remove the old table first
      let oldtbl = document.getElementById('psv_sh_table')
      if (oldtbl != null) {
        body.removeChild(oldtbl)
      }
      // creates a <table> element and a <tbody> element
      let tbl = document.createElement('table')
      tbl.setAttribute('id', 'psv_sh_table')
      let tblBody = document.createElement('tbody')
      // creating all cells
      for (let i = 0; i < 3; i++) {
        // creates a table row
        let row = document.createElement('tr')
        // first row, headers
        if (i === 0) {
          // plus 1 column for the first column, plus another 1 for "<"
          for (let j = 0; j < vm.sumFromOne(vm.size / 2) + 2; j++) {
            let cell = document.createElement('td')
            cell.setAttribute('width', '' + (100.0 / (vm.sumFromOne(vm.size / 2) + 2)) + '%')
            let cellText = null
            if (j === 0) {
              cellText = document.createTextNode('Bandgap Number')
            } else {
              cellText = document.createTextNode(j)
            }
            cell.appendChild(cellText)
            row.appendChild(cell)
          }
        } else if (i === 1) { // second row PSV
          for (let j = 0; j < vm.sumFromOne(vm.size / 2) + 2; j++) {
            // Create a <td> element and a text node, make the text
            // node the contents of the <td>, and put the <td> at
            // the end of the table row
            let cell = document.createElement('td')
            cell.setAttribute('width', '' + (100.0 / (vm.sumFromOne(vm.size / 2) + 2)) + '%')
            let cellText = null
            if (j === 0) {
              cellText = document.createTextNode('PSV')
            } else if (vm.psv[j - 1] !== 'N/A') {
              cellText = document.createTextNode(parseFloat(vm.psv[j - 1]).toExponential(2))
            } else {
              cellText = document.createTextNode(vm.psv[j - 1])
            }
            cell.appendChild(cellText)
            row.appendChild(cell)
          }
        } else if (i === 2) { // third row SH
          for (let j = 0; j < vm.sumFromOne(vm.size / 2) + 2; j++) {
            let cell = document.createElement('td')
            cell.setAttribute('width', '' + (100.0 / (vm.sumFromOne(vm.size / 2) + 2)) + '%')
            let cellText = null
            if (j === 0) {
              cellText = document.createTextNode('SH')
            } else if (vm.sh[j - 1] !== 'N/A') {
              cellText = document.createTextNode(parseFloat(vm.sh[j - 1]).toExponential(2))
            } else {
              cellText = document.createTextNode(vm.sh[j - 1])
            }
            cell.appendChild(cellText)
            row.appendChild(cell)
          }
        }
        // add the row to the end of the table body
        tblBody.appendChild(row)
      }
      // put the <tbody> in the <table>
      tbl.appendChild(tblBody)
      // appends <table> into <body>
      body.appendChild(tbl)
      // sets the border attribute of tbl to 2;
      tbl.setAttribute('border', '2')
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
