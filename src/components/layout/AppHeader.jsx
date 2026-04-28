import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'

const PAGE_TITLES = [
  { startsWith: '/briefs-dooh/', title: 'Brief Details' },
  { startsWith: '/briefs-dooh', title: 'DOOH Briefs' },
]

function getPageTitle(pathname) {
  const match = PAGE_TITLES.find((item) => pathname.startsWith(item.startsWith))
  return match?.title ?? 'Dashboard'
}

export default function AppHeader() {
  const { pathname } = useLocation()
  const { profile, signOut, signingOut } = useAuth()

  return (
    <header>
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/briefs-dooh" className="logo-brand" aria-label="Go to briefs list">
          <span className="logo-brand-x">V</span>
        </Link>
        <div className="min-w-0">
          <p className="logo-brand-title truncate">{getPageTitle(pathname)}</p>
          <p className="text-xs text-ink-tertiary">Member</p>
        </div>
      </div>

      <div className="header-actions">
        <span className="hidden text-xs text-ink-tertiary sm:inline">{profile?.name}</span>
        <Button type="button" size="sm" variant="outline" loading={signingOut} onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
