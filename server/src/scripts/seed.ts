import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { seedDemo } from './seed-data';
async function main() {
  const reset = process.argv.includes('--reset-demo');
  if (reset && !process.argv.includes('--confirm=smartcrm-demo')) throw new Error('Demo reset requires --reset-demo --confirm=smartcrm-demo. Existing non-demo records are never removed.');
  const adminPassword = process.env.SEED_ADMIN_PASSWORD; const staffPassword = process.env.SEED_STAFF_PASSWORD;
  if (!adminPassword || !staffPassword) throw new Error('Set SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD in the server environment.');
  await connectDB();
  const counts = await seedDemo({ reset, adminPassword, staffPassword });
  console.log('Pakistani demo seed ready:', counts);
  console.log('Accounts: admin@smartcrm.example and staff@smartcrm.example. Passwords come from your private server environment.');
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Seed failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
