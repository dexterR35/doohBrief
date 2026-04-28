import { supabase } from './supabase'

/** Backend `/api` base URL. */
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

/** Check if a Supabase session token is expired or within 30s of expiry */
function isTokenExpired(session) {
  if (!session?.expires_at) return true
  return session.expires_at * 1000 - Date.now() < 30_000
}

/** Get a fresh access token, refreshing if expired or near-expiry */
export async function getFreshToken() {
  let { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token || isTokenExpired(session)) {
    const { data } = await supabase.auth.refreshSession()
    session = data?.session
  }
  return session?.access_token ?? null
}

/** Authenticated fetch to this project's API. */
export async function apiFetch(path, opts = {}) {
  const token = await getFreshToken()
  if (!token) throw new Error('No session - please sign in')
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
}
