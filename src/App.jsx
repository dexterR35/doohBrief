import { RouterProvider } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { AuthProvider, useAuth } from './context/AuthContext'
import { router } from './app/router'
import 'react-toastify/dist/ReactToastify.css'

function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-ink-secondary">
      <div className="text-center space-y-2">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm">Loading session...</p>
      </div>
    </div>
  )
}

function AppShell() {
  const { loading } = useAuth()
  if (loading) return <AppLoadingScreen />
  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
      <ToastContainer />
    </AuthProvider>
  )
}
