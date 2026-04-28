import { normalizeDoohBriefSlug } from './doohBriefSlug.js'

/** Take the first segment of a "Title · subtitle" string. */
export function shortSceneTitle(title) {
  const t = title ?? ''
  const parts = String(t).split('·')
  return parts[0]?.trim() || String(t)
}

/**
 * Merge storyboard scene anchors into the Storyboard nav group.
 * Overview links are left as defined in JSON (no filtering).
 */
export function buildBriefSidebarNav(brief) {
  const sceneLinks = (brief.scenes ?? []).map((s) => ({
    id: s.id,
    label: `${s.code} · ${shortSceneTitle(s.title)}`,
    hint: (s.time ?? '').replace(/\s+/g, ''),
  }))

  return (brief.overviewNav ?? []).map((group) => {
    let links = [...(group.links ?? [])]
    if (group.group === 'Storyboard') {
      links = [...links, ...sceneLinks]
    }
    return { ...group, links }
  })
}

export function findBriefBySlug(constants, slug) {
  if (!slug || !constants?.briefs) return null
  const n = normalizeDoohBriefSlug(slug)
  return constants.briefs.find((b) => normalizeDoohBriefSlug(b?.slug) === n) ?? null
}

/**
 * Merge Postgres rows with bundled `constants.json` briefs. Same slug → database wins.
 * When the DB has no matching row (e.g. not seeded yet), the JSON brief still lists as a fallback card.
 * Stills and banners are not read from JSON paths — use `dooh_brief_media` uploads.
 */
export function mergeDoohBriefCatalog(staticBriefs, staticAssetBase, dbRows) {
  const base = String(staticAssetBase || '/dooh').replace(/\/$/, '') || '/dooh'
  const dbSlugs = new Set((dbRows ?? []).map((r) => normalizeDoohBriefSlug(r.slug)))
  const dbOrdered = (dbRows ?? [])
    .slice()
    .sort((a, b) => new Date(b.updated_at ?? 0) - new Date(a.updated_at ?? 0))
    .map((r) => ({
      key: `db:${r.slug}`,
      slug: r.slug,
      brief: r.payload,
      assetBase: r.asset_base_path ? String(r.asset_base_path).replace(/\/$/, '') || base : base,
      source: 'db',
    }))
  const rest = (staticBriefs ?? [])
    .filter((b) => b?.slug && !dbSlugs.has(normalizeDoohBriefSlug(b.slug)))
    .map((b) => ({
      key: `static:${b.slug}`,
      slug: b.slug,
      brief: b,
      assetBase: base,
      source: 'static',
    }))
  return [...dbOrdered, ...rest]
}

