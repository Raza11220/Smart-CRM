import { Schema, model, type InferSchemaType } from 'mongoose';
const userSchema = new Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 80 }, lastName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: '', maxlength: 40 }, avatar: { type: String, default: '', maxlength: 500 }, role: { type: String, enum: ['admin', 'staff'], default: 'staff', required: true },
  jobTitle: { type: String, default: 'Sales Executive' }, department: { type: String, default: 'Sales' }, city: { type: String, default: '' }, status: { type: String, enum: ['active', 'inactive'], default: 'active', required: true },
  lastLoginAt: Date, tokenVersion: { type: Number, default: 0, select: false }, notificationPreferences: { emailNotifications: { type: Boolean, default: true }, desktopNotifications: { type: Boolean, default: true }, weeklyDigest: { type: Boolean, default: true } }, demoSeed: { type: Boolean, default: false, select: false },
}, { timestamps: true, strict: 'throw' });
userSchema.index({ role: 1, status: 1 });
export type UserData = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
