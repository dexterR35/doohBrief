import doohExportCssRaw from './doohBriefExport.css?raw'
import { buildBriefSidebarNav } from './briefUtils'
import {
  bannerHasUploadedOverride,
  characterRefHasUploadedOverride,
  publicUrlForPath,
  selectBannerUrl,
  selectCharacterRefUrl,
  selectMediaForScene,
} from './hooks/useDoohBriefMedia'

const DOOH_EXPORT_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..400&family=JetBrains+Mono:wght@400;500&display=swap'

function splitOverviewAndStoryboard(sections) {
  const list = sections ?? []
  const overviewGroups = list.filter((g) => String(g.group) !== 'Storyboard')
  const storyboardGroup = list.find((g) => String(g.group) === 'Storyboard')
  return { overviewGroups, storyboardGroup }
}

function briefNavAnchorHtml(link) {
  const hint =
    link.hint && String(link.hint).trim()
      ? `<span class="dooh-brief-nav__anchor-hint">${esc(link.hint)}</span>`
      : ''
  return `<a href="#${esc(link.id)}" class="dooh-brief-nav__anchor"><span class="dooh-brief-nav__anchor-label">${esc(link.label)}</span>${hint}</a>`
}

/** Same anchors as `<DoohBriefHeaderNav>` on `BriefDoohDetailPage` (overview + storyboard scenes). */
function briefNavExportHtml(sections) {
  const { overviewGroups, storyboardGroup } = splitOverviewAndStoryboard(sections)
  let rowsInner = ''

  if (overviewGroups.length) {
    const blocks = overviewGroups
      .map((group, gi) => {
        const divider =
          overviewGroups.length > 1 && gi > 0
            ? '<span class="dooh-brief-nav__divider dooh-brief-nav__divider--soft" aria-hidden="true"></span>'
            : ''
        const groupTag =
          overviewGroups.length > 1
            ? `<span class="dooh-brief-nav__group-tag">${esc(group.group)}</span>`
            : ''
        const links = (group.links ?? []).map((link) => briefNavAnchorHtml(link)).join('')
        return `${divider}${groupTag}${links}`
      })
      .join('')
    rowsInner += `<div class="dooh-brief-nav__block"><p class="dooh-brief-nav__block-label">Overview</p><nav class="dooh-brief-nav__rail dooh-brief-nav__rail--wrap" aria-label="Overview sections">${blocks}</nav></div>`
  }

  if (storyboardGroup?.links?.length) {
    const links = storyboardGroup.links.map((link) => briefNavAnchorHtml(link)).join('')
    rowsInner += `<div class="dooh-brief-nav__block dooh-brief-nav__block--storyboard"><p class="dooh-brief-nav__block-label">Storyboard</p><nav class="dooh-brief-nav__rail dooh-brief-nav__rail--wrap" aria-label="Storyboard and scenes">${links}</nav></div>`
  }

  if (!rowsInner) return ''
  return `<header class="dooh-brief-nav" aria-label="Brief sections"><div class="dooh-brief-nav__rows">${rowsInner}</div></header>`
}

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Brief JSON may include HTML fragments (same sources as in-app dangerouslySetInnerHTML paths). */
function trustedBriefHtml(html) {
  if (html == null) return ''
  return String(html)
}

/** Same URL as DoohSceneCard Image tab hero (`dooh_brief_media` only — Supabase URLs are absolute). */
function primaryImageTabUrlForExport(scene, media) {
  const img = scene.image ?? {}
  if (img.layout === 'split' && img.left) {
    return media?.splitPanelImage ?? media?.finalStill ?? null
  }
  return media?.sceneMainImage ?? media?.finalStill ?? null
}

const CORNERS_HTML =
  '<span class="dooh-sc-img-corner tl" aria-hidden="true"></span>' +
  '<span class="dooh-sc-img-corner tr" aria-hidden="true"></span>' +
  '<span class="dooh-sc-img-corner bl" aria-hidden="true"></span>' +
  '<span class="dooh-sc-img-corner br" aria-hidden="true"></span>'

const EXPORT_MEDIA_ACTIONS_HTML =
  '<div class="dooh-exp-media-actions">' +
  '<button type="button" class="dooh-exp-fs-btn" aria-label="View fullscreen">Fullscreen</button>' +
  '</div>'

