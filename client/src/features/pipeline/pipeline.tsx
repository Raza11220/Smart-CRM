import { useAnalytics } from '../../hooks/use-analytics'
import { runMutation } from '../../lib/mutation'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, KeyboardCoordinateGetter } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDownToLine, ArrowUpRight, CalendarDays, CircleCheck, DollarSign, GripVertical, LayoutGrid, List, Pencil, Plus, Search, SlidersHorizontal, Trash2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useCRM } from '../../store/crm-store'
import { useCurrentUser } from '../../hooks/use-current-user'
import { CurrencyValue, ActionMenu, Avatar, Badge, Button, ConfirmDialog, IconButton, Modal, PageHeading, Select } from '../../components/ui/primitives'
import { EntityForm } from '../../components/common/entity-form'
import { DataTable, type Column } from '../../components/data-table/data-table'
import { employeeColor, exportCSV, metrics, money, shortDate } from '../../lib/format'
import { stages } from '../../types'
import type { Deal, Stage } from '../../types'

const stageColors: Record<Stage, string> = { New: '#6a9bf3', Contacted: '#9b83df', Qualified: '#dfa144', Proposal: '#5b84e5', Won: '#27a37f', Lost: '#df7b83' }
const keyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.code)) return
  event.preventDefault()
  const currentStage = (context.over?.id || context.active?.data.current?.stage) as Stage
  const current = stages.indexOf(currentStage)
  const nextStage = stages[current + (event.code === 'ArrowRight' ? 1 : -1)]
  const currentRect = context.droppableRects.get(currentStage)
  const nextRect = nextStage && context.droppableRects.get(nextStage)
  if (currentRect && nextRect) return { x: currentCoordinates.x + nextRect.left - currentRect.left, y: currentCoordinates.y }
}
function DealCard({ deal, onOpen, overlay = false }: { deal: Deal; onOpen: () => void; overlay?: boolean }) {
  return overlay ? <DealCardView deal={deal} onOpen={onOpen} overlay /> : <DraggableDealCard deal={deal} onOpen={onOpen} />
}
function DraggableDealCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: deal.id, data: { stage: deal.stage } })
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.2 : 1 }}><DealCardView deal={deal} onOpen={onOpen} handle={<button ref={setActivatorNodeRef} className="drag-handle" aria-label={`Drag ${deal.name} for ${deal.company}`} {...attributes} {...listeners}><GripVertical size={16} /></button>} /></div>
}
function DealCardView({ deal, onOpen, overlay = false, handle }: { deal: Deal; onOpen: () => void; overlay?: boolean; handle?: ReactNode }) {
  const employee = useCRM(s => s.data.employees.find(e => e.id === deal.assignedTo))
  return <article className={`deal-card ${overlay ? 'drag-overlay' : ''}`}><div className="deal-card-top"><span className="company-monogram" style={{ background: `${stageColors[deal.stage]}15`, color: stageColors[deal.stage] }}>{deal.company[0]}</span><span>{deal.company}</span>{handle || <GripVertical size={16} className="drag-handle" />}</div><button className="deal-title" onClick={onOpen}>{deal.name}</button><strong className="deal-value">{money(deal.value)}</strong><div className="deal-card-tags"><Badge>{deal.priority}</Badge></div><div className="deal-card-footer"><Avatar name={employee?.name || 'Unassigned'} color={employeeColor(deal.assignedTo)} size="small" /><span>{employee?.name.split(' ')[0]}</span><span><CalendarDays size={11} />{shortDate(deal.closeDate)}</span></div></article>
}
function PipelineColumn({ stage, deals, onOpen, onAdd }: { stage: Stage; deals: Deal[]; onOpen: (deal: Deal) => void; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return <section ref={setNodeRef} className={`kanban-column ${isOver ? 'drag-over' : ''}`}><div className="kanban-column-header"><span className="stage-indicator" style={{ background: stageColors[stage] }} /><h2>{stage}</h2><span className="stage-count">{deals.length}</span><IconButton aria-label={`Add ${stage} deal`} onClick={onAdd}><Plus size={16} /></IconButton></div><div className="kanban-column-value">{money(deals.reduce((sum, deal) => sum + deal.value, 0))}<span> total value</span></div><div className="kanban-cards">{deals.map(deal => <DealCard key={deal.id} deal={deal} onOpen={() => onOpen(deal)} />)}{!deals.length && <div className="kanban-empty">Drop a deal here<br /><span>Drag a deal here or use Add deal.</span></div>}</div><button className="kanban-add" onClick={onAdd}><Plus size={14} />Add deal</button></section>
}
export default function Pipeline() {
  const { data, moveDeal, remove, seedInfo } = useCRM()
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState('all')
  const [priority, setPriority] = useState('All priorities')
  const [view, setView] = useState('board')
  const [form, setForm] = useState<Deal | 'new' | null>(null)
  const [newStage, setNewStage] = useState<Stage>('New')
  const [deleting, setDeleting] = useState<Deal | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }))
  const selected = data.deals.find(d => d.id === params.get('deal'))
  const selectedStage = params.get('stage') || 'All stages'
  const filtered = data.deals.filter(d => `${d.name} ${d.company}`.toLowerCase().includes(search.toLowerCase()) && (owner === 'all' || d.assignedTo === owner) && (priority === 'All priorities' || d.priority === priority) && (selectedStage === 'All stages' || d.stage === selectedStage))
  const active = data.deals.find(d => d.id === activeId)
  const analyticsQuery = useAnalytics()
  const m = analyticsQuery.data?.summary || metrics(data)
  function open(deal: Deal) { setParams(previous => { previous.set('deal', deal.id); return previous }) }
  function close() { setParams(previous => { previous.delete('deal'); return previous }) }
  function add(stage: Stage = 'New') { setNewStage(stage); setForm('new') }
  function onDragEnd(event: DragEndEvent) { setActiveId(null); if (event.over && stages.includes(event.over.id as Stage)) moveDeal(String(event.active.id), event.over.id as Stage) }
  const columns: Column<Deal>[] = [
    { key: 'name', label: 'Deal', sort: d => d.name, render: d => <span className="two-lines"><b>{d.name}</b><small>{d.company}</small></span> },
    { key: 'value', label: 'Value', sort: d => d.value, render: d => <b>{money(d.value)}</b> },
    { key: 'stage', label: 'Stage', sort: d => d.stage, render: d => <Badge>{d.stage}</Badge> },
    { key: 'priority', label: 'Priority', render: d => <Badge>{d.priority}</Badge> },
    { key: 'date', label: 'Close date', sort: d => d.closeDate, render: d => shortDate(d.closeDate) },
    { key: 'owner', label: 'Owner', render: d => data.employees.find(e => e.id === d.assignedTo)?.name },
    { key: 'actions', label: '', render: d => <ActionMenu items={[{ label: 'View deal', action: () => open(d) }, { label: 'Edit deal', action: () => setForm(d) }, ...(user?.role === 'Admin' ? [{ label: 'Delete deal', danger: true, action: () => setDeleting(d) }] : [])]} /> },
  ]
  return <><PageHeading title="Sales pipeline" description="Track deal value, ownership, and progress through each stage."><Button onClick={() => { if (!filtered.length) return toast.info('No deals to export'); exportCSV('smartcrm-deals', filtered.map(d => ({ ...d, currency: seedInfo.currency }))); toast.success('Deals exported') }}><ArrowDownToLine size={15} />Export</Button><Button variant="primary" onClick={() => add()}><Plus size={16} />Add deal</Button></PageHeading>
    <div className="pipeline-stats"><div><span className="metric-icon blue"><DollarSign size={17} /></span><span><small>Open pipeline</small><strong><CurrencyValue amount={m.pipeline} /></strong></span></div><div><span className="metric-icon purple"><TrendingUp size={17} /></span><span><small>Active deals</small><strong>{data.deals.filter(d => !['Won', 'Lost'].includes(d.stage)).length}</strong></span></div><div><span className="metric-icon green"><CircleCheck size={17} /></span><span><small>Won revenue</small><strong><CurrencyValue amount={m.revenue} /></strong></span></div><div><span className="metric-icon orange"><TargetIcon /></span><span><small>Win rate</small><strong>{m.winRate.toFixed(1)}%</strong></span></div></div>
    <div className="pipeline-toolbar"><div className="search-input"><Search size={16} /><input aria-label="Search deals" placeholder="Search deals or companies..." value={search} onChange={e => setSearch(e.target.value)} /></div><div className="table-filters"><SlidersHorizontal size={15} className="muted" /><Select label="Filter deal owner" value={owner} onChange={setOwner} options={[{ value: 'all', label: 'All owners' }, ...data.employees.map(e => ({ value: e.id, label: e.name }))]} /><Select label="Filter deal priority" value={priority} onChange={setPriority} options={['All priorities', 'Low', 'Medium', 'High', 'Urgent']} /><Select label="Filter deal stage" value={selectedStage} onChange={stage => setParams(previous => { if (stage === 'All stages') previous.delete('stage'); else previous.set('stage', stage); return previous })} options={['All stages', ...stages]} /><div className="view-switch"><IconButton className={view === 'board' ? 'active' : ''} aria-label="Board view" onClick={() => setView('board')}><LayoutGrid size={16} /></IconButton><IconButton className={view === 'list' ? 'active' : ''} aria-label="List view" onClick={() => setView('list')}><List size={17} /></IconButton></div></div></div>
    {view === 'board' ? <><div className="board-helper"><span><span className="live-dot" />{filtered.length} deals in view</span><span>Drag the grip to move a deal. Keyboard: Space, ← →, Space.</span></div><DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={event => setActiveId(String(event.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}><div className="kanban-board">{stages.map(stage => <PipelineColumn key={stage} stage={stage} deals={filtered.filter(d => d.stage === stage)} onOpen={open} onAdd={() => add(stage)} />)}</div><DragOverlay>{active ? <DealCard deal={active} overlay onOpen={() => {}} /> : null}</DragOverlay></DndContext></> : <div className="panel"><DataTable records={filtered} columns={columns} label="deals" onRowClick={open} /></div>}
    <Modal open={!!selected} onClose={close} title={selected?.name || 'Deal details'} description={selected?.company} drawer>{selected && <><div className="drawer-body"><div className="drawer-deal-value"><small>Deal value</small><strong>{money(selected.value)}</strong><Badge>{selected.priority}</Badge></div><div className="drawer-field"><label>Pipeline stage</label><Select label="Deal stage" value={selected.stage} onChange={value => moveDeal(selected.id, value as Stage)} options={[...stages]} /></div><dl className="detail-definition"><div><dt>Company</dt><dd>{selected.company}</dd></div><div><dt>Assigned to</dt><dd>{data.employees.find(e => e.id === selected.assignedTo)?.name}</dd></div><div><dt>Expected close</dt><dd>{shortDate(selected.closeDate)}</dd></div><div><dt>Created</dt><dd>{shortDate(selected.createdAt)}</dd></div><div><dt>Related customer</dt><dd>{selected.customerId ? <Link to={`/customers/${selected.customerId}`} onClick={close}>{data.customers.find(c => c.id === selected.customerId)?.name}<ArrowUpRight size={13} /></Link> : 'Not linked'}</dd></div><div><dt>Related lead</dt><dd>{selected.leadId ? <Link to={`/leads/${selected.leadId}`} onClick={close}>{data.leads.find(l => l.id === selected.leadId)?.name}<ArrowUpRight size={13} /></Link> : 'Not linked'}</dd></div></dl><div className="drawer-notes"><h3>Deal notes</h3><p>{selected.notes || 'No notes added yet.'}</p></div><div className="demo-notice"><CircleCheck size={18} /><p>Stage changes update the related lead, dashboard, and reports automatically.</p></div></div><div className="modal-footer">{user?.role === 'Admin' && <Button variant="ghost" className="text-danger" onClick={() => { setDeleting(selected); close() }}><Trash2 size={15} />Delete</Button>}<Button variant="primary" onClick={() => { setForm(selected); close() }}><Pencil size={15} />Edit deal</Button></div></>}</Modal>
    {form && <EntityForm kind="deals" record={form === 'new' ? undefined : form} initialStage={newStage} onClose={() => setForm(null)} />}
    <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name}?`} onConfirm={() => deleting ? runMutation(() => remove('deals', deleting.id), 'Deal deleted') : false} />
  </>
}
function TargetIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg> }
