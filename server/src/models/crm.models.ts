import { Schema, model, type Model, Types } from 'mongoose';
export const stages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
export const priorities = ['low', 'medium', 'high', 'urgent'] as const;
export type Kind = 'customers' | 'leads' | 'deals' | 'tasks';
export interface CRMDocument {
  _id: Types.ObjectId; assignedTo: Types.ObjectId; createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date;
  firstName?: string; lastName?: string; name?: string; email?: string; phone?: string; company?: string; jobTitle?: string; status?: string; city?: string; province?: string; address?: string; notes?: string; lastContactAt?: Date;
  source?: string; estimatedValue?: number; priority?: string; customerId?: Types.ObjectId | null; leadId?: Types.ObjectId | null; dealId?: Types.ObjectId | null; expectedCloseDate?: string; nextFollowUp?: string;
  title?: string; value?: number; stage?: string; closedAt?: Date | null; description?: string; dueDate?: string; completedAt?: Date | null; demoSeed?: boolean;
}
const ref = (name: string, required = false) => ({ type: Schema.Types.ObjectId, ref: name, required });
const text = (max = 300) => ({ type: String, trim: true, maxlength: max, default: '' });
const common = { assignedTo: ref('User', true), createdBy: ref('User', true), demoSeed: { type: Boolean, default: false, select: false } };
const location = { city: text(), province: text(), address: text(1000) };
const priority = { type: String, enum: priorities, default: 'medium', required: true };
const schemas: Record<Kind, Schema<CRMDocument>> = {
  customers: new Schema<CRMDocument>({ ...common, ...location, firstName: { ...text(80), required: true }, lastName: { ...text(120), required: true }, email: { ...text(), lowercase: true, required: true, unique: true }, phone: text(40), company: { ...text(), required: true }, jobTitle: text(), status: { type: String, enum: ['active', 'inactive'], default: 'active' }, notes: text(10000), lastContactAt: Date }, { timestamps: true, strict: 'throw' }),
  leads: new Schema<CRMDocument>({ ...common, ...location, name: { ...text(), required: true }, email: { ...text(), lowercase: true, required: true, unique: true }, phone: text(40), company: { ...text(), required: true }, source: { type: String, enum: ['Website', 'Referral', 'Social media', 'Email campaign', 'Events'], required: true }, estimatedValue: { type: Number, min: 0, required: true }, status: { type: String, enum: stages, default: 'new' }, priority, customerId: ref('Customer'), expectedCloseDate: String, nextFollowUp: String, notes: text(10000) }, { timestamps: true, strict: 'throw' }),
  deals: new Schema<CRMDocument>({ ...common, title: { ...text(), required: true }, company: { ...text(), required: true }, customerId: ref('Customer'), leadId: ref('Lead'), value: { type: Number, required: true, min: 0 }, stage: { type: String, enum: stages, default: 'new' }, priority, expectedCloseDate: { type: String, required: true }, closedAt: { type: Date, default: null }, description: text(10000) }, { timestamps: true, strict: 'throw' }),
  tasks: new Schema<CRMDocument>({ ...common, title: { ...text(), required: true }, description: text(10000), priority, status: { type: String, enum: ['todo', 'in_progress', 'completed'], default: 'todo' }, dueDate: { type: String, required: true }, completedAt: { type: Date, default: null }, customerId: ref('Customer'), leadId: ref('Lead'), dealId: ref('Deal') }, { timestamps: true, strict: 'throw' }),
};
for (const [kind, schema] of Object.entries(schemas)) { schema.index({ assignedTo: 1, createdAt: -1 }); schema.index({ [kind === 'deals' ? 'stage' : 'status']: 1, assignedTo: 1 }); if (kind === 'tasks') schema.index({ dueDate: 1, status: 1 }); }
schemas.deals.index({ leadId: 1 }, { unique: true, partialFilterExpression: { leadId: { $type: 'objectId' } } }); schemas.deals.index({ stage: 1, closedAt: -1 }); schemas.customers.index({ company: 1 }); schemas.leads.index({ source: 1, createdAt: -1 });
export const Customer = model<CRMDocument>('Customer', schemas.customers);
export const Lead = model<CRMDocument>('Lead', schemas.leads);
export const Deal = model<CRMDocument>('Deal', schemas.deals);
export const Task = model<CRMDocument>('Task', schemas.tasks);
export const models: Record<Kind, Model<CRMDocument>> = { customers: Customer, leads: Lead, deals: Deal, tasks: Task };
