import {
  DOOH_BRIEF_GENERATOR_DEFAULTS,
  DOOH_BRIEF_SCENE_SLOT_MAX,
} from './doohBriefGeneratorDefaults.js'
import { normalizeDoohBriefSlug } from './doohBriefSlug.js'
import { shortSceneTitle } from './briefUtils.js'

export { DOOH_BRIEF_SCENE_SLOT_MAX }

export function clampSceneCount(raw) {
  let n = parseInt(String(raw ?? '3'), 10)
  if (Number.isNaN(n)) n = 3
  return Math.min(DOOH_BRIEF_SCENE_SLOT_MAX, Math.max(1, n))
}

/**
 * Remove embedded `data:` image URLs from payload before saving to PostgreSQL (size / perf).
 * Replaces those scenes with a placeholder pointing users to upload on the brief detail page.
 */
export function stripDataUrlImagesForDbSave(brief) {
  const scenes = (brief.scenes ?? []).map((s) => {
    const im = s.image
    if (im?.url && String(im.url).startsWith('data:')) {
      return {
        ...s,
        image: {
          placeholder: true,
          phLabel: shortSceneTitle(s.title) || 'Scene',
          phHint: 'Embedded PC upload not stored in DB — add image on the brief page',
          badge: im.badge,
          corners: im.corners !== false,
        },
      }
    }
    return s
  })
  return { ...brief, scenes }
}

/**
 * Parse "0.0 – 1.2s" or "0.0 - 1.2" → { start, end, weight }
 */
export function parseSceneTimeRange(timeStr) {
  const s = String(timeStr ?? '')
  const m = s.match(/([\d.]+)\s*[–-]\s*([\d.]+)/)
  if (!m) return { start: 0, end: 1, weight: 1 }
  const start = parseFloat(m[1])
  const end = parseFloat(m[2])
  const weight = Math.max(0.1, end - start)
  return { start, end, weight }
}

function bool(v) {
  if (v === true || v === 'true' || v === 'on' || v === 1 || v === '1') return true
  return false
}

function buildSceneImage(form, i) {
  const mode = form[`s${i}_imageMode`] || 'placeholder'
  const badge = form[`s${i}_badge`] || undefined
  const corners = true

  /** Local PC upload (data URL) — only in generator / JSON export; stripped on DB save */
  if (!form[`s${i}_brandOutro`] && mode === 'upload') {
    const dataUrl = String(form[`s${i}_imageDataUrl`] || '').trim()
    if (/^data:image\//i.test(dataUrl)) {
      return { url: dataUrl, badge, corners }
    }
    return {
      placeholder: true,
      phLabel: form[`s${i}_phLabel`] || `Scene ${i}`,
      phHint: form[`s${i}_phHint`] || 'Choose an image from your PC (generator)',
      badge,
      corners,
    }
  }

  if (form[`s${i}_brandOutro`]) {
    return {
      layout: 'split',
      left: {
        file: form.outro_logo_file || 'banner.png',
        contain: true,
        badge: form.outro_logo_badge || 'DOOH design ref',
        corners,
      },
      compositionRows: [
        { key: 'Center', value: form.outro_comp_center || '' },
        { key: 'Top bar', value: form.outro_comp_top || '' },
        { key: 'Bottom', value: form.outro_comp_bottom || '' },
        { key: 'BG', value: form.outro_comp_bg || '' },
      ].filter((r) => r.value),
      paletteNote: form.outro_palette || undefined,
    }
  }

  let effectiveMode = mode
  if (effectiveMode === 'split') {
    effectiveMode = String(form[`s${i}_imageFile`] || '').trim() ? 'file' : 'placeholder'
  }

  if (effectiveMode === 'file') {
    const file = String(form[`s${i}_imageFile`] || '').trim()
    if (!file) {
      return {
        placeholder: true,
        phLabel: form[`s${i}_phLabel`] || `Scene ${i}`,
        phHint: form[`s${i}_phHint`] || 'Add image filename under asset path',
        badge,
        corners,
      }
    }
    return { file, badge, corners }
  }

  return {
    placeholder: true,
    phLabel: form[`s${i}_phLabel`] || `Scene ${i}`,
    phHint: form[`s${i}_phHint`] || '',
    badge,
    corners,
  }
}

