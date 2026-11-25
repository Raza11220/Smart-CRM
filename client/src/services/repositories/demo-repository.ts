import { createDemoRepository } from './versioned-repository'
export type { CRMRepository, SeedInfo } from './versioned-repository'

export const demoRepository = createDemoRepository(localStorage)
export const preferenceStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
}
