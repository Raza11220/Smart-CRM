import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Providers } from './providers'
import AppShell from '../components/layout/app-shell'
import { useAuth } from '../store/auth-store'
import { useCurrentUser } from '../hooks/use-current-user'
import { useCRM, usePreferences } from '../store/crm-store'
import { API_MODE } from '../lib/runtime'
import { Button } from '../components/ui/primitives'
const Dashboard = lazy(() => import('../features/dashboard/dashboard'))
const RecordsPage = lazy(() => import('../features/customers/records-page'))
const RecordDetail = lazy(() => import('../features/customers/record-detail'))
const Pipeline = lazy(() => import('../features/pipeline/pipeline'))
const Tasks = lazy(() => import('../features/tasks/tasks'))
const Team = lazy(() => import('../features/team/team'))
const Reports = lazy(() => import('../features/reports/reports'))
const Settings = lazy(() => import('../features/settings/settings'))
const Profile = lazy(() => import('../features/profile/profile'))
const AuthPage = lazy(() => import('../features/auth/auth-page'))
function ProtectedRoute() {
  const userId = useAuth(s => s.userId)
  const authStatus = useAuth(s => s.status)
  const authError = useAuth(s => s.error)
  const ready = useCRM(s => s.ready)
  const workspaceError = useCRM(s => s.error)
  const user = useCurrentUser()
  const location = useLocation()
  if (API_MODE && (authError || (userId && workspaceError))) {
    return (
      <div className="error-page">
        <h1>Workspace unavailable</h1>
        <p>{authError || workspaceError}</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'center' }}>
          <Button onClick={async () => { if (authError) await useAuth.getState().restore(); if (useAuth.getState().userId) await useCRM.getState().refresh().catch(() => {}) }}>Retry connection</Button>
          <a className="btn btn-secondary" href="/login">Go to Login</a>
        </div>
      </div>
    )
  }

  if (API_MODE && (authStatus === 'loading' || (userId && !ready))) return <PageSkeleton />
  if (!userId || !user || user.status !== 'Active') return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <AppShell />
}
export function PageSkeleton() { return <div className="page-skeleton" aria-label="Loading page" role="status"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-subtitle" /><div className="skeleton-stats">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" />)}</div><div className="skeleton skeleton-chart" /><span className="sr-only">Loading your workspace…</span></div> }
function ErrorPage({ denied = false }: { denied?: boolean }) { return <div className="error-page"><span className="error-code">{denied ? '403' : '404'}</span><h1>{denied ? 'This area is for admins' : 'Page not found'}</h1><p>{denied ? 'Your role does not have permission to perform this action.' : 'The page you’re looking for has moved or doesn’t exist.'}</p><a className="btn btn-primary" href="/dashboard">Back to dashboard</a></div> }
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="error-page"><h1>Something interrupted your workspace</h1><p>Your saved demo data is still in this browser. Reload to try again.</p><Button onClick={() => window.location.reload()}>Reload workspace</Button></div> : this.props.children }
}
export default function App() {
  usePreferences(s => `${s.preferences.currency}-${s.preferences.dateFormat}-${s.preferences.locale}-${s.preferences.timezone}`)
  useEffect(() => { if (API_MODE) void (async () => { await useAuth.getState().restore(); if (useAuth.getState().userId) await useCRM.getState().refresh().catch(() => {}) })() }, [])
  return <ErrorBoundary><Providers><BrowserRouter><Suspense fallback={<PageSkeleton />}><Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/forgot-password" element={<AuthPage mode="forgot" />} /><Route element={<ProtectedRoute />}><Route index element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/customers" element={<RecordsPage key="customers" kind="customers" />} /><Route path="/customers/:id" element={<RecordDetail kind="customers" />} /><Route path="/leads" element={<RecordsPage key="leads" kind="leads" />} /><Route path="/leads/:id" element={<RecordDetail kind="leads" />} /><Route path="/pipeline" element={<Pipeline />} /><Route path="/tasks" element={<Tasks />} /><Route path="/team" element={<Team />} /><Route path="/team/:id" element={<Profile employeeView />} /><Route path="/reports" element={<Reports />} /><Route path="/settings" element={<Settings />} /><Route path="/profile" element={<Profile />} /><Route path="/access-denied" element={<ErrorPage denied />} /><Route path="*" element={<ErrorPage />} /></Route></Routes></Suspense></BrowserRouter></Providers></ErrorBoundary>
}
