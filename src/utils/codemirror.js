// Most of the code from this file comes from:
// https://github.com/codemirror/CodeMirror/blob/master/addon/mode/loadmode.js
// This actual code came from: https://github.com/filebrowser/frontend/blob/master/src/utils/codemirror.js
//    The issue created by hacdias on the codemirror site (along with his solution): https://github.com/codemirror/CodeMirror/issues/4838

import * as CodeMirror from 'codemirror'
// import store from '@/store'

// Make CodeMirror available globally so the modes' can register themselves.
window.CodeMirror = CodeMirror
CodeMirror.modeURL = /* store.state.baseURL + */ '/nmstatic/js/codemirror/mode/%N/%N.js'
CodeMirror.helperURL = '/nmstatic/js/codemirror/addon/%T/%N.js'
CodeMirror.helperStyleURL = '/nmstatic/js/codemirror/addon/%T/%N.css'
var loading = {}

function splitCallback (cont, n) {
  var countDown = n
  return function () {
    if (--countDown === 0) cont()
  }
}

function ensureDeps (mode, cont) {
  var deps = CodeMirror.modes[mode].dependencies
  if (!deps) return cont()
  var missing = []
  for (var i = 0; i < deps.length; ++i) {
    if (!CodeMirror.modes.hasOwnProperty(deps[i])) missing.push(deps[i])
  }
  if (!missing.length) return cont()
  var split = splitCallback(cont, missing.length)
  for (i = 0; i < missing.length; ++i) CodeMirror.requireMode(missing[i], split)
}

CodeMirror.requireMode = function (mode, cont) {
  if (typeof mode !== 'string') mode = mode.name
  if (CodeMirror.modes.hasOwnProperty(mode)) return ensureDeps(mode, cont)
  if (loading.hasOwnProperty(mode)) return loading[mode].push(cont)

  var file = CodeMirror.modeURL.replace(/%N/g, mode)
  console.log('CodeMirror.modeURL: ' + CodeMirror.modeURL)

  var script = document.createElement('script')
  script.src = file
  var others = document.getElementsByTagName('script')[0]
  var list = loading[mode] = [cont]

  CodeMirror.on(script, 'load', function () {
    ensureDeps(mode, function () {
      for (var i = 0; i < list.length; ++i) list[i]()
    })
  })

  others.parentNode.insertBefore(script, others)
}

CodeMirror.autoLoadMode = function (instance, mode) {
  if (CodeMirror.modes.hasOwnProperty(mode)) return

  CodeMirror.requireMode(mode, function () {
    instance.setOption('mode', mode)
  })
}
CodeMirror.requireHelper = function (helperType, helperName, cb) {
  // if (typeof mode !== 'string') mode = mode.name
  //  if (CodeMirror.modes.hasOwnProperty(mode)) return ensureDeps(mode, cont)
  if (loading.hasOwnProperty(helperName)) return loading[helperName].push(cb)

  var file = CodeMirror.helperURL.replace(/%N/g, helperName).replace(/%T/g, helperType)
  console.log('CodeMirror.helperURL: ' + CodeMirror.helperURL)

  var script = document.createElement('script')
  script.src = file
  var others = document.getElementsByTagName('script')[0]
  // var list = loading[helperName] = [cb]

  CodeMirror.on(script, 'load', function (ev) {
    // ensureDeps(mode, function () {
    //   for (var i = 0; i < list.length; ++i) list[i]()
    // })
    console.log('script loaded. ' + JSON.stringify(ev))
  })

  others.parentNode.insertBefore(script, others)
}

CodeMirror.autoLoadHelper = function (instance, helperType, helperName) {
  // if (CodeMirror.addons.hasOwnProperty(addonName)) return

  CodeMirror.requireHelper(helperType, helperName, function () {
    // instance.registerHelper(helperType, helperName,) // ?? cannot be right
  })
}

CodeMirror.requireHelperStylesheet = function (helperType, helperName, cb) {
  // if (typeof mode !== 'string') mode = mode.name
  //  if (CodeMirror.modes.hasOwnProperty(mode)) return ensureDeps(mode, cont)
  if (loading.hasOwnProperty(helperName)) return loading[helperName].push(cb)

  var file = CodeMirror.helperStyleURL.replace(/%N/g, helperName).replace(/%T/g, helperType)
  console.log('CodeMirror.helperStyleURL: ' + CodeMirror.helperStyleURL)

  var link = document.createElement('link')
  link.href = file
  link.type = 'text/css'
  link.rel = 'stylesheet'
  var others = document.getElementsByTagName('link')[0]
  // var list = loading[helperName] = [cb]

  CodeMirror.on(link, 'load', function (ev) {
    // ensureDeps(mode, function () {
    //   for (var i = 0; i < list.length; ++i) list[i]()
    // })
    console.log('stylesheet link loaded. ' + JSON.stringify(ev))
  })

  others.parentNode.insertBefore(link, others)
}

CodeMirror.autoLoadHelperStylesheet = function (instance, helperType, helperName) {
  // if (CodeMirror.addons.hasOwnProperty(addonName)) return

  CodeMirror.requireHelperStylesheet(helperType, helperName, function () {
    // instance.registerHelper(helperType, helperName,) // ?? cannot be right
  })
}

export default CodeMirror
