import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000), NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//), CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(48), JWT_REFRESH_SECRET: z.string().min(48),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('15m'), JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('7d'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'), ALLOW_PUBLIC_REGISTRATION: z.enum(['true', 'false']).default('false'), TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
});
const result = schema.safeParse(process.env);
if (!result.success) throw new Error(`Invalid server configuration: ${result.error.issues.map(i => i.path.join('.')).join(', ')}. See .env.example.`);
export const env = result.data;
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error('Access and refresh secrets must differ.');
if ([env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET].some(value => value.startsWith('replace-with'))) throw new Error('Generate real random JWT secrets before starting the API.');
export const clientOrigins = env.CLIENT_URL.split(',').map(value => { const url = new URL(value.trim()); if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production CLIENT_URL must use HTTPS.'); return url.origin; });
if (env.COOKIE_SAME_SITE === 'none' && env.NODE_ENV !== 'production') throw new Error('Cross-site refresh cookies require HTTPS and NODE_ENV=production.');
export function durationSeconds(value: string): number { const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }; return Number(value.slice(0, -1)) * (units[value.slice(-1)] ?? 0); }
export const accessSeconds = durationSeconds(env.JWT_ACCESS_EXPIRES_IN);
export const refreshSeconds = durationSeconds(env.JWT_REFRESH_EXPIRES_IN);
if (accessSeconds < 30 || accessSeconds > 3600 || refreshSeconds < 60 || refreshSeconds > 2592000) throw new Error('Token expiry is outside the supported security bounds.');
