import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { deleteDoohBriefMediaBySlot, uploadDoohBriefFile } from '../doohUpload'
import { toast } from '../../../lib/toast'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import DoohBriefManagedImage from './DoohBriefManagedImage.jsx'
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  PencilSquareIcon,
  Square2StackIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

function deriveFileExtension(url, fallback = '') {
  try {
    const u = new URL(url, window.location.href)
    const name = u.pathname.split('/').pop() ?? ''
    const dot = name.lastIndexOf('.')
    if (dot > 0 && dot < name.length - 1) return name.slice(dot)
  } catch {
    /* ignore */
  }
  return fallback ? (fallback.startsWith('.') ? fallback : `.${fallback}`) : ''
}

function DownloadMediaButton({ url, filename, label = 'Download' }) {
  const [busy, setBusy] = useState(false)
  if (!url) return null

  async function handleDownload(event) {
    event.preventDefault()
    event.stopPropagation()
    setBusy(true)
    try {
      const res = await fetch(url, { credentials: 'omit' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const ext = deriveFileExtension(url, blob.type.split('/')[1] || '')
      const finalName = filename ? `${filename}${ext}` : url.split('/').pop() || 'download'
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = finalName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
      toast.success(`${label} downloaded`)
    } catch (e) {
      toast.error(e?.message ?? 'Download failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      title={label}
      aria-label={label}
      className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-ink-tertiary hover:text-accent hover:bg-surface-muted/60 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-accent" />
      ) : (
        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}

const COLLAPSE_LINE_CLAMP = 10

function CollapsiblePrompt({ text, className = '' }) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflows(el.scrollHeight - el.clientHeight > 1)
  }, [text])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (expanded) return
      setOverflows(el.scrollHeight - el.clientHeight > 1)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [expanded])

  const collapsedStyle = expanded
    ? undefined
    : {
        display: '-webkit-box',
        WebkitLineClamp: COLLAPSE_LINE_CLAMP,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }

  return (
    <div className={className}>
      <div ref={ref} className="dooh-sc-ptxt dooh-sc-ptxt--full" style={collapsedStyle}>
        {text}
      </div>
      {overflows ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setExpanded((prev) => !prev)
          }}
          className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs text-accent hover:opacity-80 transition-opacity"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="h-3.5 w-3.5" aria-hidden />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden />
              <span>Show more</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}

function CopyPromptButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const value = String(text ?? '').trim()
  if (!value) return null

  async function handleCopy(event) {
    event.preventDefault()
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copied`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label.toLowerCase()}`}
      aria-label={`Copy ${label.toLowerCase()}`}
      className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-ink-tertiary hover:text-accent hover:bg-surface-muted/60 transition-colors"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4" aria-hidden />
      ) : (
        <Square2StackIcon className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}

function Corners() {
  return (
    <>
      <span className="dooh-sc-img-corner tl" aria-hidden />
      <span className="dooh-sc-img-corner tr" aria-hidden />
      <span className="dooh-sc-img-corner bl" aria-hidden />
      <span className="dooh-sc-img-corner br" aria-hidden />
    </>
  )
}

/**
 * @param {{
 *   scene: object,
 *   briefSlug?: string,
 *   media?: {
 *     finalVideo?: string | null,
 *     finalStill?: string | null,
 *     sceneMainImage?: string | null,
 *     sceneMainUploaded?: boolean,
 *     splitPanelImage?: string | null,
 *     splitPanelUploaded?: boolean,
 *     finalVideoUploaded?: boolean,
 *     finalStillUploaded?: boolean,
 *   },
 *   onUploadDone?: () => Promise<void> | void,
 *   onSavePrompts?: (sceneId: string, prompts: object) => Promise<void> | void,
 *   onDeleteScene?: (scene: object) => Promise<void> | void,
 *   confirmRemove?: (options: object) => Promise<boolean>,
 *   onActivate?: (sceneId: string) => void,
 *   isActive?: boolean,
 *   savingPrompts?: boolean,
 *   deletingScene?: boolean,
 *   onMediaClick: (opts: { src?: string, alt?: string, videoSrc?: string }) => void,
 * }} props
 */
