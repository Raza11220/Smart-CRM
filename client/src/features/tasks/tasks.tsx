import { runMutation } from '../../lib/mutation'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, CircleCheck, Clock3, Filter, LayoutGrid, List, ListTodo, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCRM } from '../../store/crm-store'
import { useCurrentUser } from '../../hooks/use-current-user'
import { ActionMenu, Avatar, Badge, Button, ConfirmDialog, IconButton, MetricCard, PageHeading, Panel, Select } from '../../components/ui/primitives'
import { EntityForm } from '../../components/common/entity-form'
import { DataTable, type Column } from '../../components/data-table/data-table'
import { isWorkspaceToday, isWorkspaceOverdue, employeeColor, shortDate } from '../../lib/format'
import type { Task } from '../../types'

const overdue = (task: Task) => task.status !== 'Completed' && isWorkspaceOverdue(task.dueDate)
export default function Tasks() {
  const { data, save, remove } = useCRM()
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [priority, setPriority] = useState('All priorities')
  const [owner, setOwner] = useState('all')
  const [due, setDue] = useState('All due dates')
  const [form, setForm] = useState<Task | 'new' | null>(null)
  const [newStatus, setNewStatus] = useState<Task['status']>('Todo')
  const [deleting, setDeleting] = useState<Task | null>(null)
  const selected = data.tasks.find(t => t.id === params.get('task'))
  const editing = form || selected
  const completed = data.tasks.filter(t => t.status === 'Completed').length
  const filtered = data.tasks.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) && (status === 'All statuses' || t.status === status) && (priority === 'All priorities' || t.priority === priority) && (owner === 'all' || t.assignedTo === owner) && (due === 'All due dates' || (due === 'Overdue' ? overdue(t) : isWorkspaceToday(t.dueDate))))
  function closeForm() { setForm(null); setParams(previous => { previous.delete('task'); return previous }) }
  function createTask(status: Task['status'] = 'Todo') { setNewStatus(status); setForm('new') }
  function toggleTask(task: Task) { void runMutation(() => save('tasks', { ...task, status: task.status === 'Completed' ? 'Todo' : 'Completed' }), task.status === 'Completed' ? 'Task reopened' : 'Task completed') }
  function actions(task: Task) { return [{ label: 'Edit task', icon: <Pencil size={14} />, action: () => setForm(task) }, { label: task.status === 'Completed' ? 'Reopen task' : 'Mark completed', icon: <Check size={14} />, action: () => toggleTask(task) }, ...(user?.role === 'Admin' ? [{ label: 'Delete task', icon: <Trash2 size={14} />, danger: true, action: () => setDeleting(task) }] : [])] }
  const columns: Column<Task>[] = [
    { key: 'name', label: 'Task', sort: t => t.name, render: task => <div className="task-name-cell"><button className={`task-checkbox ${task.status === 'Completed' ? 'checked' : ''}`} aria-label={`Toggle completion for ${task.name}`} onClick={() => toggleTask(task)}>{task.status === 'Completed' && <Check size={12} />}</button><button className={`task-name-button ${task.status === 'Completed' ? 'task-completed' : ''}`} onClick={() => setForm(task)}>{task.name}</button></div> },
    { key: 'priority', label: 'Priority', sort: t => ({ Low: 0, Medium: 1, High: 2, Urgent: 3 })[t.priority], render: t => <Badge>{t.priority}</Badge> },
    { key: 'status', label: 'Status', sort: t => t.status, render: t => <Select label={`Status of ${t.name}`} value={t.status} options={['Todo', 'In Progress', 'Completed']} onChange={status => { void runMutation(() => save('tasks', { ...t, status: status as Task['status'] }), 'Task status updated') }} className="table-status-select" /> },
    { key: 'dueDate', label: 'Due date', sort: t => t.dueDate, render: t => <span className={`due-date ${overdue(t) ? 'text-danger' : ''}`}><CalendarDays size={13} />{isWorkspaceToday(t.dueDate) ? 'Today' : shortDate(t.dueDate)}{overdue(t) && <span className="overdue-label">Overdue</span>}</span> },
    { key: 'owner', label: 'Assigned to', render: t => { const employee = data.employees.find(e => e.id === t.assignedTo); return <span className="owner-cell"><Avatar name={employee?.name || 'Unassigned'} color={employeeColor(t.assignedTo)} size="small" />{employee?.name}</span> } },
    { key: 'related', label: 'Related to', render: t => { const relation = [...data.customers, ...data.leads].find(r => r.id === t.relatedId); return relation ? <Link className="text-link" to={`/${relation.id.startsWith('lead') ? 'leads' : 'customers'}/${relation.id}`}>{relation.name}</Link> : <span className="muted">—</span> } },
    { key: 'actions', label: '', render: t => <ActionMenu items={actions(t)} /> },
  ]
  return <><PageHeading title="Tasks" description="Manage follow-ups, deadlines, and team assignments."><Button variant="primary" onClick={() => createTask()}><Plus size={16} />Create task</Button></PageHeading>
    <div className="metrics-grid compact-metrics"><MetricCard label="Total tasks" value={data.tasks.length} icon={<ListTodo size={17} />} detail="Your workspace to-do list" /><MetricCard label="In progress" value={data.tasks.filter(t => t.status === 'In Progress').length} icon={<Clock3 size={17} />} color="purple" detail="Tasks currently underway" /><MetricCard label="Completed" value={completed} icon={<CircleCheck size={17} />} color="green" detail={`${Math.round(completed / Math.max(data.tasks.length, 1) * 100)}% of all tasks completed`} /><MetricCard label="Overdue" value={data.tasks.filter(overdue).length} icon={<CalendarDays size={17} />} color="orange" detail="Past the due date" /></div>
    <Panel className="records-panel"><div className="records-tabs"><button className={owner === 'all' ? 'active' : ''} onClick={() => setOwner('all')}>All tasks<span>{data.tasks.length}</span></button><button className={owner === user?.id ? 'active' : ''} onClick={() => setOwner(user?.id || 'all')}>My tasks</button><button className={due === 'Today' ? 'active' : ''} onClick={() => setDue(due === 'Today' ? 'All due dates' : 'Today')}>Due today</button><div className="view-switch"><IconButton className={view === 'list' ? 'active' : ''} aria-label="Task list view" onClick={() => setView('list')}><List size={17} /></IconButton><IconButton className={view === 'board' ? 'active' : ''} aria-label="Task board view" onClick={() => setView('board')}><LayoutGrid size={16} /></IconButton></div></div><div className="table-toolbar"><div className="search-input"><Search size={16} /><input aria-label="Search tasks" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} /></div><div className="table-filters"><Filter size={15} className="muted" /><Select label="Task status filter" value={status} onChange={setStatus} options={['All statuses', 'Todo', 'In Progress', 'Completed']} /><Select label="Task priority filter" value={priority} onChange={setPriority} options={['All priorities', 'Low', 'Medium', 'High', 'Urgent']} /><Select label="Task due date filter" value={due} onChange={setDue} options={['All due dates', 'Today', 'Overdue']} /><Select label="Task owner filter" value={owner} onChange={setOwner} options={[{ value: 'all', label: 'All owners' }, ...data.employees.map(e => ({ value: e.id, label: e.name }))]} /></div></div>
      {view === 'list' ? <DataTable key={search + status + priority + owner + due} records={filtered} columns={columns} label="tasks" /> : <div className="task-board">{(['Todo', 'In Progress', 'Completed'] as const).map(state => <section key={state}><div className="task-board-heading"><span className={`stage-indicator ${state === 'Completed' ? 'green-bg' : state === 'In Progress' ? 'blue-bg' : 'gray-bg'}`} /><h2>{state}</h2><span>{filtered.filter(t => t.status === state).length}</span><button aria-label={`Create ${state} task`} onClick={() => createTask(state)}><Plus size={16} /></button></div>{filtered.filter(t => t.status === state).map(task => <article className="task-board-card" key={task.id}><div><Badge>{task.priority}</Badge><ActionMenu items={actions(task)} /></div><button className="task-board-title" onClick={() => setForm(task)}>{task.name}</button><p>{[...data.customers, ...data.leads].find(record => record.id === task.relatedId)?.company || task.description}</p><div className={`due-date ${overdue(task) ? 'text-danger' : ''}`}><CalendarDays size={12} />{shortDate(task.dueDate)}{overdue(task) && <span className="overdue-label">Overdue</span>}</div><div className="task-board-footer"><Avatar name={data.employees.find(e => e.id === task.assignedTo)?.name || 'Unassigned'} color={employeeColor(task.assignedTo)} size="small" /><Select label={`Move ${task.name}`} value={task.status} options={['Todo', 'In Progress', 'Completed']} onChange={status => { void runMutation(() => save('tasks', { ...task, status: status as Task['status'] })) }} /></div></article>)}{!filtered.some(t => t.status === state) && <div className="kanban-empty">Nothing here yet.<br /><span>Use the status menu to move tasks here.</span></div>}</section>)}</div>}
    </Panel>
    {editing && <EntityForm kind="tasks" initialTaskStatus={newStatus} record={editing === 'new' ? undefined : editing} onClose={closeForm} />}
    <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete “${deleting?.name}”?`} onConfirm={() => deleting ? runMutation(() => remove('tasks', deleting.id), 'Task deleted') : false} />
  </>
}

