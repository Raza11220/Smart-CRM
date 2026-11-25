import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { toast } from 'sonner'
import { demoRepository, preferenceStorage } from '../services/repositories/demo-repository'
import { useAuth } from './auth-store'
import { DEFAULT_CURRENCY, DEFAULT_DATE_FORMAT, DEFAULT_LOCALE, DEFAULT_TIME_ZONE, dateKey } from '../lib/localization'
import { PREFERENCES_KEY } from '../services/repositories/storage-keys'
import { API_MODE } from '../lib/runtime'
import { apiRepository } from '../services/repositories/api-repository'
import { api, apiFailure } from '../services/api/client'
import { queryClient } from '../services/api/query-client'
import type { SeedInfo } from '../services/repositories/demo-repository'
import type { Activity, Database, Entity, EntityKey, Preferences, Stage } from '../types'
const emptyDatabase = (): Database => ({ customers: [], leads: [], deals: [], tasks: [], employees: [], activities: [] })
let refreshGeneration = 0
interface CRMStore {
  data: Database
  seedInfo: SeedInfo
  ready: boolean; loading: boolean; error: string | null; notifications: Activity[]
  refresh: () => Promise<void>; clear: () => void
  save: <K extends EntityKey>(key: K, record: Database[K][number]) => Promise<void>
  remove: (key: EntityKey, id: string) => Promise<void>
  moveDeal: (id: string, stage: Stage) => Promise<void>
  readNotifications: (id?: string) => Promise<void>
  reset: () => boolean
}
function commit(data: Database, set: (value: { data: Database }) => void) {
  try { demoRepository.save(data); set({ data }) } catch { toast.error('Could not save changes. Your browser storage may be full.'); throw new Error('Storage unavailable') }
}
export const useCRM = create<CRMStore>((set, get) => ({
  data: API_MODE ? emptyDatabase() : demoRepository.load(),
  seedInfo: API_MODE ? { currency: 'PKR', version: 0, dataset: 'mongodb', requiresReset: false } : demoRepository.getSeedInfo(),
  ready: !API_MODE, loading: false, error: null, notifications: [],
  clear() { refreshGeneration++; set({ data: emptyDatabase(), notifications: [], ready: false, error: null, loading: false }) },
  async refresh() {
    if (!API_MODE) return
    const generation = ++refreshGeneration; const userId = useAuth.getState().userId
    set({ loading: true, error: null })
    try { const result = await apiRepository.load(); if (generation === refreshGeneration && userId === useAuth.getState().userId) set({ ...result, ready: true, loading: false, error: null }) }
    catch (error) { const failure = apiFailure(error); if (generation === refreshGeneration) set({ error: failure.message, loading: false }); throw failure }
  },
  async save(key, record) {
    if (API_MODE) { try { await apiRepository.save(key, record, get().data[key].some(row => row.id === record.id), key === 'employees' && record.id === useAuth.getState().userId); await get().refresh(); void queryClient.invalidateQueries({ queryKey: ['analytics'] }) } catch (error) { const failure = apiFailure(error); toast.error(failure.message); throw failure } return }
    const data = structuredClone(get().data)
    const records = data[key] as Entity[]
    const index = records.findIndex(r => r.id === record.id)
    if (index >= 0) records[index] = record; else records.unshift(record)
    if (key === 'deals') { const deal = data.deals.find(d => d.id === record.id); const lead = data.leads.find(l => l.id === deal?.leadId); if (deal && lead) lead.stage = deal.stage }
    if (key === 'leads') data.deals.filter(d => d.leadId === record.id).forEach(d => {
      const stage = data.leads.find(l => l.id === record.id)!.stage
      if (d.stage !== stage && (stage === 'Won' || stage === 'Lost')) d.closeDate = dateKey()
      d.stage = stage
    })
    data.activities.unshift({ id: crypto.randomUUID(), text: `${index >= 0 ? 'updated' : 'created'} ${record.name}`, type: key === 'deals' ? 'deal' : key === 'leads' ? 'lead' : key === 'tasks' ? 'task' : 'customer', employeeId: useAuth.getState().userId || 'employee-1', relatedId: record.id, createdAt: new Date().toISOString(), read: false })
    commit(data, set)
  },
  async remove(key, id) {
    if (API_MODE) { try { await apiRepository.remove(key, id); await get().refresh(); void queryClient.invalidateQueries({ queryKey: ['analytics'] }) } catch (error) { const failure = apiFailure(error); toast.error(failure.message); throw failure } return }
    if (key === 'employees' && id === 'employee-1') { toast.error('The workspace owner cannot be deleted.'); return }
    const data = structuredClone(get().data)
    Object.assign(data, { [key]: data[key].filter(record => record.id !== id) })
    if (key === 'customers') data.deals.forEach(d => { if (d.customerId === id) d.customerId = undefined })
    if (key === 'leads') data.deals.forEach(d => { if (d.leadId === id) d.leadId = undefined })
    if (key === 'customers' || key === 'leads') data.tasks.forEach(t => { if (t.relatedId === id) t.relatedId = '' })
    if (key === 'employees') [...data.customers, ...data.leads, ...data.deals, ...data.tasks].forEach(r => { if (r.assignedTo === id) r.assignedTo = 'employee-1' })
    commit(data, set)
  },
  async moveDeal(id, stage) { if (API_MODE) { try { await apiRepository.moveDeal(id, stage); await get().refresh(); void queryClient.invalidateQueries({ queryKey: ['analytics'] }); toast.success(`Deal moved to ${stage}`) } catch (error) { const failure = apiFailure(error); toast.error(failure.message) } return } const deal = get().data.deals.find(d => d.id === id); if (deal) { await get().save('deals', { ...deal, stage, closeDate: stage === 'Won' || stage === 'Lost' ? dateKey() : deal.closeDate }); toast.success(`Deal moved to ${stage}`) } },
  async readNotifications(id) { if (API_MODE) { try { await apiRepository.readNotifications(id); await get().refresh() } catch (error) { toast.error(apiFailure(error).message) } return } const data = structuredClone(get().data); data.activities.forEach(a => { if (!id || a.id === id) a.read = true }); commit(data, set) },
  reset() { if (API_MODE) { toast.error('Database resets are available only through the explicit development seed command.'); return false } try { const data = demoRepository.reset(); set({ data, seedInfo: demoRepository.getSeedInfo() }); toast.success('Pakistani demo dataset restored'); return true } catch { toast.error('Could not reset demo data. Existing records were preserved.'); return false } },
}))
interface PreferenceStore { preferences: Preferences; update: (values: Partial<Preferences>) => void }
const initialSeedInfo = demoRepository.getSeedInfo()
const defaultPreferences: Preferences = { theme: 'light', currency: initialSeedInfo.requiresReset ? initialSeedInfo.currency : DEFAULT_CURRENCY, locale: DEFAULT_LOCALE, timezone: DEFAULT_TIME_ZONE, dateFormat: initialSeedInfo.requiresReset ? 'MMM d, yyyy' : DEFAULT_DATE_FORMAT, emailNotifications: true, desktopNotifications: true, weeklyDigest: true, collapsed: false }
export const usePreferences = create<PreferenceStore>()(persist((set) => ({
  preferences: defaultPreferences,
  update: values => { set(state => ({ preferences: { ...state.preferences, ...values } })); if (API_MODE && useAuth.getState().userId) { const notifications = Object.fromEntries(Object.entries(values).filter(([key]) => ['emailNotifications', 'desktopNotifications', 'weeklyDigest'].includes(key))); if (Object.keys(notifications).length) void api.patch('/auth/preferences', notifications).catch(error => toast.error(apiFailure(error).message)) } },
}), { name: PREFERENCES_KEY, version: 2, storage: createJSONStorage(() => preferenceStorage),
  migrate: persisted => {
    const previous = persisted as Partial<PreferenceStore>
    return { ...previous, preferences: { ...defaultPreferences, ...previous.preferences, currency: demoRepository.getSeedInfo().requiresReset ? previous.preferences?.currency || defaultPreferences.currency : DEFAULT_CURRENCY, locale: DEFAULT_LOCALE, timezone: DEFAULT_TIME_ZONE, dateFormat: demoRepository.getSeedInfo().requiresReset ? previous.preferences?.dateFormat || defaultPreferences.dateFormat : DEFAULT_DATE_FORMAT } }
  },
}))