function wrapExportFullscreen(inner) {
  return `<div class="dooh-exp-media-wrap">${inner}${EXPORT_MEDIA_ACTIONS_HTML}</div>`
}

function sceneMainImageMarkup(scene, media) {
  const img = scene.image ?? {}

  if (img.layout === 'split' && img.left) {
    const leftHero = primaryImageTabUrlForExport(scene, media)
    const leftImgClass = img.left?.contain ? 'dooh-sc-img dooh-contain' : 'dooh-sc-img'
    const badge = img.left.badge
      ? `<span class="dooh-sc-img-badge">${esc(img.left.badge)}</span>`
      : ''
    const splitSizing = ' style="max-width:280px;flex-shrink:0;aspect-ratio:9/16;height:280px"'
    if (leftHero) {
      return wrapExportFullscreen(
        `<div class="${leftImgClass}"${splitSizing}>${CORNERS_HTML}<img src="${esc(leftHero)}" alt="" loading="lazy" />${badge}</div>`,
      )
    }
    return `<div class="${leftImgClass}"${splitSizing}>${CORNERS_HTML}${badge}</div>`
  }

  if (img.placeholder) {
    const hero = primaryImageTabUrlForExport(scene, media)
    if (hero) {
      const badge = img.badge ? `<span class="dooh-sc-img-badge">${esc(img.badge)}</span>` : ''
      return wrapExportFullscreen(
        `<div class="dooh-sc-img">${CORNERS_HTML}<img src="${esc(hero)}" alt="" loading="lazy" />${badge}</div>`,
      )
    }
    const badge = img.badge ? `<span class="dooh-sc-img-badge">${esc(img.badge)}</span>` : ''
    return `<div class="dooh-sc-img">${CORNERS_HTML}
      <div class="dooh-sc-img-ph">
        <div class="ph-grid" aria-hidden="true"></div>
        <span class="ph-num">${esc(scene.code)}</span>
        <span class="ph-lbl">${esc(img.phLabel ?? '')}</span>
        ${img.phHint ? `<span class="ph-hint">${esc(img.phHint)}</span>` : ''}
      </div>${badge}</div>`
  }

  const hero = primaryImageTabUrlForExport(scene, media)
  const badge = img.badge ? `<span class="dooh-sc-img-badge">${esc(img.badge)}</span>` : ''
  if (!hero) return `<div class="dooh-sc-intent" style="color:var(--ink-tertiary)">No reference image</div>`
  return wrapExportFullscreen(
    `<div class="dooh-sc-img">${CORNERS_HTML}<img src="${esc(hero)}" alt="" loading="lazy" />${badge}</div>`,
  )
}

function timelineHtml(brief, sceneCodes) {
  const timeline = brief.timeline
  if (!timeline?.length) return ''
  const endLabel = brief.timelineEndLabel ?? '10s'
  const segs = []
  for (let i = 0; i < timeline.length; i++) {
    const seg = timeline[i]
    segs.push(
      `<div class="dooh-sb-seg-wrap${seg.hot ? ' dooh-hot' : ''}" style="--w:${seg.weight ?? 1}">
        <span class="dooh-sb-seg-label">${esc(seg.label)}</span>
        <a class="dooh-sb-seg-dot" href="#${esc(seg.id)}">${esc(sceneCodes[seg.id] ?? seg.id)}</a>
        <span class="dooh-sb-seg-time">${esc(seg.time)}</span>
      </div>`,
    )
    if (i < timeline.length - 1) {
      segs.push(
        `<div class="dooh-sb-seg-bar${seg.hotBridge ? ' dooh-hot' : ''}" style="--w:${seg.barAfter ?? 0.4}" aria-hidden="true"></div>`,
      )
    }
  }
  segs.push(
    `<div class="dooh-sb-seg-wrap" style="--w:0.35;pointer-events:none">
      <span class="dooh-sb-seg-label" style="opacity:0">–</span>
      <span style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:9px;color:var(--ink-tertiary)">${esc(endLabel)}</span>
      <span class="dooh-sb-seg-time" style="opacity:0">–</span>
    </div>`,
  )
  return `<div class="dooh-sb-timeline-wrap"><div class="dooh-sb-timeline-track">
    <div class="dooh-sb-timeline-line" aria-hidden="true"></div>
    ${segs.join('')}
  </div></div>`
}

