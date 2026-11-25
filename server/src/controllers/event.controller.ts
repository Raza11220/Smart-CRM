import { actor } from '../middleware/auth.middleware';
import { Activity, Notification } from '../models/events.models';
import { ApiError, asyncHandler, success } from '../utils/http';
import { dto } from '../utils/dto';
import { idParams, listSchema } from '../validators/schemas';
export const activities = asyncHandler(async (req, res) => {
  const query = listSchema.parse(req.query); const user = actor(req);
  const filter = user.role === 'admin' ? {} : { audienceIds: user.id };
  const [rows, total] = await Promise.all([Activity.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), Activity.countDocuments(filter)]);
  return res.json({ success: true, data: dto(rows), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
});
export const notifications = asyncHandler(async (req, res) => {
  const query = listSchema.parse(req.query); const filter = { userId: actor(req).id, ...(query.unread === 'true' ? { isRead: false } : {}) };
  const [rows, total, unreadCount] = await Promise.all([Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), Notification.countDocuments(filter), Notification.countDocuments({ userId: actor(req).id, isRead: false })]);
  return res.json({ success: true, data: dto(rows), unreadCount, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
});
export const readNotification = asyncHandler(async (req, res) => { const record = await Notification.findOneAndUpdate({ _id: idParams.parse(req.params).id, userId: actor(req).id }, { $set: { isRead: true } }, { returnDocument: 'after' }); if (!record) throw new ApiError(404, 'Notification not found'); return success(res, dto(record), 'Notification read'); });
export const readAll = asyncHandler(async (req, res) => { await Notification.updateMany({ userId: actor(req).id, isRead: false }, { $set: { isRead: true } }); return success(res, null, 'Notifications read'); });
