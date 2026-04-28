export default function PageBoardLayout({ topbar, sidebar, children, className = '' }) {
  return (
    <section className={`pageboard ${className}`.trim()}>
      {topbar ? <div className="pageboard__topbar">{topbar}</div> : null}
      <div className="pageboard__body">
        {sidebar ? <aside className="pageboard__sidebar">{sidebar}</aside> : null}
        <div className="pageboard__main">{children}</div>
      </div>
    </section>
  )
}
