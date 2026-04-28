/**
 * True edge-to-edge viewer: fullscreen (or viewport overlay) black stage with `object-fit: contain`
 * so the full raster is visible — no cropping, original aspect preserved.
 */

function styleShellBase(el) {
  el.style.boxSizing = 'border-box'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.background = '#000'
  el.style.width = '100%'
  el.style.height = '100%'
}

function styleMediaContain(el) {
  el.style.maxWidth = '100vw'
  el.style.maxHeight = '100vh'
  el.style.width = 'auto'
  el.style.height = 'auto'
  el.style.objectFit = 'contain'
  el.style.objectPosition = 'center center'
}

/**
 * @param {Element | null} containerEl
 * @returns {Promise<boolean>}
 */
export async function requestMediaFullscreen(containerEl) {
  if (!containerEl || typeof document === 'undefined') return false

  const media = containerEl.querySelector('img, video')
  if (!media) return false

  const shell = document.createElement('div')
  shell.setAttribute('data-dooh-fs-shell', '')
  styleShellBase(shell)

  const clone = /** @type {HTMLImageElement | HTMLVideoElement} */ (media.cloneNode(true))
  clone.removeAttribute('width')
  clone.removeAttribute('height')
  if (clone.tagName === 'VIDEO') {
    clone.controls = true
    clone.playsInline = true
  }
  styleMediaContain(clone)

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = 'Close · Esc'
  closeBtn.setAttribute('aria-label', 'Close fullscreen')
  closeBtn.style.cssText = [
    'position:absolute',
    'top:12px',
    'right:12px',
    'z-index:3',
    'margin:0',
    'cursor:pointer',
    'border-radius:8px',
    'border:1px solid rgba(255,255,255,0.25)',
    'background:rgba(20,20,20,0.85)',
    'color:#fff',
    'font-family:system-ui,sans-serif',
    'font-size:12px',
    'padding:8px 12px',
  ].join(';')

  shell.appendChild(closeBtn)
  shell.appendChild(clone)
  document.body.appendChild(shell)

  let cleaned = false
  let fsListenerAdded = false

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    document.removeEventListener('keydown', onKey)
    if (fsListenerAdded) document.removeEventListener('fullscreenchange', onFs)
    if (shell.parentNode) shell.parentNode.removeChild(shell)
  }

  function onKey(e) {
    if (e.key === 'Escape') void exitViewer()
  }

  async function exitViewer() {
    if (cleaned) return
    try {
      if (document.fullscreenElement === shell) await document.exitFullscreen()
    } catch {
      /* ignore */
    }
    cleanup()
  }

  function onFs() {
    if (document.fullscreenElement === shell) return
    if (shell.parentNode) cleanup()
  }

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    void exitViewer()
  })
  shell.addEventListener('click', (e) => {
    if (e.target === shell) void exitViewer()
  })
  document.addEventListener('keydown', onKey)

  try {
    if (typeof shell.requestFullscreen === 'function') {
      await shell.requestFullscreen()
      document.addEventListener('fullscreenchange', onFs)
      fsListenerAdded = true
      return true
    }
  } catch {
    /* fall through */
  }

  /* No Fullscreen API: fixed overlay fills the viewport — still letterboxed contain inside shell */
  shell.style.position = 'fixed'
  shell.style.left = '0'
  shell.style.top = '0'
  shell.style.right = '0'
  shell.style.bottom = '0'
  shell.style.width = '100vw'
  shell.style.height = '100vh'
  shell.style.zIndex = '2147483646'
  return true
}
