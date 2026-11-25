import { useMemo } from 'react'
import { dateKey } from '../../lib/localization'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { LoaderCircle } from 'lucide-react'
import { Button, Modal } from '../ui/primitives'
import { useCRM } from '../../store/crm-store'
import { useCurrentUser } from '../../hooks/use-current-user'
import { stages } from '../../types'
import { API_MODE } from '../../lib/runtime'
import { ApiFailure } from '../../services/api/client'
import type { Entity, EntityKey, Customer, Lead, Deal, Task, Employee, Stage } from '../../types'

interface Field { key: string; label: string; type?: string; options?: { value: string; label: string }[]; required?: boolean; full?: boolean }
const opts = (values: readonly string[]) => values.map(value => ({ value, label: value }))
import { singular } from '../../lib/entities'
export function EntityForm({ kind, record, onClose, relatedId, initialStage = 'New', initialTaskStatus = 'Todo' }: { kind: EntityKey; record?: Entity; onClose: () => void; relatedId?: string; initialStage?: Stage; initialTaskStatus?: Task['status'] }) {
  const { data, save, seedInfo } = useCRM()
  const currentUser = useCurrentUser()
  const assignees = data.employees.filter(e => e.status === 'Active').map(e => ({ value: e.id, label: e.name }))
  const fields: Field[] = kind === 'customers' ? [
    { key: 'firstName', label: 'First name', required: true }, { key: 'lastName', label: 'Last name', required: true },
    { key: 'email', label: 'Email address', type: 'email', required: true }, { key: 'phone', label: 'Phone number', type: 'tel' },
    { key: 'company', label: 'Company', required: true }, { key: 'jobTitle', label: 'Job title' },
    { key: 'status', label: 'Status', options: opts(['Active', 'Inactive']) }, { key: 'assignedTo', label: 'Assigned to', options: assignees },
    { key: 'address', label: 'Address', full: true }, { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ] : kind === 'leads' ? [
    { key: 'name', label: 'Full name', required: true }, { key: 'company', label: 'Company', required: true },
    { key: 'email', label: 'Email address', type: 'email', required: true }, { key: 'phone', label: 'Phone number' },
    { key: 'source', label: 'Lead source', options: opts(['Website', 'Referral', 'Social media', 'Email campaign', 'Events']) }, { key: 'value', label: `Estimated value (${seedInfo.currency})`, type: 'number', required: true },
    { key: 'stage', label: 'Stage', options: opts(stages) }, { key: 'priority', label: 'Priority', options: opts(['Low', 'Medium', 'High', 'Urgent']) },
    { key: 'assignedTo', label: 'Assigned to', options: assignees }, { key: 'followUp', label: 'Next follow-up', type: 'date', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ] : kind === 'deals' ? [
    { key: 'name', label: 'Deal title', required: true, full: true }, { key: 'company', label: 'Company', required: true }, { key: 'value', label: `Deal value (${seedInfo.currency})`, type: 'number', required: true },
    { key: 'customerId', label: 'Related customer', options: [{ value: '', label: 'No customer' }, ...data.customers.map(c => ({ value: c.id, label: `${c.name} · ${c.company}` }))] },
    { key: 'leadId', label: 'Related lead', options: [{ value: '', label: 'No lead' }, ...data.leads.map(l => ({ value: l.id, label: `${l.name} · ${l.company}` }))] },
    { key: 'stage', label: 'Stage', options: opts(stages) }, { key: 'priority', label: 'Priority', options: opts(['Low', 'Medium', 'High', 'Urgent']) },
    { key: 'assignedTo', label: 'Assigned to', options: assignees }, { key: 'closeDate', label: 'Expected close date', type: 'date', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ] : kind === 'tasks' ? [
    { key: 'name', label: 'Task title', required: true, full: true }, { key: 'description', label: 'Description', type: 'textarea', full: true },
    { key: 'assignedTo', label: 'Assigned to', options: assignees }, { key: 'dueDate', label: 'Due date', type: 'date', required: true },
    { key: 'priority', label: 'Priority', options: opts(['Low', 'Medium', 'High', 'Urgent']) }, { key: 'status', label: 'Status', options: opts(['Todo', 'In Progress', 'Completed']) },
    { key: 'relatedId', label: 'Related customer or lead', full: true, options: [{ value: '', label: 'No related record' }, ...[...data.customers, ...data.leads].map(r => ({ value: r.id, label: `${r.name} · ${r.id.startsWith('lead') ? 'Lead' : 'Customer'}` }))] },
  ] : [
    { key: 'name', label: 'Full name', required: true }, { key: 'email', label: 'Email address', type: 'email', required: true },
    { key: 'jobTitle', label: 'Job title', required: true }, { key: 'phone', label: 'Phone number' },
    { key: 'role', label: 'Workspace role', options: opts(['Staff', 'Admin']) }, { key: 'status', label: 'Status', options: opts(['Active', 'Inactive']) },
    ...(API_MODE ? [{ key: 'department', label: 'Department' }, { key: 'city', label: 'City' }, ...(!record ? [{ key: 'password', label: 'Initial password', type: 'password', required: true }] : [])] : []),
  ]
  const schema = useMemo(() => z.object(Object.fromEntries(fields.map(f => [f.key, z.string().refine(v => !f.required || !!v.trim(), `${f.label} is required`).refine(v => f.type !== 'email' || !v || z.email().safeParse(v).success, 'Enter a valid email address').refine(v => f.type !== 'number' || (v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0), 'Enter a valid positive amount').refine(v => f.type !== 'date' || !v || !Number.isNaN(Date.parse(v)), 'Choose a valid date')]))), [kind]) // eslint-disable-line react-hooks/exhaustive-deps
  const defaults: Record<string, string> = { assignedTo: currentUser?.id || 'employee-1', priority: 'Medium', stage: initialStage, status: kind === 'tasks' ? initialTaskStatus : 'Active', source: 'Website', role: 'Staff', value: '', dueDate: dateKey(), followUp: dateKey(), closeDate: dateKey(), relatedId: relatedId || '' }
  if (kind === 'deals' && relatedId) {
    const relation = [...data.customers, ...data.leads].find(r => r.id === relatedId)
    if (relation) { defaults.company = relation.company; defaults[relatedId.startsWith('customer') ? 'customerId' : 'leadId'] = relatedId }
  }
  if (record) Object.entries(record).forEach(([key, value]) => { defaults[key] = String(value ?? '') })
  if (kind === 'customers' && record) { defaults.firstName = record.name.split(' ')[0]; defaults.lastName = record.name.split(' ').slice(1).join(' ') }
  fields.forEach(f => { defaults[f.key] ??= f.options?.[0]?.value || '' })
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues: defaults })
  async function submit(values: Record<string, string>) {
    if (kind === 'employees' && currentUser?.role !== 'Admin') { toast.error('Only admins can manage employees.'); return }
    const base = { ...record, ...values, id: record?.id || `${singular[kind]}-${crypto.randomUUID()}`, createdAt: record?.createdAt || dateKey() }
    if (kind === 'employees' && data.employees.some(e => e.email.toLowerCase() === values.email.toLowerCase() && e.id !== base.id)) { toast.error('An employee with this email already exists.'); return }
    if (kind === 'employees' && base.id === currentUser?.id && (values.status !== 'Active' || values.role !== currentUser.role)) { toast.error('You cannot change your own role or deactivate your account.'); return }
    try {
      if (kind === 'customers') await save('customers', { ...base, name: `${values.firstName.trim()} ${values.lastName.trim()}`, lastContact: (record as Customer | undefined)?.lastContact || dateKey() } as Customer)
      else if (kind === 'leads') await save('leads', { ...base, value: Number(values.value) } as Lead)
      else if (kind === 'deals') {
        const customer = data.customers.find(c => c.id === values.customerId)
        const lead = data.leads.find(l => l.id === values.leadId)
        if (customer && lead && customer.company !== lead.company) { toast.error('Choose a customer and lead from the same company.'); return }
        await save('deals', { ...base, value: Number(values.value), company: customer?.company || lead?.company || values.company } as Deal)
      }
      else if (kind === 'tasks') await save('tasks', base as Task)
      else await save('employees', base as Employee)
      toast.success(`${singular[kind][0].toUpperCase() + singular[kind].slice(1)} ${record ? 'updated' : 'created'} successfully`)
      onClose()
    } catch (error) { if (error instanceof ApiFailure) { const aliases: Record<string, string> = { estimatedValue: 'value', title: 'name', expectedCloseDate: 'closeDate', nextFollowUp: 'followUp', status: kind === 'leads' ? 'stage' : 'status', firstName: kind === 'employees' ? 'name' : 'firstName', lastName: kind === 'employees' ? 'name' : 'lastName' }; error.fields.forEach(issue => setError(aliases[issue.field] || issue.field, { type: 'server', message: issue.message })) } }
  }
  return <Modal open onClose={onClose} title={`${record ? 'Edit' : 'Add'} ${singular[kind]}`} description={{ customers: 'Contact details and account ownership.', leads: 'Contact information, qualification, and follow-up schedule.', deals: 'Deal value, related records, and pipeline stage.', tasks: 'Task details, assignee, and due date.', employees: 'Employee details and workspace permissions.' }[kind]} wide><form onSubmit={handleSubmit(submit)} noValidate><div className="form-grid">{fields.map(field => <div key={field.key} className={`form-field ${field.full ? 'span-2' : ''}`}><label htmlFor={`field-${field.key}`}>{field.label}{field.required && <span className="required"> *</span>}</label>{field.options ? <select id={`field-${field.key}`} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined} {...register(field.key)}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea id={`field-${field.key}`} rows={3} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined} placeholder={`Add ${field.label.toLowerCase()}…`} {...register(field.key)} /> : <input id={`field-${field.key}`} type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} placeholder={field.type === 'date' ? undefined : field.key === 'email' ? 'name@company.example' : field.key === 'phone' ? '0300-1000000' : field.key === 'value' ? '0' : field.key === 'firstName' ? 'Muhammad' : field.key === 'lastName' ? 'Ahmed' : undefined} {...register(field.key)} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined} />}{errors[field.key] && <span className="field-error" id={`error-${field.key}`} role="alert">{errors[field.key]?.message}</span>}</div>)}</div>{kind === 'employees' && !record && <p className="form-notice">{API_MODE ? 'Set an initial password of at least 12 characters with uppercase, lowercase, a number, and a symbol. Share it securely; no invitation email is sent.' : 'Demo employee records do not send invitations or create login credentials.'}</p>}<div className="modal-footer"><Button type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="spin" size={16} />}{record ? 'Save changes' : `Create ${singular[kind]}`}</Button></div></form></Modal>
}
