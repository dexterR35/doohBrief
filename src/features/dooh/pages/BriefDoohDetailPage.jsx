import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { buildBriefSidebarNav } from '../briefUtils'
import { stripDataUrlImagesForDbSave } from '../buildBriefFromGeneratorForm'
import {
  buildSceneIdReindexPlan,
  remapDoohBriefMediaSceneIds,
  deleteDoohBriefMediaBySlot,
  uploadDoohBriefFile,
} from '../doohUpload'
import { saveDoohBriefRow } from '../doohBriefsDb'
import { useDoohBriefWithFallback } from '../hooks/useDoohBriefCatalog'
import DoohBriefHeaderNav from '../components/DoohBriefHeaderNav'
import DoohBriefManagedImage from '../components/DoohBriefManagedImage'
import DoohTimeline from '../components/DoohTimeline'
import DoohSceneCard from '../components/DoohSceneCard'
import DoohImageLightbox from '../components/DoohImageLightbox'
import DoohBrandUploads from '../components/DoohBrandUploads'
import DoohGlobalTopbar from '../components/DoohGlobalTopbar'
import PageBoardLayout from '../../../components/layout/PageBoardLayout'
import {
  characterRefHasUploadedOverride,
  selectCharacterRefUrl,
  selectMediaForScene,
  useDoohBriefMedia,
} from '../hooks/useDoohBriefMedia'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import {
  ArrowDownTrayIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  buildDoohBriefExportJson,
  buildStandaloneBriefHtml,
  downloadDoohBriefJson,
  downloadDoohBriefHtml,
} from '../doohExportHtml'
import { toast } from '../../../lib/toast'
import { useConfirm } from '../../../hooks/useConfirm'
import { createDebouncedAsync } from '../../../lib/requestControl'

function nextCharacterRefId(existing) {
  const used = new Set((existing ?? []).map((r) => r.id).filter(Boolean))
  let n = 1
  while (used.has(`cr${n}`)) n += 1
  return `cr${n}`
}

function BriefDetailLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm text-ink-tertiary">Loading brief…</p>
      </div>
    </div>
  )
}

