;(function () {
  var scripts = document.getElementsByTagName('script')
  var script = null
  for (var i = scripts.length - 1; i >= 0; i--) {
    if (scripts[i].getAttribute('data-flow')) {
      script = scripts[i]
      break
    }
  }
  if (!script) return

  var flowId = script.getAttribute('data-flow')
  if (!flowId) return

  var height = script.getAttribute('data-height') || '600px'
  var width = script.getAttribute('data-width') || '100%'

  var scriptSrc = script.getAttribute('src') || ''
  var origin = ''
  try {
    origin = new URL(scriptSrc, document.baseURI).origin
  } catch (e) {
    return
  }

  var iframe = document.createElement('iframe')
  iframe.src = origin + '/f/' + encodeURIComponent(flowId) + '?embed=1'
  iframe.style.width = width
  iframe.style.height = height
  iframe.style.border = 'none'
  iframe.style.borderRadius = '16px'
  iframe.style.display = 'block'
  iframe.setAttribute('loading', 'lazy')
  iframe.setAttribute('title', 'Dilo Flow')
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')

  script.parentNode.insertBefore(iframe, script.nextSibling)

  window.addEventListener('message', function (event) {
    if (event.origin !== origin) return
    var d = event.data
    if (!d || d.type !== 'dilo:resize') return
    if (String(d.flowId) !== String(flowId)) return
    var h = Number(d.height)
    if (!h || h < 120) return
    iframe.style.height = Math.min(h, 3200) + 'px'
  })
})()
