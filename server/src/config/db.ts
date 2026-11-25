import mongoose from 'mongoose';
import { env } from './env';
import { User } from '../models/User.model';
import { models } from '../models/crm.models';
import { Activity, Notification, RefreshSession, WorkspaceLock } from '../models/events.models';
export async function connectDB(uri = env.MONGODB_URI): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 7000, autoIndex: true });
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') { await mongoose.disconnect(); throw new Error('SmartCRM requires a MongoDB replica set for atomic CRM updates and token rotation. Run npm run db:dev or use MongoDB Atlas.'); }
  await Promise.all([User.init(), ...Object.values(models).map(model => model.init()), Activity.init(), Notification.init(), RefreshSession.init(), WorkspaceLock.init()]);
  await WorkspaceLock.updateOne({ _id: 'crm' }, { $setOnInsert: { version: 0 } }, { upsert: true });
}
