import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Menu } from '@base-ui/react/menu'
import { ChevronDown, Ellipsis, Inbox, X } from 'lucide-react'
import { initials, money } from '../../lib/format'

/** Keep full PKR amounts on desktop; use compact notation in narrow summaries. */
export function CurrencyValue({ amount }: { amount: number }) {
  return <span title={money(amount)}><span className="currency-full">{money(amount)}</span><span className="currency-compact">{money(amount, true)}</span></span>
}

export function Button({ children, variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>
}
export function IconButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`icon-btn ${className}`} {...props}>{children}</button> }
export function Avatar({ name, color = 'blue', size = 'normal' }: { name: string; color?: string; size?: 'small' | 'normal' | 'large' }) { return <span className={`avatar avatar-${size} avatar-${color}`} aria-label={name}>{initials(name)}</span> }
export function Badge({ children, dot = true, className = '' }: { children: ReactNode; dot?: boolean; className?: string }) { return <span className={`badge badge-${String(children).toLowerCase().replaceAll(' ', '-')} ${className}`}>{dot && <span className="badge-dot" />}{children}</span> }
export function Modal({ open, onClose, title, description, children, wide = false, drawer = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean; drawer?: boolean }) {
  const popupRef = useRef<HTMLDivElement>(null)
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose() }}><Dialog.Portal><Dialog.Backdrop className="modal-backdrop" /><Dialog.Popup ref={popupRef} initialFocus={openType => openType === 'touch' ? true : popupRef.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])') || true} className={`modal ${wide ? 'modal-wide' : ''} ${drawer ? 'drawer' : ''}`}><div className="modal-header"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description || 'Manage your SmartCRM workspace.'}</Dialog.Description></div><Dialog.Close render={<button className="icon-btn" aria-label="Close dialog" />}><X size={19} /></Dialog.Close></div>{children}</Dialog.Popup></Dialog.Portal></Dialog.Root>
}
export function ConfirmDialog({ open, onClose, onConfirm, title = 'Delete this record?', description = 'This record will be removed from your workspace. This action cannot be undone.', label = 'Delete record' }: { open: boolean; onClose: () => void; onConfirm: () => void | boolean | Promise<void | boolean>; title?: string; description?: string; label?: string }) {
  const [pending, setPending] = useState(false)
  return <Modal open={open} onClose={() => { if (!pending) onClose() }} title={title} description={description}><div className="modal-footer"><Button disabled={pending} onClick={onClose}>Cancel</Button><Button variant="danger" disabled={pending} onClick={async () => { setPending(true); try { if (await onConfirm() !== false) onClose() } catch { /* Store displays the server error; retain confirmation. */ } finally { setPending(false) } }}>{pending ? 'Saving…' : label}</Button></div></Modal>
}
export function ActionMenu({ items, label = 'Record actions' }: { items: { label: string; action: () => void; danger?: boolean; icon?: ReactNode }[]; label?: string }) {
  return <Menu.Root><Menu.Trigger render={<button className="icon-btn" aria-label={label} />}><Ellipsis size={18} /></Menu.Trigger><Menu.Portal><Menu.Positioner sideOffset={6} align="end" className="menu-positioner"><Menu.Popup className="dropdown">{items.map(item => <Menu.Item key={item.label} className={`dropdown-item ${item.danger ? 'text-danger' : ''}`} onClick={item.action}>{item.icon}{item.label}</Menu.Item>)}</Menu.Popup></Menu.Positioner></Menu.Portal></Menu.Root>
}
export function Select({ value, onChange, options, label, className = '' }: { value: string; onChange: (value: string) => void; options: (string | { value: string; label: string })[]; label: string; className?: string }) {
  return <div className={`select-wrap ${className}`}><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{options.map(option => typeof option === 'string' ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={14} /></div>
}
export function EmptyState({ title = 'No records found', description = 'Try adjusting your search or filters.', action }: { title?: string; description?: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Inbox size={25} /></div><h3>{title}</h3><p>{description}</p>{action}</div> }
export function Panel({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{title && <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}{children}</section> }
export function PageHeading({ title, description, children, eyebrow }: { title: string; description: string; children?: ReactNode; eyebrow?: string }) { return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div><div className="page-actions">{children}</div></div> }
export function MetricCard({ label, value, icon, detail, chart, color = 'blue' }: { label: string; value: ReactNode; icon: ReactNode; detail?: ReactNode; chart?: ReactNode; color?: string }) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${color}`}>{icon}</span></div><div className="metric-main"><strong>{value}</strong>{chart}</div><div className="metric-detail">{detail || 'Workspace total'}</div></div> }