function summarizePrompt(value) {
  const raw = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw) return ''
  const contentOnly = raw
    .split(/\b(?:Style|Camera|Lighting|Mood|Duration|Aspect Ratio)\s*:/i)[0]
    .trim()
  const firstSentence = contentOnly.split(/[.!?](?:\s|$)/)[0].trim()
  const basis = (firstSentence || contentOnly || raw).replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '')
  if (!basis) return ''
  const words = basis.split(/\s+/)
  if (words.length <= 16) return basis
  return `${words.slice(0, 16).join(' ')}...`
}

function cleanSummaryLabelPrefix(value, label) {
  return String(value ?? '')
    .replace(new RegExp(`^${label}\\s*:?\\s*`, 'i'), '')
    .trim()
}

function summaryValue({ summary, prompt, label }) {
  const cleanedSummary = cleanSummaryLabelPrefix(summary, label)
  const source = cleanedSummary.length > 0 ? cleanedSummary : prompt
  const concise = summarizePrompt(source)
  return concise || cleanedSummary || summarizePrompt(prompt)
}

function sceneCompositionRows(scene) {
  const img = scene.image ?? {}
  const p = scene.prompts ?? {}
  const mergedNegative = Array.from(
    new Set(
      [p.negativeStill, p.negativeVideo]
        .filter(Boolean)
        .flatMap((text) => String(text).split('·'))
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ).join(' · ')
  const baseRows = img.compositionRows?.length
    ? img.compositionRows.map((row) => ({
        key: row?.key ?? '',
        value: row?.value ?? '',
        html: true,
      }))
    : [{ key: 'Scene', value: scene.title ?? '', html: false }]
  const rows = [...baseRows]
  const upsert = (key, value) => {
    if (!String(value ?? '').trim()) return
    const idx = rows.findIndex((row) => String(row?.key ?? '').toLowerCase() === key.toLowerCase())
    const next = { key, value, html: false }
    if (idx >= 0) rows[idx] = next
    else rows.push(next)
  }
  upsert(
    'Photo summary',
    summaryValue({ summary: p.photoSummary, prompt: p.still, label: 'photo summary' }),
  )
  upsert(
    'Video summary',
    summaryValue({ summary: p.videoSummary, prompt: p.video, label: 'video summary' }),
  )
  upsert('Negative', mergedNegative)
  return rows.filter((row) => String(row.value ?? '').trim().length > 0)
}

function brandOutroStripHtml(outroScene, rows) {
  if (!outroScene?.id) return ''
  const media = selectMediaForScene(rows, outroScene.id)
  if (!media?.finalVideo) return ''
  return `<section class="dooh-export-brand-strip" aria-labelledby="dooh-exp-brand-uploads-heading">
    <p id="dooh-exp-brand-uploads-heading" class="dooh-doc-h2" style="font-size:1rem;margin-bottom:10px">Brand outro · uploads</p>
    <p style="font-size:13px;color:var(--ink-tertiary);margin:0 0 16px;line-height:1.55">Final video — same as on the live brief.</p>
    <p class="dooh-sc-ptxt-label" style="margin-top:0;margin-bottom:12px">Current upload</p>
    <div>
      <p class="dooh-export-brand-lbl" style="margin-bottom:8px">Final video</p>
      ${wrapExportFullscreen(
        `<video class="dooh-exp-final-video dooh-exp-brand-vid" src="${esc(media.finalVideo)}" controls preload="metadata" playsinline></video>`,
      )}
    </div>
  </section>`
}

function sceneCardHtml(scene, rows) {
  const media = selectMediaForScene(rows, scene.id)
  const p = scene.prompts ?? {}
  const vid = media.finalVideo
  const stillHero = primaryImageTabUrlForExport(scene, media)
  const ghost = scene.num ?? scene.code
  const compositionRows = sceneCompositionRows(scene)
  const img = scene.image ?? {}
  const isBrandOutro = !!scene.brandOutro

  const intentBlock = `<div class="dooh-sc-intent">${trustedBriefHtml(scene.intentHtml ?? '')}</div>`

  if (isBrandOutro) {
    const imgBlock = sceneMainImageMarkup(scene, media) + intentBlock
    return `<article class="dooh-sc dooh-sc-full" id="${esc(scene.id)}">
      <header class="dooh-sc-head" style="position:relative">
        <span class="dooh-sc-head-ghost" aria-hidden="true">${esc(ghost)}</span>
        <div class="dooh-sc-head-left">
          <div class="dooh-sc-head-top">
            <span class="dooh-sc-snum">${esc(scene.code)}</span>
            <span class="dooh-sc-title">${esc(scene.title)}</span>
          </div>
          <div class="dooh-sc-head-meta">
            <span class="dooh-sc-time">${esc(scene.time ?? '')}</span>
            ${scene.lens ? `<span class="dooh-sc-lens">${esc(scene.lens)}</span>` : ''}
          </div>
        </div>
      </header>
      <div class="dooh-sc-pane dooh-active">${imgBlock}</div>
    </article>`
  }

  const tabIdPrefix = `${esc(scene.id)}`
  const compositionBlock = compositionRows.length
    ? `<div>
      <div class="dooh-sc-ptxt-label">Composition</div>
      <div class="dooh-card-table dooh-card-table--kv">
        <table><tbody>${compositionRows
          .map((row) => `<tr><td>${esc(row.key)}</td><td>${row.html ? trustedBriefHtml(row.value) : esc(row.value)}</td></tr>`)
          .join('')}
        </tbody></table>
      </div>
    </div>`
    : ''
  const paletteBlock =
    img.paletteNote != null && String(img.paletteNote).trim()
      ? `<p class="dooh-sc-intent dooh-sc-image-layout__palette-note">${trustedBriefHtml(img.paletteNote)}</p>`
      : ''
  const imagePaneInner = `<div class="dooh-sc-image-layout">
    <div class="dooh-sc-image-layout__media">${sceneMainImageMarkup(scene, media)}</div>
    <div class="dooh-sc-image-layout__aside">${compositionBlock}${paletteBlock}</div>
  </div>${intentBlock}`

  let videoInner = `<div class="dooh-sc-prompt-wrap">`
  if (vid) {
    videoInner += `<div class="dooh-export-vid-block" style="margin-bottom:14px">
      <div class="dooh-sc-ptxt-label">Final video (uploaded)</div>
      ${wrapExportFullscreen(
        `<video class="dooh-exp-final-video" src="${esc(vid)}" controls preload="metadata" playsinline></video>`,
      )}
    </div>`
  }
  videoInner += `<div class="dooh-sc-ptxt-label">Video prompt</div>
<div class="dooh-sc-ptxt dooh-sc-ptxt--full">${esc(p.video ?? '')}</div>`
  if (p.negativeVideo) {
    videoInner += `<div class="dooh-rule-box"><b>Negative</b> ${esc(p.negativeVideo)}</div>`
  }
  videoInner += `</div>`

  let stillInner = `<div class="dooh-sc-prompt-wrap">`
  if (stillHero) {
    stillInner += `<div style="margin-bottom:14px">
      <div class="dooh-sc-ptxt-label">Scene image</div>
      ${wrapExportFullscreen(
        `<img class="dooh-exp-final-still" src="${esc(stillHero)}" alt="" loading="lazy" />`,
      )}
    </div>`
  } else {
    stillInner += `<p class="dooh-exp-still-placeholder">No scene image yet — add one on the <strong>Still</strong> tab.</p>`
  }
  stillInner += `<div class="dooh-sc-ptxt-label">Still prompt</div>
<div class="dooh-sc-ptxt dooh-sc-ptxt--full">${esc(p.still ?? '')}</div>`
  if (p.negativeStill) {
    stillInner += `<div class="dooh-rule-box"><b>Negative</b> ${esc(p.negativeStill)}</div>`
  }
  stillInner += `</div>`

  return `<article class="dooh-sc" id="${esc(scene.id)}">
  <header class="dooh-sc-head" style="position:relative">
    <span class="dooh-sc-head-ghost" aria-hidden="true">${esc(ghost)}</span>
    <div class="dooh-sc-head-left">
      <div class="dooh-sc-head-top">
        <span class="dooh-sc-snum">${esc(scene.code)}</span>
        <span class="dooh-sc-title">${esc(scene.title)}</span>
      </div>
      <div class="dooh-sc-head-meta">
        <span class="dooh-sc-time">${esc(scene.time ?? '')}</span>
        ${scene.lens ? `<span class="dooh-sc-lens">${esc(scene.lens)}</span>` : ''}
      </div>
    </div>
  </header>
  <div class="dooh-sc-tabs" role="tablist" aria-label="Scene ${esc(scene.code)}">
    <button type="button" role="tab" class="dooh-sc-tab dooh-active" aria-selected="true" id="${tabIdPrefix}-tab-img" aria-controls="${tabIdPrefix}-pane-img">Image</button>
    <button type="button" role="tab" class="dooh-sc-tab" aria-selected="false" id="${tabIdPrefix}-tab-vid" aria-controls="${tabIdPrefix}-pane-vid">Video</button>
    <button type="button" role="tab" class="dooh-sc-tab" aria-selected="false" id="${tabIdPrefix}-tab-still" aria-controls="${tabIdPrefix}-pane-still">Still</button>
  </div>
  <div role="tabpanel" class="dooh-sc-pane dooh-active" id="${tabIdPrefix}-pane-img" aria-labelledby="${tabIdPrefix}-tab-img">${imagePaneInner}</div>
  <div role="tabpanel" class="dooh-sc-pane" id="${tabIdPrefix}-pane-vid" aria-labelledby="${tabIdPrefix}-tab-vid">${videoInner}</div>
  <div role="tabpanel" class="dooh-sc-pane" id="${tabIdPrefix}-pane-still" aria-labelledby="${tabIdPrefix}-tab-still">${stillInner}</div>
</article>`
}

/**
 * Single-file standalone HTML for one DOOH brief: JSON content + uploaded media URLs from Supabase rows.
 * Mirrors in-app typography, layout classes, and dark theme (BriefDoohDetailPage).
 *
 * @param {{ brief: object, rows: array }} opts
 */
export function buildStandaloneBriefHtml({ brief, rows }) {
  const banner = rows?.length ? selectBannerUrl(rows) : null

  const tags =
    (brief.tags ?? []).map((t) => `<span class="badge dooh-exp-tag">${esc(t)}</span>`).join('') || ''

  const arc =
    (brief.creativeArc ?? []).map((step, i, arr) => {
      const badge = `<span class="badge dooh-exp-tag">${esc(step)}</span>`
      const arrow =
        i < arr.length - 1 ? `<span class="dooh-export-arc-arrow" aria-hidden="true">→</span>` : ''
      return `${badge}${arrow}`
    }).join('') || ''

  const sceneCodes = {}
  for (const s of brief?.scenes ?? []) sceneCodes[s.id] = s.code

  let formatHtml = ''
  if (brief.formatRows?.length) {
    formatHtml =
      `<section id="format"><p class="dooh-section-label">Production</p><h2 class="dooh-doc-h2">Format &amp; specs</h2><div class="dooh-card-table dooh-card-table--kv"><table><tbody>` +
      brief.formatRows
        .map(
          (row) =>
            `<tr><td>${esc(row.key)}</td><td>${trustedBriefHtml(row.value)}</td></tr>`,
        )
        .join('') +
      '</tbody></table></div><div class="dooh-divider"></div></section>'
  }

  let charHtml = ''
  if (brief.characterRows?.length || brief.characterRefs?.length) {
    let refs = ''
    if (brief.characterRefs?.length) {
      refs =
        '<div class="dooh-ref-grid">' +
        brief.characterRefs
          .map((ref) => {
            const url = selectCharacterRefUrl(rows ?? [], ref.id)
            const img = url
              ? wrapExportFullscreen(`<img src="${esc(url)}" alt="" loading="lazy" />`)
              : ''
            return `<div class="dooh-ref-cell">${img}<span class="dooh-ref-cell-label">${esc(ref.label)}</span></div>`
          })
          .join('') +
        '</div>'
    }
    charHtml =
      `<section id="character"><div class="dooh-character-direction-header"><div><p class="dooh-section-label">Direction</p><h2 class="dooh-doc-h2">Character direction</h2></div></div>${refs}<div class="dooh-card-table dooh-card-table--kv"><table><tbody>` +
      (brief.characterRows ?? [])
        .map(
          (row) =>
            `<tr class="${row.hot ? 'dooh-hot-row' : ''}"><td>${esc(row.key)}</td><td>${trustedBriefHtml(row.value)}</td></tr>`,
        )
        .join('') +
      '</tbody></table></div><div class="dooh-divider"></div></section>'
  }

  const scenesHtml = (brief.scenes ?? []).map((s) => sceneCardHtml(s, rows)).join('\n')

  const timelineBlock = timelineHtml(brief, sceneCodes)

  const outroScene = brief?.scenes?.find((s) => s.brandOutro)
  const brandStrip = brandOutroStripHtml(outroScene, rows)

  const exported = new Date().toISOString()

  const doohCss = typeof doohExportCssRaw === 'string' ? doohExportCssRaw : ''
  const sections = buildBriefSidebarNav(brief)
  const navHtml = briefNavExportHtml(sections)
  const directionTile = `<div class="dooh-brief-direction-tile">
    <div class="dooh-brief-nav__titles">
      <p class="dooh-brief-nav__eyebrow">Brief direction</p>
      <p class="dooh-brief-nav__brief-name">${esc(brief.listTitle ?? brief.title)}</p>
    </div>
  </div>`

  return `<!DOCTYPE html>
<html lang="en" class="dooh-brief-export">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(brief.title)} - DOOH export</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${DOOH_EXPORT_FONTS_HREF}" />
<style>${doohCss}</style>
</head>
<body>
<div class="dooh-brief-layout">
${navHtml}
<div class="dooh-brief-main">
${directionTile}
<section id="overview">
  ${banner ? `<div class="dooh-doc-banner dooh-exp-media-wrap">
    <img src="${esc(banner)}" alt="" />
    ${brief.bannerLabel ? `<div class="dooh-doc-banner-label"><span class="dooh-mgmt-brand-dot" aria-hidden="true"></span>${esc(brief.bannerLabel)}</div>` : ''}
    ${brief.headerPill ? `<div class="dooh-doc-banner-pill">${esc(brief.headerPill)}</div>` : ''}
    ${EXPORT_MEDIA_ACTIONS_HTML}
  </div>` : ''}
  <div class="dooh-doc-header-body">
    ${tags ? `<div class="dooh-doc-header-meta">${tags}</div>` : ''}
    <h1 class="dooh-doc-h1">${esc(brief.title)}</h1>
    <p class="dooh-doc-subtitle">${esc(brief.subtitle ?? '')}</p>
    <div class="dooh-doc-intro">${trustedBriefHtml(brief.introHtml ?? '')}</div>
    ${arc ? `<div class="dooh-creative-arc">${arc}</div>` : ''}
  </div>
</section>
<div class="dooh-divider"></div>
${formatHtml}
${charHtml}
<section id="storyboard">
  <p class="dooh-section-label">Production · Storyboard</p>
  <h2 class="dooh-doc-h2">Scenes · Storyboard</h2>
  ${timelineBlock}
  <div class="dooh-storyboard">${scenesHtml}</div>
  ${brandStrip}
</section>
  <footer class="dooh-doc-footer">
    <span class="dooh-mgmt-brand-dot" aria-hidden="true"></span>
    <span><b>${esc(brief.footerLine ?? '')}</b></span>
    <span>${esc(brief.footerMeta ?? '')}</span>
    <span class="dooh-export-foot-note">Exported ${esc(exported)}</span>
  </footer>
</div>
</div>
<script>
(function () {
  document.querySelectorAll('article.dooh-sc').forEach(function (card) {
    var tl = card.querySelector(':scope > .dooh-sc-tabs')
    if (!tl) return
    var tabs = tl.querySelectorAll('.dooh-sc-tab')
    var panes = card.querySelectorAll(':scope > .dooh-sc-pane')
    if (tabs.length !== panes.length || !tabs.length) return
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t, k) {
          var on = k === i
          t.classList.toggle('dooh-active', on)
          t.setAttribute('aria-selected', on ? 'true' : 'false')
        })
        panes.forEach(function (pane, k) {
          pane.classList.toggle('dooh-active', k === i)
        })
      })
    })
  })
})()
;(function () {
  /** Black fullscreen (or fixed) stage with letterboxed media — same idea as doohFullscreen.js */
  function openFitFullscreen(wrap) {
    var m = wrap.querySelector('img,video')
    if (!m) return
    var shell = document.createElement('div')
    shell.setAttribute('data-dooh-fs-shell', '')
    shell.style.cssText =
      'box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#000;width:100%;height:100%'
    var clone = m.cloneNode(true)
    if (clone.tagName === 'VIDEO') {
      clone.controls = true
      clone.playsInline = true
    }
    clone.style.cssText =
      'max-width:100vw;max-height:100vh;width:auto;height:auto;object-fit:contain;object-position:center'
    var closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.textContent = 'Close · Esc'
    closeBtn.setAttribute('aria-label', 'Close fullscreen')
    closeBtn.style.cssText =
      'position:absolute;top:12px;right:12px;z-index:3;margin:0;cursor:pointer;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,20,20,0.85);color:#fff;font-family:system-ui,sans-serif;font-size:12px;padding:8px 12px'
    shell.appendChild(closeBtn)
    shell.appendChild(clone)
    document.body.appendChild(shell)
    var cleaned = false
    var fsListenerAdded = false
    function cleanup() {
      if (cleaned) return
      cleaned = true
      document.removeEventListener('keydown', onKey)
      if (fsListenerAdded) document.removeEventListener('fullscreenchange', onFs)
      if (shell.parentNode) shell.parentNode.removeChild(shell)
    }
    function onKey(ev) {
      if (ev.key === 'Escape') exitViewer()
    }
    function exitViewer() {
      if (cleaned) return
      try {
        if (document.fullscreenElement === shell) document.exitFullscreen()
      } catch (_) {
        /* ignore */
      }
      cleanup()
    }
    function onFs() {
      if (document.fullscreenElement === shell) return
      if (shell.parentNode) cleanup()
    }
    closeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation()
      exitViewer()
    })
    shell.addEventListener('click', function (ev) {
      if (ev.target === shell) exitViewer()
    })
    document.addEventListener('keydown', onKey)
    function fixedOverlayFallback() {
      shell.style.position = 'fixed'
      shell.style.left = '0'
      shell.style.top = '0'
      shell.style.right = '0'
      shell.style.bottom = '0'
      shell.style.width = '100vw'
      shell.style.height = '100vh'
      shell.style.zIndex = '2147483646'
    }
    if (typeof shell.requestFullscreen === 'function') {
      shell
        .requestFullscreen()
        .then(function () {
          document.addEventListener('fullscreenchange', onFs)
          fsListenerAdded = true
        })
        .catch(function () {
          fixedOverlayFallback()
        })
    } else {
      fixedOverlayFallback()
    }
  }
  document.querySelectorAll('.dooh-exp-fs-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      var wrap = btn.closest('.dooh-exp-media-wrap')
      if (wrap) openFitFullscreen(wrap)
    })
  })
})()
</script>
</body>
</html>`
}

export function downloadDoohBriefHtml(html, filename) {
  const safe = filename.replace(/[^\w.-]+/g, '_')
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safe.endsWith('.html') ? safe : `${safe}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function buildMediaSnapshot(rows, brief) {
  const safeRows = Array.isArray(rows) ? rows : []
  const scenes = Array.isArray(brief?.scenes) ? brief.scenes : []
  const characterRefs = Array.isArray(brief?.characterRefs) ? brief.characterRefs : []

  const sceneMedia = {}
  for (const scene of scenes) {
    if (!scene?.id) continue
    sceneMedia[scene.id] = selectMediaForScene(safeRows, scene.id)
  }

  const characterRefMedia = {}
  for (const ref of characterRefs) {
    if (!ref?.id) continue
    characterRefMedia[ref.id] = {
      label: ref.label ?? '',
      imageUrl: selectCharacterRefUrl(safeRows, ref.id),
      hasUploadedOverride: characterRefHasUploadedOverride(safeRows, ref.id),
    }
  }

  return {
    banner: {
      sceneId: 'brief-banner',
      imageUrl: selectBannerUrl(safeRows),
      hasUploadedOverride: bannerHasUploadedOverride(safeRows),
    },
    characterRefs: characterRefMedia,
    scenes: sceneMedia,
    rows: safeRows.map((row) => ({
      ...row,
      publicUrl: row?.storage_path ? publicUrlForPath(row.storage_path) : null,
    })),
  }
}

export function buildDoohBriefExportJson({ brief, rows }) {
  const exportedAt = new Date().toISOString()
  const safeBrief = brief ?? {}
  return {
    export: {
      type: 'dooh-brief-full',
      version: 1,
      exportedAt,
      title: safeBrief.title ?? '',
      slug: safeBrief.slug ?? '',
      listTitle: safeBrief.listTitle ?? '',
    },
    brief: safeBrief,
    media: buildMediaSnapshot(rows, safeBrief),
  }
}

export function downloadDoohBriefJson(payload, filename) {
  const safe = filename.replace(/[^\w.-]+/g, '_')
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safe.endsWith('.json') ? safe : `${safe}.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
