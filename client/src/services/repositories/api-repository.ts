import { api, type ApiUser } from '../api/client'
import { dateKey } from '../../lib/localization'
import type { Activity, Customer, Database, Deal, Employee, Entity, EntityKey, Lead, Priority, Stage, Task } from '../../types'
export const publicId = (kind: EntityKey, id: string) => `${kind === 'employees' ? 'employee' : kind.slice(0, -1)}-${id}`
export function rawId(value: string) { const id = value.slice(value.lastIndexOf('-') + 1); if (!/^[a-f\d]{24}$/i.test(id)) throw new Error('Invalid API record ID'); return id }
const title = (value: string) => value[0].toUpperCase() + value.slice(1)
const text = (value: unknown) => typeof value === 'string' ? value : ''
const day = (value: unknown) => value ? dateKey(text(value)) : ''
export function employeeFromApi(user: ApiUser): Employee { return { id: publicId('employees', user.id), name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone || '', role: user.role === 'admin' ? 'Admin' : 'Staff', status: user.status === 'active' ? 'Active' : 'Inactive', jobTitle: user.jobTitle, department: user.department, city: user.city, createdAt: day(user.createdAt) } }
type Row = Record<string, unknown>
export function fromApi(kind: EntityKey, row: Row): Entity {
  if (kind === 'employees') return employeeFromApi(row as unknown as ApiUser)
  const common = { id: publicId(kind, text(row.id)), assignedTo: publicId('employees', text(row.assignedTo)), createdAt: day(row.createdAt) }
  if (kind === 'customers') return { ...common, name: `${row.firstName} ${row.lastName}`, email: text(row.email), phone: text(row.phone), company: text(row.company), jobTitle: text(row.jobTitle), status: row.status === 'inactive' ? 'Inactive' : 'Active', address: text(row.address), city: text(row.city), province: text(row.province), notes: text(row.notes), lastContact: day(row.lastContactAt) } satisfies Customer
  if (kind === 'leads') return { ...common, name: text(row.name), email: text(row.email), phone: text(row.phone), company: text(row.company), source: text(row.source), value: Number(row.estimatedValue), stage: title(text(row.status)) as Stage, priority: title(text(row.priority)) as Priority, followUp: day(row.nextFollowUp), notes: text(row.notes), city: text(row.city), province: text(row.province), address: text(row.address), ...(row.customerId ? { customerId: publicId('customers', text(row.customerId)) } : {}) } as Lead
  if (kind === 'deals') return { ...common, name: text(row.title), company: text(row.company), value: Number(row.value), stage: title(text(row.stage)) as Stage, priority: title(text(row.priority)) as Priority, customerId: row.customerId ? publicId('customers', text(row.customerId)) : undefined, leadId: row.leadId ? publicId('leads', text(row.leadId)) : undefined, closeDate: day(row.expectedCloseDate), closedAt: text(row.closedAt), notes: text(row.description) } as Deal
  return { ...common, name: text(row.title), description: text(row.description), priority: title(text(row.priority)) as Priority, status: row.status === 'completed' ? 'Completed' : row.status === 'in_progress' ? 'In Progress' : 'Todo', dueDate: day(row.dueDate), relatedId: row.customerId ? publicId('customers', text(row.customerId)) : row.leadId ? publicId('leads', text(row.leadId)) : '', ...(row.dealId ? { dealId: publicId('deals', text(row.dealId)) } : {}) } as Task
}
export function activityFromApi(row: Row, notification = false): Activity {
  const type = text(notification ? row.relatedEntityType : row.entityType)
  const kind = type === 'customer' ? 'customers' : type === 'lead' ? 'leads' : type === 'deal' ? 'deals' : type === 'task' ? 'tasks' : 'employees'
  return { id: text(row.id), text: text(notification ? row.message : row.description), employeeId: row.actorId ? publicId('employees', text(row.actorId)) : '', type: type === 'user' ? 'employee' : kind.slice(0, -1) as Activity['type'], relatedId: row[notification ? 'relatedEntityId' : 'entityId'] ? publicId(kind, text(row[notification ? 'relatedEntityId' : 'entityId'])) : undefined, createdAt: text(row.createdAt), read: notification ? Boolean(row.isRead) : true }
}
const endpoint = (kind: EntityKey) => kind === 'employees' ? 'users' : kind
async function all(path: string): Promise<Row[]> {
  const rows: Row[] = []; let page = 1; let pages: number
  do { const response = await api.get<{ data: Row[]; pagination: { totalPages: number } }>(`/${path}`, { params: { page, limit: 100 } }); rows.push(...response.data.data); pages = response.data.pagination.totalPages; page += 1 } while (page <= pages)
  return rows
}
const relation = (value?: string) => value ? rawId(value) : null
export function toApi(kind: EntityKey, record: Entity): Row {
  if (kind === 'employees') { const user = record as Employee & { password?: string }; const [firstName, ...rest] = user.name.split(' '); return { firstName, lastName: rest.join(' '), email: user.email, phone: user.phone, jobTitle: user.jobTitle, department: user.department, city: user.city, role: user.role.toLowerCase(), status: user.status.toLowerCase(), ...(user.password ? { password: user.password } : {}) } }
  const base = { assignedTo: rawId((record as Customer).assignedTo) }
  if (kind === 'customers') { const c = record as Customer; const [firstName, ...rest] = c.name.split(' '); return { ...base, firstName, lastName: rest.join(' '), email: c.email, phone: c.phone, company: c.company, jobTitle: c.jobTitle, status: c.status.toLowerCase(), address: c.address, city: c.city, province: c.province, notes: c.notes, ...(c.lastContact ? { lastContactAt: new Date(`${c.lastContact}T00:00:00+05:00`).toISOString() } : {}) } }
  if (kind === 'leads') { const l = record as Lead & { customerId?: string }; return { ...base, name: l.name, email: l.email, phone: l.phone, company: l.company, source: l.source, estimatedValue: l.value, status: l.stage.toLowerCase(), priority: l.priority.toLowerCase(), nextFollowUp: l.followUp || undefined, customerId: relation(l.customerId), notes: l.notes, city: l.city, province: l.province, address: l.address } }
  if (kind === 'deals') { const d = record as Deal; return { ...base, title: d.name, company: d.company, value: d.value, stage: d.stage.toLowerCase(), priority: d.priority.toLowerCase(), customerId: relation(d.customerId), leadId: relation(d.leadId), expectedCloseDate: d.closeDate, description: d.notes } }
  const t = record as Task & { dealId?: string }; return { ...base, title: t.name, description: t.description, priority: t.priority.toLowerCase(), status: t.status === 'In Progress' ? 'in_progress' : t.status.toLowerCase(), dueDate: t.dueDate, customerId: t.relatedId.startsWith('customer-') ? rawId(t.relatedId) : null, leadId: t.relatedId.startsWith('lead-') ? rawId(t.relatedId) : null, dealId: relation(t.dealId) }
}
export const apiRepository = {
  async load(): Promise<{ data: Database; notifications: Activity[] }> {
    const [customers, leads, deals, tasks, employees, activities, notifications] = await Promise.all(['customers', 'leads', 'deals', 'tasks', 'users', 'activities', 'notifications'].map(all))
    return { data: { customers: customers.map(row => fromApi('customers', row) as Customer), leads: leads.map(row => fromApi('leads', row) as Lead), deals: deals.map(row => fromApi('deals', row) as Deal), tasks: tasks.map(row => fromApi('tasks', row) as Task), employees: employees.map(row => fromApi('employees', row) as Employee), activities: activities.map(row => activityFromApi(row)) }, notifications: notifications.map(row => activityFromApi(row, true)) }
  },
  async save(kind: EntityKey, record: Entity, existing: boolean, ownProfile: boolean) {
    const payload = toApi(kind, record)
    if (kind === 'employees' && ownProfile) { delete payload.role; delete payload.status; delete payload.password; await api.patch('/auth/profile', payload) }
    else if (existing) await api.patch(`/${endpoint(kind)}/${rawId(record.id)}`, payload)
    else await api.post(`/${endpoint(kind)}`, payload)
  },
  async remove(kind: EntityKey, id: string) { await api.delete(`/${endpoint(kind)}/${rawId(id)}`) },
  async moveDeal(id: string, stage: Stage) { await api.patch(`/deals/${rawId(id)}/stage`, { stage: stage.toLowerCase() }) },
  async readNotifications(id?: string) { await api.patch(id ? `/notifications/${id}/read` : '/notifications/read-all', {}) },
}
