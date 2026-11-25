import type { Response } from 'express';
import { env, refreshSeconds } from '../config/env';
import { actor } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import * as auth from '../services/auth.service';
import { updateUser } from '../services/user.service';
import { asyncHandler, success } from '../utils/http';
import { dto } from '../utils/dto';
export const refreshCookie = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: env.COOKIE_SAME_SITE, path: '/api/auth' } as const;
function sessionResponse(res: Response, result: Awaited<ReturnType<typeof auth.login>>, status = 200) { res.cookie('smartcrm_refresh', result.refreshToken, { ...refreshCookie, ...(result.remember ? { maxAge: refreshSeconds * 1000 } : {}) }); res.setHeader('Cache-Control', 'no-store'); return success(res, { user: dto(result.user), accessToken: result.accessToken, expiresIn: result.expiresIn }, 'Authenticated', status); }
export const login = asyncHandler(async (req, res) => sessionResponse(res, await auth.login(req.body.email, req.body.password, req.body.remember)));
export const register = asyncHandler(async (req, res) => sessionResponse(res, await auth.register(req.body), 201));
export const refresh = asyncHandler(async (req, res) => { try { return sessionResponse(res, await auth.refresh(req.cookies?.smartcrm_refresh)); } catch (error) { res.clearCookie('smartcrm_refresh', refreshCookie); throw error; } });
export const logout = asyncHandler(async (req, res) => { await auth.logout(req.cookies?.smartcrm_refresh); res.clearCookie('smartcrm_refresh', refreshCookie); return success(res, null, 'Signed out'); });
export const me = asyncHandler(async (req, res) => success(res, dto(await User.findById(actor(req).id))));
export const profile = asyncHandler(async (req, res) => success(res, dto(await updateUser(actor(req), actor(req).id.toHexString(), req.body, true)), 'Profile updated'));
export const preferences = asyncHandler(async (req, res) => { const values = Object.fromEntries(Object.entries(req.body as Record<string, boolean>).map(([key, value]) => [`notificationPreferences.${key}`, value])); const user = await User.findByIdAndUpdate(actor(req).id, { $set: values }, { returnDocument: 'after', runValidators: true }); return success(res, dto(user?.notificationPreferences), 'Notification preferences updated'); });
