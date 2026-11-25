import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { seedDemo } from './seed-data';
import { WorkspaceLock } from '../models/events.models';

async function main() {
  if (env.NODE_ENV !== 'test') throw new Error('Browser fixtures require NODE_ENV=test.');
  await connectDB();
  if (!mongoose.connection.name.startsWith('smartcrm_test_browser_')) throw new Error('Refusing to reset a non-browser-test database.');
  if (!process.argv.includes('--reset-fixture')) throw new Error('Supply --reset-fixture explicitly.');
  await mongoose.connection.dropDatabase();
  // Dropping the isolated fixture removes the transaction guard as well.
  await WorkspaceLock.create({ _id: 'crm', version: 0 });
  await mongoose.connection.syncIndexes();
  await seedDemo({ adminPassword: process.env.SEED_ADMIN_PASSWORD || '', staffPassword: process.env.SEED_STAFF_PASSWORD || '' });
  console.log('Isolated browser test fixture ready.');
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Browser fixture failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());

