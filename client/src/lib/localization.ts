import { addDays, format, isValid, parseISO, startOfYear, subDays, subMonths } from 'date-fns'

export const DEFAULT_LOCALE = 'en-PK'
export const DEFAULT_CURRENCY = 'PKR'
export const DEFAULT_TIME_ZONE = 'Asia/Karachi'
export const DEFAULT_DATE_FORMAT = 'dd MMM yyyy'
export const TIME_ZONE_LABEL = 'Pakistan Standard Time (PST, UTC+05:00)'

const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: DEFAULT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})

/** Business dates are calendar dates in Pakistan, independent of the browser timezone. */
export function dateKey(value: Date | string = new Date()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = typeof value === 'string' ? new Date(value) : value
  if (!isValid(date)) return ''
  const parts = calendar.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function shiftDate(value: string, days: number) {
  return format(addDays(parseISO(value), days), 'yyyy-MM-dd')
}

export function periodStartKey(period: string, now = new Date()) {
  const today = parseISO(dateKey(now))
  const start = period === 'This year' ? startOfYear(today)
    : period === 'Last 6 months' ? subMonths(today, 6)
      : subDays(today, Math.max(0, (Number(period.match(/\d+/)?.[0]) || 30) - 1))
  return format(start, 'yyyy-MM-dd')
}

export const isWorkspaceToday = (value: string) => dateKey(value) === dateKey()
export const isWorkspaceOverdue = (value: string) => !!dateKey(value) && dateKey(value) < dateKey()

export function formatCurrency(value: number, compact = false, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency', currency, currencyDisplay: currency === 'PKR' ? 'code' : 'narrowSymbol',
    maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard',
  }).formatToParts(value).map(part => part.type === 'currency' && currency === 'PKR' ? 'Rs.' : part.value).join('').replace(/\u00a0/g, ' ')
}

export function formatBusinessDate(value: string, pattern = DEFAULT_DATE_FORMAT) {
  const key = dateKey(value)
  const date = key ? parseISO(key) : new Date(NaN)
  return isValid(date) ? format(date, pattern) : 'Not set'
}

export function formatWorkspaceTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (!isValid(date)) return 'Not set'
  const time = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
  return `${formatBusinessDate(date.toISOString())}, ${time} PST (UTC+05:00)`
}
