import { runMutation } from '../../lib/mutation'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCheck, CircleCheck, LayoutGrid, List, Mail, Pencil, Plus, Search, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useCRM } from '../../store/crm-store'
import { useCurrentUser } from '../../hooks/use-current-user'
import { ActionMenu, Avatar, Badge, Button, ConfirmDialog, EmptyState, IconButton, MetricCard, PageHeading, Panel, Select } from '../../components/ui/primitives'
import { DataTable, type Column } from '../../components/data-table/data-table'
import { EntityForm } from '../../components/common/entity-form'
import { employeeColor, money } from '../../lib/format'
import type { Employee } from '../../types'

export default function Team() {
  const { data, remove } = useCRM()
  const currentUser = useCurrentUser()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [role, setRole] = useState('All roles')
  const [view, setView] = useState('grid')
  const [form, setForm] = useState<Employee | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const isAdmin = currentUser?.role === 'Admin'
  const filtered = data.employees.filter(e => `${e.name} ${e.email} ${e.jobTitle}`.toLowerCase().includes(search.toLowerCase()) && (status === 'All statuses' || e.status === status) && (role === 'All roles' || e.role === role))
  const performance = (id: string) => ({ revenue: data.deals.filter(d => d.assignedTo === id && d.stage === 'Won').reduce((sum, d) => sum + d.value, 0), won: data.deals.filter(d => d.assignedTo === id && d.stage === 'Won').length, tasks: data.tasks.filter(t => t.assignedTo === id && t.status !== 'Completed').length })
  const actions = (e: Employee) => [{ label: 'View profile', action: () => navigate(`/team/${e.id}`) }, ...(isAdmin ? [{ label: 'Edit employee', icon: <Pencil size={14} />, action: () => setForm(e) }, ...(e.id !== currentUser?.id && e.id !== 'employee-1' ? [{ label: 'Delete employee', icon: <Trash2 size={14} />, danger: true, action: () => setDeleting(e) }] : [])] : [])]
  const columns: Column<Employee>[] = [
    { key: 'name', label: 'Team member', sort: e => e.name, render: e => <span className="person-cell"><Avatar name={e.name} color={employeeColor(e.id)} /><span><b>{e.name}</b><small>{e.email}</small></span></span> },
    { key: 'jobTitle', label: 'Job title', sort: e => e.jobTitle, render: e => e.jobTitle }, { key: 'role', label: 'Role', render: e => <Badge>{e.role}</Badge> },
    { key: 'status', label: 'Status', sort: e => e.status, render: e => <Badge>{e.status}</Badge> },
    { key: 'revenue', label: 'Won revenue', sort: e => performance(e.id).revenue, render: e => <b>{money(performance(e.id).revenue)}</b> },
    { key: 'tasks', label: 'Open tasks', sort: e => performance(e.id).tasks, render: e => performance(e.id).tasks },
    { key: 'actions', label: '', render: e => <ActionMenu items={actions(e)} /> },
  ]
  return <><PageHeading title="Team management" description="Manage team access, assignments, and sales performance.">{isAdmin && <Button variant="primary" onClick={() => setForm('new')}><Plus size={16} />Add employee</Button>}</PageHeading><div className="metrics-grid compact-metrics"><MetricCard label="Team members" value={data.employees.length} icon={<Users size={17} />} detail="Members in this workspace" /><MetricCard label="Active employees" value={data.employees.filter(e => e.status === 'Active').length} icon={<CircleCheck size={17} />} color="green" detail="Available for assignments" /><MetricCard label="Workspace admins" value={data.employees.filter(e => e.role === 'Admin').length} icon={<ShieldCheck size={17} />} color="purple" detail="Managing your workspace" /><MetricCard label="Tasks completed" value={data.tasks.filter(t => t.status === 'Completed').length} icon={<CheckCheck size={17} />} color="orange" detail="Completed across the team" /></div>
    {!isAdmin && <div className="inline-notice"><ShieldCheck size={17} />You’re viewing the team as Staff. Employee and role management are available to admins.</div>}
    <div className="team-toolbar"><div className="search-input"><Search size={16} /><input aria-label="Search team members" placeholder="Search team members..." value={search} onChange={e => setSearch(e.target.value)} /></div><div className="table-filters"><Select label="Employee status filter" value={status} onChange={setStatus} options={['All statuses', 'Active', 'Inactive']} /><Select label="Employee role filter" value={role} onChange={setRole} options={['All roles', 'Admin', 'Staff']} /><div className="view-switch"><IconButton aria-label="Employee cards" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><LayoutGrid size={16} /></IconButton><IconButton aria-label="Employee table" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={17} /></IconButton></div></div></div>
    {view === 'list' ? <Panel><DataTable records={filtered} columns={columns} label="employees" onRowClick={e => navigate(`/team/${e.id}`)} /></Panel> : <div className="team-grid">{filtered.map(employee => { const p = performance(employee.id); return <article className="employee-card panel" key={employee.id}><div className="employee-card-top"><Badge>{employee.role}</Badge><ActionMenu items={actions(employee)} /></div><Link to={`/team/${employee.id}`} className="employee-card-person"><Avatar name={employee.name} color={employeeColor(employee.id)} size="large" /><h2>{employee.name}{employee.id === currentUser?.id && <span>you</span>}</h2><p>{employee.jobTitle}</p></Link><a href={`mailto:${employee.email}`} className="employee-email"><Mail size={13} />{employee.email}</a><div className="employee-card-status"><Badge>{employee.status}</Badge></div><div className="employee-card-stats"><div><strong>{money(p.revenue, true)}</strong><span>Revenue</span></div><div><strong>{p.won}</strong><span>Deals won</span></div><div><strong>{p.tasks}</strong><span>Open tasks</span></div></div><Link className="employee-profile-link" to={`/team/${employee.id}`}>View profile<span>→</span></Link></article> })}{!filtered.length && <EmptyState title="No team members found" />}</div>}
    {form && isAdmin && <EntityForm kind="employees" record={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Remove ${deleting?.name}?`} description="Connected records must be reassigned before removal. Employees with activity history should be deactivated instead." onConfirm={() => deleting && isAdmin ? runMutation(() => remove('employees', deleting.id), 'Employee removed') : false} />
  </>
}
