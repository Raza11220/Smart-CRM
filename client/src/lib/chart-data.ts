import { addDays, addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { periodStart } from './format'
import { dateKey } from './localization'
import type { Database } from '../types'

export const chartColors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6']
export function revenueData(data: Database, period: string) {
  const fromKey = periodStart(period); const from = parseISO(fromKey); const today = dateKey(); const now = parseISO(today)
  const daily = ['Last 7 days', 'Last 30 days'].includes(period)
  const buckets: { name: string; revenue: number; pipeline: number }[] = []
  let cursor = daily ? from : startOfMonth(from)
  while (cursor <= now) {
    const next = daily ? addDays(cursor, 1) : addMonths(cursor, 1)
    const deals = data.deals.filter(d => d.closeDate >= format(cursor, 'yyyy-MM-dd') && d.closeDate < format(next, 'yyyy-MM-dd') && d.closeDate >= fromKey && d.closeDate <= today)
    buckets.push({ name: format(cursor, daily ? 'dd MMM' : 'MMM'), revenue: deals.filter(d => d.stage === 'Won' && d.closeDate <= today).reduce((s, d) => s + d.value, 0), pipeline: data.deals.filter(d => d.createdAt >= fromKey && d.createdAt >= format(cursor, 'yyyy-MM-dd') && d.createdAt < format(next, 'yyyy-MM-dd') && d.createdAt <= today && !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0) })
    cursor = next
  }
  return buckets
}
