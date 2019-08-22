export default class PixelUnit {
  // Note: this code only handles two materials (foreground and background) and it assumes that
  //    any pixel not set to the foreground material is the background material i.e. there are no
  //    blank spots
  constructor (data, canvas, ctx,
    sz, width, height, lineWidth,
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
    vm.height = height
    vm.width = width
    vm.lw = lineWidth

    vm.pixels = vm.resetPixels(vm.size)
  }

  getPixels () {
    return this.pixels
  }

  pt2pixel (pointerX, pointerY) {
    let vm = this
    let vxw = Math.floor(vm.width / vm.size)
    let vxh = Math.floor(vm.height / vm.size)
    let x = Math.floor(pointerX / vxw)
    let y = Math.floor(pointerY / vxh)
    return {'x': x, 'y': y}
  }

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
    vm.ctx.clearRect(0, 0, vm.canvas.width, vm.canvas.height)
    vm.ctx.beginPath()
  }

  drawGrid () {
    let vm = this
    for (let x = 0; x <= vm.width; x += vm.width / vm.size) {
      vm.ctx.moveTo(0.5 + x + vm.p, vm.p)
      vm.ctx.lineTo(0.5 + x + vm.p, vm.height + vm.p)
    }
    for (let x = 0; x <= vm.height; x += vm.height / vm.size) {
      vm.ctx.moveTo(vm.p, 0.5 + x + vm.p)
      vm.ctx.lineTo(vm.width + vm.p, 0.5 + x + vm.p)
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
    let vr = vm.pixelRect(pos, vm.lw, vm.size, vm.canvas.width, vm.canvas.height)
    let x = pos.x
    let y = pos.y
    vm.pixels[x][y] = 0
    vm.ctx.fillStyle = vm.pixelBgColor
    vm.ctx.fillRect(vr.x, vr.y, vr.sx, vr.sy)
  }

  setPixel (pos) {
    let vm = this
    let vr = vm.pixelRect(pos, vm.lw, vm.size, vm.canvas.width, vm.canvas.height)
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
/*
let psv = [] // 16 floats
let sh = [] // 16 floats
let borderColor = 'black'
let setColor = 'red'
let resetColor = 'rgb(192,192,192)'
let bgColor = resetColor
let c = document.getElementById('unit-cell')
let ctx = c.getContext('2d')
ctx.fillStyle = bgColor
ctx.fillRect(0, 0, c.width, c.height)
let lw = 4 // line width
const szInput = document.getElementById('sz')
const doset = document.getElementById('doset')
let size = 10 // (sz) default to 10x10 matrix
let pixels = resetPixels(size)
szInput.value = '' + size
let pixelString = ''
const pixelStrElem = document.getElementById('pixel-string')
const matlabStrElem = document.getElementById('matlab-string')
const psvElem = document.getElementById('psv-bandgap')
const shElem = document.getElementById('sh-bandgap')
const ymElem = document.getElementById('youngs-modulus')
const prElem = document.getElementById('poissons-ratio')
const dataDict = readLocalData() // read local PSV, SH data
console.log(dataDict)
// c.addEventListener('mousemove', (ev) => {
//     let pixel = pt2pixel(c.width, c.height, size, ev.layerX, ev.layerY)
//     console.log('x: ' + ev.layerX + ' y: ' + ev.layerY + ' pixel: ' + JSON.stringify(pixel))
// })

c.addEventListener('click', ev => {
  let pixel = pt2pixel(c.width, c.height, size, ev.layerX, ev.layerY)
  console.log('clicked x: ' + pixel.x + ' y: ' + pixel.y)
  let pixels = getPixels()
  console.log(' pixels[' + pixel.x + '][' + pixel.y + '] was: ' + ' ' + pixels[pixel.x][pixel.y])
  handleClick(pixel)
  console.log(' pixels[' + pixel.x + '][' + pixel.y + '] now: ' + ' ' + pixels[pixel.x][pixel.y])
})
doset.addEventListener('click', () => {
  size = parseInt(szInput.value)
  console.log('size change: ' + size + ' ' + ' canvas width: ' + c.width + ' height: ' + c.height)
  clear(c)
  drawGrid(lw, c.width, c.height, size, p)
  pixels = resetPixels(size)
  showMatlabString()
  showPixelString()
  updatePSV()
  updateSH()
  showPSVString()
  showSHString()
  showYoungsModulusString()
  showPoissonsRatioString()
  generate_table()
})

function setPixel (pos) {
  call_setPixel(pos)
  showMatlabString()
  showPixelString()
  updatePSV()
  updateSH()
  showPSVString()
  showSHString()
  showYoungsModulusString()
  showPoissonsRatioString()
  generate_table()
}
function resetPixel (pos) {
  call_resetPixel(pos)
  showMatlabString()
  showPixelString()
  updatePSV()
  updateSH()
  showPSVString()
  showSHString()
  showYoungsModulusString()
  showPoissonsRatioString()
  generate_table()
}

function showPixelString () {
  pixelStrElem.innerText = getPixelString()
}

function showMatlabString () {
  let ml = getMatlabString()
  matlabStrElem.innerText = ml
}
function readLocalData () {
  let reader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
  reader.open('GET', 'file:///E:/nanomine/src/modules/metamine/datanew.txt', false)
  reader.send(null)
  let text = reader.responseText
  console.log(text)
  let dataDict = parseData(text)
  return dataDict
}
function showPSVString () {
  if (matlabStrElem.innerText in dataDict.PSV) {
    psvElem.innerText = dataDict.PSV[matlabStrElem.innerText]
  } else {
    psvElem.innerText = 'N/A'
  }
}
function showSHString () {
  if (matlabStrElem.innerText in dataDict.SH) {
    shElem.innerText = dataDict.SH[matlabStrElem.innerText]
  } else {
    shElem.innerText = 'N/A'
  }
}
function showYoungsModulusString () {
  if (matlabStrElem.innerText in dataDict.YoungsModulus) {
    ymElem.innerText = dataDict.YoungsModulus[matlabStrElem.innerText]
  } else {
    ymElem.innerText = 'N/A'
  }
}
function showPoissonsRatioString () {
  if (matlabStrElem.innerText in dataDict.PoissonsRatio) {
    prElem.innerText = dataDict.PoissonsRatio[matlabStrElem.innerText]
  } else {
    prElem.innerText = 'N/A'
  }
}
function updatePSV () {
  if (matlabStrElem.innerText in dataDict.PSV) {
    psvString = dataDict.PSV[matlabStrElem.innerText]
    psv = psvString.substring(1, psvString.length - 1).split(/\s+/)
  } else {
    psv = []
    for (let i = 0; i < sumFromOne(size / 2) + 1; i++) {
      psv.push('N/A')
    }
  }
}
function updateSH () {
  if (matlabStrElem.innerText in dataDict.SH) {
    shString = dataDict.SH[matlabStrElem.innerText]
    sh = shString.substring(1, shString.length - 1).split(/\s+/)
  } else {
    sh = []
    for (let i = 0; i < sumFromOne(size / 2) + 1; i++) {
      sh.push('N/A')
    }
  }
}
function generate_table () {
  // get the reference for the body
  let body = document.getElementsByTagName('body')[0]
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
    if (i == 0) {
      // plus 1 column for the first column, plus another 1 for "<"
      for (let j = 0; j < sumFromOne(size / 2) + 2; j++) {
        let cell = document.createElement('td')
        cell.setAttribute('width', '' + (100.0 / (sumFromOne(size / 2) + 2)) + '%')
        if (j == 0) {
          var cellText = document.createTextNode('Bandgap Number')
        } else {
          var cellText = document.createTextNode(j)
        }
        cell.appendChild(cellText)
        row.appendChild(cell)
      }
    }
    // second row PSV
    else if (i == 1) {
      for (let j = 0; j < sumFromOne(size / 2) + 2; j++) {
        // Create a <td> element and a text node, make the text
        // node the contents of the <td>, and put the <td> at
        // the end of the table row
        let cell = document.createElement('td')
        cell.setAttribute('width', '' + (100.0 / (sumFromOne(size / 2) + 2)) + '%')
        if (j == 0) {
          var cellText = document.createTextNode('PSV')
        } else if (psv[j - 1] != 'N/A') {
          var cellText = document.createTextNode(parseFloat(psv[j - 1]).toExponential(2))
        } else {
          var cellText = document.createTextNode(psv[j - 1])
        }
        cell.appendChild(cellText)
        row.appendChild(cell)
      }
    }
    // third row SH
    else if (i == 2) {
      for (let j = 0; j < sumFromOne(size / 2) + 2; j++) {
        let cell = document.createElement('td')
        cell.setAttribute('width', '' + (100.0 / (sumFromOne(size / 2) + 2)) + '%')
        if (j == 0) {
          var cellText = document.createTextNode('SH')
        } else if (sh[j - 1] != 'N/A') {
          var cellText = document.createTextNode(parseFloat(sh[j - 1]).toExponential(2))
        } else {
          var cellText = document.createTextNode(sh[j - 1])
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
drawGrid(lw, c.width, c.height, parseInt(size), p)
showMatlabString()
showPixelString()
updatePSV()
updateSH()
showPSVString()
showSHString()
showYoungsModulusString()
showPoissonsRatioString()
generate_table()
*/
