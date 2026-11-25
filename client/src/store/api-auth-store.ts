import { create } from 'zustand'
import { api, acceptToken, apiFailure, onSessionExpired, restoreSession, type SessionResponse } from '../services/api/client'
import { employeeFromApi } from '../services/repositories/api-repository'
import { queryClient } from '../services/api/query-client'
import type { Employee } from '../types'
export interface AuthStore {
  userId: string | null; user: Employee | null; status: 'loading' | 'authenticated' | 'anonymous' | 'error'; error: string | null
  signIn: (id: string, remember?: boolean) => void; signOut: () => Promise<void>; restore: () => Promise<void>
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
}
export const useApiAuth = create<AuthStore>((set, get) => {
  const accept = (session: SessionResponse) => { acceptToken(session.accessToken); const user = employeeFromApi(session.user); set({ user, userId: user.id, status: 'authenticated', error: null }) }
  return {
    userId: null, user: null, status: 'loading', error: null,
    signIn(id) { if (get().user?.id !== id) throw new Error('A verified API session is required') },
    async login(email, password, remember = true) { try { const response = await api.post<{ data: SessionResponse }>('/auth/login', { email, password, remember }); accept(response.data.data) } catch (error) { throw apiFailure(error) } },
    async register(name, email, password) { const [firstName, ...rest] = name.trim().split(' '); try { const response = await api.post<{ data: SessionResponse }>('/auth/register', { firstName, lastName: rest.join(' '), email, password }); accept(response.data.data) } catch (error) { throw apiFailure(error) } },
    async restore() { set({ status: 'loading', error: null }); try { accept(await restoreSession()) } catch (error) { const failure = apiFailure(error); acceptToken(null); set({ userId: null, user: null, status: failure.status === 401 ? 'anonymous' : 'error', error: failure.status === 401 ? null : failure.message }) } },
    async signOut() { try { await api.post('/auth/logout', {}); acceptToken(null); queryClient.clear(); set({ userId: null, user: null, status: 'anonymous', error: null }) } catch (error) { throw apiFailure(error) } },
  }
})
onSessionExpired(() => { queryClient.clear(); useApiAuth.setState({ userId: null, user: null, status: 'anonymous', error: null }) })
