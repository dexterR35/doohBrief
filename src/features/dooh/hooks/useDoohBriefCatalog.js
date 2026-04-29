import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import doohConstants from '../constants.json'
import { normalizeDoohBriefSlug } from '../doohBriefSlug.js'
import { findBriefBySlug, mergeDoohBriefCatalog } from '../briefUtils'
import { mapBriefSlugToFirstSceneUrl } from './useDoohBriefMedia'

export function useDoohBriefsFromDb() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('dooh_briefs')
      .select('slug, payload, asset_base_path, updated_at')
      .order('updated_at', { ascending: false })

    if (qErr) {
      setError(qErr.message)
      setRows([])
    } else {
      setRows(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { rows, loading, error, refresh }
}

/** Index: Postgres first, then bundled `constants.json` briefs not overridden by slug. */
export function useDoohBriefIndexEntries() {
  const staticBriefs = doohConstants.briefs ?? []
  const staticAsset = String(doohConstants.assetBasePath || '/dooh').replace(/\/$/, '') || '/dooh'
  const { rows, loading, error, refresh: refreshDb } = useDoohBriefsFromDb()
  const [mediaRows, setMediaRows] = useState([])
  const [mediaErr, setMediaErr] = useState(null)

  const loadMedia = useCallback(async () => {
    setMediaErr(null)
    const { data, error: qErr } = await supabase
      .from('dooh_brief_media')
      .select('*')
      .in('kind', ['scene_main_image', 'final_still'])
      .order('created_at', { ascending: false })
    if (qErr) {
      setMediaErr(qErr.message)
      setMediaRows([])
      return
    }
    setMediaRows(data ?? [])
  }, [])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  const refresh = useCallback(async () => {
    await refreshDb()
    await loadMedia()
  }, [refreshDb, loadMedia])

  const entries = useMemo(
    () => mergeDoohBriefCatalog(staticBriefs, staticAsset, rows),
    [staticBriefs, staticAsset, rows],
  )
  const bannerBySlug = useMemo(() => {
    const firstSceneIdBySlug = {}
    for (const e of entries) {
      const firstId = e.brief?.scenes?.[0]?.id
      if (firstId) firstSceneIdBySlug[normalizeDoohBriefSlug(e.slug)] = firstId
    }
    return mapBriefSlugToFirstSceneUrl(mediaRows, firstSceneIdBySlug)
  }, [mediaRows, entries])
  const combinedError = error || mediaErr
  return { entries, loading, error: combinedError, refresh, bannerBySlug }
}

/** Brief detail: Postgres `payload` wins; else bundled JSON for same slug (`constants.json`). */
export function useDoohBriefWithFallback(briefSlug) {
  const normalized = briefSlug ? normalizeDoohBriefSlug(briefSlug) : ''
  const staticBrief = useMemo(
    () => (briefSlug ? findBriefBySlug(doohConstants, briefSlug) : null),
    [briefSlug],
  )
  const defaultAsset = String(doohConstants.assetBasePath || '/dooh').replace(/\/$/, '') || '/dooh'
  const [dbRow, setDbRow] = useState(null)
  const [loadingDb, setLoadingDb] = useState(!!briefSlug)
  const [refreshSeq, setRefreshSeq] = useState(0)
  const refreshBrief = useCallback(() => setRefreshSeq((n) => n + 1), [])

  useEffect(() => {
    if (!briefSlug || !normalized) {
      setDbRow(null)
      setLoadingDb(false)
      return
    }
    let cancelled = false
    setLoadingDb(true)
    supabase
      .from('dooh_briefs')
      .select('payload, asset_base_path')
      .eq('slug', normalized)
      .maybeSingle()
      .then(({ data, error: qErr }) => {
        if (cancelled) return
        if (qErr) {
          console.warn('[dooh_briefs]', qErr.message)
          setDbRow(null)
        } else {
          setDbRow(data ?? null)
        }
        setLoadingDb(false)
      })
    return () => {
      cancelled = true
    }
  }, [briefSlug, normalized, refreshSeq])

  const brief = dbRow?.payload ?? staticBrief ?? null
  const assetBase = dbRow?.payload
    ? String(dbRow.asset_base_path ?? '').replace(/\/$/, '') || defaultAsset
    : defaultAsset

  const blockingLoader = !brief && loadingDb
  const notFound = !brief && !loadingDb

  return {
    brief,
    assetBase,
    loadingDb,
    blockingLoader,
    notFound,
    isFromDb: !!dbRow?.payload,
    refreshBrief,
  }
}
