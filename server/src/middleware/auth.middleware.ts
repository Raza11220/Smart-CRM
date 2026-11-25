import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { RefreshSession } from '../models/events.models';
import { env, clientOrigins } from '../config/env';
import { ApiError, asyncHandler } from '../utils/http';
export interface Actor { id: Types.ObjectId; role: 'admin' | 'staff'; sessionId: string }
export type ApiRequest = Request & { auth?: Actor };
export function actor(req: Request): Actor { const user = (req as ApiRequest).auth; if (!user) throw new ApiError(401, 'Sign in to continue'); return user; }
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw new ApiError(401, 'Sign in to continue');
  let payload: jwt.JwtPayload;
  try { const verified = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'], issuer: 'smartcrm', audience: 'smartcrm-api' }); if (typeof verified === 'string' || verified.type !== 'access' || !Types.ObjectId.isValid(String(verified.sub)) || !Types.ObjectId.isValid(String(verified.sid))) throw new Error('Invalid claims'); payload = verified; }
  catch { throw new ApiError(401, 'Your session has expired. Sign in again.'); }
  const [user, session] = await Promise.all([User.findById(payload.sub).select('+tokenVersion'), RefreshSession.findOne({ _id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { $gt: new Date() } })]);
  if (!user || user.status !== 'active' || !session || user.tokenVersion !== payload.ver) throw new ApiError(401, 'Your session is no longer active');
  (req as ApiRequest).auth = { id: user._id, role: user.role, sessionId: String(payload.sid) }; next();
});
export const adminOnly: RequestHandler = (req, _res, next) => { if (actor(req).role !== 'admin') return next(new ApiError(403, 'Admin access is required')); next(); };
/** Custom non-simple header plus exact origin checks protect cookie operations against CSRF. */
export const cookieRequest: RequestHandler = (req, _res, next) => { if (req.get('X-SmartCRM-Request') !== '1' || !clientOrigins.includes(req.get('Origin') || '')) return next(new ApiError(403, 'Untrusted authentication request origin')); next(); };
