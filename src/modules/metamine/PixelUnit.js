export default class PixelUnit {
  // Note: this code only handles two materials (foreground and background) and it assumes that
  //    any pixel not set to the foreground material is the background material i.e. there are no
  //    blank spots
  // This module was converted from Claire's https://github.com/anqiclaire/metaviz (pushed to MaterialsMine 2019/08/20)

  constructor (data, canvas, ctx,
    sz, /* width, height, */ lineWidth,
    borderColor, pixelFgColor, pixelBgColor,
    onPixelSet, onPixelReset) {
    let vm = this
    vm.canvas = canvas
    vm.ctx = ctx
    vm.p = 0 // relative position
    vm.data = vm.parseData(data)
    vm.size = sz
    vm.onPixelSet = onPixelSet
    vm.onPixelReset = onPixelReset
    vm.borderColor = borderColor
    vm.pixelFgColor = pixelFgColor
    vm.pixelBgColor = pixelBgColor
    console.log('canvas width: ' + vm.canvas.width)
    console.log('canvas height: ' + vm.canvas.height)
    vm.lw = lineWidth

    vm.pixels = vm.resetPixels(vm.size)
  }

  getWidth () {
    return this.canvas.width
  }

  getHeight () {
    return this.canvas.height
  }

  getPixels () {
    return this.pixels
  }

  pt2pixel (pointerX, pointerY) {
    let vm = this
    let vxw = Math.floor(vm.getWidth() / vm.size)
    let vxh = Math.floor(vm.getHeight() / vm.size)
    let x = Math.floor(pointerX / vxw)
    let y = Math.floor(pointerY / vxh)
    return {'x': x, 'y': y}
  }

  pixelRect (pos) {
    let vm = this
    let x = pos.x
    let y = pos.y
    let x1 = Math.floor(x * vm.getWidth() / vm.size) + vm.lw / 2
    let y1 = Math.floor(y * vm.getHeight() / vm.size) + vm.lw / 2
    let sx = Math.floor(vm.getWidth() / vm.size) - vm.lw
    let sy = Math.floor(vm.getHeight() / vm.size) - vm.lw
    console.log('x: ' + x1 + ' y: ' + y1 + ' sx: ' + sx + ' sy: ' + sy)
    return {'x': x1, 'y': y1, 'sx': sx, 'sy': sy}
  }

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
  }

  resetSymmetric (pos, sz) {
    let vm = this
    let a = vm.getSymmetric(pos, sz)
    a.forEach(function (v) {
      vm.resetPixel(v)
    })
  }

  setSymmetric (pos, sz) {
    let vm = this
    let a = vm.getSymmetric(pos, sz)
    a.forEach(function (v) {
      vm.setPixel(v)
    })
  }

  resetPixels () {
    let vm = this
    let rv = []
    for (let x = 0; x < vm.size; ++x) {
      let yvals = []
      rv[x] = yvals
      for (let y = 0; y < vm.size; ++y) {
        rv[x][y] = 0
      }
    }
    vm.pixels = rv
    // console.log('pixels length: ' + rv.length)
    return rv
  }

  sumFromOne (num) {
    let sum = 0
    for (let x = 0; x <= num; x++) {
      sum += x
    }
    return sum
  }

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
  }

  getPixelString () { // Row major, left to right, top to bottom
    let vs = ''
    let vm = this
    let size = vm.size
    for (let x = 0; x < size; ++x) {
      for (let y = 0; y < size; ++y) {
        vs += ('' + vm.pixels[x][y])
      }
    }
    return vs
  }

  getMatlabString () {
    let vm = this
    let ml = ''
    for (let index = 1; index <= vm.sumFromOne(vm.size / 2); index++) {
      let coord = vm.indexToCoord(index)
      ml += ('' + vm.pixels[coord.x][coord.y])
    }
    console.log('getMatlabString: ' + ml)
    return ml
  }

  handleClick (pixel) {
    let vm = this
    if (vm.pixels[pixel.x][pixel.y]) {
      vm.resetSymmetric(pixel, vm.size)
    } else {
      vm.setSymmetric(pixel, vm.size)
    }
  }

  clearCanvas () {
    // let ctx = canvas.getContext('2d')
    let vm = this
    vm.ctx.clearRect(0, 0, vm.getWidth(), vm.getHeight())
    vm.ctx.beginPath()
  }

  drawGrid () {
    let vm = this
    for (let x = 0; x <= vm.getWidth(); x += vm.getWidth() / vm.size) {
      vm.ctx.moveTo(0.5 + x + vm.p, vm.p)
      vm.ctx.lineTo(0.5 + x + vm.p, vm.getHeight() + vm.p)
    }
    for (let x = 0; x <= vm.getHeight(); x += vm.getHeight() / vm.size) {
      vm.ctx.moveTo(vm.p, 0.5 + x + vm.p)
      vm.ctx.lineTo(vm.getWidth() + vm.p, 0.5 + x + vm.p)
    }
    vm.ctx.lineWidth = vm.lw
    vm.ctx.strokeStyle = vm.borderColor
    vm.ctx.stroke()
  }

  parseData (data) {
    let textByLine = data.split('\n')
    let dataObj = {'PSV': {}, 'SH': {}, 'YoungsModulus': {}, 'PoissonsRatio': {}}
    for (let r = 0; r < textByLine.length; r++) {
      if (textByLine[r].trim().length > 0) {
        let line = textByLine[r].split('/')
        dataObj['PSV'][line[0]] = line[1].slice(1, -1).replace(/ {2}/g, ',').split(',')
        dataObj['SH'][line[0]] = line[2].slice(1, -1).replace(/ {2}/g, ',').split(',')
        dataObj['YoungsModulus'][line[0]] = line[3]
        dataObj['PoissonsRatio'][line[0]] = line[4]
      }
    }
    return dataObj
  }

  resetPixel (pos) {
    let vm = this
    let vr = vm.pixelRect(pos)
    let x = pos.x
    let y = pos.y
    vm.pixels[x][y] = 0
    vm.ctx.fillStyle = vm.pixelBgColor
    vm.ctx.fillRect(vr.x, vr.y, vr.sx, vr.sy)
  }

  setPixel (pos) {
    let vm = this
    let vr = vm.pixelRect(pos)
    let x = pos.x
    let y = pos.y
    vm.pixels[x][y] = 1
    vm.ctx.fillStyle = vm.pixelFgColor
    vm.ctx.fillRect(vr.x, vr.y, vr.sx, vr.sy)
  }

  getPsvString () { // PSV
    let vm = this
    let mls = vm.getMatlabString()
    let psv = vm.data['PSV'][mls]
    let rv = 'N/A'
    if (psv) {
      rv = psv.join(', ')
    }
    return rv
  }

  getPsv () {
    let vm = this
    let mls = vm.getMatlabString()
    let psv = vm.data['PSV'][mls]
    let rv = []
    if (psv) {
      rv = psv
    } else {
      for (let i = 0; i < 16; ++i) { rv.push('N/A') }
    }
    return rv
  }

  getShString () { // SH
    let vm = this
    let mls = vm.getMatlabString()
    let psv = vm.data['SH'][mls]
    let rv = 'N/A'
    if (psv) {
      rv = psv.join(', ')
    }
    return rv
  }

  getSh () {
    let vm = this
    let mls = vm.getMatlabString()
    let sh = vm.data['SH'][mls]
    let rv = []
    if (sh) {
      rv = sh
    } else {
      for (let i = 0; i < 16; ++i) { rv.push('N/A') }
    }
    return rv
  }

  getPrString () { // Poissons Ratio
    let vm = this
    let mls = vm.getMatlabString()
    let psv = vm.data['PoissonsRatio'][mls]
    let rv = 'N/A'
    if (psv) {
      rv = psv
    }
    return rv
  }

  getYmString () { // Youngs Modulus
    let vm = this
    let mls = vm.getMatlabString()
    let psv = vm.data['YoungsModulus'][mls]
    let rv = 'N/A'
    if (psv) {
      rv = psv
    }
    return rv
  }
}
