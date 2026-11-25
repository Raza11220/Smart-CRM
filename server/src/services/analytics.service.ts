import { Types } from 'mongoose';
import type { Actor } from '../middleware/auth.middleware';
import { Customer, Deal, Lead, Task, stages } from '../models/crm.models';
import { User } from '../models/User.model';
import { assignedScope } from './record.service';
import { BUSINESS_TIMEZONE, businessDay, range } from '../utils/dates';
import type { RangeQuery } from '../validators/schemas';
interface CountRow { _id: string; count: number; value: number }
interface EmployeeRow { _id: Types.ObjectId; revenue: number; deals: number; open: number }
export async function analytics(user: Actor, query: RangeQuery) {
  const access = assignedScope(user, query.assignedTo);
  const dates = range(query);
  const created = { $gte: dates.start, $lt: dates.end };
  const dateCondition = (field: string) => ({ $and: [{ $gte: [field, dates.start] }, { $lt: [field, dates.end] }] });
  const daily = ['Last 7 days', 'Last 30 days'].includes(query.period) || (!!query.from && dates.end.getTime() - dates.start.getTime() <= 31 * 86400000);
  const groupDate = (field: string) => ({ $dateToString: { date: field, format: daily ? '%Y-%m-%d' : '%Y-%m', timezone: BUSINESS_TIMEZONE } });
  const [outcomes, leadRows, customerRows, taskRows, pipelineRows, periodPipelineRows, revenueRows, createdPipelineRows, sources, performance, employees] = await Promise.all([
    Deal.aggregate<CountRow>([{ $match: { ...access, stage: { $in: ['won', 'lost'] }, closedAt: created } }, { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } }]),
    Lead.aggregate<CountRow>([{ $match: { ...access, createdAt: created } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Customer.aggregate<CountRow>([{ $match: access }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate<{ pending: number; overdue: number; count: number; completed: number }>([{ $match: access }, { $group: { _id: null, pending: { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] } }, overdue: { $sum: { $cond: [{ $and: [{ $ne: ['$status', 'completed'] }, { $lt: ['$dueDate', businessDay()] }] }, 1, 0] } }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }]),
    Deal.aggregate<CountRow>([{ $match: access }, { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } }]),
    Deal.aggregate<CountRow>([{ $match: { ...access, stage: { $nin: ['won', 'lost'] }, createdAt: created } }, { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } }]),
    Deal.aggregate<CountRow>([{ $match: { ...access, stage: 'won', closedAt: created } }, { $group: { _id: groupDate('$closedAt'), value: { $sum: '$value' } } }]),
    Deal.aggregate<CountRow>([{ $match: { ...access, stage: { $nin: ['won', 'lost'] }, createdAt: created } }, { $group: { _id: groupDate('$createdAt'), value: { $sum: '$value' } } }]),
    Lead.aggregate<CountRow>([{ $match: { ...access, createdAt: created } }, { $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Deal.aggregate<EmployeeRow>([{ $match: access }, { $group: { _id: '$assignedTo', revenue: { $sum: { $cond: [{ $and: [{ $eq: ['$stage', 'won'] }, dateCondition('$closedAt')] }, '$value', 0] } }, deals: { $sum: { $cond: [{ $and: [{ $eq: ['$stage', 'won'] }, dateCondition('$closedAt')] }, 1, 0] } }, open: { $sum: { $cond: [{ $and: [{ $not: [{ $in: ['$stage', ['won', 'lost']] }] }, dateCondition('$createdAt')] }, '$value', 0] } } } }]),
    User.find(user.role === 'admin' && !query.assignedTo ? {} : { _id: query.assignedTo || user.id }).select('firstName lastName').lean(),
  ]);
  const periodTasks = await Task.aggregate<CountRow>([{ $match: { ...access, createdAt: created } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const won = outcomes.find(row => row._id === 'won'); const lost = outcomes.find(row => row._id === 'lost');
  const leadCount = leadRows.reduce((sum, row) => sum + row.count, 0); const converted = leadRows.find(row => row._id === 'won')?.count || 0;
  const wonCount = won?.count || 0; const lostCount = lost?.count || 0; const revenue = won?.value || 0;
  const summary = { revenue, won: wonCount, lost: lostCount, closed: wonCount + lostCount, activeLeads: leadRows.filter(row => !['won', 'lost'].includes(row._id)).reduce((sum, row) => sum + row.count, 0), totalLeads: leadCount, converted, newLeads: leadRows.find(row => row._id === 'new')?.count || 0, conversion: leadCount ? converted / leadCount * 100 : 0, winRate: wonCount + lostCount ? wonCount / (wonCount + lostCount) * 100 : 0, average: wonCount ? revenue / wonCount : 0, pipeline: pipelineRows.filter(row => !['won', 'lost'].includes(row._id)).reduce((sum, row) => sum + row.value, 0), periodPipeline: periodPipelineRows.reduce((sum, row) => sum + row.value, 0), activeDeals: pipelineRows.filter(row => !['won', 'lost'].includes(row._id)).reduce((sum, row) => sum + row.count, 0), pending: taskRows[0]?.pending || 0, overdue: taskRows[0]?.overdue || 0, totalCustomers: customerRows.reduce((sum, row) => sum + row.count, 0), activeCustomers: customerRows.find(row => row._id === 'active')?.count || 0 };
  const revenueSeries: { name: string; date: string; revenue: number; pipeline: number }[] = [];
  const cursor = new Date(`${dates.from}T00:00:00Z`); if (!daily) cursor.setUTCDate(1);
  while (cursor.toISOString().slice(0, 10) <= dates.to && revenueSeries.length < 740) {
    const key = cursor.toISOString().slice(0, daily ? 10 : 7);
    revenueSeries.push({ date: key, name: new Intl.DateTimeFormat('en-PK', { ...(daily ? { day: '2-digit' } : {}), month: 'short', timeZone: 'UTC' }).format(cursor), revenue: revenueRows.find(row => row._id === key)?.value || 0, pipeline: createdPipelineRows.find(row => row._id === key)?.value || 0 });
    if (daily) cursor.setUTCDate(cursor.getUTCDate() + 1); else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const salesByEmployee = employees.map(employee => { const row = performance.find(row => row._id.equals(employee._id)); return { id: employee._id.toHexString(), name: `${employee.firstName} ${employee.lastName}`, revenue: row?.revenue || 0, deals: row?.deals || 0, open: row?.open || 0 }; }).sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
  const title = (name: string) => name[0]!.toUpperCase() + name.slice(1);
  const funnelStages = ['new', 'contacted', 'qualified', 'proposal', 'won'];
  return { summary, revenue: revenueSeries, salesByEmployee, topPerformers: salesByEmployee.slice(0, 4), leadSources: sources.map(row => ({ name: row._id, value: row.count })), funnel: funnelStages.map((stage, index) => ({ name: index === 0 ? 'All leads' : title(stage), value: index === 0 ? leadCount : leadRows.filter(row => row._id !== 'lost' && funnelStages.indexOf(row._id) >= index).reduce((sum, row) => sum + row.count, 0) })), wonLost: [{ name: 'Won', value: wonCount }, { name: 'Lost', value: lostCount }], pipeline: stages.map(stage => ({ name: title(stage), count: pipelineRows.find(row => row._id === stage)?.count || 0, value: pipelineRows.find(row => row._id === stage)?.value || 0 })), periodPipeline: stages.filter(stage => !['won', 'lost'].includes(stage)).map(stage => ({ name: title(stage), value: periodPipelineRows.find(row => row._id === stage)?.value || 0 })), taskPerformance: ['todo', 'in_progress', 'completed'].map(status => ({ name: status === 'in_progress' ? 'In Progress' : status === 'todo' ? 'Todo' : 'Completed', value: periodTasks.find(row => row._id === status)?.count || 0 })), range: { from: dates.from, to: dates.to, timezone: BUSINESS_TIMEZONE }, currency: 'PKR', locale: 'en-PK' };
}
