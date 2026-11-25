import { API_MODE } from '../../lib/runtime'
import { apiFailure } from '../../services/api/client'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from '@base-ui/react/menu'
import { Activity, ArrowRight, Bell, BookOpen, ChartNoAxesCombined, ChevronDown, ChevronRight, ChevronsUpDown, CircleHelp, Command, House, Layers2, LayoutDashboard, ListTodo, LogOut, Menu as MenuIcon, Moon, PanelLeftClose, Search, Settings, ShieldCheck, Sun, Target, TrendingUp, Users, UsersRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { useCRM, usePreferences } from '../../store/crm-store'
import { useAuth } from '../../store/auth-store'
import { useCurrentUser } from '../../hooks/use-current-user'
import { Avatar, Badge, EmptyState, IconButton, Modal } from '../ui/primitives'
import { formatWorkspaceTime, employeeColor, money } from '../../lib/format'

const groups = [
  { label: 'MAIN', items: [{ name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }, { name: 'Customers', to: '/customers', icon: Users }, { name: 'Leads', to: '/leads', icon: Target }, { name: 'Sales Pipeline', to: '/pipeline', icon: Layers2 }] },
  { label: 'WORKSPACE', items: [{ name: 'Tasks', to: '/tasks', icon: ListTodo }, { name: 'Team Management', to: '/team', icon: UsersRound }] },
  { label: 'INSIGHTS', items: [{ name: 'Reports & Analytics', to: '/reports', icon: ChartNoAxesCombined }] },
  { label: 'GENERAL', items: [{ name: 'Settings', to: '/settings', icon: Settings }] },
]
const routeNames: Record<string, string> = { dashboard: 'Dashboard', customers: 'Customers', leads: 'Leads', pipeline: 'Sales Pipeline', tasks: 'Tasks', team: 'Team Management', reports: 'Reports & Analytics', settings: 'Settings', profile: 'My Profile', 'access-denied': 'Access denied' }
export function Brand({ compact = false }: { compact?: boolean }) { return <Link to="/dashboard" className="brand" aria-label="SmartCRM home"><span className="brand-mark"><Layers2 size={23} strokeWidth={2.4} /></span>{!compact && <span>Smart<span className="brand-light">CRM</span><small>Sales Workspace</small></span>}</Link> }
export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data, readNotifications, seedInfo, notifications } = useCRM()
  const { preferences, update } = usePreferences()
  const currentUser = useCurrentUser()
  const signOut = useAuth(s => s.signOut)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const currentPage = routeNames[location.pathname.split('/')[1]] || 'Workspace'
  const notificationRecords = API_MODE ? notifications : data.activities
  const unread = notificationRecords.filter(a => !a.read).length
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(v => !v) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])
  useEffect(() => { const close = () => setMobileOpen(false); window.addEventListener('popstate', close); return () => window.removeEventListener('popstate', close) }, [])
  useEffect(() => {
    if (!mobileOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []).filter(element => element.offsetParent !== null)
    focusable()[0]?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false) }
      if (event.key !== 'Tab') return
      const elements = focusable()
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', handleKey)
      previouslyFocused?.focus({ preventScroll: true })
    }
  }, [mobileOpen])
  const searchGroups = [
    { label: 'Customers', records: data.customers.map(r => ({ ...r, path: `/customers/${r.id}`, detail: r.company })) },
    { label: 'Leads', records: data.leads.map(r => ({ ...r, path: `/leads/${r.id}`, detail: r.company })) },
    { label: 'Deals', records: data.deals.map(r => ({ ...r, path: `/pipeline?deal=${r.id}`, detail: `${r.company} · ${money(r.value)}` })) },
    { label: 'Tasks', records: data.tasks.map(r => ({ ...r, path: `/tasks?task=${r.id}`, detail: r.status })) },
    { label: 'Team', records: data.employees.map(r => ({ ...r, path: `/team/${r.id}`, detail: r.jobTitle })) },
  ].map(g => ({ ...g, records: g.records.filter(r => `${r.name} ${r.detail} ${'email' in r ? r.email : ''}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4) }))
  useEffect(() => { if (seedInfo.requiresReset) toast.info('Pakistani demo data is available. Your previous records have been kept. Use Settings → Account → Reset Demo Data to replace them.', { id: 'pakistan-seed-migration', duration: 10000, action: { label: 'Settings', onClick: () => navigate('/settings') } }) }, [seedInfo.requiresReset, navigate])
  async function logout() { try { await signOut(); if (API_MODE) useCRM.getState().clear(); navigate('/login') } catch (error) { toast.error(apiFailure(error).message) } }
  return <div className={`app-shell ${preferences.collapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileOpen && <button aria-label="Close navigation" className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
    <aside ref={sidebarRef} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label="Workspace navigation" className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}><div className="sidebar-brand"><Brand compact={preferences.collapsed && !mobileOpen} /><IconButton className="mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></IconButton></div>
      <button className="workspace-picker" onClick={() => { setMobileOpen(false); setGuideOpen(true) }}><span className="workspace-avatar">S<span /></span><span className="nav-text"><b>SmartCRM Workspace</b><small>{API_MODE ? 'Connected workspace' : 'Demo workspace'}</small></span><ChevronsUpDown className="nav-text" size={15} /></button>
      <nav aria-label="Main navigation" onClick={event => { if ((event.target as HTMLElement).closest('a')) setMobileOpen(false) }}>{groups.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`} title={item.name}><item.icon size={18} strokeWidth={1.7} /><span className="nav-text">{item.name}</span>{item.to === '/leads' && <span className="nav-count nav-text">{data.leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length}</span>}{item.to === '/tasks' && <span className="nav-count nav-text">{data.tasks.filter(t => t.status !== 'Completed').length}</span>}</NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item help-link" onClick={() => { setMobileOpen(false); setGuideOpen(true) }} title="Help and getting started"><CircleHelp size={18} /><span className="nav-text">Help & getting started</span><ArrowUpRightIcon /></button><div className="sidebar-user"><Link to="/profile"><Avatar name={currentUser?.name || 'Ahmed Faraz'} color="purple" /><span className="nav-text"><b>{currentUser?.name}</b><small>{currentUser?.jobTitle}</small></span></Link><IconButton aria-label="Sign out" onClick={logout}><LogOut size={17} /></IconButton></div></div>
    </aside>
    <div className="main-shell" inert={mobileOpen}><header className="topbar"><div className="breadcrumb"><IconButton aria-label={preferences.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="desktop-menu" onClick={() => update({ collapsed: !preferences.collapsed })}><PanelLeftClose size={18} /></IconButton><IconButton aria-label="Open navigation" className="mobile-menu" onClick={() => setMobileOpen(true)}><MenuIcon size={21} /></IconButton><Link to="/dashboard" aria-label="Home"><House size={15} /></Link><ChevronRight size={13} /><span>{currentPage}</span>{location.pathname.split('/').length > 2 && <><ChevronRight size={13} /><span className="muted">Details</span></>}</div>
      <div className="header-tools"><button className="global-search" onClick={() => { setQuery(''); setSearchOpen(true) }}><Search size={16} /><span>Search anything...</span><kbd><Command size={11} /> K</kbd></button><span className="header-divider" /><IconButton aria-label="Toggle theme" onClick={() => update({ theme: document.documentElement.classList.contains('dark') ? 'light' : 'dark' })}>{preferences.theme === 'dark' ? <Sun size={19} /> : <Moon size={18} />}</IconButton><IconButton className="notification-button" aria-label={`Notifications, ${unread} unread`} onClick={() => setNotificationsOpen(true)}><Bell size={19} />{unread > 0 && preferences.desktopNotifications && <span className="notification-dot" />}</IconButton><span className="header-divider" /><Menu.Root><Menu.Trigger render={<button className="profile-trigger" aria-label="Profile menu" />}><Avatar name={currentUser?.name || 'Ahmed Faraz'} color="purple" size="small" /><ChevronDown size={13} /></Menu.Trigger><Menu.Portal><Menu.Positioner align="end" sideOffset={12} className="menu-positioner"><Menu.Popup className="dropdown profile-dropdown"><div className="dropdown-profile"><b>{currentUser?.name}</b><small>{currentUser?.email}</small><Badge>{currentUser?.role}</Badge></div><Menu.Item className="dropdown-item" onClick={() => navigate('/profile')}>My profile</Menu.Item><Menu.Item className="dropdown-item" onClick={() => navigate('/settings')}>Workspace settings</Menu.Item><Menu.Item className="dropdown-item text-danger" onClick={logout}><LogOut size={15} />Sign out</Menu.Item></Menu.Popup></Menu.Positioner></Menu.Portal></Menu.Root></div></header>
      <main className="main-content" key={location.pathname}><Outlet /></main><footer className="app-footer"><span>© {new Date().getFullYear()} SmartCRM</span><span><i /> {API_MODE ? 'SmartCRM workspace' : 'Demo workspace'} <span className="footer-separator">·</span>{API_MODE ? 'Connected to SmartCRM API' : 'All changes saved locally'}</span></footer>
    </div>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search your workspace" description="Find customers, leads, deals, tasks, and teammates." wide><div className="search-dialog-input"><Search size={20} /><input ref={searchRef} autoFocus placeholder="Search by name, company, or email..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="search-results">{searchGroups.some(g => g.records.length) ? searchGroups.map(group => !!group.records.length && <div key={group.label}><div className="search-group-label">{group.label}</div>{group.records.map(record => <button className="search-result" key={record.id} onClick={() => { navigate(record.path); setSearchOpen(false) }}><Avatar name={record.name} size="small" /><span><b>{record.name}</b><small>{record.detail}</small></span><ChevronRight size={16} /></button>)}</div>) : <EmptyState title="No matches found" description="Try another name, company, or email." />}</div><div className="search-dialog-footer"><span><kbd>esc</kbd> to close</span><span>Search all workspace records</span></div></Modal>
    <Modal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Notifications" description={`${unread} unread updates in your workspace.`}><div className="notification-toolbar"><span>Recent activity</span><button className="text-link" onClick={() => readNotifications()}>Mark all as read</button></div><div className="notification-list">{notificationRecords.slice(0, 15).map(a => { const employee = data.employees.find(e => e.id === a.employeeId); return <button key={a.id} className={`notification-item ${!a.read ? 'unread' : ''}`} onClick={() => readNotifications(a.id)}><Avatar name={employee?.name || 'Workspace'} color={employeeColor(a.employeeId)} size="small" /><span><span><b>{employee?.name || 'Workspace'}</b> {a.text}</span><small title={formatWorkspaceTime(a.createdAt)}>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</small></span>{!a.read && <i />}</button> })}</div></Modal>
    <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Welcome to your sales workspace" description="A quick guide to your sales workspace."><div className="guide-content"><div className="demo-notice"><ShieldCheck size={21} /><span><b>{API_MODE ? 'Your connected workspace' : "You're exploring a demo workspace"}</b><p>{API_MODE ? 'Records are stored in MongoDB. Account permissions are verified by the server.' : 'Data is saved in this browser. Authentication and roles are simulated for this frontend demo.'}</p></span></div>{[{ icon: Users, title: 'Customers and leads', text: 'Add customers, capture leads, and keep every detail in one place.', path: '/customers' }, { icon: TrendingUp, title: 'Sales pipeline', text: 'Drag deals between stages and see your revenue update instantly.', path: '/pipeline' }, { icon: Activity, title: 'Reports and analytics', text: 'View revenue, conversion, and task completion. Export a CSV report.', path: '/reports' }].map(item => <button key={item.path} className="guide-item" onClick={() => { navigate(item.path); setGuideOpen(false) }}><span className="guide-icon"><item.icon size={20} /></span><span><b>{item.title}</b><p>{item.text}</p></span><ArrowRight size={17} /></button>)}<p className="guide-footnote"><BookOpen size={15} />{API_MODE ? 'Contact your workspace administrator for account assistance.' : 'Restore the original demo records from Settings.'}</p></div></Modal>
  </div>
}
function ArrowUpRightIcon() { return <svg className="nav-text" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 17 17 7M7 7h10v10" /></svg> }
