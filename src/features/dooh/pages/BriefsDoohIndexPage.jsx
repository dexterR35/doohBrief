import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Card } from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { deleteDoohBriefRow } from '../doohBriefsDb'
import { normalizeDoohBriefSlug } from '../doohBriefSlug'
import { useDoohBriefIndexEntries } from '../hooks/useDoohBriefCatalog'
import { toast } from '../../../lib/toast'
import { useConfirm } from '../../../hooks/useConfirm'
import PageBoardLayout from '../../../components/layout/PageBoardLayout'
import DoohGlobalTopbar from '../components/DoohGlobalTopbar'

export default function BriefsDoohIndexPage() {
  const { entries, loading, error, refresh, bannerBySlug } = useDoohBriefIndexEntries()
  const [deletingSlug, setDeletingSlug] = useState(null)
  const { confirm, ConfirmModal } = useConfirm()

  async function handleDeleteBrief(slug) {
    const label = slug
    const ok = await confirm({
      title: 'Delete brief',
      message: `Delete "${label}" from PostgreSQL? Storage files and dooh_brief_media rows for this slug will be removed.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      requireText: label,
      requireTextLabel: 'Type the brief slug to confirm deletion',
    })
    if (!ok) return
    setDeletingSlug(slug)
    try {
      await deleteDoohBriefRow(slug)
      toast.success('Brief deleted from PostgreSQL')
      await refresh()
    } catch (e) {
      toast.error(e?.message ?? 'Delete failed')
    } finally {
      setDeletingSlug(null)
    }
  }

  return (
    <>
      <PageBoardLayout className="dooh-brief-layout" topbar={<DoohGlobalTopbar />}>
        <div className="space-y-6 dooh-brief-main">
          <div className="page-header dooh-brief-detail-header">
            <div>
              <h1 className="page-header__title">Briefs</h1>
              {error ? (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                  Could not load <code className="font-mono">dooh_briefs</code>: {error}. Run the latest Supabase migration if
                  this table is missing.
                </p>
              ) : null}
              {loading ? (
                <p className="text-xs text-ink-tertiary mt-1" aria-live="polite">
                  Syncing brief list…
                </p>
              ) : null}
            </div>
          </div>

          {!loading && !error && entries.length === 0 ? (
            <div className="rounded-xl border border-border border-dashed bg-surface-elevated/60 px-6 py-10 text-center text-sm text-ink-secondary">
              <p className="mb-3 font-medium text-ink-primary">No brief cards available.</p>
              <p className="mb-5 text-xs text-ink-tertiary">
                Add a brief row in PostgreSQL or ensure <code className="font-mono">constants.json</code> includes entries under{' '}
                <code className="font-mono">briefs[]</code>.
              </p>
            </div>
          ) : null}

          <div className="flex w-full max-w-full flex-col gap-4">
            {entries.map((entry) => {
              const { brief, slug, source } = entry
              const img = bannerBySlug[normalizeDoohBriefSlug(slug)] ?? null
              const deleteBusy = deletingSlug === slug
              const canDelete = source === 'db'
              return (
                <div key={entry.key} className="relative">
                  <Link
                    to={`/briefs-dooh/${slug}`}
                    className="group block rounded-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Card padding="none">
                      <div
                        className="h-56 sm:h-72 bg-cover bg-center bg-surface-elevated"
                        style={img ? { backgroundImage: `url(${img})` } : undefined}
                      />
                      <div className="card--padded space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5 flex-1">
                            <p className="font-mono text-[9px] uppercase tracking-wider text-ink-tertiary mb-1">Brief</p>
                            <h2 className="card-header__title text-base font-semibold leading-snug">{brief.listTitle ?? brief.title}</h2>
                          </div>
                          <div className="flex flex-wrap gap-1 shrink-0 justify-end">
                            {source === 'db' ? (
                              <Badge variant="success" title="Brief stored in PostgreSQL">
                                DB
                              </Badge>
                            ) : (
                              <Badge variant="gray" title="Bundled reference from constants.json — save to Postgres to persist edits">
                                JSON
                              </Badge>
                            )}
                            {brief.listBadge ? <Badge variant="gray">{brief.listBadge}</Badge> : null}
                          </div>
                        </div>
                        <p className="card-header__subtitle text-xs leading-relaxed text-ink-tertiary">{brief.subtitle}</p>
                        <span className="text-accent text-sm font-semibold inline-flex items-center gap-1">
                          Open brief <span aria-hidden>→</span>
                        </span>
                      </div>
                    </Card>
                  </Link>
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="dangerMuted"
                      size="sm"
                      className="!absolute top-3 right-3 z-[2] shadow-md"
                      aria-label={`Delete brief ${slug} from database`}
                      icon={TrashIcon}
                      loading={deleteBusy}
                      disabled={deletingSlug !== null}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteBrief(slug)
                      }}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </PageBoardLayout>
      {ConfirmModal}
    </>
  )
}
