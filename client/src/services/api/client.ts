import axios, { type InternalAxiosRequestConfig } from 'axios'
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api', timeout: 15000, withCredentials: true, headers: { 'Content-Type': 'application/json', 'X-SmartCRM-Request': '1' } })
const sessionApi = axios.create({ baseURL: api.defaults.baseURL, timeout: 15000, withCredentials: true, headers: { 'Content-Type': 'application/json', 'X-SmartCRM-Request': '1' } })
let accessToken: string | null = null
let refreshPromise: Promise<SessionResponse> | null = null
let onExpired = () => {}
export interface ApiUser { id: string; firstName: string; lastName: string; email: string; phone: string; role: 'admin' | 'staff'; status: 'active' | 'inactive'; jobTitle: string; department?: string; city?: string; createdAt: string; notificationPreferences?: { emailNotifications: boolean; desktopNotifications: boolean; weeklyDigest: boolean } }
export interface SessionResponse { user: ApiUser; accessToken: string; expiresIn: number }
export function acceptToken(token: string | null) { accessToken = token }
export function onSessionExpired(callback: () => void) { onExpired = callback }
export async function restoreSession(): Promise<SessionResponse> {
  if (!refreshPromise) refreshPromise = sessionApi.post<{ data: SessionResponse }>('/auth/refresh', {}).then(response => { acceptToken(response.data.data.accessToken); return response.data.data }).finally(() => { refreshPromise = null })
  return refreshPromise
}
api.interceptors.request.use(config => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; return config })
api.interceptors.response.use(response => response, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error
  const config = error.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined
  if (error.response?.status === 401 && config && !config.retried && !/^\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(config.url || '')) {
    config.retried = true
    try { const session = await restoreSession(); config.headers.Authorization = `Bearer ${session.accessToken}`; return await api(config) }
    catch { acceptToken(null); onExpired() }
  } else if (error.response?.status === 401 && config?.retried) { acceptToken(null); onExpired() }
  throw error
})
export class ApiFailure extends Error { fields: { field: string; message: string }[]; status: number; constructor(message: string, fields: { field: string; message: string }[] = [], status = 0) { super(message); this.fields = fields; this.status = status } }
export function apiFailure(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error
  if (axios.isAxiosError<{ message?: string; errors?: { field: string; message: string }[] }>(error)) return new ApiFailure(error.response?.data.message || 'The API could not be reached. Check your connection and retry.', error.response?.data.errors || [], error.response?.status || 0)
  return new ApiFailure(error instanceof Error ? error.message : 'The request could not be completed')
}
