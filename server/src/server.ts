import mongoose from 'mongoose';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
async function start() {
  await connectDB();
  const server = app.listen(env.PORT, () => console.log(`SmartCRM API ready on port ${env.PORT}; MongoDB connected.`));
  let stopping = false;
  const shutdown = () => { if (stopping) return; stopping = true; server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); }); setTimeout(() => { void mongoose.disconnect().finally(() => process.exit(1)); }, 10000).unref(); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
  server.on('error', error => { console.error('HTTP server could not start:', error.message); void mongoose.disconnect().finally(() => process.exit(1)); });
}
void start().catch(error => { console.error(error instanceof Error && error.message.includes('replica set') ? error.message : 'Server startup failed. Check validated environment variables and MongoDB availability.'); void mongoose.disconnect().finally(() => process.exit(1)); });
