import { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '../../utils/cn.js'

const SIZE_CLASS = {
  sm: 'modal-panel--sm',
  md: 'modal-panel--md',
  lg: 'modal-panel--lg',
  xl: 'modal-panel--xl',
  fullscreen: 'modal-panel--fullscreen',
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function Modal({ isOpen, onClose, title, subtitle, children, size = 'md', bodyClassName, disableBackdropClose = false, headerActions }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Scroll lock — DOM-safe, idempotent, HMR/StrictMode safe
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => {
      if (!disableBackdropClose) e.key === 'Escape' && onClose?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, disableBackdropClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return
    previousFocusRef.current = document.activeElement
    // Move focus into panel on next tick
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll(FOCUSABLE)
      const first = focusable[0]
      if (first) first.focus()
    })

    const handleTab = (e) => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.disabled && el.offsetParent !== null
      )
      if (!focusable.length) { e.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleTab)
      previousFocusRef.current?.focus?.()
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClass = SIZE_CLASS[size] ?? 'modal-panel--md'

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={disableBackdropClose ? undefined : onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn('modal-panel', sizeClass)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {(title || onClose) && (
          <div className="modal-header">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id={titleId} className="modal-title">
                  {title}
                </h2>
              )}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            {headerActions && <div className="flex items-center gap-2 mr-2">{headerActions}</div>}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={cn('badge badge--error shrink-0 modal-close')}
                aria-label="Close"
              >
                <XMarkIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span>Close</span>
              </button>
            )}
          </div>
        )}
        <div className={cn('modal-body', bodyClassName)}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
