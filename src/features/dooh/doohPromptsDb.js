import { supabase } from '../../lib/supabase'

const PROMPT_FIELDS = ['video', 'still', 'negativeVideo', 'negativeStill']

function toPromptRows(briefSlug, payload, uid) {
  const rows = []
  for (const scene of payload?.scenes ?? []) {
    const sceneId = String(scene?.id || '').trim()
    if (!sceneId) continue
    const prompts = scene?.prompts ?? {}
    for (const field of PROMPT_FIELDS) {
      const text = String(prompts[field] ?? '').trim()
      if (!text) continue
      rows.push({
        brief_slug: briefSlug,
        scene_id: sceneId,
        prompt_type: field,
        prompt_text: text,
        created_by: uid,
      })
    }
  }
  return rows
}

/**
 * Replace active prompts for a brief from `payload.scenes[].prompts`.
 */
export async function syncDoohBriefPrompts({ briefSlug, payload, createdBy }) {
  if (!briefSlug) throw new Error('briefSlug is required')
  const rows = toPromptRows(briefSlug, payload, createdBy ?? null)

  const { error: delErr } = await supabase.from('dooh_prompts').delete().eq('brief_slug', briefSlug)
  if (delErr) throw delErr
  if (!rows.length) return { count: 0 }

  const { error: insErr } = await supabase.from('dooh_prompts').insert(rows)
  if (insErr) throw insErr
  return { count: rows.length }
}

