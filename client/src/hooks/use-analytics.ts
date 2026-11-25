import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api/client'
import { API_MODE } from '../lib/runtime'
import { useAuth } from '../store/auth-store'
export interface AnalyticsData {
  summary: { revenue: number; won: number; lost: number; closed: number; activeLeads: number; totalLeads: number; converted: number; newLeads: number; conversion: number; winRate: number; average: number; pipeline: number; periodPipeline: number; activeDeals: number; pending: number; overdue: number; totalCustomers: number; activeCustomers: number }
  revenue: { name: string; date: string; revenue: number; pipeline: number }[]
  salesByEmployee: { id: string; name: string; revenue: number; deals: number; open: number }[]
  topPerformers: AnalyticsData['salesByEmployee']; leadSources: { name: string; value: number }[]
  funnel: { name: string; value: number }[]; wonLost: { name: string; value: number }[]; pipeline: { name: string; count: number; value: number }[]
  periodPipeline: { name: string; value: number }[]; taskPerformance: { name: string; value: number }[]
}
export function useAnalytics(period = 'This year') {
  const userId = useAuth(s => s.userId)
  return useQuery({ queryKey: ['analytics', userId, period], enabled: API_MODE && !!userId, queryFn: async () => (await api.get<{ data: AnalyticsData }>('/reports/overview', { params: { period } })).data.data })
}
