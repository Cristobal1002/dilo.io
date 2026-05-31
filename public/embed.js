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
  var mode = (script.getAttribute('data-mode') || 'inline').toLowerCase()
  var bubbleLabel = script.getAttribute('data-label') || '¿Necesitas ayuda?'
  var staticClient = script.getAttribute('data-client') || ''
  var staticExternalId = script.getAttribute('data-external-id') || script.getAttribute('data-externalId') || ''

  var scriptSrc = script.getAttribute('src') || ''
  var origin = ''
  try {
    origin = new URL(scriptSrc, document.baseURI).origin
  } catch (e) {
    return
  }

  var runtimeContext = {
    clientId: staticClient,
    externalId: staticExternalId,
    ctx: '',
  }

  function buildIframeSrc() {
    var q = ['embed=1']
    if (runtimeContext.ctx) {
      q.push('ctx=' + encodeURIComponent(runtimeContext.ctx))
    } else if (runtimeContext.clientId) {
      q.push('client=' + encodeURIComponent(runtimeContext.clientId))
    } else if (runtimeContext.externalId) {
      q.push('external_id=' + encodeURIComponent(runtimeContext.externalId))
    }
    return origin + '/f/' + encodeURIComponent(flowId) + '?' + q.join('&')
  }

  var iframe = document.createElement('iframe')
  iframe.src = buildIframeSrc()
  iframe.style.width = width
  iframe.style.border = 'none'
  iframe.style.borderRadius = '16px'
  iframe.style.display = 'block'
  iframe.setAttribute('loading', 'lazy')
  iframe.setAttribute('title', 'Dilo Flow')
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')

  var container = document.createElement('div')
  container.setAttribute('data-dilo-embed', flowId)

  if (mode === 'bubble') {
    container.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:99999;font-family:system-ui,sans-serif;'
    iframe.style.height = height
    iframe.style.maxHeight = 'min(85vh,720px)'
    iframe.style.boxShadow = '0 12px 40px rgba(15,11,26,0.18)'
    iframe.style.display = 'none'

    var btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = bubbleLabel
    btn.setAttribute('aria-expanded', 'false')
    btn.style.cssText =
      'cursor:pointer;border:none;border-radius:999px;padding:14px 20px;font-size:14px;font-weight:700;color:#fff;background:linear-gradient(135deg,#9C77F5,#7B5BD4);box-shadow:0 8px 28px rgba(156,119,245,0.45);'

    var open = false
    btn.addEventListener('click', function () {
      open = !open
      btn.setAttribute('aria-expanded', open ? 'true' : 'false')
      iframe.style.display = open ? 'block' : 'none'
      btn.textContent = open ? 'Cerrar' : bubbleLabel
      if (open) iframe.src = buildIframeSrc()
    })

    container.appendChild(btn)
    container.appendChild(iframe)
    document.body.appendChild(container)
  } else {
    iframe.style.height = height
    script.parentNode.insertBefore(container, script.nextSibling)
    container.appendChild(iframe)
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== origin) return
    var d = event.data
    if (!d || d.type !== 'dilo:resize') return
    if (String(d.flowId) !== String(flowId)) return
    var h = Number(d.height)
    if (!h || h < 120) return
    iframe.style.height = Math.min(h, 3200) + 'px'
  })

  window.DiloEmbed = window.DiloEmbed || {}
  window.DiloEmbed.setContext = function (ctx) {
    if (!ctx || typeof ctx !== 'object') return
    if (ctx.clientId) runtimeContext.clientId = String(ctx.clientId)
    if (ctx.externalId) runtimeContext.externalId = String(ctx.externalId)
    if (ctx.ctx) runtimeContext.ctx = String(ctx.ctx)
    iframe.src = buildIframeSrc()
  }
  window.DiloEmbed.reload = function () {
    iframe.src = buildIframeSrc()
  }
})()
