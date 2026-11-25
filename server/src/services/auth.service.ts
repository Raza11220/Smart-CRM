import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose, { Types, type ClientSession } from 'mongoose';
import { User, type UserData } from '../models/User.model';
import { RefreshSession } from '../models/events.models';
import { accessSeconds, env, refreshSeconds } from '../config/env';
import { ApiError } from '../utils/http';
import { atomic } from './transaction';
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const dummyHash = bcrypt.hash(randomUUID(), 12);
type UserIdentity = UserData & { _id: Types.ObjectId };
async function issue(user: UserIdentity, remember: boolean, session: ClientSession, familyId: string = randomUUID()) {
  const sessionId = new Types.ObjectId();
  const refreshToken = jwt.sign({ type: 'refresh', sid: sessionId.toHexString(), family: familyId }, env.JWT_REFRESH_SECRET, { algorithm: 'HS256', subject: user._id.toHexString(), jwtid: randomUUID(), issuer: 'smartcrm', audience: 'smartcrm-refresh', expiresIn: refreshSeconds });
  await RefreshSession.create([{ _id: sessionId, userId: user._id, familyId, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + refreshSeconds * 1000), remember }], { session });
  const accessToken = jwt.sign({ type: 'access', sid: sessionId.toHexString(), ver: user.tokenVersion }, env.JWT_ACCESS_SECRET, { algorithm: 'HS256', subject: user._id.toHexString(), issuer: 'smartcrm', audience: 'smartcrm-api', expiresIn: accessSeconds });
  return { user, refreshToken, accessToken, remember, expiresIn: accessSeconds };
}
export async function login(email: string, password: string, remember = true) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const correct = await bcrypt.compare(password, user?.passwordHash || await dummyHash);
  if (!user || !correct || user.status !== 'active') throw new ApiError(401, 'The email or password is incorrect');
  return atomic(async session => {
    const active = await User.findOne({ _id: user._id, status: 'active' }).select('+tokenVersion').session(session);
    if (!active) throw new ApiError(401, 'The email or password is incorrect');
    active.lastLoginAt = new Date(); await active.save({ session });
    return issue(active, remember, session);
  });
}
export async function register(input: { firstName: string; lastName: string; email: string; password: string }) {
  if (env.ALLOW_PUBLIC_REGISTRATION !== 'true') throw new ApiError(403, 'Registration is managed by your workspace administrator. Ask an Admin to create your account.');
  const passwordHash = await bcrypt.hash(input.password, 12);
  return atomic(async session => {
    const [user] = await User.create([{ firstName: input.firstName, lastName: input.lastName, email: input.email, passwordHash, role: 'staff', status: 'active' }], { session });
    return issue(user!, true, session);
  });
}
function verifyRefresh(token: string) {
  try { const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'], issuer: 'smartcrm', audience: 'smartcrm-refresh' }); if (typeof payload === 'string' || payload.type !== 'refresh' || !Types.ObjectId.isValid(String(payload.sid)) || !Types.ObjectId.isValid(String(payload.sub)) || typeof payload.family !== 'string') throw new Error('Invalid token'); return payload; }
  catch { throw new ApiError(401, 'Your session has expired. Sign in again.'); }
}
export async function refresh(token: string | undefined) {
  if (!token) throw new ApiError(401, 'Sign in to continue');
  const payload = verifyRefresh(token);
  const result = await mongoose.connection.transaction(async session => {
    const saved = await RefreshSession.findOne({ _id: payload.sid, userId: payload.sub, familyId: payload.family, tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).session(session);
    if (!saved) return null;
    if (saved.revokedAt) { await RefreshSession.updateMany({ familyId: saved.familyId }, { $set: { revokedAt: new Date() } }, { session }); return null; }
    const user = await User.findOne({ _id: saved.userId, status: 'active' }).select('+tokenVersion').session(session);
    saved.revokedAt = new Date(); await saved.save({ session });
    if (!user) return null;
    return issue(user, saved.remember, session, saved.familyId);
  });
  if (!result) throw new ApiError(401, 'Your session is no longer active. Sign in again.');
  return result;
}
export async function logout(token?: string) {
  if (!token) return;
  try { const payload = verifyRefresh(token); await RefreshSession.updateMany({ familyId: payload.family, userId: payload.sub }, { $set: { revokedAt: new Date() } }); } catch (error) { if (!(error instanceof ApiError)) throw error; }
}
