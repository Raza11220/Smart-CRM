import { actor } from '../middleware/auth.middleware';
import { analytics } from '../services/analytics.service';
import { asyncHandler, success } from '../utils/http';
import { rangeSchema } from '../validators/schemas';
type Analytics = Awaited<ReturnType<typeof analytics>>;
export const analyticsController = (field?: keyof Analytics) => asyncHandler(async (req, res) => { const result = await analytics(actor(req), rangeSchema.parse(req.query)); return success(res, field ? result[field] : result); });
