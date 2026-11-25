import { Types } from 'mongoose';
/** Explicit internal fields are removed for every model, including populated records. */
export function dto(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (Array.isArray(value)) return value.map(dto);
  if (value instanceof Map) return Object.fromEntries([...value].map(([key, item]) => [key, dto(item)]));
  if (typeof value === 'object') { const source = 'toObject' in value && typeof value.toObject === 'function' ? value.toObject() as Record<string, unknown> : value as Record<string, unknown>; return Object.fromEntries(Object.entries(source).filter(([key]) => !['__v', 'passwordHash', 'tokenHash', 'tokenVersion', 'demoSeed', 'audienceIds'].includes(key)).map(([key, item]) => [key === '_id' ? 'id' : key, dto(item)])); }
  return value;
}
