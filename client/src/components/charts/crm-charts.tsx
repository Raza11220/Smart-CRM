import { chartColors, revenueData } from '../../lib/chart-data'
import { useAnalytics } from '../../hooks/use-analytics'
import { API_MODE } from '../../lib/runtime'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money, periodStart } from '../../lib/format'
import { dateKey } from '../../lib/localization'
import type { Database } from '../../types'

const tooltipStyle = { 
  border: '1px solid var(--border)', 
  borderRadius: 10, 
  background: 'var(--surface)', 
  color: 'var(--text)', 
  fontSize: 12, 
  fontWeight: 500,
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  padding: '8px 12px'
}
export function RevenueChart({ data, period = 'Last 6 months', height = 237 }: { data: Database; period?: string; height?: number }) {
  const analyticsQuery = useAnalytics(period)
  const rows = API_MODE ? analyticsQuery.data?.revenue || [] : revenueData(data, period)
  return <div className="chart-container" style={{ height }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: -6 }}><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25} /><stop offset="60%" stopColor="#7c3aed" stopOpacity={0.08} /><stop offset="100%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} tickMargin={14} minTickGap={26} /><YAxis width={78} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} tickFormatter={v => money(Number(v), true)} tickMargin={8} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [money(Number(value)), name === 'revenue' ? 'Won Revenue' : 'Open pipeline created']} /><Area isAnimationActive={false} type="monotone" dataKey="pipeline" stroke="#94a1b8" strokeWidth={1.8} strokeDasharray="4 4" fill="transparent" /><Area isAnimationActive={false} type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fill="url(#revenue-fill)" activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div>
}

export function LeadSourceChart({ data, period = 'This year' }: { data: Database; period?: string }) {
  const analyticsQuery = useAnalytics(period)
  const leads = data.leads.filter(l => l.createdAt >= periodStart(period))
  const leadTotal = analyticsQuery.data?.summary.totalLeads ?? leads.length
  const sources = analyticsQuery.data?.leadSources || [...new Set(leads.map(l => l.source))].map(name => ({ name, value: leads.filter(l => l.source === name).length })).sort((a, b) => b.value - a.value)
  return <div className="lead-source"><div className="donut-chart"><ResponsiveContainer width="100%" height={150}><PieChart><Pie isAnimationActive={false} data={sources} dataKey="value" nameKey="name" innerRadius={49} outerRadius={65} paddingAngle={3} cornerRadius={3} stroke="none" startAngle={90} endAngle={-270}>{sources.map((s, i) => <Cell key={s.name} fill={chartColors[i % chartColors.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{leadTotal}</strong><span>Total leads</span></div></div><div className="source-legend">{sources.map((source, i) => <div key={source.name}><span className="legend-dot" style={{ background: chartColors[i] }} /><span>{source.name}</span><b>{leadTotal ? Math.round(source.value / leadTotal * 100) : 0}%</b><small>{source.value}</small></div>)}</div></div>
}
export function SalesChart({ data, period = 'This year' }: { data: Database; period?: string }) {
  const today = dateKey(); const deals = data.deals.filter(d => d.closeDate >= periodStart(period))
  const analyticsQuery = useAnalytics(period)
  const rows = analyticsQuery.data ? analyticsQuery.data.salesByEmployee.slice(0, 6).map(row => ({ name: row.name.split(' ')[0], won: row.revenue, open: row.open })) : data.employees.slice(0, 6).map(e => ({ name: e.name.split(' ')[0], won: deals.filter(d => d.assignedTo === e.id && d.stage === 'Won' && d.closeDate <= today).reduce((sum, d) => sum + d.value, 0), open: deals.filter(d => d.assignedTo === e.id && !['Won', 'Lost'].includes(d.stage)).reduce((sum, d) => sum + d.value, 0) }))
  return <div className="chart-container" style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 12, right: 12, left: -4, bottom: 0 }} barGap={4}><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} /><YAxis width={78} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} tickFormatter={v => money(Number(v), true)} /><Tooltip contentStyle={tooltipStyle} formatter={v => money(Number(v))} cursor={{ fill: 'var(--subtle)' }} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 14 }} /><Bar isAnimationActive={false} dataKey="won" name="Won revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={22} /><Bar isAnimationActive={false} dataKey="open" name="Open pipeline" fill="#a5b4fc" radius={[6, 6, 0, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div>
}

export function SimpleBarChart({ rows, currency = false, horizontal = false }: { rows: { name: string; value: number }[]; currency?: boolean; horizontal?: boolean }) {
  return <div className="chart-container" style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 14, bottom: 4, left: horizontal ? 18 : -15, right: 18 }}><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />{horizontal ? <><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={70} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} /></> : <><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} /><YAxis width={78} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 11 }} tickFormatter={v => currency ? money(Number(v), true) : String(v)} /></>}<Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--subtle)' }} formatter={v => currency ? money(Number(v)) : Number(v)} /><Bar isAnimationActive={false} dataKey="value" name={currency ? 'Value' : 'Count'} fill="#3478f6" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={34}>{rows.map(r => <Cell key={r.name} fill={r.name === 'Won' || r.name === 'Completed' ? '#4d9775' : r.name === 'Lost' ? '#bd6876' : '#4c79ca'} />)}</Bar></BarChart></ResponsiveContainer></div>
}
export function Sparkline({ values, color = '#3b82f6' }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1); const min = Math.min(...values, 0)
  const points = values.map((v, i) => `${i / Math.max(values.length - 1, 1) * 84},${30 - (v - min) / (max - min || 1) * 25}`).join(' ')
  return <svg className="sparkline" width="84" height="34" viewBox="0 0 84 34" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
}
