import { dateKey, formatBusinessDate, formatCurrency, periodStartKey } from './localization'
export { formatWorkspaceTime, isWorkspaceToday, isWorkspaceOverdue } from './localization'
import { usePreferences } from '../store/crm-store'
import type { Database } from '../types'
export const money = (value: number, compact = false) => formatCurrency(value, compact, usePreferences.getState().preferences.currency)
export const shortDate = (value: string, pattern?: string) => formatBusinessDate(value, pattern || usePreferences.getState().preferences.dateFormat)
export const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('')
export const colors = ['blue', 'purple', 'orange', 'green', 'pink', 'teal']
export const employeeColor = (id: string) => colors[(Number(id.replace(/\D/g, '')) || 0) % colors.length]
export const periodStart = periodStartKey
export function metrics(data: Database, period = 'This year') {
  const start = periodStart(period)
  const deals = data.deals.filter(d => dateKey(d.closedAt || d.closeDate) >= start && dateKey(d.closedAt || d.closeDate) <= dateKey())
  const won = deals.filter(d => d.stage === 'Won'); const lost = deals.filter(d => d.stage === 'Lost')
  const leads = data.leads.filter(l => l.createdAt >= start && l.createdAt <= dateKey())
  const revenue = won.reduce((sum, d) => sum + d.value, 0)
  return { revenue, won: won.length, closed: won.length + lost.length, lost: lost.length, activeLeads: leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length, conversion: leads.length ? leads.filter(l => l.stage === 'Won').length / leads.length * 100 : 0, winRate: won.length + lost.length ? won.length / (won.length + lost.length) * 100 : 0, average: won.length ? revenue / won.length : 0, pipeline: data.deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((sum, d) => sum + d.value, 0), pending: data.tasks.filter(t => t.status !== 'Completed').length }
}
export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))]
  const cell = (value: unknown) => { let text = String(value ?? ''); if (/^[-=+@]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"` }
  const csv = [headers.map(cell).join(','), ...rows.map(row => headers.map(key => cell(row[key])).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
