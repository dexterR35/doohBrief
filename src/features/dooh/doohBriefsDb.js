import { supabase } from '../../lib/supabase'
import { deleteAllDoohBriefMediaForBriefSlug } from './doohUpload.js'
import { normalizeDoohBriefSlug } from './doohBriefSlug.js'
import { syncDoohBriefPrompts } from './doohPromptsDb.js'
import { archiveDoohBrief } from './doohArchiveDb.js'
import { createMinIntervalGate } from '../../lib/requestControl.js'

const writeGateBySlug = new Map()

function getWriteGate(slug) {
  if (!writeGateBySlug.has(slug)) {
    writeGateBySlug.set(slug, createMinIntervalGate(300))
  }
  return writeGateBySlug.get(slug)
}

/**
 * Insert or update a DOOH brief row (admin RLS). `payload` stores the full brief (scenes, prompts, refs, etc.).
 */
export async function saveDoohBriefRow({ slug, payload, assetBasePath }) {
  const cleanSlug = normalizeDoohBriefSlug(slug)
  if (!cleanSlug) throw new Error('Slug is required')
  await getWriteGate(cleanSlug)()

  const { data: userData } = await supabase.auth.getUser()
  const uid = userData?.user?.id ?? null

  const { data: existing, error: selErr } = await supabase
    .from('dooh_briefs')
    .select('id')
    .eq('slug', cleanSlug)
    .maybeSingle()

  if (selErr) throw selErr

  const basePath = String(assetBasePath || '/dooh').trim() || '/dooh'
  const row = {
    slug: cleanSlug,
    payload,
    asset_base_path: basePath,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from('dooh_briefs').update(row).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('dooh_briefs').insert({ ...row, created_by: uid })
    if (error) throw error
  }
  await syncDoohBriefPrompts({ briefSlug: cleanSlug, payload, createdBy: uid })

  return { slug: cleanSlug }
}

/**
 * Remove a brief from PostgreSQL and all related `dooh_brief_media` files (admin RLS).
 */
export async function deleteDoohBriefRow(slug) {
  const cleanSlug = normalizeDoohBriefSlug(slug)
  if (!cleanSlug) throw new Error('Slug is required')

  const { data: existing, error: existingErr } = await supabase
    .from('dooh_briefs')
    .select('payload')
    .eq('slug', cleanSlug)
    .maybeSingle()
  if (existingErr) throw existingErr
  await archiveDoohBrief({
    briefSlug: cleanSlug,
    payload: existing?.payload ?? {},
    reason: 'Deleted brief from app',
  })

  await deleteAllDoohBriefMediaForBriefSlug(cleanSlug)

  const { error } = await supabase.from('dooh_briefs').delete().eq('slug', cleanSlug)
  if (error) throw error
}
