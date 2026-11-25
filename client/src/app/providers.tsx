import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { usePreferences } from '../store/crm-store'
import { queryClient } from '../services/api/query-client'
export function Providers({ children }: { children: ReactNode }) {
  const preferences = usePreferences(s => s.preferences)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', preferences.theme === 'dark' || (preferences.theme === 'system' && media.matches))
    apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply)
  }, [preferences.theme])
  return <QueryClientProvider client={queryClient}>{children}<Toaster position="bottom-right" richColors closeButton theme={preferences.theme} /></QueryClientProvider>
}
