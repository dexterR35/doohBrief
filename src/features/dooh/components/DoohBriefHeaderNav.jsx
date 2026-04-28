import { Fragment, useEffect, useMemo, useState } from 'react'
import { cn } from '../../../utils/cn.js'
import '../doohBriefHeaderNav.minimal.css'

function splitOverviewAndStoryboard(sections) {
  const list = sections ?? []
  const overviewGroups = list.filter((g) => String(g.group) !== 'Storyboard')
  const storyboardGroup = list.find((g) => String(g.group) === 'Storyboard')
  return { overviewGroups, storyboardGroup }
}

function NavAnchor({ link, effective, className }) {
  return (
    <a
      href={`#${link.id}`}
      className={cn('dooh-brief-nav__anchor', effective === link.id && 'dooh-brief-nav__anchor--active', className)}
    >
      <span className="dooh-brief-nav__anchor-label">{link.label}</span>
      {link.hint ? <span className="dooh-brief-nav__anchor-hint">{link.hint}</span> : null}
    </a>
  )
}

export default function DoohBriefHeaderNav({ sections, activeId, briefName }) {
  const [hash, setHash] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '',
  )

  useEffect(() => {
    const onHash = () => setHash(window.location.hash.replace(/^#/, ''))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const ids = sections.flatMap((g) => g.links.map((l) => l.id))

    const setActiveFromDom = () => {
      let best = null
      let bestDist = Infinity
      const mid = window.innerHeight * 0.38
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        const center = r.top + r.height / 2
        const d = Math.abs(center - mid)
        if (r.bottom > 0 && r.top < window.innerHeight && d < bestDist) {
          bestDist = d
          best = id
        }
      }
      if (best) setHash(best)
    }

    const t = window.setInterval(setActiveFromDom, 400)
    window.addEventListener('scroll', setActiveFromDom, true)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('scroll', setActiveFromDom, true)
    }
  }, [sections])

  const effective = activeId || hash

  const { overviewGroups, storyboardGroup } = useMemo(
    () => splitOverviewAndStoryboard(sections),
    [sections],
  )

  return (
    <header className="dooh-brief-nav" aria-label="Brief sections">
      {briefName ? (
        <div className="dooh-brief-direction-tile">
          <div className="dooh-brief-nav__titles">
            <p className="dooh-brief-nav__eyebrow">Brief direction</p>
            <p className="dooh-brief-nav__brief-name">{briefName}</p>
          </div>
        </div>
      ) : null}
      <div className="dooh-brief-nav__rows">
        {overviewGroups.length ? (
          <div className="dooh-brief-nav__block">
            <p className="dooh-brief-nav__block-label">Overview</p>
            <nav className="dooh-brief-nav__rail dooh-brief-nav__rail--wrap" aria-label="Overview sections">
              {overviewGroups.map((group, gi) => (
                <Fragment key={group.group}>
                  {overviewGroups.length > 1 && gi > 0 ? (
                    <span className="dooh-brief-nav__divider dooh-brief-nav__divider--soft" aria-hidden="true" />
                  ) : null}
                  {overviewGroups.length > 1 ? (
                    <span className="dooh-brief-nav__group-tag">{group.group}</span>
                  ) : null}
                  {(group.links ?? []).map((link) => (
                    <NavAnchor key={link.id} link={link} effective={effective} />
                  ))}
                </Fragment>
              ))}
            </nav>
          </div>
        ) : null}

        {storyboardGroup?.links?.length ? (
          <div className="dooh-brief-nav__block dooh-brief-nav__block--storyboard">
            <p className="dooh-brief-nav__block-label">Storyboard</p>
            <nav className="dooh-brief-nav__rail dooh-brief-nav__rail--wrap" aria-label="Storyboard and scenes">
              {storyboardGroup.links.map((link) => (
                <NavAnchor key={link.id} link={link} effective={effective} />
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}
