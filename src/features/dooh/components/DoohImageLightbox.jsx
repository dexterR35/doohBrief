import { useEffect } from 'react'

export default function DoohImageLightbox({ src, alt, videoSrc, onClose }) {
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  if (!src && !videoSrc) return null
  return (
    <div
      className="dooh-lightbox"
      role="dialog"
      aria-modal
      aria-label="Fullscreen preview"
      onClick={onClose}
    >
      <button type="button" className="dooh-lightbox-close" onClick={onClose}>
        Close · Esc
      </button>
      <div className="dooh-lightbox-panel" onClick={(e) => e.stopPropagation()}>
        {videoSrc ? (
          <video src={videoSrc} controls autoPlay className="dooh-lightbox-media" />
        ) : (
          <img src={src} alt={alt || ''} className="dooh-lightbox-media" />
        )}
      </div>
    </div>
  )
}
