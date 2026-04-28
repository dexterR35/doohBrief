import { supabase } from '../../lib/supabase'

const BUCKET = 'dooh-briefs'

/** Kinds that use the video size limit (150 MB). */
const DOOH_VIDEO_KINDS = ['final_video']

/** Images (and non-final video uploads): story frames, finals still, scene/card/banner/ref stills */
export const DOOH_MAX_IMAGE_BYTES = 20 * 1024 * 1024
/** Final video reel only */
export const DOOH_MAX_VIDEO_BYTES = 150 * 1024 * 1024

export function getDoohMaxBytesForKind(kind) {
  return DOOH_VIDEO_KINDS.includes(kind) ? DOOH_MAX_VIDEO_BYTES : DOOH_MAX_IMAGE_BYTES
}

/**
 * @param {File} file
 * @param {string} kind
 * @throws {Error} when file exceeds limit for kind
 */
export function assertDoohBriefFileWithinLimit(file, kind) {
  const max = getDoohMaxBytesForKind(kind)
  const isVid = DOOH_VIDEO_KINDS.includes(kind)
  if (file.size > max) {
    throw new Error(
      `File is too large (${file.name}). Maximum size for ${isVid ? 'video' : 'images'} is ${isVid ? '150 MB' : '20 MB'}.`,
    )
  }
}

/** Stored banner slot (`__banner__` or legacy NULL `scene_id`). */
export const DOOH_BRIEF_BANNER_SCENE_ID = '__banner__'

/**
 * Build a scene id reindex plan after scene delete/reorder.
 * Maps surviving old scene ids -> new scene ids by position.
 */
export function buildSceneIdReindexPlan({ oldSceneOrder, nextSceneOrder, removedSceneIds = [] }) {
  const oldIds = (oldSceneOrder ?? []).map((id) => String(id || '').trim()).filter(Boolean)
  const newIds = (nextSceneOrder ?? []).map((id) => String(id || '').trim()).filter(Boolean)
  const removedSet = new Set((removedSceneIds ?? []).map((id) => String(id || '').trim()).filter(Boolean))

  const survivingOldIds = oldIds.filter((id) => !removedSet.has(id))
  const sceneIdMap = {}
  for (let i = 0; i < Math.min(survivingOldIds.length, newIds.length); i += 1) {
    const from = survivingOldIds[i]
    const to = newIds[i]
    if (from && to && from !== to) sceneIdMap[from] = to
  }

  const removed = oldIds.filter((id) => removedSet.has(id))
  return {
    sceneIdMap,
    removedSceneIds: removed,
  }
}

async function deleteMediaRows(existing) {
  for (const row of existing ?? []) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {})
    await supabase.from('dooh_brief_media').delete().eq('id', row.id)
  }
}

/**
 * Delete uploaded media for one replacement slot (admin). Removes Storage objects + rows.
 * @param {{ briefSlug: string, sceneId: string | null, kind: string }} opts
 */
export async function deleteDoohBriefMediaBySlot({ briefSlug, sceneId, kind }) {
  if (kind !== 'banner') {
    const { data: existing, error } = await supabase
      .from('dooh_brief_media')
      .select('id, storage_path')
      .eq('brief_slug', briefSlug)
      .eq('scene_id', sceneId)
      .eq('kind', kind)
    if (error) throw error
    await deleteMediaRows(existing)
    return
  }

  const { data: rowNull, error: e1 } = await supabase
    .from('dooh_brief_media')
    .select('id, storage_path')
    .eq('brief_slug', briefSlug)
    .eq('kind', kind)
    .is('scene_id', null)
  if (e1) throw e1
  const { data: rowBanner, error: e2 } = await supabase
    .from('dooh_brief_media')
    .select('id, storage_path')
    .eq('brief_slug', briefSlug)
    .eq('kind', kind)
    .eq('scene_id', DOOH_BRIEF_BANNER_SCENE_ID)
  if (e2) throw e2
  await deleteMediaRows([...(rowNull ?? []), ...(rowBanner ?? [])])
}

