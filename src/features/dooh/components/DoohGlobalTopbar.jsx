import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'

export default function DoohGlobalTopbar() {
  const { signOut, signingOut } = useAuth()

  return (
    <div className="page-header">
      <Link to="/briefs-dooh" className="logo-brand" aria-label="Go to briefs list">
        <span className="logo-brand-x">V</span>
      </Link>
      <div className="page-header__actions">
        <Button type="button" size="sm" variant="outline" loading={signingOut} onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
