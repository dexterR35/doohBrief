import { cn } from '../../utils/cn.js'

function Skeleton({ className = '' }) {
  return <div className={cn('skeleton', className)} />
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={cn('skeleton-card', className)}>
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={2} />
    </div>
  )
}

/**
 * Four placeholders matching `SummaryCard` footprint.
 * Render as direct children of the timesheet grid so the grid wrapper stays mounted (no layout swap).
 */
export function SkeletonTimesheetSummaryCards() {
  return Array.from({ length: 4 }).map((_, i) => (
    <div
      key={i}
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-elevated)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
      }}
      aria-hidden
    >
      <div className="h-10 w-10 rounded-[10px] shrink-0 bg-accent" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-28 max-w-full" />
        <Skeleton className="h-3 w-full max-w-48" />
      </div>
    </div>
  ))
}

export function SkeletonSummaryCards() {
  return (
    <div className="dashboard-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="dooh-sc !flex min-w-0 !flex-row items-center gap-3.5 px-4 py-3.5"
        >
          <div className="h-10 w-10 rounded-[10px] shrink-0 bg-accent" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-28 max-w-full" />
            <Skeleton className="h-3 w-full max-w-44" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table__head">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table__row">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cn('h-4 flex-1', j === 1 && 'max-w-[40%]')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonBoardCards({ count = 6 }) {
  return (
    <div className="boards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="board-card">
          <div className="board-card__accent-bar" />
          <div className="board-card__body p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default Skeleton
