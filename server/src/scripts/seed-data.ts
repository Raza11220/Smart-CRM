import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import fixture from '../data/pakistan-demo.json';
import { User } from '../models/User.model';
import { models } from '../models/crm.models';
import { Activity, Notification, RefreshSession } from '../models/events.models';
import { atomic } from '../services/transaction';
import { businessDay } from '../utils/dates';
import { env } from '../config/env';
import { password as passwordSchema } from '../validators/schemas';
export const seedId = (id: string) => new Types.ObjectId(createHash('sha256').update(`smartcrm-pakistan-v2:${id}`).digest('hex').slice(0, 24));
export async function seedDemo(options: { reset?: boolean; adminPassword: string; staffPassword: string }) {
  if (env.NODE_ENV === 'production') throw new Error('Demo seeding and resets are disabled in production');
  passwordSchema.parse(options.adminPassword); passwordSchema.parse(options.staffPassword);
  const shift = Math.round((new Date(`${businessDay()}T00:00:00Z`).getTime() - new Date(`${fixture.anchor}T00:00:00Z`).getTime()) / 86400000);
  const day = (value: string) => new Date(new Date(`${value}T00:00:00Z`).getTime() + shift * 86400000).toISOString().slice(0, 10);
  const date = (value: string) => new Date(`${day(value)}T00:00:00+05:00`);
  const instant = (value: string) => new Date(new Date(value).getTime() + shift * 86400000);
  const data = fixture.data; const owner = seedId('employee-1');
  const hashes = await Promise.all([bcrypt.hash(options.adminPassword, 12), bcrypt.hash(options.staffPassword, 12)]);
  return atomic(async session => {
    // Refuse a mixed/live workspace; seed is never an implicit migration of user data.
    for (const model of [User, ...Object.values(models), Activity, Notification]) if (await model.collection.findOne({ demoSeed: { $ne: true } }, { session })) throw new Error('Refusing to seed a workspace containing non-demo records. Use a separate empty development database.');
    if (options.reset) { for (const model of [Notification, Activity, ...Object.values(models), User]) await model.collection.deleteMany({ demoSeed: true }, { session }); await RefreshSession.deleteMany({ userId: { $in: data.employees.map(user => seedId(user.id)) } }, { session }); }
    for (const [index, employee] of data.employees.entries()) {
      const [firstName, ...rest] = employee.name.split(' ');
      await User.updateOne({ _id: seedId(employee.id) }, { $setOnInsert: { firstName, lastName: rest.join(' '), email: employee.email, phone: employee.phone, role: employee.role.toLowerCase(), status: 'active', jobTitle: employee.jobTitle, department: employee.department, city: employee.city, passwordHash: index === 0 ? hashes[0] : index === 1 ? hashes[1] : await bcrypt.hash(createHash('sha256').update(options.staffPassword + employee.id).digest('hex'), 12), demoSeed: true, createdAt: date(employee.createdAt), updatedAt: date(employee.createdAt) } }, { upsert: true, session, timestamps: false });
    }
    for (const customer of data.customers) {
      const [firstName, ...rest] = customer.name.split(' ');
      await models.customers.updateOne({ _id: seedId(customer.id) }, { $setOnInsert: { firstName, lastName: rest.join(' '), email: customer.email, phone: customer.phone, company: customer.company, jobTitle: customer.jobTitle, status: customer.status.toLowerCase(), assignedTo: seedId(customer.assignedTo), city: customer.city, province: customer.province, address: customer.address, notes: customer.notes, lastContactAt: date(customer.lastContact), createdBy: owner, createdAt: date(customer.createdAt), updatedAt: date(customer.createdAt), demoSeed: true } }, { upsert: true, session, timestamps: false });
    }
    for (const lead of data.leads) await models.leads.updateOne({ _id: seedId(lead.id) }, { $setOnInsert: { name: lead.name, email: lead.email, phone: lead.phone, company: lead.company, source: lead.source, estimatedValue: lead.value, status: lead.stage.toLowerCase(), priority: lead.priority.toLowerCase(), assignedTo: seedId(lead.assignedTo), customerId: seedId(data.customers[data.leads.indexOf(lead) % 40]!.id), city: lead.city, province: lead.province, address: lead.address, nextFollowUp: day(lead.followUp), notes: lead.notes, createdBy: owner, createdAt: date(lead.createdAt), updatedAt: date(lead.createdAt), demoSeed: true } }, { upsert: true, session, timestamps: false });
    for (const deal of data.deals) await models.deals.updateOne({ _id: seedId(deal.id) }, { $setOnInsert: { title: deal.name, company: deal.company, customerId: seedId(deal.customerId), leadId: seedId(deal.leadId), value: deal.value, stage: deal.stage.toLowerCase(), priority: deal.priority.toLowerCase(), assignedTo: seedId(deal.assignedTo), expectedCloseDate: day(deal.closeDate), closedAt: ['Won', 'Lost'].includes(deal.stage) ? date(deal.closeDate) : null, description: deal.notes, createdBy: owner, createdAt: date(deal.createdAt), updatedAt: date(deal.createdAt), demoSeed: true } }, { upsert: true, session, timestamps: false });
    const taskStatus: Record<string, string> = { Todo: 'todo', 'In Progress': 'in_progress', Completed: 'completed' };
    for (const task of data.tasks) await models.tasks.updateOne({ _id: seedId(task.id) }, { $setOnInsert: { title: task.name, description: task.description, assignedTo: seedId(task.assignedTo), priority: task.priority.toLowerCase(), status: taskStatus[task.status], dueDate: day(task.dueDate), completedAt: task.status === 'Completed' ? new Date() : null, [task.relatedId.startsWith('customer') ? 'customerId' : 'leadId']: seedId(task.relatedId), createdBy: owner, createdAt: date(task.createdAt), updatedAt: date(task.createdAt), demoSeed: true } }, { upsert: true, session, timestamps: false });
    for (const activity of data.activities) {
      await Activity.updateOne({ _id: seedId(activity.id) }, { $setOnInsert: { actorId: seedId(activity.employeeId), entityType: activity.type, entityId: seedId(activity.relatedId), action: activity.type === 'deal' ? 'stage_changed' : activity.type === 'task' ? 'completed' : 'updated', description: activity.text, audienceIds: [owner, seedId(activity.employeeId)], createdAt: instant(activity.createdAt), demoSeed: true } }, { upsert: true, session, timestamps: false });
    }
    for (const [index, task] of data.tasks.entries()) await Notification.updateOne({ _id: seedId(`notification-${index + 1}`) }, { $setOnInsert: { userId: seedId(task.assignedTo), actorId: owner, title: 'Task assigned', message: task.name, type: 'assigned', relatedEntityType: 'task', relatedEntityId: seedId(task.id), isRead: index % 3 === 0, createdAt: date(task.createdAt), demoSeed: true } }, { upsert: true, session, timestamps: false });
    return { customers: 40, leads: 50, deals: 35, tasks: 40, employees: 12, activities: 50, notifications: 40 };
  });
}
