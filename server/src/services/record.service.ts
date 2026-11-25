import { Types, type ClientSession } from 'mongoose';
import type { Actor } from '../middleware/auth.middleware';
import { models, type Kind, type CRMDocument, Deal, Lead, Task } from '../models/crm.models';
import { Activity, Notification } from '../models/events.models';
import { User } from '../models/User.model';
import { ApiError } from '../utils/http';
import { dto } from '../utils/dto';
import type { ListQuery } from '../validators/schemas';
import { atomic } from './transaction';
import { businessDay } from '../utils/dates';
export const scope = (user: Actor): Record<string, unknown> => user.role === 'admin' ? {} : { assignedTo: user.id };
export function assignedScope(user: Actor, assignedTo?: string): Record<string, unknown> { if (assignedTo && user.role !== 'admin' && assignedTo !== user.id.toHexString()) throw new ApiError(403, 'You may only access your own assigned records'); return assignedTo ? { assignedTo: new Types.ObjectId(assignedTo) } : scope(user); }
const singular: Record<Kind, 'customer' | 'lead' | 'deal' | 'task'> = { customers: 'customer', leads: 'lead', deals: 'deal', tasks: 'task' };
export const escapedSearch = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export async function getRecord(kind: Kind, id: string, user: Actor, session?: ClientSession) { const record = await models[kind].findOne({ _id: id, ...scope(user) }).session(session || null); if (!record) throw new ApiError(404, 'Record not found or not accessible'); return record; }
export async function listRecords(kind: Kind, query: ListQuery, user: Actor) {
  const filter: Record<string, unknown> = assignedScope(user, query.assignedTo);
  if (query.status) filter[kind === 'deals' ? 'stage' : 'status'] = query.status;
  if (query.stage) filter[kind === 'leads' ? 'status' : 'stage'] = query.stage;
  if (query.priority) filter.priority = query.priority;
  if (query.source) filter.source = query.source;
  if (query.overdue === 'true' && kind === 'tasks') { filter.dueDate = { $lt: businessDay() }; filter.status = { $ne: 'completed' }; }
  if (query.search) { const regex = { $regex: escapedSearch(query.search), $options: 'i' }; filter.$or = (kind === 'customers' ? ['firstName', 'lastName', 'email', 'company'] : kind === 'leads' ? ['name', 'email', 'company'] : ['title', 'company']).map(field => ({ [field]: regex })); }
  const sortField = query.sort === 'name' ? kind === 'customers' ? 'firstName' : kind === 'leads' ? 'name' : 'title' : query.sort === 'value' && kind === 'leads' ? 'estimatedValue' : query.sort;
  const [rows, total] = await Promise.all([models[kind].find(filter).sort({ [sortField]: query.order === 'asc' ? 1 : -1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), models[kind].countDocuments(filter)]);
  return { data: dto(rows), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
async function validateReferences(input: Record<string, unknown>, user: Actor, session: ClientSession) {
  if (input.assignedTo) {
    if (user.role !== 'admin' && String(input.assignedTo) !== user.id.toHexString()) throw new ApiError(403, 'Staff can only assign records to themselves');
    if (!await User.exists({ _id: input.assignedTo, status: 'active' }).session(session)) throw new ApiError(422, 'Choose an active employee', [{ field: 'assignedTo', message: 'Employee does not exist or is inactive' }]);
  }
  for (const [key, kind] of [['customerId', 'customers'], ['leadId', 'leads'], ['dealId', 'deals']] as const) if (input[key]) await getRecord(kind, String(input[key]), user, session);
}
async function event(kind: Kind, record: CRMDocument, action: string, user: Actor, session: ClientSession, metadata: Record<string, unknown> = {}) {
  const name = record.title || record.name || `${record.firstName} ${record.lastName}`;
  const description = `${action.replaceAll('_', ' ')} ${name}`;
  await Activity.create([{ actorId: user.id, entityType: singular[kind], entityId: record._id, action, description, metadata, audienceIds: [user.id, record.assignedTo] }], { session });
  if (['created', 'assigned', 'stage_changed', 'completed', 'status_changed'].includes(action)) await Notification.create([{ userId: record.assignedTo, actorId: user.id, title: kind === 'deals' && record.stage === 'won' ? 'Deal won' : `${singular[kind][0]!.toUpperCase()}${singular[kind].slice(1)} ${action.replaceAll('_', ' ')}`, message: description, type: action, relatedEntityType: singular[kind], relatedEntityId: record._id }], { session });
}
export async function writeRecord(kind: Kind, id: string | null, input: Record<string, unknown>, user: Actor) {
  return atomic(async session => {
    const existing = id ? await getRecord(kind, id, user, session) : null;
    const previousAssignee = existing?.assignedTo.toHexString();
    if (!Object.keys(input).length) throw new ApiError(422, 'No changes supplied');
    const merged = { ...(existing?.toObject() || {}), ...input };
    const referenceChanges: Record<string, unknown> = existing ? {} : input;
    if (existing) for (const key of ['assignedTo', 'customerId', 'leadId', 'dealId'] as const) if (key in input && String(input[key] ?? '') !== String(existing[key] ?? '')) referenceChanges[key] = input[key];
    await validateReferences(referenceChanges, user, session);
    if (kind === 'deals' && merged.customerId && merged.leadId && (!existing || 'customerId' in referenceChanges || 'leadId' in referenceChanges || input.company !== undefined && input.company !== existing.company)) { const customer = await getRecord('customers', String(merged.customerId), user, session); const lead = await getRecord('leads', String(merged.leadId), user, session); if (customer.company !== lead.company) throw new ApiError(422, 'Linked customer and lead must belong to the same company'); }
    const changed = kind === 'deals' ? input.stage && input.stage !== existing?.stage : input.status && input.status !== existing?.status;
    const values: Record<string, unknown> = { ...input };
    if (kind === 'deals' && (changed || !existing)) values.closedAt = ['won', 'lost'].includes(String(merged.stage)) ? new Date() : null;
    if (kind === 'tasks' && (changed || !existing)) values.completedAt = merged.status === 'completed' ? new Date() : null;
    const record = existing ? Object.assign(existing, values) : new models[kind]({ ...values, createdBy: user.id });
    await record.save({ session });
    // One opportunity per linked lead. Manual lead changes update that opportunity; no implicit deal creation.
    if (kind === 'deals' && changed && record.leadId) { const linked = await getRecord('leads', record.leadId.toHexString(), user, session); linked.status = record.stage; await linked.save({ session }); }
    if (kind === 'leads' && changed) { const linked = await Deal.findOne({ leadId: record._id }).session(session); if (linked) { if (user.role !== 'admin' && !linked.assignedTo.equals(user.id)) throw new ApiError(403, 'The linked opportunity is assigned to another employee'); linked.stage = record.status; linked.closedAt = ['won', 'lost'].includes(String(record.status)) ? new Date() : null; await linked.save({ session }); } }
    const action = !existing ? 'created' : input.assignedTo && String(input.assignedTo) !== previousAssignee ? 'assigned' : kind === 'deals' && changed ? 'stage_changed' : kind === 'tasks' && changed ? record.status === 'completed' ? 'completed' : 'status_changed' : 'updated';
    await event(kind, record, action, user, session, { fields: Object.keys(input) });
    return record;
  });
}
export async function deleteRecord(kind: Kind, id: string, user: Actor) {
  if (user.role !== 'admin') throw new ApiError(403, 'Only Admins can delete CRM records');
  return atomic(async session => {
    const record = await getRecord(kind, id, user, session);
    const key = kind === 'customers' ? 'customerId' : kind === 'leads' ? 'leadId' : kind === 'deals' ? 'dealId' : null;
    if (key) { for (const model of [Lead, Deal, Task]) if (await model.exists({ [key]: record._id }).session(session)) throw new ApiError(409, 'This record has related records. Reassign or remove those links before deletion.'); }
    await event(kind, record, 'deleted', user, session); await record.deleteOne({ session });
  });
}
