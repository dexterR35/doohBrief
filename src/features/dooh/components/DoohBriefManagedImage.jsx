import { useCallback, useRef } from 'react'
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { cn } from '../../../utils/cn.js'
import { requestMediaFullscreen } from '../doohFullscreen.js'

/**
 * Managed hover overlay — replace / fullscreen / remove (PostgreSQL + Storage).
 * `overlayVariant`: `dim` = full dim (default); `floating` = bottom strip only (videos).
 */
export default function DoohBriefManagedImage({
  children,
  className,
  style,
  busy,
  removeBusy,
  disabled,
  accept = 'image/*',
  label = 'Change image',
  removeLabel = 'Remove',
  inputId,
  onPickFile,
  showRemove,
  onRemove,
  overlayVariant = 'dim',
  /** Show browser fullscreen for managed raster (img / video). */
  enableFullscreen = true,
}) {
  const wrapRef = useRef(null)

  const onFullscreenClick = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      void requestMediaFullscreen(wrapRef.current)
    },
    [],
  )

  const overlayCls =
    overlayVariant === 'floating'
      ? 'pointer-events-none absolute inset-x-0 bottom-0 z-[20] flex items-end justify-center bg-gradient-to-t from-black/65 via-black/20 to-transparent pb-2.5 pt-12 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'
      : 'pointer-events-none absolute inset-0 z-[20] flex items-end justify-center bg-black/45 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'

  const wrapCls = cn(
    'dooh-mgmt-img-wrap group relative min-h-0 min-w-0 overflow-hidden rounded-[inherit] [&:focus-within]:z-[1]',
    className,
  )

  const ctlCls =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm transition'
  const idleCls =
    'border-white/25 bg-[color-mix(in_srgb,var(--surface-elevated)_88%,transparent)] text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]'
  const warnCls =
    'border-red-400/35 bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--ink-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_32%,transparent)]'

  const block = !!(disabled || busy || removeBusy)

  return (
    <div ref={wrapRef} className={wrapCls} style={style}>
      {children}
      <div className={overlayCls}>
        <div className="pointer-events-auto mx-2 mb-3 flex flex-wrap items-center justify-center gap-2">
          <label
            htmlFor={inputId}
            className={cn(`${ctlCls} ${idleCls} cursor-pointer`, (block || busy) && 'cursor-not-allowed opacity-60')}
          >
            {busy ? 'Uploading…' : label}
          </label>
          <input
            id={inputId}
            type="file"
            accept={accept}
            className="sr-only"
            disabled={block || busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPickFile?.(f)
              e.target.value = ''
            }}
          />
          {enableFullscreen ? (
            <button
              type="button"
              disabled={block}
              className={cn(`${ctlCls} ${idleCls}`, block && 'cursor-not-allowed opacity-60')}
              onClick={onFullscreenClick}
            >
              <ArrowsPointingOutIcon className="h-4 w-4 shrink-0" aria-hidden />
              Fullscreen
            </button>
          ) : null}
          {showRemove && onRemove ? (
            <button
              type="button"
              disabled={block || removeBusy}
              className={cn(`${ctlCls} ${warnCls}`, (block || removeBusy) && 'cursor-wait opacity-60')}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove()
              }}
            >
              {removeBusy ? 'Removing…' : removeLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