function buildTimeline(scenes) {
  const rows = []
  const len = scenes.length
  for (let i = 0; i < len; i++) {
    const s = scenes[i]
    const { start, weight } = parseSceneTimeRange(s.time)
    /** Second beat + second-to-last beat (when enough scenes) — matches old 7-beat pattern */
    const hotBridge = i === 1 || (len > 3 && i === len - 2)
    rows.push({
      id: s.id,
      label: shortSceneTitle(s.title),
      time: `${start.toFixed(1)}s`,
      weight,
      barAfter: 0.4,
      hot: bool(s.hot),
      hotBridge,
    })
  }
  return rows
}

function verticalNote(vertical) {
  const v = String(vertical || '').toLowerCase()
  if (v === 'sport') return 'Sportsbook / live sport energy where relevant.'
  if (v === 'casino') return 'Casino / slots / table glamour where relevant — stay brand-safe.'
  return ''
}

function verticalLabel(vertical) {
  const v = String(vertical || '').toLowerCase()
  if (v === 'sport') return 'Sports'
  if (v === 'casino') return 'Casino'
  return 'General'
}

function firstSentence(text) {
  const clean = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const m = clean.match(/^(.{1,180}?[.!?])(\s|$)/)
  return (m ? m[1] : clean).trim()
}

/**
 * @param {Record<string, unknown>} form — raw react-hook-form values
 * @returns {object} one brief object for `dooh_briefs.payload`
 */
