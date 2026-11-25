import { runMutation } from '../../lib/mutation'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Building2, Clock3, DollarSign, Mail, MapPin, Pencil, Phone, Plus, Save, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useCRM } from '../../store/crm-store'
import { useCurrentUser } from '../../hooks/use-current-user'
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Panel, Select } from '../../components/ui/primitives'
import { EntityForm } from '../../components/common/entity-form'
import { formatWorkspaceTime, employeeColor, money, shortDate } from '../../lib/format'
import { stages } from '../../types'
import type { Customer, Lead, EntityKey } from '../../types'

export default function RecordDetail({ kind }: { kind: 'customers' | 'leads' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, save, remove } = useCRM()
  const user = useCurrentUser()
  const record = data[kind].find(r => r.id === id)
  const [tab, setTab] = useState('Overview')
  const [form, setForm] = useState<EntityKey | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  if (!record) return <EmptyState title="This record couldn’t be found" description="It may have been removed from your workspace." action={<Link to={`/${kind}`} className="btn btn-primary">Back to {kind}</Link>} />
  const isLead = 'stage' in record
  const employee = data.employees.find(e => e.id === record.assignedTo)
  const deals = data.deals.filter(d => d.customerId === id || d.leadId === id)
  const tasks = data.tasks.filter(t => t.relatedId === id)
  const activities = data.activities.filter(a => a.relatedId === id)
  function updateRecord(values: Partial<Customer> | Partial<Lead>) { return runMutation(() => isLead ? save('leads', { ...record, ...values } as Lead) : save('customers', { ...record, ...values } as Customer), 'Record updated') }
  const dealsView = <div className="detail-deals">{deals.length ? deals.map(deal => <Link to={`/pipeline?deal=${deal.id}`} key={deal.id} className="related-record"><span className="related-icon"><DollarSign size={18} /></span><span><b>{deal.name}</b><small>{deal.company} · Closes {shortDate(deal.closeDate)}</small></span><Badge>{deal.stage}</Badge><strong>{money(deal.value)}</strong><ArrowUpRight size={16} /></Link>) : <EmptyState title="No deals connected yet" description="Create a deal and associate it with this record." action={<Button onClick={() => setForm('deals')}><Plus size={14} />Create deal</Button>} />}</div>
  const tasksView = <div className="detail-tasks">{tasks.length ? tasks.map(task => <div key={task.id} className="related-record"><button className={`task-checkbox ${task.status === 'Completed' ? 'checked' : ''}`} aria-label={`Toggle completion for ${task.name}`} onClick={() => { void runMutation(() => save('tasks', { ...task, status: task.status === 'Completed' ? 'Todo' : 'Completed' })) }}>{task.status === 'Completed' && '✓'}</button><Link to={`/tasks?task=${task.id}`}><b>{task.name}</b><small>Due {shortDate(task.dueDate)}</small></Link><Badge>{task.priority}</Badge><Badge>{task.status}</Badge></div>) : <EmptyState title="No related tasks" description="Add a follow-up to keep this relationship moving." action={<Button onClick={() => setForm('tasks')}><Plus size={14} />Add task</Button>} />}</div>
  return <><Link className="back-link" to={`/${kind}`}><ArrowLeft size={15} />Back to {kind}</Link><div className="detail-header"><Avatar name={record.name} color={employeeColor(record.id)} size="large" /><div><div className="detail-name"><h1>{record.name}</h1><Badge>{isLead ? record.stage : record.status}</Badge></div><p>{isLead ? record.company : `${record.jobTitle} at ${record.company}`}<span>·</span>Added {shortDate(record.createdAt)}</p></div><div className="page-actions"><Button onClick={() => setForm(kind)}><Pencil size={15} />Edit {isLead ? 'lead' : 'customer'}</Button>{user?.role === 'Admin' && <Button variant="ghost" aria-label="Delete record" onClick={() => setDeleting(true)}><Trash2 size={16} /></Button>}</div></div>
    <div className="detail-layout"><aside><Panel title="Contact details"><div className="contact-info"><div><Mail size={16} /><span><small>Email address</small><a href={`mailto:${record.email}`}>{record.email}</a></span></div><div><Phone size={16} /><span><small>Phone number</small><a href={`tel:${record.phone}`}>{record.phone || 'Not provided'}</a></span></div><div><Building2 size={16} /><span><small>Company</small>{record.company}</span></div>{!isLead && <div><MapPin size={16} /><span><small>Address</small>{record.address || 'Not provided'}</span></div>}<div><BriefcaseBusiness size={16} /><span><small>Assigned to</small><span className="owner-cell"><Avatar name={employee?.name || 'Unassigned'} color={employeeColor(record.assignedTo)} size="small" />{employee?.name}</span></span></div></div><div className="detail-controls"><label>Assigned employee</label><Select label="Assigned employee" value={record.assignedTo} options={data.employees.filter(e => e.status === 'Active').map(e => ({ value: e.id, label: e.name }))} onChange={assignedTo => updateRecord({ assignedTo })} />{isLead && <><label>Lead stage</label><Select label="Lead stage" value={record.stage} options={[...stages]} onChange={stage => updateRecord({ stage: stage as Lead['stage'] })} /><label>Next follow-up</label><input aria-label="Next follow-up" type="date" value={record.followUp} onChange={e => { if (e.target.value) updateRecord({ followUp: e.target.value }) }} /></>}</div></Panel>{isLead && <Panel title="Opportunity"><div className="opportunity-value"><small>Estimated value</small><strong>{money(record.value)}</strong><Badge>{record.priority}</Badge><p>Source: {record.source}</p></div></Panel>}</aside>
      <div className="detail-main"><div className="detail-tabs">{['Overview', 'Deals', 'Tasks', 'Notes', 'Activity'].map(t => <button className={t === tab ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}{t === 'Deals' && <span>{deals.length}</span>}{t === 'Tasks' && <span>{tasks.length}</span>}</button>)}</div>
        {(tab === 'Overview' || tab === 'Deals') && <Panel title="Associated deals" subtitle="Opportunities connected to this relationship." action={<Button className="btn-small" onClick={() => setForm('deals')}><Plus size={14} />Add deal</Button>}>{dealsView}</Panel>}
        {(tab === 'Overview' || tab === 'Tasks') && <Panel title="Related tasks" subtitle="Tasks linked to this record." action={<Button className="btn-small" onClick={() => setForm('tasks')}><Plus size={14} />Add task</Button>}>{tasksView}</Panel>}
        {(tab === 'Overview' || tab === 'Notes') && <Panel title="Notes" subtitle="Account context and follow-up notes."><div className="notes-editor"><textarea aria-label="Relationship notes" rows={5} value={note ?? record.notes} onChange={e => setNote(e.target.value)} placeholder="Add context, meeting notes, or next steps…" /><Button variant="primary" disabled={note === null || note === record.notes} onClick={() => { updateRecord({ notes: note || '' }); setNote(null) }}><Save size={14} />Save notes</Button></div></Panel>}
        {tab === 'Activity' && <Panel title="Activity history"><div className="detail-activity">{activities.length ? activities.map(a => <div key={a.id}><span className="timeline-dot" /><p><b>{data.employees.find(e => e.id === a.employeeId)?.name || 'Workspace'}</b> {a.text}<small title={formatWorkspaceTime(a.createdAt)}><Clock3 size={12} />{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</small></p></div>) : <EmptyState title="No activity yet" description="Edits and new interactions will appear in this timeline." />}</div></Panel>}
      </div></div>
    {form && <EntityForm kind={form} record={form === kind ? record : undefined} relatedId={record.id} onClose={() => setForm(null)} />}
    <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} title={`Delete ${record.name}?`} onConfirm={() => runMutation(() => remove(kind, record.id), 'Record deleted', () => navigate(`/${kind}`))} />
  </>
}
