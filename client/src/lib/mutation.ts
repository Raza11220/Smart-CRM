import { toast } from 'sonner'
/** Persistence errors are displayed by the store; UI success follows a confirmed server write. */
export async function runMutation(work: () => Promise<unknown>, message?: string, onSuccess?: () => void) { try { await work(); if (message) toast.success(message); onSuccess?.(); return true } catch { return false } }