export function buildBriefFromGeneratorForm(form) {
  const merged = { ...DOOH_BRIEF_GENERATOR_DEFAULTS, ...form }
  const sceneCount = clampSceneCount(merged.scene_count)
  const vertical = verticalLabel(merged.format_vertical)
  const verticalLine = verticalNote(merged.format_vertical)
  const location = String(merged.format_location || '').trim()
  const duration = String(merged.format_duration || '').trim()

  const g = String(merged.char_gender || '').toLowerCase()
  const genderLabel =
    g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Unspecified'
  const accessoriesValue = [merged.char_feet, merged.char_accessory]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join('<br/><br/>')

  const characterRows = [
    { key: 'Gender', value: genderLabel },
    { key: 'Type', value: merged.char_type },
    { key: 'Traits', value: merged.char_traits },
    { key: 'Wardrobe', value: merged.char_wardrobe },
    {
      key: 'Accessories',
      value: accessoriesValue,
      hot: bool(merged.char_feet_hot),
    },
    { key: 'Movement', value: merged.char_movement },
    { key: 'Post-helmet', value: merged.char_postHelmet },
  ].filter((r) => r.value)

  const characterRefs = [
    { id: 'cr1', image: merged.ref1_file, label: merged.ref1_label },
    { id: 'cr2', image: merged.ref2_file, label: merged.ref2_label },
    { id: 'cr3', image: merged.ref3_file, label: merged.ref3_label },
  ]
    .filter((r) => r.image && String(r.image).trim())
    .map((r) => ({ ...r, image: String(r.image).trim() }))

  const cameraBlock =
    merged.camera_cinematic || merged.camera_billboard
      ? `<p><b>Cinematic camera</b> — ${merged.camera_cinematic || '—'}</p><p><b>Billboard / outro</b> — ${merged.camera_billboard || '—'}</p>`
      : ''

  const formatRows = [
    { key: 'Format', value: merged.format_type },
    { key: 'Duration', value: merged.format_duration },
    { key: 'Attention window', value: merged.format_attention },
    { key: 'Readability', value: merged.format_readability },
    { key: 'Location', value: merged.format_location },
    { key: 'Loop transition', value: merged.format_loop },
    {
      key: 'Vertical',
      value: vertical,
    },
  ].filter((r) => r.value)

  if (cameraBlock) {
    formatRows.push({ key: 'Camera notes', value: cameraBlock })
  }

  const scenes = []
  for (let n = 1; n <= sceneCount; n++) {
    const id = `s${n}`
    const brandOutro = bool(merged[`s${n}_brandOutro`])
    scenes.push({
      id,
      num: merged[`s${n}_num`],
      code: merged[`s${n}_code`],
      title: merged[`s${n}_title`],
      time: merged[`s${n}_time`],
      lens: merged[`s${n}_lens`],
      hot: bool(merged[`s${n}_hot`]),
      image: buildSceneImage(merged, n),
      intentHtml: merged[`s${n}_intentHtml`],
      aiSettings: {
        constraints: merged[`s${n}_aiConstraints`] || '',
        creativity: Number.isFinite(Number(merged[`s${n}_aiCreativity`]))
          ? Math.max(0, Math.min(1, Number(merged[`s${n}_aiCreativity`])))
          : 0.3,
      },
      aiAlternatives: {
        ...(merged[`s${n}_aiAlt_video`]
          ? {
              video: {
                text: merged[`s${n}_aiAlt_video`],
                field: 'video',
              },
            }
          : {}),
        ...(merged[`s${n}_aiAlt_still`]
          ? {
              still: {
                text: merged[`s${n}_aiAlt_still`],
                field: 'still',
              },
            }
          : {}),
        ...(merged[`s${n}_aiAlt_negativeVideo`]
          ? {
              negativeVideo: {
                text: merged[`s${n}_aiAlt_negativeVideo`],
                field: 'negativeVideo',
              },
            }
          : {}),
        ...(merged[`s${n}_aiAlt_negativeStill`]
          ? {
              negativeStill: {
                text: merged[`s${n}_aiAlt_negativeStill`],
                field: 'negativeStill',
              },
            }
          : {}),
      },
      ...(!brandOutro
        ? {
            prompts: {
              video: merged[`s${n}_promptVideo`],
              still: merged[`s${n}_promptStill`],
              negativeVideo: merged[`s${n}_negVideo`],
              negativeStill: merged[`s${n}_negStill`],
            },
          }
        : { brandOutro: true }),
    })
  }

  const timeline = buildTimeline(scenes)
  const sceneTitles = scenes.map((s) => shortSceneTitle(s.title)).filter(Boolean)
  const sceneArc = sceneTitles.slice(0, 5)
  const introFromScene = firstSentence(scenes[0]?.intentHtml)
  const introBase = introFromScene
    ? `A cinematic ${vertical.toLowerCase()} DOOH build. ${introFromScene}`
    : `A cinematic ${vertical.toLowerCase()} DOOH production brief generated from scene and format inputs.`
  const introHtml = verticalLine
    ? `${introBase} <b>Market context:</b> ${verticalLine}`
    : introBase
  const tags = ['DOOH', vertical, location, duration]
    .map((t) => String(t || '').trim())
    .filter(Boolean)
  const title = [vertical, 'DOOH', 'Brief'].join(' ')
  const subtitle = [location || 'Location TBD', `${sceneCount}-scene production brief`].join(' — ')
  const listTitle = [vertical, location || 'Location TBD'].join(' · ')
  const bannerLabel = [vertical, 'DOOH', location || 'Location TBD', duration || `${sceneCount} scenes`].join(
    ' · ',
  )
  const headerPill = `Live ${vertical.toLowerCase()} production brief`
  const slugBase = [vertical, location || '', 'dooh-brief'].join(' ')

  return {
    slug: normalizeDoohBriefSlug(slugBase || 'generated-dooh-brief'),
    listTitle,
    listBadge: 'DOOH',
    bannerLabel,
    headerPill,
    tags,
    title,
    subtitle,
    introHtml,
    creativeArc: sceneArc,
    formatRows,
    characterRefs,
    characterRows,
    overviewNav: [
      {
        group: 'Overview',
        links: [
          { id: 'overview', label: 'Creative direction' },
          { id: 'format', label: 'Format & specs' },
          { id: 'character', label: 'Character' },
        ],
      },
      { group: 'Storyboard', links: [{ id: 'storyboard', label: 'All scenes' }] },
    ],
    scenes,
    timeline,
    footerLine: merged.footerLine,
    footerMeta: merged.footerMeta,
  }
}

export function briefToConstantsJsonSnippet(brief) {
  return JSON.stringify(brief, null, 2)
}
