import mongoose, { type ClientSession } from 'mongoose';
import { WorkspaceLock } from '../models/events.models';
/** Serialize writes in this single-company workspace, including reference and last-admin checks. */
export async function atomic<T>(work: (session: ClientSession) => Promise<T>): Promise<T> { return mongoose.connection.transaction(async session => { await WorkspaceLock.updateOne({ _id: 'crm' }, { $inc: { version: 1 } }, { session }); return work(session); }); }