export default function BriefDoohDetailPage() {
  const { briefSlug } = useParams()
  const location = useLocation()
  const { brief, assetBase, blockingLoader, notFound, isFromDb, refreshBrief } =
    useDoohBriefWithFallback(briefSlug)
  const { rows, loading, refresh } = useDoohBriefMedia(briefSlug)

  const [lightbox, setLightbox] = useState(null)
  const { confirm, ConfirmModal } = useConfirm()

  const sidebarSections = useMemo(() => (brief ? buildBriefSidebarNav(brief) : []), [brief])
  const debouncedRefreshBrief = useMemo(
    () =>
      createDebouncedAsync(async () => {
        await refreshBrief()
      }, 220),
    [refreshBrief],
  )

  const sceneCodes = useMemo(() => {
    const m = {}
    for (const s of brief?.scenes ?? []) m[s.id] = s.code
    return m
  }, [brief])
  const characterRowsNormalized = useMemo(() => {
    const rows = Array.isArray(brief?.characterRows) ? brief.characterRows : []
    const feetRow = rows.find((r) => String(r?.key || '').toLowerCase() === 'feet')
    const accessoryRow = rows.find((r) => String(r?.key || '').toLowerCase() === 'accessory')
    if (!feetRow) return rows

    const mergedAccessories = [feetRow?.value, accessoryRow?.value]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join('<br/><br/>')

    const cleaned = rows.filter((r) => {
      const key = String(r?.key || '').toLowerCase()
      return key !== 'feet' && key !== 'accessory'
    })
    return [
      ...cleaned,
      {
        key: 'Accessories',
        value: mergedAccessories,
        hot: !!feetRow?.hot,
      },
    ]
  }, [brief])

  const firstScene = brief?.scenes?.[0] ?? null
  const firstSceneMedia = firstScene ? selectMediaForScene(rows, firstScene.id) : null
  const bannerSrc =
    firstScene?.image?.layout === 'split'
      ? firstSceneMedia?.splitPanelImage ?? firstSceneMedia?.finalStill ?? null
      : firstSceneMedia?.sceneMainImage ?? firstSceneMedia?.finalStill ?? null

  /** One pending media op at a time: `up-*` / `rm-*` */
  const [pendingMedia, setPendingMedia] = useState(null)
  const [addingCharacterRef, setAddingCharacterRef] = useState(false)
  const [deletingCharacterRefId, setDeletingCharacterRefId] = useState(null)
  const [editingFormatRows, setEditingFormatRows] = useState(false)
  const [savingFormatRows, setSavingFormatRows] = useState(false)
  const [formatRowsDraft, setFormatRowsDraft] = useState([])
  const [editingCharacterRows, setEditingCharacterRows] = useState(false)
  const [savingCharacterRows, setSavingCharacterRows] = useState(false)
  const [characterRowsDraft, setCharacterRowsDraft] = useState([])
  const [addingScene, setAddingScene] = useState(false)
  const [deletingSceneId, setDeletingSceneId] = useState(null)
  const [savingSceneId, setSavingSceneId] = useState(null)
  const [activeSceneId, setActiveSceneId] = useState(null)
  const outroScene = brief?.scenes?.find((s) => s.brandOutro)
  useEffect(() => {
    const sceneIds = (brief?.scenes ?? []).map((scene) => scene.id)
    if (!sceneIds.length) {
      setActiveSceneId(null)
      return
    }

    const hashSceneId = decodeURIComponent((location.hash || '').replace(/^#/, ''))
    if (hashSceneId && sceneIds.includes(hashSceneId)) {
      setActiveSceneId(hashSceneId)
      return
    }

    setActiveSceneId((prev) => (prev && sceneIds.includes(prev) ? prev : sceneIds[0]))
  }, [brief?.scenes, location.hash])


  const mediaBusy = pendingMedia !== null
  const characterRefInteractionLocked = deletingCharacterRefId !== null

  function buildNextScenesAfterChange(scenes) {
    return (scenes ?? []).map((scene, idx) => ({
      ...scene,
      id: `s${idx + 1}`,
      num: String(idx + 1).padStart(2, '0'),
      code: `SC${String(idx + 1).padStart(2, '0')}`,
    }))
  }

  async function saveBriefPayload(payload, successMessage) {
    if (!brief?.slug) return
    await saveDoohBriefRow({
      slug: brief.slug,
      payload: stripDataUrlImagesForDbSave(payload),
      assetBasePath: assetBase,
    })
    if (successMessage) toast.success(successMessage)
    try {
      await debouncedRefreshBrief()
    } catch (error) {
      if (error?.message !== 'Debounced by newer call') throw error
    }
  }

  function startEditFormatRows() {
    setFormatRowsDraft((brief.formatRows ?? []).map((row) => ({ ...row })))
    setEditingFormatRows(true)
  }

  function addFormatRowDraft() {
    setFormatRowsDraft((prev) => [...prev, { key: '', value: '' }])
  }

  async function saveFormatRows() {
    if (!brief?.slug) return
    setSavingFormatRows(true)
    try {
      const nextRows = formatRowsDraft.map((row) => ({
        key: String(row.key ?? '').trim(),
        value: String(row.value ?? '').trim(),
      }))
      await saveBriefPayload({ ...brief, formatRows: nextRows }, 'Format table saved')
      setEditingFormatRows(false)
    } catch (e) {
      toast.error(e?.message ?? 'Could not save format rows')
    } finally {
      setSavingFormatRows(false)
    }
  }

  function startEditCharacterRows() {
    setCharacterRowsDraft((brief.characterRows ?? []).map((row) => ({ ...row })))
    setEditingCharacterRows(true)
  }

  function addCharacterRowDraft() {
    setCharacterRowsDraft((prev) => [...prev, { key: '', value: '', hot: false }])
  }

  async function saveCharacterRows() {
    if (!brief?.slug) return
    setSavingCharacterRows(true)
    try {
      const nextRows = characterRowsDraft.map((row) => ({
        key: String(row.key ?? '').trim(),
        value: String(row.value ?? '').trim(),
        hot: !!row.hot,
      }))
      await saveBriefPayload({ ...brief, characterRows: nextRows }, 'Character table saved')
      setEditingCharacterRows(false)
    } catch (e) {
      toast.error(e?.message ?? 'Could not save character rows')
    } finally {
      setSavingCharacterRows(false)
    }
  }

  async function addSceneCard() {
    if (!brief?.slug) return
    setAddingScene(true)
    try {
      const nextIndex = (brief.scenes ?? []).length + 1
      const nextScene = {
        id: `s${nextIndex}`,
        num: String(nextIndex).padStart(2, '0'),
        code: `SC${String(nextIndex).padStart(2, '0')}`,
        title: `Scene ${nextIndex}`,
        time: '',
        lens: '',
        hot: false,
        image: {
          placeholder: true,
          phLabel: `Scene ${nextIndex}`,
          phHint: '',
          corners: true,
        },
        intentHtml: '',
        prompts: {
          video: '',
          still: '',
          negativeVideo: '',
          negativeStill: '',
        },
      }
      const nextScenes = buildNextScenesAfterChange([...(brief.scenes ?? []), nextScene])
      await saveBriefPayload({ ...brief, scenes: nextScenes }, 'Scene added')
    } catch (e) {
      toast.error(e?.message ?? 'Could not add scene')
    } finally {
      setAddingScene(false)
    }
  }

  async function removeSceneCard(scene) {
    if (!brief?.slug || !scene?.id) return
    const sceneName = String(scene.title || scene.code || scene.id).trim() || scene.id
    const ok = await confirm({
      title: 'Delete scene',
      message: `Type "${sceneName}" to delete this scene.`,
      requireText: sceneName,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return

    setDeletingSceneId(scene.id)
    try {
      const oldSceneOrder = (brief.scenes ?? []).map((s) => s.id)
      const withoutScene = (brief.scenes ?? []).filter((s) => s.id !== scene.id)
      const nextScenes = buildNextScenesAfterChange(withoutScene)
      const { sceneIdMap, removedSceneIds } = buildSceneIdReindexPlan({
        oldSceneOrder,
        nextSceneOrder: nextScenes.map((s) => s.id),
        removedSceneIds: [scene.id],
      })
      await remapDoohBriefMediaSceneIds({
        briefSlug: brief.slug,
        sceneIdMap,
        removedSceneIds,
      })
      await saveBriefPayload({ ...brief, scenes: nextScenes }, 'Scene deleted')
    } catch (e) {
      toast.error(e?.message ?? 'Could not delete scene')
    } finally {
      setDeletingSceneId(null)
    }
  }

  async function saveScenePrompts(sceneId, nextPrompts) {
    if (!brief?.slug || !sceneId) return
    setSavingSceneId(sceneId)
    try {
      const nextScenes = (brief.scenes ?? []).map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              prompts: {
                ...(scene.prompts ?? {}),
                ...nextPrompts,
              },
            }
          : scene,
      )
      await saveBriefPayload({ ...brief, scenes: nextScenes }, 'Scene prompts saved')
    } catch (e) {
      toast.error(e?.message ?? 'Could not save scene prompts')
      throw e
    } finally {
      setSavingSceneId(null)
    }
  }

  async function uploadBriefImage({ kind, sceneId, file }) {
    if (!brief?.slug || !file) return
    const key = `up-cref-${sceneId}`
    setPendingMedia(key)
    try {
      await uploadDoohBriefFile(file, { briefSlug: brief.slug, sceneId, kind })
      toast.success('Image saved')
      await refresh()
    } catch (e) {
      toast.error(e?.message ?? 'Upload failed')
    } finally {
      setPendingMedia(null)
    }
  }

  async function addCharacterRefCard() {
    if (!brief?.slug) return
    /** Drop trailing user-created refs with no DB upload so + does not stack empty cells */
    const refsTrimmed = [...(brief.characterRefs ?? [])]
    while (refsTrimmed.length > 0) {
      const last = refsTrimmed[refsTrimmed.length - 1]
      if (
        last?.createdSlot &&
        !characterRefHasUploadedOverride(rows, last.id)
      ) {
        refsTrimmed.pop()
      } else {
        break
      }
    }
    const id = nextCharacterRefId(refsTrimmed)
    const nextRefs = [
      ...refsTrimmed,
      {
        id,
        label: `Character ref · Slot ${refsTrimmed.length + 1}`,
        image: '',
        createdSlot: true,
      },
    ]
    setAddingCharacterRef(true)
    try {
      const payload = stripDataUrlImagesForDbSave({
        ...brief,
        characterRefs: nextRefs,
      })
      await saveDoohBriefRow({
        slug: brief.slug,
        payload,
        assetBasePath: assetBase,
      })
      toast.success('Character image slot added')
      await refreshBrief()
    } catch (e) {
      toast.error(e?.message ?? 'Could not add slot')
    } finally {
      setAddingCharacterRef(false)
    }
  }

  async function removeCharacterRefSlot(ref) {
    if (!brief?.slug || !ref?.id) return
    setDeletingCharacterRefId(ref.id)
    try {
      if (characterRefHasUploadedOverride(rows, ref.id)) {
        await deleteDoohBriefMediaBySlot({
          briefSlug: brief.slug,
          sceneId: ref.id,
          kind: 'character_ref',
        })
      }
      const nextRefs = (brief.characterRefs ?? []).filter((r) => r.id !== ref.id)
      const payload = stripDataUrlImagesForDbSave({
        ...brief,
        characterRefs: nextRefs,
      })
      await saveDoohBriefRow({
        slug: brief.slug,
        payload,
        assetBasePath: assetBase,
      })
      toast.success('Character ref removed')
      await refresh()
      await refreshBrief()
    } catch (e) {
      toast.error(e?.message ?? 'Could not remove ref')
    } finally {
      setDeletingCharacterRefId(null)
    }
  }

  async function removeBriefImage({ kind, sceneId }) {
    if (!brief?.slug) return
    const ok = await confirm({
      title: 'Remove image',
      message: 'Are you sure you want to remove this uploaded image?',
      confirmLabel: 'Yes',
      variant: 'danger',
    })
    if (!ok) return

    const key = `rm-cref-${sceneId}`
    setPendingMedia(key)
    try {
      await deleteDoohBriefMediaBySlot({ briefSlug: brief.slug, sceneId, kind })
      toast.success('Uploaded image removed')
      await refresh()
    } catch (e) {
      toast.error(e?.message ?? 'Remove failed')
    } finally {
      setPendingMedia(null)
    }
  }

  if (blockingLoader) {
    return <BriefDetailLoader />
  }

  if (notFound || !brief) {
    return <Navigate to="/briefs-dooh" replace />
  }

  return (
    <div className="h-full">
      <PageBoardLayout
        className="dooh-brief-layout"
        topbar={<DoohGlobalTopbar />}
        sidebar={<DoohBriefHeaderNav sections={sidebarSections} briefName={brief.listTitle ?? brief.title} />}
      >
        <div className="dooh-brief-main">
          <div className="page-header dooh-brief-detail-header">
            <div>
              <div className="flex items-center gap-2 text-sm text-ink-tertiary mb-1">
                <Link to="/briefs-dooh" className="hover:text-accent font-mono">
                  ← DOOH
                </Link>
              </div>
              <h1 className="page-header__title">{brief.title}</h1>
              <p className="page-header__sub">{brief.subtitle}</p>
            </div>
            <div className="page-header__actions flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  try {
                    const payload = buildDoohBriefExportJson({ brief, rows })
                    downloadDoohBriefJson(payload, `dooh-${brief.slug}-full`)
                    toast.success('JSON file downloaded')
                  } catch (e) {
                    toast.error(e?.message ?? 'JSON export failed')
                  }
                }}
              >
                Export JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={ArrowDownTrayIcon}
                onClick={() => {
                  try {
                    const html = buildStandaloneBriefHtml({ brief, rows })
                    downloadDoohBriefHtml(html, `dooh-${brief.slug}`)
                    toast.success('HTML file downloaded')
                  } catch (e) {
                    toast.error(e?.message ?? 'Export failed')
                  }
                }}
              >
                Export HTML
              </Button>
            </div>
          </div>

          <section id="overview">
            {brief?.slug ? (
              <div className="dooh-doc-banner">
                <div className="absolute inset-0 z-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-[center_28%]">
                  {bannerSrc ? (
                    <button
                      type="button"
                      className="block h-full w-full border-0 bg-transparent p-0 text-left"
                      onClick={() => setLightbox({ src: bannerSrc, alt: brief.title })}
                    >
                      <img src={bannerSrc} alt="" />
                    </button>
                  ) : (
                    <div className="flex h-full min-h-[80px] w-full items-center justify-center bg-surface-muted px-6 text-center text-sm text-ink-tertiary">
                      Banner is auto-linked to Scene 1 image.
                    </div>
                  )}
                </div>
                <div className="dooh-doc-banner-label z-3">
                  <span className="dooh-mgmt-brand-dot" style={{ width: 5, height: 5 }} />
                  {brief.bannerLabel}
                </div>
                <div className="dooh-doc-banner-pill z-3">{brief.headerPill}</div>
              </div>
            ) : null}
            <div className="dooh-doc-header-body">
              <div className="dooh-doc-header-meta flex flex-wrap gap-2">
                {brief.tags?.map((t) => (
                  <Badge key={t} variant="success">
                    {t}
                  </Badge>
                ))}
              </div>
              <h1 className="dooh-doc-h1">{brief.title}</h1>
              <p className="dooh-doc-subtitle">{brief.subtitle}</p>
              <p
                className="dooh-doc-intro"
                dangerouslySetInnerHTML={{ __html: brief.introHtml ?? '' }}
              />
              <div className="dooh-creative-arc flex flex-wrap items-center gap-2">
                {(brief.creativeArc ?? []).map((step, i, arr) => (
                  <span key={`${step}-${i}`} className="inline-flex items-center gap-2">
                    <Badge variant="success">{step}</Badge>
                    {i < arr.length - 1 ? (
                      <span className="text-ink-tertiary text-sm" aria-hidden>
                        →
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="dooh-divider" />

          {brief.formatRows?.length ? (
            <section id="format">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="dooh-section-label">Production</p>
                  <h2 className="dooh-doc-h2 mb-0">Format &amp; specs</h2>
                </div>
                <div className="flex gap-2">
                  {editingFormatRows ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={PlusIcon}
                        disabled={savingFormatRows}
                        onClick={addFormatRowDraft}
                      >
                        Add row
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={XMarkIcon}
                        disabled={savingFormatRows}
                        onClick={() => {
                          setEditingFormatRows(false)
                          setFormatRowsDraft([])
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" size="sm" loading={savingFormatRows} onClick={saveFormatRows}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" variant="outline" icon={PencilSquareIcon} onClick={startEditFormatRows}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              <div className="dooh-card-table dooh-card-table--kv">
                <table>
                  <tbody>
                    {(editingFormatRows ? formatRowsDraft : brief.formatRows).map((row, idx) => (
                      <tr key={`format-row-${idx}-${row.key ?? ''}`}>
                        <td>
                          {editingFormatRows ? (
                            <Input
                              value={row.key}
                              onChange={(e) =>
                                setFormatRowsDraft((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r)),
                                )
                              }
                            />
                          ) : (
                            row.key
                          )}
                        </td>
                        <td>
                          {editingFormatRows ? (
                            <Input
                              as="textarea"
                              value={row.value}
                              onChange={(e) =>
                                setFormatRowsDraft((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)),
                                )
                              }
                            />
                          ) : (
                            <span dangerouslySetInnerHTML={{ __html: row.value }} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="dooh-divider" />
            </section>
          ) : null}

          {brief.characterRows?.length || brief.characterRefs?.length || brief?.slug ? (
            <section id="character">
              <div className="dooh-character-direction-header">
                <div>
                  <p className="dooh-section-label">Direction</p>
                  <h2 className="dooh-doc-h2">Character direction</h2>
                </div>
                <div className="flex items-center gap-2">
                  {editingCharacterRows ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={PlusIcon}
                        disabled={savingCharacterRows}
                        onClick={addCharacterRowDraft}
                      >
                        Add row
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={XMarkIcon}
                        disabled={savingCharacterRows}
                        onClick={() => {
                          setEditingCharacterRows(false)
                          setCharacterRowsDraft([])
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" size="sm" loading={savingCharacterRows} onClick={saveCharacterRows}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      icon={PencilSquareIcon}
                      onClick={startEditCharacterRows}
                    >
                      Edit table
                    </Button>
                  )}
                  <button
                    type="button"
                    className="dooh-char-ref-add"
                    title="Add character image"
                    aria-label="Add character reference image"
                    disabled={addingCharacterRef || mediaBusy || characterRefInteractionLocked}
                    onClick={() => addCharacterRefCard()}
                  >
                    {addingCharacterRef ? (
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent" />
                    ) : (
                      <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
              {brief.characterRefs?.length ? (
                <div className="dooh-ref-grid">
                  {(brief.characterRefs ?? []).map((ref) => {
                    const url = selectCharacterRefUrl(rows, ref.id)
                    const upKey = `up-cref-${ref.id}`
                    const rmKey = `rm-cref-${ref.id}`
                    return (
                      <div key={ref.id} className="dooh-ref-cell">
                        <button
                          type="button"
                          className="dooh-char-ref-remove"
                          title="Remove this character ref from the brief"
                          aria-label="Remove this character reference slot from the brief"
                          disabled={
                            characterRefInteractionLocked ||
                            (mediaBusy &&
                              pendingMedia !== upKey &&
                              pendingMedia !== rmKey)
                          }
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeCharacterRefSlot(ref)
                          }}
                        >
                          {deletingCharacterRefId === ref.id ? (
                            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent" />
                          ) : (
                            <XMarkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          )}
                        </button>
                        <DoohBriefManagedImage
                          className="dooh-ref-cell-mgmt absolute inset-0 min-h-0 size-full"
                          inputId={`dooh-char-ref-${ref.id}`}
                          label={url ? 'Replace image' : 'Add image'}
                          busy={pendingMedia === upKey}
                          removeBusy={pendingMedia === rmKey}
                          disabled={
                            characterRefInteractionLocked ||
                            (mediaBusy &&
                              pendingMedia !== upKey &&
                              pendingMedia !== rmKey)
                          }
                          showRemove={characterRefHasUploadedOverride(rows, ref.id)}
                          onRemove={() => removeBriefImage({ kind: 'character_ref', sceneId: ref.id })}
                          onPickFile={(f) =>
                            uploadBriefImage({
                              kind: 'character_ref',
                              sceneId: ref.id,
                              file: f,
                            })
                          }
                        >
                          {url ? (
                            <img
                              className="absolute inset-0 size-full min-h-0 min-w-0 object-cover"
                              src={url}
                              alt=""
                              onClick={() => setLightbox({ src: url, alt: ref.label })}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-surface-muted px-3 text-center text-xs text-ink-tertiary">
                              Add or replace ({ref.label})
                            </div>
                          )}
                          <span className="dooh-ref-cell-label">{ref.label}</span>
                        </DoohBriefManagedImage>
                      </div>
                    )
                  })}
                </div>
              ) : null}
              {editingCharacterRows || characterRowsNormalized.length ? (
                <div className="dooh-card-table dooh-card-table--kv">
                  <table>
                    <tbody>
                      {(editingCharacterRows ? characterRowsDraft : characterRowsNormalized).map((row, idx) => (
                        <tr
                          key={`character-row-${idx}-${row.key ?? ''}`}
                          className={row.hot ? 'dooh-hot-row' : undefined}
                        >
                          <td>
                            {editingCharacterRows ? (
                              <Input
                                value={row.key}
                                onChange={(e) =>
                                  setCharacterRowsDraft((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r)),
                                  )
                                }
                              />
                            ) : (
                              row.key
                            )}
                          </td>
                          <td>
                            {editingCharacterRows ? (
                              <Input
                                as="textarea"
                                value={row.value}
                                onChange={(e) =>
                                  setCharacterRowsDraft((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)),
                                  )
                                }
                              />
                            ) : (
                              <span dangerouslySetInnerHTML={{ __html: row.value }} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="dooh-divider" />
            </section>
          ) : null}

          <section id="storyboard">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="dooh-section-label">Production · Storyboard</p>
                <h2 className="dooh-doc-h2 mb-0">Scenes · Storyboard</h2>
              </div>
              <Button type="button" size="sm" icon={PlusIcon} loading={addingScene} onClick={addSceneCard}>
                Add scene
              </Button>
            </div>

            {brief.timeline?.length ? (
              <DoohTimeline
                timeline={brief.timeline}
                sceneCodes={sceneCodes}
                endLabel={brief.timelineEndLabel ?? '10s'}
              />
            ) : null}

            <div className="dooh-storyboard">
              {(brief.scenes ?? []).map((scene) => (
                <DoohSceneCard
                  key={scene.id}
                  scene={scene}
                  isActive={activeSceneId === scene.id}
                  briefSlug={brief.slug}
                  media={selectMediaForScene(rows, scene.id)}
                  onUploadDone={refresh}
                  onSavePrompts={saveScenePrompts}
                  onDeleteScene={removeSceneCard}
                  onActivate={setActiveSceneId}
                  deletingScene={deletingSceneId === scene.id}
                  savingPrompts={savingSceneId === scene.id}
                  confirmRemove={confirm}
                  onMediaClick={({ src, alt, videoSrc }) => setLightbox({ src, alt, videoSrc })}
                />
              ))}
            </div>
          </section>

          {outroScene ? (
            <DoohBrandUploads
              briefSlug={brief.slug}
              sceneId={outroScene.id}
              media={selectMediaForScene(rows, outroScene.id)}
              refresh={refresh}
            />
          ) : null}

          <footer className="dooh-doc-footer">
            <span className="dooh-mgmt-brand-dot" aria-hidden />
            <span>
              <b>{brief.footerLine}</b>
            </span>
            <span>{brief.footerMeta}</span>
          </footer>
        </div>
      </PageBoardLayout>

      {lightbox ? (
        <DoohImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          videoSrc={lightbox.videoSrc}
          onClose={() => setLightbox(null)}
        />
      ) : null}

      {loading ? (
        <p className="text-xs text-ink-tertiary sr-only" aria-live="polite">
          Syncing uploads…
        </p>
      ) : null}
      {ConfirmModal}
    </div>
  )
}
