import { API_MODE } from '../../lib/runtime'
import { PageSkeleton } from '../../app/App'
import { useAnalytics } from '../../hooks/use-analytics'
import { useState } from 'react'
import { ArrowDownToLine, CalendarDays, ChartNoAxesCombined, CircleCheck, DollarSign, Layers2, Target, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useCRM } from '../../store/crm-store'
import { CurrencyValue, Button, MetricCard, PageHeading, Panel, Select } from '../../components/ui/primitives'
import { LeadSourceChart, RevenueChart, SalesChart, SimpleBarChart } from '../../components/charts/crm-charts'
import { revenueData } from '../../lib/chart-data'
import { exportCSV, metrics, periodStart } from '../../lib/format'
import { stages } from '../../types'

export default function Reports() {
  const { data, seedInfo } = useCRM()
  const [period, setPeriod] = useState('This year')
  const analyticsQuery = useAnalytics(period)
  const m = analyticsQuery.data?.summary || metrics(data, period)
  const revenueRows = analyticsQuery.data?.revenue || revenueData(data, period)
  const start = periodStart(period)
  const leads = data.leads.filter(l => l.createdAt >= start)
  const tasks = data.tasks.filter(t => t.createdAt >= start)
  const openDeals = data.deals.filter(d => !['Won', 'Lost'].includes(d.stage) && d.createdAt >= start)
  const periodPipeline = analyticsQuery.data?.summary.periodPipeline ?? openDeals.reduce((s, d) => s + d.value, 0)
  const funnelStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won']
  const funnel = analyticsQuery.data?.funnel || funnelStages.map((stage, index) => ({ name: stage === 'New' ? 'All leads' : stage, value: index === 0 ? leads.length : leads.filter(l => l.stage !== 'Lost' && funnelStages.indexOf(l.stage) >= index).length }))
  function exportReport() {
    exportCSV('smartcrm-analytics', [{ period, currency: seedInfo.currency, totalRevenue: m.revenue, winRate: m.winRate.toFixed(1), leadConversionRate: m.conversion.toFixed(1), averageDealValue: m.average, pipelineValue: periodPipeline, closedDeals: m.closed, wonDeals: m.won, lostDeals: m.lost }, ...revenueRows.map(r => ({ period, currency: seedInfo.currency, month: r.name, monthlyRevenue: r.revenue, openPipelineCreated: r.pipeline })), ...data.employees.map(e => ({ period, currency: seedInfo.currency, employee: e.name, employeeRevenue: data.deals.filter(d => d.stage === 'Won' && d.assignedTo === e.id && d.closeDate >= start).reduce((sum, d) => sum + d.value, 0) }))]); toast.success('Analytics report exported')
  }
  if (API_MODE && analyticsQuery.isPending) return <PageSkeleton />
  if (API_MODE && analyticsQuery.isError) return <div className="error-page"><h1>Reports unavailable</h1><p>Reports could not be loaded from the server.</p><Button onClick={() => { void analyticsQuery.refetch() }}>Retry reports</Button></div>
  return <><PageHeading title="Reports & analytics" description="Analyze revenue, conversion, and team performance."><div className="date-filter"><CalendarDays size={15} /><Select label="Report date range" value={period} onChange={setPeriod} options={['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 6 months', 'This year']} /></div><Button variant="primary" onClick={exportReport}><ArrowDownToLine size={15} />Export report</Button></PageHeading>
    <div className="report-metrics"><MetricCard label="Total revenue" value={<CurrencyValue amount={m.revenue} />} icon={<DollarSign size={17} />} detail={`${m.won} closed-won deals`} /><MetricCard label="Win rate" value={`${m.winRate.toFixed(1)}%`} icon={<TrendingUp size={17} />} color="green" detail="Won / all closed deals" /><MetricCard label="Lead conversion" value={`${m.conversion.toFixed(1)}%`} icon={<Target size={17} />} color="purple" detail="Won leads / total leads" /><MetricCard label="Average deal value" value={<CurrencyValue amount={m.average} />} icon={<ChartNoAxesCombined size={17} />} color="blue" detail="Average closed-won value" /><MetricCard label="Pipeline value" value={<CurrencyValue amount={periodPipeline} />} icon={<Layers2 size={17} />} color="orange" detail="Open deals created in period" /><MetricCard label="Closed deals" value={m.closed} icon={<CircleCheck size={17} />} color="green" detail={`${m.won} won · ${m.lost} lost`} /></div>
    <div className="report-chart-grid"><Panel title="Revenue trends" subtitle={`Closed-won revenue · ${period.toLowerCase()}`} action={<span className="chart-legend"><span><i style={{ background: '#3478f6' }} />Revenue</span><span><i style={{ background: 'var(--muted-text)' }} />Pipeline created</span></span>}><RevenueChart data={data} period={period} height={270} /></Panel><Panel title="Sales by employee" subtitle="Won revenue and open pipeline by owner."><SalesChart data={data} period={period} /></Panel><Panel title="Lead conversion funnel" subtitle="Lead counts at each qualification stage."><SimpleBarChart rows={funnel} horizontal /></Panel><Panel title="Won vs. lost deals" subtitle="Outcomes based on the deal close date."><SimpleBarChart rows={[{ name: 'Won', value: m.won }, { name: 'Lost', value: m.lost }]} /></Panel><Panel title="Lead source distribution" subtitle="Lead count by acquisition channel."><LeadSourceChart data={data} period={period} /></Panel><Panel title="Monthly sales" subtitle="A month-by-month view of closed revenue."><SimpleBarChart rows={revenueRows.map(r => ({ name: r.name, value: r.revenue }))} currency /></Panel><Panel title="Pipeline value by stage" subtitle="Open opportunities created during this period."><SimpleBarChart rows={analyticsQuery.data?.periodPipeline || stages.filter(s => !['Won', 'Lost'].includes(s)).map(stage => ({ name: stage, value: openDeals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0) }))} currency /></Panel><Panel title="Task completion" subtitle="Tasks created during the selected period."><SimpleBarChart rows={analyticsQuery.data?.taskPerformance || ['Todo', 'In Progress', 'Completed'].map(status => ({ name: status, value: tasks.filter(t => t.status === status).length }))} /></Panel></div><div className="report-note"><CalendarDays size={15} /><p>Revenue uses deal close dates. Lead and task reports use creation dates. Open pipeline excludes won and lost deals. Currency follows your workspace preference.</p></div>
  </>
}
