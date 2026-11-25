import { createSeed, DATASET_ID, SEED_VERSION } from '../../data/seed'
import { DATA_KEY, LEGACY_DATA_KEY, RESET_BACKUP_KEY } from './storage-keys'
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from '../../lib/localization'
import type { Database } from '../../types'

export interface SeedInfo { currency: string; version: number; dataset: string; requiresReset: boolean }
export interface CRMRepository { load(): Database; save(data: Database): void; reset(): Database; getSeedInfo(): SeedInfo }
interface Envelope { currency: string; locale: string; timezone: string; seedVersion: number; dataset: string; createdAt: string; data: Database }
type BrowserStorage = Pick<Storage, 'getItem' | 'setItem'>

function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== 'object') return false
  return ['customers', 'leads', 'deals', 'tasks', 'employees', 'activities'].every(key => Array.isArray((value as Record<string, unknown>)[key]))
}
function parse(value: string | null): unknown { try { return value ? JSON.parse(value) : null } catch { return null } }

/** A complete dataset is selected; legacy records are never merged into a new seed. */
export function createDemoRepository(storage: BrowserStorage): CRMRepository {
  let activeKey = DATA_KEY
  let envelope: Envelope | null = null
  let info: SeedInfo = { currency: DEFAULT_CURRENCY, version: SEED_VERSION, dataset: DATASET_ID, requiresReset: false }
  const freshEnvelope = (data: Database): Envelope => ({ currency: DEFAULT_CURRENCY, locale: DEFAULT_LOCALE, timezone: DEFAULT_TIME_ZONE, seedVersion: SEED_VERSION, dataset: DATASET_ID, createdAt: new Date().toISOString(), data })
  return {
    load() {
      const currentRaw = storage.getItem(DATA_KEY)
      const current = parse(currentRaw)
      if (current && typeof current === 'object' && 'data' in current && isDatabase(current.data)) {
        envelope = current as Envelope
        activeKey = DATA_KEY
        info = { currency: envelope.currency || DEFAULT_CURRENCY, version: envelope.seedVersion, dataset: envelope.dataset, requiresReset: envelope.seedVersion !== SEED_VERSION || envelope.dataset !== DATASET_ID }
        return envelope.data
      }
      const legacyRaw = storage.getItem(LEGACY_DATA_KEY)
      const legacy = parse(legacyRaw)
      if (isDatabase(legacy)) {
        activeKey = LEGACY_DATA_KEY
        envelope = null
        info = { currency: 'USD', version: 1, dataset: 'previous-demo', requiresReset: true }
        return legacy
      }
      // Keep unreadable source bytes for recovery before creating any replacement.
      if (currentRaw || legacyRaw) storage.setItem(`${RESET_BACKUP_KEY}-unreadable`, JSON.stringify({ current: currentRaw, legacy: legacyRaw }))
      const data = createSeed()
      activeKey = DATA_KEY
      envelope = freshEnvelope(data)
      info = { currency: DEFAULT_CURRENCY, version: SEED_VERSION, dataset: DATASET_ID, requiresReset: false }
      storage.setItem(DATA_KEY, JSON.stringify(envelope))
      return data
    },
    save(data) {
      // Edits in an unconverted workspace stay in its existing storage namespace.
      if (activeKey === LEGACY_DATA_KEY) storage.setItem(LEGACY_DATA_KEY, JSON.stringify(data))
      else {
        const updated = { ...(envelope || freshEnvelope(data)), data }
        storage.setItem(DATA_KEY, JSON.stringify(updated))
        envelope = updated
      }
    },
    reset() {
      const previous = storage.getItem(activeKey)
      if (previous) storage.setItem(RESET_BACKUP_KEY, JSON.stringify({ sourceKey: activeKey, savedAt: new Date().toISOString(), raw: previous }))
      const data = createSeed()
      const updated = freshEnvelope(data)
      // Do not change the in-memory source until the new dataset is durably saved.
      storage.setItem(DATA_KEY, JSON.stringify(updated))
      activeKey = DATA_KEY
      envelope = updated
      info = { currency: DEFAULT_CURRENCY, version: SEED_VERSION, dataset: DATASET_ID, requiresReset: false }
      return data
    },
    getSeedInfo() { return { ...info } },
  }
}
