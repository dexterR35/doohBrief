import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { normalizeDoohBriefSlug } from '../doohBriefSlug.js'
import { DOOH_BRIEF_BANNER_SCENE_ID } from '../doohUpload.js'

export { DOOH_BRIEF_BANNER_SCENE_ID }

export function publicUrlForPath(storagePath) {
  if (!storagePath) return null
  const { data } = supabase.storage.from('dooh-briefs').getPublicUrl(storagePath)
  return data?.publicUrl ?? null
}

function pickLatest(rows, pred) {
  let best = null
  for (const row of rows ?? []) {
    if (!pred(row)) continue
    if (!best || new Date(row.created_at) > new Date(best.created_at)) best = row
  }
  return best
}

/** Latest `banner` row for this brief (PostgreSQL path wins over JSON assets). */
export function selectBannerUrl(rows) {
  const row = pickLatest(
    rows,
    (r) =>
      r.kind === 'banner' &&
      (r.scene_id == null || r.scene_id === DOOH_BRIEF_BANNER_SCENE_ID),
  )
  return row ? publicUrlForPath(row.storage_path) : null
}

/** Latest uploaded still for a character ref id (e.g. cr1, cr2). */
export function selectCharacterRefUrl(rows, refId) {
  const row = pickLatest(rows, (r) => r.kind === 'character_ref' && r.scene_id === refId)
  return row ? publicUrlForPath(row.storage_path) : null
}

/** True if an uploaded character ref image exists (safe to offer “Remove”). */
export function characterRefHasUploadedOverride(rows, refId) {
  return !!pickLatest(rows, (r) => r.kind === 'character_ref' && r.scene_id === refId)
}

/** True if an uploaded hero banner exists in DB. */
export function bannerHasUploadedOverride(rows) {
  return !!pickLatest(
    rows,
    (r) =>
      r.kind === 'banner' &&
      (r.scene_id == null || r.scene_id === DOOH_BRIEF_BANNER_SCENE_ID),
  )
}

/** Latest banner public URL per normalized brief slug (for index cards). */
export function mapBriefSlugToBannerUrl(allRows) {
  const bySlug = {}
  for (const row of allRows ?? []) {
    if (row.kind !== 'banner' || !row.brief_slug) continue
    const slug = normalizeDoohBriefSlug(row.brief_slug)
    if (!slug) continue
    if (!bySlug[slug]) bySlug[slug] = []
    bySlug[slug].push(row)
  }
  const map = {}
  for (const [slug, rows] of Object.entries(bySlug)) {
    const u = selectBannerUrl(rows)
    if (u) map[slug] = u
  }
  return map
}

/** Latest row wins per (scene_id, kind) for finals; all rows for story_image. */
export function selectMediaForScene(rows, sceneId) {
  const finals = {}
  const stories = []
  for (const row of rows ?? []) {
    if (row.scene_id !== sceneId) continue
    if (row.kind === 'story_image') {
      stories.push(row)
      continue
    }
    if (!finals[row.kind] || new Date(row.created_at) > new Date(finals[row.kind].created_at)) {
      finals[row.kind] = row
    }
  }
  return {
    finalVideo: finals.final_video ? publicUrlForPath(finals.final_video.storage_path) : null,
    /** True when a final video row exists in DB (safe to offer Remove). */
    finalVideoUploaded: !!finals.final_video,
    finalStill: finals.final_still ? publicUrlForPath(finals.final_still.storage_path) : null,
    finalStillUploaded: !!finals.final_still,
    sceneMainImage: finals.scene_main_image
      ? publicUrlForPath(finals.scene_main_image.storage_path)
      : null,
    /** DB row present (not only JSON file path). */
    sceneMainUploaded: !!finals.scene_main_image,
    splitPanelImage: finals.split_panel_image
      ? publicUrlForPath(finals.split_panel_image.storage_path)
      : null,
    splitPanelUploaded: !!finals.split_panel_image,
    storyImages: stories
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((r) => ({ ...r, url: publicUrlForPath(r.storage_path) })),
  }
}

export function useDoohBriefMedia(briefSlug) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!briefSlug) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('dooh_brief_media')
      .select('*')
      .eq('brief_slug', briefSlug)
      .order('created_at', { ascending: false })

    if (qErr) {
      setError(qErr.message)
      setRows([])
    } else {
      setRows(data ?? [])
    }
    setLoading(false)
  }, [briefSlug])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { rows, loading, error, refresh }
}
