import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { preferenceStorage } from '../services/repositories/demo-repository'
import { API_MODE } from '../lib/runtime'
import { useApiAuth, type AuthStore } from './api-auth-store'
const sessionId = sessionStorage.getItem('smartcrm-session')
const useDemoAuth = create<AuthStore>()(persist(set => ({
  // The first visit opens a clearly labeled, pre-authenticated demo workspace.
  userId: sessionId || (preferenceStorage.getItem('smartcrm-auth-v1') ? null : 'employee-1'),
  user: null, status: 'authenticated', error: null,
  async restore() {},
  async login() { throw new Error('Use the demo authentication service') },
  async register() { throw new Error('Use the demo authentication service') },
  signIn(id, remember = true) { if (!remember) sessionStorage.setItem('smartcrm-session', id); else sessionStorage.removeItem('smartcrm-session'); preferenceStorage.setItem('smartcrm-remember', String(remember)); set({ userId: id }) },
  async signOut() { sessionStorage.removeItem('smartcrm-session'); set({ userId: null }) },
}), { name: 'smartcrm-auth-v1', storage: createJSONStorage(() => preferenceStorage), partialize: state => ({ userId: preferenceStorage.getItem('smartcrm-remember') === 'false' ? null : state.userId }), merge: (persisted, current) => ({ ...current, ...(persisted as Partial<AuthStore>), ...(sessionId ? { userId: sessionId } : {}) }) }))
export const useAuth = API_MODE ? useApiAuth : useDemoAuth
