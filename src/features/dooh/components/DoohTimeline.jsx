import { Fragment } from 'react'

/** @param {{ timeline: Array<{ id: string, label: string, time: string, weight: number, barAfter?: number, hot?: boolean, hotBridge?: boolean }>, sceneCodes: Record<string, string>, endLabel?: string }} props */
export default function DoohTimeline({ timeline, sceneCodes, endLabel = '10s' }) {
  return (
    <div className="dooh-sb-timeline-wrap">
      <div className="dooh-sb-timeline-track">
        <div className="dooh-sb-timeline-line" aria-hidden />
        {timeline.map((seg, i) => (
          <Fragment key={seg.id}>
            <div
              className={`dooh-sb-seg-wrap${seg.hot ? ' dooh-hot' : ''}`}
              style={{ '--w': seg.weight }}
            >
              <span className="dooh-sb-seg-label">{seg.label}</span>
              <a className="dooh-sb-seg-dot" href={`#${seg.id}`}>
                {sceneCodes[seg.id] ?? seg.id.toUpperCase()}
              </a>
              <span className="dooh-sb-seg-time">{seg.time}</span>
            </div>
            {i < timeline.length - 1 ? (
              <div
                className={`dooh-sb-seg-bar${seg.hotBridge ? ' dooh-hot' : ''}`}
                style={{ '--w': seg.barAfter ?? 0.4 }}
                aria-hidden
              />
            ) : null}
          </Fragment>
        ))}
        <div className="dooh-sb-seg-wrap" style={{ '--w': 0.35, pointerEvents: 'none' }}>
          <span className="dooh-sb-seg-label" style={{ opacity: 0 }}>
            –
          </span>
          <span
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ink-tertiary)',
            }}
          >
            {endLabel}
          </span>
          <span className="dooh-sb-seg-time" style={{ opacity: 0 }}>
            –
          </span>
        </div>
      </div>
    </div>
  )
}
