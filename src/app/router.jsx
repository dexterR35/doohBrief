import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import BriefsDoohIndexPage from '../features/dooh/pages/BriefsDoohIndexPage'
import BriefDoohDetailPage from '../features/dooh/pages/BriefDoohDetailPage'
import LoginPage from '../features/auth/pages/LoginPage'
import RequireAuth from './RequireAuth'

function protectedRoute(element) {
  return <RequireAuth>{element}</RequireAuth>
}

function ProtectedLayout() {
  return (
    <div className="app-shell">
      <div className="app-content">
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: protectedRoute(<ProtectedLayout />),
    children: [
      { path: '/briefs-dooh', element: <BriefsDoohIndexPage /> },
      { path: '/briefs-dooh/:briefSlug', element: <BriefDoohDetailPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/briefs-dooh" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