/**
 * Keep dooh_brief_media scene_id rows aligned with renumbered brief scenes.
 * Uses a two-phase remap to avoid temporary key collisions.
 */
export async function remapDoohBriefMediaSceneIds({ briefSlug, sceneIdMap = {}, removedSceneIds = [] }) {
  const cleanSlug = String(briefSlug || '').trim()
  if (!cleanSlug) throw new Error('briefSlug is required')

  const removed = (removedSceneIds ?? []).map((id) => String(id || '').trim()).filter(Boolean)
  if (removed.length) {
    const { data: rows, error: rowsErr } = await supabase
      .from('dooh_brief_media')
      .select('id, storage_path')
      .eq('brief_slug', cleanSlug)
      .in('scene_id', removed)
    if (rowsErr) throw rowsErr
    await deleteMediaRows(rows)
  }

  const entries = Object.entries(sceneIdMap).filter(([from, to]) => from && to && from !== to)
  if (!entries.length) return

  for (const [from] of entries) {
    const tmp = `__tmp_scene__${from}`
    const { error } = await supabase
      .from('dooh_brief_media')
      .update({ scene_id: tmp })
      .eq('brief_slug', cleanSlug)
      .eq('scene_id', from)
    if (error) throw error
  }

  for (const [from, to] of entries) {
    const tmp = `__tmp_scene__${from}`
    const { error } = await supabase
      .from('dooh_brief_media')
      .update({ scene_id: to })
      .eq('brief_slug', cleanSlug)
      .eq('scene_id', tmp)
    if (error) throw error
  }
}

async function removeFinalRows(briefSlug, sceneId, kind) {
  if (kind === 'banner') {
    await deleteDoohBriefMediaBySlot({ briefSlug, sceneId, kind })
    return
  }
  const { data: existing } = await supabase
    .from('dooh_brief_media')
    .select('id, storage_path')
    .eq('brief_slug', briefSlug)
    .eq('scene_id', sceneId)
    .eq('kind', kind)

  await deleteMediaRows(existing)
}

/**
 * @param {File} file
 * @param {{ briefSlug: string, sceneId: string | null, kind:
 *   'final_video' | 'final_still' | 'story_image' | 'scene_main_image' |
 *   'banner' | 'character_ref' | 'split_panel_image' }} opts
 */
export async function uploadDoohBriefFile(file, { briefSlug, sceneId, kind }) {
  assertDoohBriefFileWithinLimit(file, kind)

  const uid = crypto.randomUUID()
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const pathSlug = sceneId ?? DOOH_BRIEF_BANNER_SCENE_ID
  const path = `${briefSlug}/${pathSlug}/${kind}_${uid}_${safeName}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  })
  if (upErr) throw upErr

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    kind === 'final_video' ||
    kind === 'final_still' ||
    kind === 'scene_main_image' ||
    kind === 'split_panel_image' ||
    kind === 'banner' ||
    kind === 'character_ref'
  ) {
    await removeFinalRows(briefSlug, sceneId, kind)
  }

  const { error: insErr } = await supabase.from('dooh_brief_media').insert({
    brief_slug: briefSlug,
    scene_id: kind === 'banner' ? sceneId ?? DOOH_BRIEF_BANNER_SCENE_ID : sceneId,
    kind,
    storage_path: path,
    original_filename: file.name,
    mime_type: file.type || null,
    created_by: user?.id ?? null,
  })
  if (insErr) throw insErr
}

export async function deleteDoohBriefMediaRow(rowId, storagePath) {
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {})
  const { error } = await supabase.from('dooh_brief_media').delete().eq('id', rowId)
  if (error) throw error
}

/** All `dooh_brief_media` rows + Storage objects for a brief slug (e.g. before deleting `dooh_briefs`). */
export async function deleteAllDoohBriefMediaForBriefSlug(briefSlug) {
  const { data: rows, error } = await supabase
    .from('dooh_brief_media')
    .select('id, storage_path')
    .eq('brief_slug', briefSlug)
  if (error) throw error
  for (const row of rows ?? []) {
    await deleteDoohBriefMediaRow(row.id, row.storage_path)
  }
}
