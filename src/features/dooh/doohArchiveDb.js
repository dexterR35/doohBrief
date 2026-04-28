import { supabase } from '../../lib/supabase'

/**
 * Save a snapshot of the brief payload before destructive actions.
 */
export async function archiveDoohBrief({ briefSlug, payload, reason = null }) {
  if (!briefSlug || !payload) return
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData?.user?.id ?? null

  const { error } = await supabase.from('dooh_archives').insert({
    brief_slug: briefSlug,
    archived_payload: payload,
    reason: reason ? String(reason) : null,
    archived_by: uid,
  })
  if (error) throw error
}

