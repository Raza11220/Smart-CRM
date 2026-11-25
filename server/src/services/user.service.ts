import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../models/User.model';
import { models } from '../models/crm.models';
import { Activity, RefreshSession } from '../models/events.models';
import type { Actor } from '../middleware/auth.middleware';
import { ApiError } from '../utils/http';
import { atomic } from './transaction';
import { dto } from '../utils/dto';
import type { ListQuery } from '../validators/schemas';
import { escapedSearch } from './record.service';
export async function listUsers(query: ListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.search) filter.$or = ['firstName', 'lastName', 'email', 'jobTitle'].map(field => ({ [field]: { $regex: escapedSearch(query.search!), $options: 'i' } }));
  if (query.status) filter.status = query.status;
  const [rows, total] = await Promise.all([User.find(filter).select('-notificationPreferences').sort({ firstName: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), User.countDocuments(filter)]);
  return { data: dto(rows), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
export async function createUser(input: Record<string, unknown>, actor: Actor) {
  if (actor.role !== 'admin') throw new ApiError(403, 'Admin access is required');
  const { password, ...fields } = input;
  const passwordHash = await bcrypt.hash(String(password), 12);
  return atomic(async session => {
    const [user] = await User.create([{ ...fields, passwordHash }], { session });
    await Activity.create([{ actorId: actor.id, entityType: 'user', entityId: user!._id, action: 'created', description: `created employee ${user!.firstName} ${user!.lastName}`, audienceIds: [actor.id, user!._id] }], { session });
    return user!;
  });
}
export async function updateUser(actor: Actor, id: string, input: Record<string, unknown>, ownProfile = false) {
  if (!ownProfile && actor.role !== 'admin') throw new ApiError(403, 'Admin access is required');
  if (ownProfile && actor.id.toHexString() !== id) throw new ApiError(403, 'Only your own profile can be changed');
  return atomic(async session => {
    const user = await User.findById(id).select('+tokenVersion').session(session);
    if (!user) throw new ApiError(404, 'Employee not found');
    if (user.role === 'admin' && user.status === 'active' && ((input.role && input.role !== 'admin') || (input.status && input.status !== 'active')) && await User.countDocuments({ role: 'admin', status: 'active' }).session(session) <= 1) throw new ApiError(409, 'The last active Admin cannot be deactivated or demoted');
    const permissionsChanged = (input.role && input.role !== user.role) || (input.status && input.status !== user.status);
    Object.assign(user, input);
    if (permissionsChanged) { user.tokenVersion += 1; await RefreshSession.updateMany({ userId: user._id }, { $set: { revokedAt: new Date() } }, { session }); }
    await user.save({ session });
    await Activity.create([{ actorId: actor.id, entityType: 'user', entityId: user._id, action: 'updated', description: `updated employee ${user.firstName} ${user.lastName}`, audienceIds: [actor.id, user._id] }], { session });
    return user;
  });
}
export async function deleteUser(actor: Actor, id: string) {
  if (actor.role !== 'admin') throw new ApiError(403, 'Admin access is required');
  if (actor.id.toHexString() === id) throw new ApiError(409, 'You cannot delete your own account');
  return atomic(async session => {
    const user = await User.findById(id).session(session);
    if (!user) throw new ApiError(404, 'Employee not found');
    if (user.role === 'admin' && user.status === 'active' && await User.countDocuments({ role: 'admin', status: 'active' }).session(session) <= 1) throw new ApiError(409, 'The last active Admin cannot be removed');
    for (const model of Object.values(models)) if (await model.exists({ $or: [{ assignedTo: user._id }, { createdBy: user._id }] }).session(session)) throw new ApiError(409, 'This employee has CRM records. Reassign their records or deactivate their account instead.');
    // Audit actors remain identifiable. Deactivation is the supported path for employees with history.
    if (await Activity.exists({ actorId: user._id }).session(session)) throw new ApiError(409, 'This employee has activity history. Deactivate the account instead.');
    await RefreshSession.deleteMany({ userId: user._id }, { session });
    await user.deleteOne({ session });
  });
}
export async function userPerformance(actor: Actor, id: string) {
  if (actor.role !== 'admin' && actor.id.toHexString() !== id) throw new ApiError(403, 'You may only view your own performance');
  if (!await User.exists({ _id: id })) throw new ApiError(404, 'Employee not found');
  const assignedTo = new Types.ObjectId(id);
  const [won, tasks, open] = await Promise.all([
    models.deals.aggregate<{ revenue: number; wonDeals: number }>([{ $match: { assignedTo, stage: 'won' } }, { $group: { _id: null, revenue: { $sum: '$value' }, wonDeals: { $sum: 1 } } }]),
    models.tasks.aggregate<{ _id: string; count: number }>([{ $match: { assignedTo } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    models.deals.countDocuments({ assignedTo, stage: { $nin: ['won', 'lost'] } }),
  ]);
  return { employeeId: id, revenue: won[0]?.revenue || 0, wonDeals: won[0]?.wonDeals || 0, activeOpportunities: open, totalTasks: tasks.reduce((sum, row) => sum + row.count, 0), completedTasks: tasks.find(row => row._id === 'completed')?.count || 0, tasks };
}