export default function DoohSceneCard({
  scene,
  isActive = false,
  briefSlug,
  media,
  onUploadDone,
  onSavePrompts,
  onDeleteScene,
  confirmRemove,
  onActivate,
  savingPrompts = false,
  deletingScene = false,
  onMediaClick,
}) {
  const [tab, setTab] = useState('image')
  const [busyKind, setBusyKind] = useState(null)
  const [editingVideoPrompts, setEditingVideoPrompts] = useState(false)
  const [editingStillPrompts, setEditingStillPrompts] = useState(false)
  const img = scene.image ?? {}

  async function upload(kind, file) {
    if (!briefSlug || !file) return
    setBusyKind(`up:${kind}`)
    try {
      await uploadDoohBriefFile(file, { briefSlug, sceneId: scene.id, kind })
      toast.success('Upload saved')
      await onUploadDone?.()
    } catch (e) {
      toast.error(e?.message ?? 'Upload failed')
    } finally {
      setBusyKind(null)
    }
  }

  async function removeUploaded(kind) {
    if (!briefSlug) return
    const ok = confirmRemove
      ? await confirmRemove({
          title: 'Remove image',
          message: 'Are you sure you want to remove this uploaded image?',
          confirmLabel: 'Yes',
          variant: 'danger',
        })
      : true
    if (!ok) return

    setBusyKind(`rm:${kind}`)
    try {
      await deleteDoohBriefMediaBySlot({ briefSlug, sceneId: scene.id, kind })
      toast.success('Uploaded image removed')
      await onUploadDone?.()
    } catch (e) {
      toast.error(e?.message ?? 'Remove failed')
    } finally {
      setBusyKind(null)
    }
  }

  /** Any overlay op on this scene image area */
  const sceneImgBusy = busyKind !== null

  const sceneMainImage = media?.sceneMainImage
  const sceneMainUploaded = !!media?.sceneMainUploaded
  const splitPanelImage = media?.splitPanelImage
  const splitPanelUploaded = !!media?.splitPanelUploaded
  const finalVideo = media?.finalVideo
  const finalStill = media?.finalStill
  const finalVideoUploaded = !!media?.finalVideoUploaded
  const finalStillUploaded = !!media?.finalStillUploaded
  const uid = `${scene.id}`

  /** Main raster: DB uploads only (`dooh_brief_media`). */
  function mainHeroUrl() {
    return sceneMainImage ?? finalStill ?? null
  }

  /** Same asset URL as the Image tab hero — Still tab previews this only. */
  function primaryImageTabUrl() {
    if (img.layout === 'split' && img.left) {
      return splitPanelImage ?? finalStill ?? null
    }
    return mainHeroUrl()
  }

  /** Remove matches what is shown: scene main row, else final-still row. */
  function removeMainHeroByDisplay() {
    if (sceneMainImage && sceneMainUploaded) void removeUploaded('scene_main_image')
    else if (!sceneMainImage && finalStill && finalStillUploaded) void removeUploaded('final_still')
  }

  /** Allow main panel controls while these ops run (hero + split). */
  function isMainHeroBusyKey(k) {
    if (!k) return false
    return (
      k === 'up:scene_main_image' ||
      k === 'rm:scene_main_image' ||
      k === 'up:final_still' ||
      k === 'rm:final_still' ||
      k === 'up:split_panel_image' ||
      k === 'rm:split_panel_image'
    )
  }

  const renderMainImage = () => {
    const canReplace = !!briefSlug

    if (img.layout === 'split' && img.left) {
      const leftDisplay = splitPanelImage ?? finalStill ?? null
      return (
        <DoohBriefManagedImage
          className={`dooh-sc-img${img.left.contain ? ' dooh-contain' : ''}`}
          style={{ maxWidth: 280, flexShrink: 0, aspectRatio: '9/16', height: 280 }}
          inputId={`dooh-repl-${uid}-split`}
          label={leftDisplay ? 'Replace image' : 'Add image'}
          busy={busyKind === 'up:split_panel_image'}
          removeBusy={busyKind === 'rm:split_panel_image'}
          disabled={sceneImgBusy && !isMainHeroBusyKey(busyKind)}
          showRemove={
            canReplace &&
            (splitPanelUploaded || (!splitPanelImage && !!finalStill && finalStillUploaded))
          }
          onRemove={() => {
            if (splitPanelUploaded) removeUploaded('split_panel_image')
            else if (!splitPanelImage && finalStill && finalStillUploaded) removeUploaded('final_still')
          }}
          onPickFile={(f) => upload('split_panel_image', f)}
        >
          <Corners />
          {leftDisplay ? (
            <img
              src={leftDisplay}
              alt=""
              onClick={() => onMediaClick({ src: leftDisplay, alt: scene.title })}
            />
          ) : canReplace ? (
            <div className="dooh-sc-img-ph">
              <div className="ph-grid" aria-hidden />
              <span className="ph-num">{scene.code}</span>
              <span className="ph-lbl">{img.left?.phLabel ?? img.phLabel ?? scene.title ?? 'Split'}</span>
              {img.phHint ? <span className="ph-hint">{img.phHint}</span> : null}
            </div>
          ) : (
            <div className="flex min-h-[160px] w-full items-center justify-center bg-surface-deep text-[10px] text-ink-tertiary">
              No image
            </div>
          )}
          {img.left.badge ? <span className="dooh-sc-img-badge">{img.left.badge}</span> : null}
        </DoohBriefManagedImage>
      )
    }

    if (img.placeholder) {
      const heroPh = sceneMainImage ?? finalStill
      if (heroPh) {
        return (
          <DoohBriefManagedImage
            className="dooh-sc-img"
            inputId={`dooh-repl-${uid}-main`}
            label="Replace image"
            busy={busyKind === 'up:scene_main_image' || busyKind === 'up:final_still'}
            removeBusy={busyKind === 'rm:scene_main_image' || busyKind === 'rm:final_still'}
            disabled={sceneImgBusy && !isMainHeroBusyKey(busyKind)}
            showRemove={
              canReplace &&
              ((!!sceneMainImage && sceneMainUploaded) ||
                (!sceneMainImage && !!finalStill && finalStillUploaded))
            }
            onRemove={removeMainHeroByDisplay}
            onPickFile={(f) => upload('scene_main_image', f)}
          >
            <Corners />
            <img
              src={heroPh}
              alt=""
              onClick={() => onMediaClick({ src: heroPh, alt: scene.title })}
            />
            {img.badge ? <span className="dooh-sc-img-badge">{img.badge}</span> : null}
          </DoohBriefManagedImage>
        )
      }

      return (
        <DoohBriefManagedImage
          className="dooh-sc-img"
          inputId={`dooh-repl-${uid}-main`}
          label="Add or replace image"
          busy={busyKind === 'up:scene_main_image' || busyKind === 'up:final_still'}
          removeBusy={busyKind === 'rm:scene_main_image' || busyKind === 'rm:final_still'}
          disabled={sceneImgBusy && !isMainHeroBusyKey(busyKind)}
          showRemove={false}
          onPickFile={(f) => upload('scene_main_image', f)}
        >
          <Corners />
          <div className="dooh-sc-img-ph">
            <div className="ph-grid" aria-hidden />
            <span className="ph-num">{scene.code}</span>
            <span className="ph-lbl">{img.phLabel}</span>
            {img.phHint ? <span className="ph-hint">{img.phHint}</span> : null}
          </div>
          {img.badge ? <span className="dooh-sc-img-badge">{img.badge}</span> : null}
        </DoohBriefManagedImage>
      )
    }

    const fileDisplay = mainHeroUrl()

    return (
      <DoohBriefManagedImage
        className="dooh-sc-img"
        inputId={`dooh-repl-${uid}-main`}
        label={fileDisplay ? 'Replace image' : 'Add image'}
        busy={busyKind === 'up:scene_main_image' || busyKind === 'up:final_still'}
        removeBusy={busyKind === 'rm:scene_main_image' || busyKind === 'rm:final_still'}
        disabled={sceneImgBusy && !isMainHeroBusyKey(busyKind)}
        showRemove={
          canReplace &&
          ((!!sceneMainImage && sceneMainUploaded) ||
            (!sceneMainImage && !!finalStill && finalStillUploaded))
        }
        onRemove={removeMainHeroByDisplay}
        onPickFile={(f) => upload('scene_main_image', f)}
      >
        <Corners />
        {fileDisplay ? (
          <img
            src={fileDisplay}
            alt=""
            onClick={() => onMediaClick({ src: fileDisplay, alt: scene.title })}
          />
        ) : canReplace ? (
          <div className="dooh-sc-img-ph">
            <div className="ph-grid" aria-hidden />
            <span className="ph-num">{scene.code}</span>
            <span className="ph-lbl">{img.phLabel ?? scene.title ?? 'Scene'}</span>
            {img.phHint ? <span className="ph-hint">{img.phHint}</span> : null}
          </div>
        ) : (
          <div className="flex min-h-[200px] w-full items-center justify-center bg-surface-deep text-[10px] text-ink-tertiary">
            No image
          </div>
        )}
        {img.badge ? <span className="dooh-sc-img-badge">{img.badge}</span> : null}
      </DoohBriefManagedImage>
    )
  }

  const p = scene.prompts ?? {}
  const summarizePrompt = (value) => {
    const raw = String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!raw) return ''

    // Drop common metadata tails so summary focuses on scene content.
    const contentOnly = raw.split(/\b(?:Style|Camera|Lighting|Mood|Duration|Aspect Ratio)\s*:/i)[0].trim()
    const firstSentence = contentOnly.split(/[.!?](?:\s|$)/)[0].trim()
    const basis = (firstSentence || contentOnly || raw).replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '')
    if (!basis) return ''

    const words = basis.split(/\s+/)
    if (words.length <= 16) return basis
    return `${words.slice(0, 16).join(' ')}...`
  }
  const cleanSummaryLabelPrefix = (value, label) =>
    String(value ?? '')
      .replace(new RegExp(`^${label}\\s*:?\\s*`, 'i'), '')
      .trim()
  const summaryValue = ({ summary, prompt, label }) => {
    const cleanedSummary = cleanSummaryLabelPrefix(summary, label)
    const hasSummary = cleanedSummary.length > 0
    const source = hasSummary ? cleanedSummary : prompt
    const concise = summarizePrompt(source)
    return concise || cleanedSummary || summarizePrompt(prompt)
  }
  const mergedNegative = Array.from(
    new Set(
      [p.negativeStill, p.negativeVideo]
        .filter(Boolean)
        .flatMap((text) => String(text).split('·'))
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ).join(' · ')
  const baseCompositionRows = img.compositionRows?.length
    ? img.compositionRows.map((row) => ({
        key: row?.key ?? '',
        value: row?.value ?? '',
        html: true,
      }))
    : [{ key: 'Scene', value: scene.title ?? '', html: false }]
  const compositionRows = (() => {
    const rows = [...baseCompositionRows]
    const upsert = (key, value) => {
      if (!String(value ?? '').trim()) return
      const idx = rows.findIndex((row) => String(row?.key ?? '').toLowerCase() === key.toLowerCase())
      const nextRow = { key, value, html: false }
      if (idx >= 0) rows[idx] = nextRow
      else rows.push(nextRow)
    }
    upsert(
      'Photo summary',
      summaryValue({ summary: p.photoSummary, prompt: p.still, label: 'photo summary' }),
    )
    upsert(
      'Video summary',
      summaryValue({ summary: p.videoSummary, prompt: p.video, label: 'video summary' }),
    )
    upsert('Negative', mergedNegative)
    return rows.filter((row) => String(row.value ?? '').trim().length > 0)
  })()
  const [videoDraft, setVideoDraft] = useState({
    video: p.video ?? '',
    negativeVideo: p.negativeVideo ?? '',
  })
  const [stillDraft, setStillDraft] = useState({
    still: p.still ?? '',
    negativeStill: p.negativeStill ?? '',
  })
  const isBrandOutro = !!scene.brandOutro
  const stillTabHeroUrl = primaryImageTabUrl()
  const stillDisplayUrl = finalStill ?? stillTabHeroUrl

  function startVideoPromptEdit() {
    setVideoDraft({
      video: p.video ?? '',
      negativeVideo: p.negativeVideo ?? '',
    })
    setEditingVideoPrompts(true)
  }

  async function saveVideoPrompts() {
    await onSavePrompts?.(scene.id, {
      video: videoDraft.video,
      still: p.still ?? '',
      negativeVideo: videoDraft.negativeVideo,
      negativeStill: p.negativeStill ?? '',
    })
    setEditingVideoPrompts(false)
  }

  function cancelVideoPromptEdit() {
    setVideoDraft({
      video: p.video ?? '',
      negativeVideo: p.negativeVideo ?? '',
    })
    setEditingVideoPrompts(false)
  }

  function startStillPromptEdit() {
    setStillDraft({
      still: p.still ?? '',
      negativeStill: p.negativeStill ?? '',
    })
    setEditingStillPrompts(true)
  }

  async function saveStillPrompts() {
    await onSavePrompts?.(scene.id, {
      video: p.video ?? '',
      still: stillDraft.still,
      negativeVideo: p.negativeVideo ?? '',
      negativeStill: stillDraft.negativeStill,
    })
    setEditingStillPrompts(false)
  }

  function cancelStillPromptEdit() {
    setStillDraft({
      still: p.still ?? '',
      negativeStill: p.negativeStill ?? '',
    })
    setEditingStillPrompts(false)
  }

  function activateCard() {
    onActivate?.(scene.id)
  }

  function handleCardClick(event) {
    const target = event.target
    if (!(target instanceof Element)) {
      activateCard()
      return
    }
    if (target.closest('button, a, input, select, textarea, label')) return
    activateCard()
  }

  return (
    <article
      className={`dooh-sc${isBrandOutro ? ' dooh-sc-full' : ''}${isActive ? ' is-active' : ''}`}
      id={scene.id}
      onClick={handleCardClick}
      onFocusCapture={activateCard}
    >
      <div className="dooh-sc-head">
        <span className="dooh-sc-head-ghost" aria-hidden>
          {scene.num}
        </span>
        <div className="dooh-sc-head-left">
          <div className="dooh-sc-head-top">
            <span className="dooh-sc-snum">{scene.code}</span>
            <span className="dooh-sc-title">{scene.title}</span>
          </div>
          <div className="dooh-sc-head-meta">
            {scene.time ? <Badge variant="gray">{scene.time}</Badge> : null}
            {scene.lens ? <Badge variant="gray">Focus {scene.lens}</Badge> : null}
          </div>
        </div>
        {isActive ? (
          <div className="dooh-sc-head-actions">
            <Button
              type="button"
              size="xs"
              variant="dangerMuted"
              icon={TrashIcon}
              className="px-2! py-1!"
              title="Delete scene"
              aria-label="Delete selected scene"
              loading={deletingScene}
              onClick={() => onDeleteScene?.(scene)}
            />
          </div>
        ) : null}
      </div>
      {!isBrandOutro ? (
        <div className="flex w-[55%] gap-1.5 px-[9px] pb-[10px]" role="tablist">
          {(['image', 'video', 'still']).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className="btn-outline btn-sm relative cursor-pointer disabled:cursor-not-allowed flex-1"
              onClick={() => setTab(key)}
            >
              {key === 'image' ? 'Image' : key === 'video' ? 'Video' : 'Still'}
            </button>
          ))}
        </div>
      ) : null}
      <div className={`dooh-sc-pane${tab === 'image' ? ' dooh-active' : ''}`} role="tabpanel" hidden={tab !== 'image'}>
        <div className="dooh-sc-image-layout">
          <div className="dooh-sc-image-layout__media">{renderMainImage()}</div>
          <div className="dooh-sc-image-layout__aside">
            {compositionRows.length ? (
              <>
                <div className="dooh-sc-ptxt-label flex items-center justify-between gap-2">
                  <span>Composition</span>
                  <DownloadMediaButton
                    url={mainHeroUrl()}
                    filename={`${scene.code ?? scene.id}-image`}
                    label="Download image"
                  />
                </div>
                <div className="dooh-card-table dooh-card-table--kv">
                  <table>
                    <tbody>
                      {compositionRows.map((row, idx) => (
                        <tr key={`${scene.id}-${row.key}-${idx}`}>
                          <td>{row.key}</td>
                          <td>
                            {row.html ? (
                              <span dangerouslySetInnerHTML={{ __html: row.value }} />
                            ) : (
                              row.value
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
            {img.paletteNote ? (
              <p className="dooh-sc-intent dooh-sc-image-layout__palette-note">
                <span dangerouslySetInnerHTML={{ __html: img.paletteNote }} />
              </p>
            ) : null}
          </div>
        </div>
        <div className="dooh-sc-intent" dangerouslySetInnerHTML={{ __html: scene.intentHtml ?? '' }} />
      </div>
      {!isBrandOutro ? (
        <>
          <div className={`dooh-sc-pane${tab === 'video' ? ' dooh-active' : ''}`} role="tabpanel" hidden={tab !== 'video'}>
            <div className="dooh-sc-prompt-wrap">
              <div className="mb-3 flex gap-2">
                {editingVideoPrompts ? (
                  <>
                    <Button type="button" size="sm" variant="outline" icon={XMarkIcon} onClick={cancelVideoPromptEdit}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" loading={savingPrompts} onClick={saveVideoPrompts}>
                      Save
                    </Button>
                  </>
                ) : (
                  <Button type="button" size="sm" variant="outline" icon={PencilSquareIcon} onClick={startVideoPromptEdit}>
                    Edit prompts
                  </Button>
                )}
              </div>
              {finalVideo ? (
                <div style={{ marginBottom: 14 }}>
                  <div className="dooh-sc-ptxt-label flex items-center justify-between gap-2">
                    <span>Final video (uploaded)</span>
                    <DownloadMediaButton
                      url={finalVideo}
                      filename={`${scene.code ?? scene.id}-final-video`}
                      label="Download video"
                    />
                  </div>
                  {briefSlug ? (
                    <DoohBriefManagedImage
                      className="w-full [&_video]:block [&_video]:max-h-[320px] [&_video]:w-full [&_video]:rounded-lg [&_video]:border [&_video]:border-border"
                      inputId={`dooh-final-video-${uid}`}
                      accept="video/*"
                      overlayVariant="floating"
                      label="Replace video"
                      busy={busyKind === 'up:final_video'}
                      removeBusy={busyKind === 'rm:final_video'}
                      disabled={busyKind !== null && busyKind !== 'up:final_video' && busyKind !== 'rm:final_video'}
                      showRemove={finalVideoUploaded}
                      onRemove={() => removeUploaded('final_video')}
                      onPickFile={(f) => upload('final_video', f)}
                    >
                      <video src={finalVideo} controls playsInline preload="metadata" className="w-full bg-black" />
                    </DoohBriefManagedImage>
                  ) : (
                    <video
                      src={finalVideo}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-lg border border-border max-h-[320px] bg-black"
                    />
                  )}
                </div>
              ) : null}
              <div className="dooh-sc-ptxt-label flex items-center justify-between gap-2">
                <span>Video prompt</span>
                {!editingVideoPrompts ? <CopyPromptButton text={p.video} label="Video prompt" /> : null}
              </div>
              {editingVideoPrompts ? (
                <Input
                  as="textarea"
                  value={videoDraft.video}
                  onChange={(e) => setVideoDraft((prev) => ({ ...prev, video: e.target.value }))}
                />
              ) : (
                <CollapsiblePrompt text={p.video} />
              )}
              <div className="dooh-sc-ptxt-label mt-3 flex items-center justify-between gap-2">
                <span>Negative prompt</span>
                {!editingVideoPrompts ? (
                  <CopyPromptButton text={p.negativeVideo} label="Negative video prompt" />
                ) : null}
              </div>
              {editingVideoPrompts ? (
                <Input
                  as="textarea"
                  value={videoDraft.negativeVideo}
                  onChange={(e) => setVideoDraft((prev) => ({ ...prev, negativeVideo: e.target.value }))}
                />
              ) : p.negativeVideo ? (
                <div className="dooh-rule-box">
                  <b>Negative</b>
                  {p.negativeVideo}
                </div>
              ) : (
                <div className="dooh-sc-ptxt dooh-sc-ptxt--full">-</div>
              )}
              {briefSlug ? (
                <div className="mt-4 max-w-sm">
                  <Input
                    type="file"
                    accept="video/*"
                    label="Video file"
                    disabled={busyKind !== null && busyKind !== 'up:final_video'}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void upload('final_video', file)
                      e.target.value = ''
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className={`dooh-sc-pane${tab === 'still' ? ' dooh-active' : ''}`} role="tabpanel" hidden={tab !== 'still'}>
            <div className="dooh-sc-prompt-wrap">
              <div className="mb-3 flex gap-2">
                {editingStillPrompts ? (
                  <>
                    <Button type="button" size="sm" variant="outline" icon={XMarkIcon} onClick={cancelStillPromptEdit}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" loading={savingPrompts} onClick={saveStillPrompts}>
                      Save
                    </Button>
                  </>
                ) : (
                  <Button type="button" size="sm" variant="outline" icon={PencilSquareIcon} onClick={startStillPromptEdit}>
                    Edit prompts
                  </Button>
                )}
              </div>
              {briefSlug ? (
                <div style={{ marginBottom: 14 }}>
                  <div className="dooh-sc-ptxt-label flex items-center justify-between gap-2">
                    <span>Scene image</span>
                    <DownloadMediaButton
                      url={stillDisplayUrl}
                      filename={`${scene.code ?? scene.id}-scene-image`}
                      label="Download image"
                    />
                  </div>
                  <DoohBriefManagedImage
                    className="w-full rounded-lg border border-(--border-subtle) bg-(--surface-deep)"
                    inputId={`dooh-final-still-${uid}`}
                    accept="image/*"
                    label={finalStill ? 'Replace still image' : 'Upload still image'}
                    busy={busyKind === 'up:final_still'}
                    removeBusy={busyKind === 'rm:final_still'}
                    disabled={busyKind !== null && busyKind !== 'up:final_still' && busyKind !== 'rm:final_still'}
                    showRemove={finalStillUploaded}
                    onRemove={() => removeUploaded('final_still')}
                    onPickFile={(f) => upload('final_still', f)}
                  >
                    {stillDisplayUrl ? (
                      <button
                        type="button"
                        className="block w-full border-0 p-0 bg-transparent text-left"
                        onClick={() =>
                          onMediaClick({
                            src: stillDisplayUrl,
                            alt: scene.title || 'Scene image',
                          })
                        }
                      >
                        <img
                          src={stillDisplayUrl}
                          alt=""
                          className="w-full cursor-zoom-in rounded-lg border border-(--border-subtle) object-contain max-h-[280px] bg-(--surface-deep)"
                        />
                      </button>
                    ) : (
                      <div className="flex min-h-[180px] w-full items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/40 px-3 py-2.5 text-xs text-ink-tertiary">
                        No scene image yet.
                      </div>
                    )}
                  </DoohBriefManagedImage>
                </div>
              ) : (
                <p className="mb-4 rounded-lg border border-dashed border-border bg-surface-muted/40 px-3 py-2.5 text-xs text-ink-tertiary">
                  No scene image yet.
                </p>
              )}
              <div className="dooh-sc-ptxt-label flex items-center justify-between gap-2">
                <span>Still prompt</span>
                {!editingStillPrompts ? <CopyPromptButton text={p.still} label="Still prompt" /> : null}
              </div>
              {editingStillPrompts ? (
                <Input
                  as="textarea"
                  value={stillDraft.still}
                  onChange={(e) => setStillDraft((prev) => ({ ...prev, still: e.target.value }))}
                />
              ) : (
                <CollapsiblePrompt text={p.still} />
              )}
              <div className="dooh-sc-ptxt-label mt-3 flex items-center justify-between gap-2">
                <span>Negative prompt</span>
                {!editingStillPrompts ? (
                  <CopyPromptButton text={p.negativeStill} label="Negative still prompt" />
                ) : null}
              </div>
              {editingStillPrompts ? (
                <Input
                  as="textarea"
                  value={stillDraft.negativeStill}
                  onChange={(e) => setStillDraft((prev) => ({ ...prev, negativeStill: e.target.value }))}
                />
              ) : p.negativeStill ? (
                <div className="dooh-rule-box">
                  <b>Negative</b>
                  {p.negativeStill}
                </div>
              ) : (
                <div className="dooh-sc-ptxt dooh-sc-ptxt--full">-</div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </article>
  )
}
