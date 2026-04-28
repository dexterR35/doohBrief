import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { useAuth } from '../../../context/AuthContext'

export default function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/briefs-dooh'

  if (user) return <Navigate to={from} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error: signInError } = await signIn({ email, password })
      if (signInError) {
        setError(signInError.message || 'Sign in failed')
        return
      }
      navigate(from, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8 flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6 space-y-4">
        <h1 className="text-xl font-semibold text-ink-primary">Sign in</h1>
        <p className="text-sm text-ink-tertiary">Use your Supabase account to access briefs.</p>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button type="submit" fullWidth loading={busy} disabled={busy}>
          Sign in
        </Button>
      </form>
    </div>
  )
}

