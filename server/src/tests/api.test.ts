import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../app';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { seedDemo, seedId } from '../scripts/seed-data';
import { User } from '../models/User.model';
import { Activity, Notification, RefreshSession } from '../models/events.models';
import { Customer, Deal, Lead, Task } from '../models/crm.models';
const adminPassword = 'TestingAdmin!2026'; const staffPassword = 'TestingStaff!2026';
const origin = 'http://localhost:5173';
let adminToken = ''; let staffToken = '';
const adminId = seedId('employee-1').toHexString(); const staffId = seedId('employee-2').toHexString();
const cookieRequest = (method: 'post', path: string) => request(app)[method](path).set('Origin', origin).set('X-SmartCRM-Request', '1');
const authenticated = (method: 'get' | 'post' | 'patch' | 'delete', path: string, token = adminToken) => request(app)[method](path).set('Authorization', `Bearer ${token}`);
const login = (email = 'admin@smartcrm.example', password = adminPassword) => cookieRequest('post', '/api/auth/login').send({ email, password });
const customerBody = (suffix: string, assignedTo = adminId) => ({ firstName: 'Saqib', lastName: 'Nadeem', email: `saqib-${suffix}@test-business.example`, company: `Test ${suffix} Solutions`, assignedTo });
const leadBody = (suffix: string, assignedTo = staffId) => ({ name: 'Saira Naeem', email: `saira-${suffix}@test-business.example`, company: `Test ${suffix} Solutions`, source: 'Referral', estimatedValue: 450000, assignedTo, status: 'new' });
beforeAll(async () => {
  await connectDB();
  if (!mongoose.connection.name.startsWith('smartcrm_test_')) throw new Error('Unsafe test database');
  await seedDemo({ adminPassword, staffPassword });
  const admin = await login(); expect(admin.status).toBe(200); adminToken = admin.body.data.accessToken;
  const staff = await login('staff@smartcrm.example', staffPassword); expect(staff.status).toBe(200); staffToken = staff.body.data.accessToken;
});
afterAll(async () => { if (mongoose.connection.readyState === 1 && mongoose.connection.name.startsWith('smartcrm_test_') && env.NODE_ENV === 'test') await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
describe('MongoDB persistence and safe seeding', () => {
  it('stores the connected Pakistani dataset and seeds idempotently', async () => {
    const before = await Promise.all([Customer.countDocuments(), Lead.countDocuments(), Deal.countDocuments(), Task.countDocuments(), User.countDocuments(), Activity.countDocuments()]);
    expect(before).toEqual([40, 50, 35, 40, 12, 50]);
    await Customer.updateOne({ _id: seedId('customer-1') }, { $set: { notes: 'Keep this saved edit' } });
    await seedDemo({ adminPassword, staffPassword });
    expect(await Promise.all([Customer.countDocuments(), Lead.countDocuments(), Deal.countDocuments(), Task.countDocuments(), User.countDocuments(), Activity.countDocuments()])).toEqual(before);
    expect((await Customer.findById(seedId('customer-1')))?.notes).toBe('Keep this saved edit');
  });
  it('reports readiness only with a connected database', async () => { const res = await request(app).get('/api/health'); expect(res.status).toBe(200); expect(res.body).toEqual({ success: true, message: 'SmartCRM API is running' }); });
});
describe('authentication and session security', () => {
  it('rejects anonymous, malformed, expired, and incorrectly signed access tokens', async () => {
    expect((await request(app).get('/api/customers')).status).toBe(401);
    expect((await authenticated('get', '/api/customers', 'invalid')).status).toBe(401);
    const claims = jwt.decode(adminToken) as jwt.JwtPayload;
    const expired = jwt.sign({ type: 'access', sid: claims.sid, ver: 0 }, env.JWT_ACCESS_SECRET, { subject: adminId, issuer: 'smartcrm', audience: 'smartcrm-api', expiresIn: -1 });
    expect((await authenticated('get', '/api/customers', expired)).status).toBe(401);
    expect((await authenticated('get', '/api/customers', `${adminToken.slice(0, -8)}invalid0`)).status).toBe(401);
  });
  it('validates registration, rejects role escalation, and creates only Staff accounts', async () => {
    expect((await cookieRequest('post', '/api/auth/register').send({ email: 'invalid', password: 'short' })).status).toBe(422);
    const body = { firstName: 'Anwar', lastName: 'Sohail', email: 'anwar@registered.example', password: 'RegisteredStaff!2026' };
    expect((await cookieRequest('post', '/api/auth/register').send({ ...body, role: 'admin' })).status).toBe(422);
    const response = await cookieRequest('post', '/api/auth/register').send(body);
    expect(response.status).toBe(201); expect(response.body.data.user.role).toBe('staff'); expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|tokenHash|tokenVersion/);
    expect((await cookieRequest('post', '/api/auth/register').send(body)).status).toBe(409);
    const saved = await User.findOne({ email: body.email }).select('+passwordHash'); expect(saved?.passwordHash).not.toBe(body.password); expect(saved?.passwordHash).toMatch(/^\$2/);
  });
  it('validates login and rejects inactive accounts', async () => {
    expect((await login('staff@smartcrm.example', 'WrongPassword!2026')).status).toBe(401);
    expect((await login('unknown@smartcrm.example', staffPassword)).body.message).toBe('The email or password is incorrect');
    await User.updateOne({ _id: seedId('employee-3') }, { $set: { status: 'inactive' } });
    const response = await authenticated('post', '/api/users').send({ firstName: 'Inactive', lastName: 'Tester', email: 'inactive@tests.example', password: staffPassword, status: 'inactive' });
    expect(response.status).toBe(201); expect((await login('inactive@tests.example', staffPassword)).status).toBe(401);
  });
  it('uses HttpOnly cookies, stores token hashes, rotates tokens, and revokes replayed families', async () => {
    const response = await login();
    const setCookie = String(response.headers['set-cookie']?.[0]); expect(setCookie).toContain('HttpOnly'); expect(setCookie).toContain('SameSite=Lax'); expect(setCookie).toContain('Path=/api/auth');
    const cookie = setCookie.split(';')[0]!; const raw = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
    const payload = jwt.decode(raw) as jwt.JwtPayload;
    const saved = await RefreshSession.findById(payload.sid).select('+tokenHash'); expect(saved?.tokenHash).toMatch(/^[a-f\d]{64}$/); expect(saved?.tokenHash).not.toBe(raw);
    const rotated = await cookieRequest('post', '/api/auth/refresh').set('Cookie', cookie).send({}); expect(rotated.status).toBe(200); expect(rotated.body.data.accessToken).not.toBe(response.body.data.accessToken);
    expect((await cookieRequest('post', '/api/auth/refresh').set('Cookie', cookie).send({})).status).toBe(401);
    expect((await authenticated('get', '/api/auth/me', rotated.body.data.accessToken)).status).toBe(401);
  });
  it('enforces trusted origins and CSRF headers for refresh/login/logout', async () => {
    expect((await request(app).post('/api/auth/refresh').send({})).status).toBe(403);
    expect((await request(app).post('/api/auth/login').set('Origin', 'https://attacker.example').set('X-SmartCRM-Request', '1').send({ email: 'admin@smartcrm.example', password: adminPassword })).status).toBe(403);
    expect((await request(app).post('/api/auth/logout').set('Origin', origin).send({})).status).toBe(403);
  });
  it('revokes access and refresh sessions on logout', async () => {
    const response = await login(); const cookie = String(response.headers['set-cookie']?.[0]).split(';')[0]!;
    expect((await cookieRequest('post', '/api/auth/logout').set('Cookie', cookie).send({})).status).toBe(200);
    expect((await authenticated('get', '/api/auth/me', response.body.data.accessToken)).status).toBe(401);
    expect((await cookieRequest('post', '/api/auth/refresh').set('Cookie', cookie).send({})).status).toBe(401);
  });
});
describe('role and record permissions', () => {
  it('restricts Staff to their assignments and protects employee management', async () => {
    const response = await authenticated('get', '/api/customers?limit=100', staffToken); expect(response.status).toBe(200); expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((row: { assignedTo: string }) => row.assignedTo === staffId)).toBe(true);
    expect((await authenticated('get', `/api/customers/${seedId('customer-1')}`, staffToken)).status).toBe(404);
    expect((await authenticated('patch', `/api/customers/${seedId('customer-1')}`, staffToken).send({ notes: 'unauthorized' })).status).toBe(404);
    expect((await authenticated('get', `/api/customers?assignedTo=${adminId}`, staffToken)).status).toBe(403);
    expect((await authenticated('post', '/api/users', staffToken).send({})).status).toBe(403);
    expect((await authenticated('patch', `/api/users/${adminId}`, staffToken).send({ role: 'admin' })).status).toBe(403);
    expect((await authenticated('post', '/api/customers', staffToken).send(customerBody('forbidden-assignment'))).status).toBe(403);
    expect((await authenticated('patch', '/api/auth/profile', staffToken).send({ role: 'admin' })).status).toBe(422);
  });
  it('never leaks credential hashes through list/detail/profile responses', async () => {
    for (const path of ['/api/users', `/api/users/${adminId}`, '/api/auth/me']) { const response = await authenticated('get', path); expect(response.status).toBe(200); expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|tokenHash|tokenVersion/); }
  });
});
describe('customer workflows', () => {
  it('creates, reads, updates, searches, paginates, sorts, and deletes an unlinked customer', async () => {
    const created = await authenticated('post', '/api/customers').send(customerBody('crud')); expect(created.status).toBe(201); const id = created.body.data.id;
    expect((await authenticated('get', `/api/customers/${id}`)).body.data.email).toBe('saqib-crud@test-business.example');
    expect((await authenticated('patch', `/api/customers/${id}`).send({ notes: 'Saved in MongoDB' })).status).toBe(200);
    expect((await Customer.findById(id))?.notes).toBe('Saved in MongoDB');
    const results = await authenticated('get', '/api/customers?search=crud&limit=1&sort=company&order=asc'); expect(results.body.pagination.total).toBe(1); expect(results.body.data[0].id).toBe(id);
    expect((await authenticated('get', '/api/customers?page=2&limit=5')).body.pagination.page).toBe(2);
    expect((await authenticated('delete', `/api/customers/${id}`)).status).toBe(200); expect(await Customer.findById(id)).toBeNull();
  });
  it('rejects duplicates, injection, malformed IDs, invalid pagination, and mass assignment', async () => {
    expect((await authenticated('post', '/api/customers').send(customerBody('duplicate'))).status).toBe(201);
    expect((await authenticated('post', '/api/customers').send(customerBody('duplicate'))).status).toBe(409);
    expect((await authenticated('post', '/api/customers').send({ ...customerBody('inject'), email: { $ne: null } })).status).toBe(422);
    expect((await authenticated('patch', `/api/customers/${seedId('customer-1')}`).send({ createdBy: staffId })).status).toBe(422);
    expect((await authenticated('get', '/api/customers/not-an-id')).status).toBe(422);
    expect((await authenticated('get', '/api/customers?limit=1000')).status).toBe(422);
    expect((await authenticated('get', '/api/customers?search=%2E%2A')).body.pagination.total).toBe(0);
  });
  it('prevents deletion of a linked customer without breaking its relationships', async () => { expect((await authenticated('delete', `/api/customers/${seedId('customer-1')}`)).status).toBe(409); expect(await Customer.findById(seedId('customer-1'))).not.toBeNull(); expect(await Deal.findOne({ customerId: seedId('customer-1') })).not.toBeNull(); });
});
describe('leads, deals, and atomic stage changes', () => {
  it('creates and filters leads, validates assignments, and synchronizes the linked opportunity', async () => {
    const created = await authenticated('post', '/api/leads', staffToken).send(leadBody('lead-crud')); expect(created.status).toBe(201); const leadId = created.body.data.id;
    expect((await authenticated('get', '/api/leads?source=Referral&status=new', staffToken)).body.data.some((row: { id: string }) => row.id === leadId)).toBe(true);
    expect((await authenticated('patch', `/api/leads/${leadId}/status`, staffToken).send({ status: 'qualified' })).body.data.status).toBe('qualified');
    expect((await authenticated('post', '/api/leads').send({ ...leadBody('invalid-employee'), assignedTo: new mongoose.Types.ObjectId().toHexString() })).status).toBe(422);
    const lead = await Lead.findById(seedId('lead-2')); const original = lead!.status;
    expect((await authenticated('patch', `/api/leads/${lead!._id}/status`, staffToken).send({ status: 'proposal' })).status).toBe(200);
    expect((await Deal.findOne({ leadId: lead!._id }))?.stage).toBe('proposal');
    await authenticated('patch', `/api/leads/${lead!._id}/status`, staffToken).send({ status: original });
  });
  it('persists Won/Lost/reopened stages with correct close dates and actual revenue', async () => {
    const before = await authenticated('get', '/api/dashboard/summary');
    const deal = await authenticated('post', '/api/deals').send({ title: 'ERP revenue test', company: 'Test Revenue Business', value: 1250000, stage: 'proposal', assignedTo: adminId, expectedCloseDate: '2026-12-30' }); expect(deal.status).toBe(201); const id = deal.body.data.id;
    expect((await authenticated('patch', `/api/deals/${id}/stage`).send({ stage: 'won' })).body.data.closedAt).toBeTruthy();
    const won = await authenticated('get', '/api/dashboard/summary'); expect(won.body.data.revenue).toBe(before.body.data.revenue + 1250000); expect(won.body.data.pipeline).toBe(before.body.data.pipeline);
    expect((await authenticated('patch', `/api/deals/${id}/stage`).send({ stage: 'lost' })).body.data.closedAt).toBeTruthy();
    expect((await authenticated('get', '/api/dashboard/summary')).body.data.revenue).toBe(before.body.data.revenue);
    expect((await authenticated('patch', `/api/deals/${id}/stage`).send({ stage: 'new' })).body.data.closedAt).toBeNull();
    expect((await authenticated('get', '/api/dashboard/summary')).body.data.pipeline).toBe(before.body.data.pipeline + 1250000);
    expect((await authenticated('patch', `/api/deals/${id}/stage`).send({ stage: 'invalid' })).status).toBe(422);
    expect(await Activity.countDocuments({ entityId: id, action: 'stage_changed' })).toBe(3);
  });
  it('prevents duplicate opportunities and rolls back forbidden linked updates', async () => {
    const seedDeal = await Deal.findOne({ leadId: seedId('lead-1') });
    expect((await authenticated('post', '/api/deals').send({ title: 'Duplicate', company: seedDeal!.company, leadId: seedDeal!.leadId, value: 1, assignedTo: adminId, expectedCloseDate: '2026-12-30' })).status).toBe(409);
    const lead = await authenticated('post', '/api/leads').send(leadBody('rollback'));
    await authenticated('post', '/api/deals').send({ title: 'Restricted opportunity', company: lead.body.data.company, leadId: lead.body.data.id, value: 500000, assignedTo: adminId, expectedCloseDate: '2026-12-30' });
    const count = await Activity.countDocuments();
    expect((await authenticated('patch', `/api/leads/${lead.body.data.id}/status`, staffToken).send({ status: 'won' })).status).toBe(403);
    expect((await Lead.findById(lead.body.data.id))?.status).toBe('new'); expect(await Activity.countDocuments()).toBe(count);
  });
  it('serializes concurrent deletion and reference creation without dangling records', async () => {
    const customer = await authenticated('post', '/api/customers').send(customerBody('race')); const id = customer.body.data.id;
    const [created, removed] = await Promise.all([authenticated('post', '/api/deals').send({ title: 'Race-safe deal', company: customer.body.data.company, customerId: id, value: 150000, assignedTo: adminId, expectedCloseDate: '2026-12-30' }), authenticated('delete', `/api/customers/${id}`)]);
    expect([201, 404]).toContain(created.status); expect([200, 409]).toContain(removed.status);
    const linked = await Deal.findOne({ customerId: id }); if (linked) expect(await Customer.findById(id)).not.toBeNull();
  });
});
describe('tasks and recipient notifications', () => {
  it('persists task assignment/completion, validates dates, and clears completedAt on reopen', async () => {
    const response = await authenticated('post', '/api/tasks').send({ title: 'Confirm ERP procurement', assignedTo: staffId, priority: 'high', status: 'todo', dueDate: '2026-11-20' }); expect(response.status).toBe(201); const id = response.body.data.id;
    const notification = await Notification.findOne({ relatedEntityId: id, userId: staffId }); expect(notification).not.toBeNull();
    expect((await authenticated('patch', `/api/tasks/${id}/status`, staffToken).send({ status: 'completed' })).body.data.completedAt).toBeTruthy();
    expect((await authenticated('patch', `/api/tasks/${id}/status`, staffToken).send({ status: 'in_progress' })).body.data.completedAt).toBeNull();
    expect((await authenticated('get', '/api/tasks?overdue=true', staffToken)).body.data.some((row: { id: string }) => row.id === id)).toBe(true);
    expect((await authenticated('patch', `/api/tasks/${id}`, staffToken).send({ dueDate: '2026-02-30' })).status).toBe(422);
    expect((await authenticated('delete', `/api/tasks/${id}`, staffToken)).status).toBe(403);
  });
  it('allows only the recipient to change notification read state and exposes unread counts', async () => {
    const notification = await Notification.findOne({ userId: staffId, isRead: false });
    expect((await authenticated('patch', `/api/notifications/${notification!._id}/read`).send({})).status).toBe(404);
    expect((await authenticated('patch', `/api/notifications/${notification!._id}/read`, staffToken).send({})).body.data.isRead).toBe(true);
    const list = await authenticated('get', '/api/notifications?limit=2', staffToken); expect(list.body.data.length).toBeLessThanOrEqual(2); expect(typeof list.body.unreadCount).toBe('number'); expect(list.body.data.every((row: { userId: string }) => row.userId === staffId)).toBe(true);
    expect((await authenticated('patch', '/api/notifications/read-all', staffToken).send({})).status).toBe(200); expect(await Notification.countDocuments({ userId: staffId, isRead: false })).toBe(0);
  });
});
describe('analytics and protected administration', () => {
  it('aggregates won revenue, open pipeline, conversion, and own performance from MongoDB', async () => {
    const response = await authenticated('get', '/api/reports/overview?period=Last%206%20months'); expect(response.status).toBe(200); const data = response.body.data;
    expect(data.summary.pipeline).toBe((await Deal.find({ stage: { $nin: ['won', 'lost'] } })).reduce((sum, deal) => sum + deal.value!, 0));
    expect(data.revenue.reduce((sum: number, row: { revenue: number }) => sum + row.revenue, 0)).toBe(data.summary.revenue);
    expect(data.summary.conversion).toBe(data.summary.converted / data.summary.totalLeads * 100);
    expect((await authenticated('get', `/api/users/${staffId}/performance`, staffToken)).status).toBe(200);
    expect((await authenticated('get', `/api/users/${adminId}/performance`, staffToken)).status).toBe(403);
    const own = await authenticated('get', '/api/dashboard/summary', staffToken); expect(own.body.data.pipeline).toBe((await Deal.find({ assignedTo: staffId, stage: { $nin: ['won', 'lost'] } })).reduce((sum, deal) => sum + deal.value!, 0));
    for (const path of ['revenue', 'sales-by-employee', 'lead-conversion', 'won-lost', 'lead-sources', 'pipeline', 'task-performance']) expect((await authenticated('get', `/api/reports/${path}`)).status).toBe(200);
  });
  it('filters closed revenue at Pakistan midnight rather than UTC midnight', async () => {
    await Deal.create({ title: 'Timezone boundary', company: 'Test Boundary', value: 777777, stage: 'won', assignedTo: adminId, createdBy: adminId, expectedCloseDate: '2025-02-02', closedAt: new Date('2025-02-01T20:00:00Z') });
    expect((await authenticated('get', '/api/reports/overview?from=2025-02-02&to=2025-02-02')).body.data.summary.revenue).toBe(777777);
    expect((await authenticated('get', '/api/reports/overview?from=2025-02-01&to=2025-02-01')).body.data.summary.revenue).toBe(0);
    expect((await authenticated('get', '/api/reports/overview?from=2026-12-30&to=2026-01-01')).status).toBe(422);
  });
  it('creates employees with hashed credentials and protects the last active Admin', async () => {
    const created = await authenticated('post', '/api/users').send({ firstName: 'Muneeb', lastName: 'Asif', email: 'muneeb@team.example', password: staffPassword, department: 'Sales', jobTitle: 'Sales Executive' }); expect(created.status).toBe(201); expect(created.body.data.role).toBe('staff');
    expect((await login('muneeb@team.example', staffPassword)).status).toBe(200);
    await authenticated('patch', `/api/users/${seedId('employee-4')}/status`).send({ status: 'inactive' });
    expect((await authenticated('patch', `/api/users/${adminId}`).send({ role: 'staff' })).status).toBe(409);
    expect((await authenticated('patch', `/api/users/${adminId}/status`).send({ status: 'inactive' })).status).toBe(409);
    expect((await authenticated('delete', `/api/users/${adminId}`)).status).toBe(409);
    expect(await User.countDocuments({ role: 'admin', status: 'active' })).toBe(1);
    expect((await authenticated('delete', `/api/users/${staffId}`)).status).toBe(409);
  });
  it('refuses to seed over non-demo data and limits failed authentication attempts', async () => {
    const count = await User.countDocuments(); await expect(seedDemo({ adminPassword, staffPassword })).rejects.toThrow('non-demo'); expect(await User.countDocuments()).toBe(count);
    let status = 0; for (let i = 0; i < 20 && status !== 429; i++) status = (await login('nobody@rate-limit.example', 'WrongPassword!2026')).status; expect(status).toBe(429);
  });
});
