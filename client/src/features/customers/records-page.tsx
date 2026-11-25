import { runMutation } from '../../lib/mutation'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpRight, Building2, CircleCheck, Filter, Mail, Pencil, Plus, Search, Target, Trash2, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCRM } from '../../store/crm-store'
import { useCurrentUser } from '../../hooks/use-current-user'
import { ActionMenu, Avatar, Badge, Button, ConfirmDialog, MetricCard, PageHeading, Panel, Select } from '../../components/ui/primitives'
import { DataTable, type Column } from '../../components/data-table/data-table'
import { EntityForm } from '../../components/common/entity-form'
import { employeeColor, exportCSV, money, shortDate } from '../../lib/format'
import type { Customer, Lead } from '../../types'
import { stages } from '../../types'

export default function RecordsPage({ kind }: { kind: 'customers' | 'leads' }) {
  const { data, remove, seedInfo } = useCRM()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [owner, setOwner] = useState('all')
  const [source, setSource] = useState('All sources')
  const [form, setForm] = useState<Customer | Lead | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Customer | Lead | null>(null)
  const isLead = kind === 'leads'
  const records: (Customer | Lead)[] = data[kind]
  const filtered = records.filter(r => `${r.name} ${r.email} ${r.company} ${r.phone}`.toLowerCase().includes(search.toLowerCase()) && (status === 'All statuses' || ('stage' in r ? r.stage : r.status) === status) && (owner === 'all' || r.assignedTo === owner) && (source === 'All sources' || ('source' in r && r.source === source)))
  const activeCount = isLead ? data.leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length : data.customers.filter(c => c.status === 'Active').length
  const columns: Column<Customer | Lead>[] = [
    { key: 'name', label: isLead ? 'Lead name' : 'Customer', sort: r => r.name, render: r => <span className="person-cell"><Avatar name={r.name} color={employeeColor(r.id)} /><span><b>{r.name}</b><small>{isLead ? r.email : ('jobTitle' in r ? r.jobTitle : r.email)}</small></span></span> },
    { key: 'company', label: 'Company', sort: r => r.company, render: r => <span className="company-cell"><span className="company-logo">{r.company[0]}</span>{r.company}</span> },
    ...(!isLead ? [{ key: 'email', label: 'Contact', render: (r: Customer | Lead) => <span className="two-lines"><a href={`mailto:${r.email}`}>{r.email}</a><small>{r.phone || 'No phone added'}</small></span> }] : [{ key: 'source', label: 'Source', sort: (r: Customer | Lead) => 'source' in r ? r.source : '', render: (r: Customer | Lead) => <span className="muted">{'source' in r ? r.source : ''}</span> }]),
    { key: 'status', label: isLead ? 'Stage' : 'Status', sort: r => 'stage' in r ? r.stage : r.status, render: r => <Badge>{'stage' in r ? r.stage : r.status}</Badge> },
    ...(isLead ? [{ key: 'value', label: 'Est. value', className: 'numeric-column', sort: (r: Customer | Lead) => 'value' in r ? r.value : 0, render: (r: Customer | Lead) => <b className="value-cell">{'value' in r ? money(r.value) : ''}</b> }] : []),
    { key: 'owner', label: 'Assigned to', sort: r => data.employees.find(e => e.id === r.assignedTo)?.name || '', render: r => { const e = data.employees.find(employee => employee.id === r.assignedTo); return <span className="owner-cell"><Avatar name={e?.name || 'Unassigned'} color={employeeColor(r.assignedTo)} size="small" /><span>{e?.name || 'Unassigned'}</span></span> } },
    { key: 'date', label: isLead ? 'Follow-up' : 'Last contact', sort: r => 'followUp' in r ? r.followUp : r.lastContact, render: r => <span className="muted nowrap">{shortDate('followUp' in r ? r.followUp : r.lastContact)}</span> },
    { key: 'actions', label: '', render: r => <ActionMenu items={[{ label: 'View details', icon: <ArrowUpRight size={14} />, action: () => navigate(`/${kind}/${r.id}`) }, { label: 'Edit record', icon: <Pencil size={14} />, action: () => setForm(r) }, ...(user?.role === 'Admin' ? [{ label: 'Delete record', icon: <Trash2 size={14} />, danger: true, action: () => setDeleting(r) }] : [])]} /> },
  ]
  function exportRecords() { if (!filtered.length) { toast.info('No matching records to export'); return } exportCSV(`smartcrm-${kind}`, filtered.map(r => ({ ...r, ...('value' in r ? { currency: seedInfo.currency } : {}), assignedTo: data.employees.find(e => e.id === r.assignedTo)?.name || '' }))); toast.success(`${filtered.length} ${kind} exported`) }
  const hasFilters = search || status !== 'All statuses' || owner !== 'all' || source !== 'All sources'
  return <><PageHeading title={isLead ? 'Leads' : 'Customers'} description={isLead ? 'Manage lead ownership, qualification, and follow-ups.' : 'Manage customer accounts and contact information.'}><Button onClick={exportRecords}><ArrowDownToLine size={15} />Export CSV</Button><Button variant="primary" onClick={() => setForm('new')}><Plus size={16} />Add {isLead ? 'lead' : 'customer'}</Button></PageHeading>
    <div className="metrics-grid compact-metrics"><MetricCard label={`Total ${kind}`} value={records.length} icon={isLead ? <Target size={17} /> : <Users size={17} />} detail="Across your entire workspace" /><MetricCard label={isLead ? 'Active opportunities' : 'Active customers'} value={activeCount} icon={<CircleCheck size={17} />} color="green" detail="Current active records" /><MetricCard label={isLead ? 'Estimated lead value' : 'Companies connected'} value={isLead ? money(data.leads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((s, l) => s + l.value, 0), true) : new Set(data.customers.map(c => c.company)).size} icon={<Building2 size={17} />} color="purple" detail={isLead ? 'Excludes won and lost leads' : 'Unique companies'} /><MetricCard label={isLead ? 'Qualified leads' : 'Assigned to you'} value={isLead ? data.leads.filter(l => l.stage === 'Qualified').length : data.customers.filter(c => c.assignedTo === user?.id).length} icon={<Mail size={17} />} color="orange" detail={isLead ? 'Qualified opportunities' : 'Owned by your account'} /></div>
    <Panel className="records-panel"><div className="records-tabs"><button className={status === 'All statuses' && owner === 'all' ? 'active' : ''} onClick={() => { setStatus('All statuses'); setOwner('all'); setSource('All sources') }}>All {kind}<span>{records.length}</span></button><button className={status === (isLead ? 'New' : 'Active') ? 'selected-filter' : ''} onClick={() => setStatus(isLead ? 'New' : 'Active')}>{isLead ? 'New leads' : 'Active'}</button><button className={owner === user?.id ? 'active' : ''} aria-pressed={owner === user?.id} onClick={() => setOwner(owner === user?.id ? 'all' : user?.id || 'all')}>Assigned to me</button><div className="records-tabs-note"><span className="live-dot" />Workspace records</div></div>
      <div className="table-toolbar"><div className="search-input"><Search size={16} /><input aria-label={`Search ${kind}`} value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${kind}...`} />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button>}</div><div className="table-filters"><Filter size={15} className="muted" /><Select label="Filter by status" value={status} onChange={setStatus} options={['All statuses', ...(isLead ? stages : ['Active', 'Inactive'])]} /><Select label="Filter by assigned employee" value={owner} onChange={setOwner} options={[{ value: 'all', label: 'All owners' }, ...data.employees.map(e => ({ value: e.id, label: e.name }))]} />{isLead && <Select label="Filter by lead source" value={source} onChange={setSource} options={['All sources', ...new Set(data.leads.map(l => l.source))]} />}{hasFilters && <button className="clear-filters" onClick={() => { setSearch(''); setStatus('All statuses'); setOwner('all'); setSource('All sources') }}><X size={13} />Clear</button>}</div></div>
      <DataTable key={kind + search + status + owner + source} records={filtered} columns={columns} label={kind} onRowClick={r => navigate(`/${kind}/${r.id}`)} />
    </Panel>
    {form && <EntityForm key={kind} kind={kind} record={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name || 'record'}?`} description="Deletion is prevented while linked records exist in the connected workspace. Reassign or remove those links first." onConfirm={() => deleting ? runMutation(() => remove(kind, deleting.id), 'Record deleted') : false} />
  </>
}

