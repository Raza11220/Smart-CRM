import type { Employee } from '../../types'
import { preferenceStorage } from '../../services/repositories/demo-repository'
export const authService = {
  async login(email: string, password: string, employees: Employee[]) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const normalized = email.trim().toLowerCase()
    const demoId = ['admin@smartcrm.demo', 'admin@smartcrm.example'].includes(normalized) ? 'employee-1'
      : ['staff@smartcrm.demo', 'staff@smartcrm.example'].includes(normalized) ? 'employee-2' : undefined
    const user = employees.find(e => e.status === 'Active' && (e.email.toLowerCase() === normalized || e.id === demoId))
    const registered = JSON.parse(preferenceStorage.getItem('smartcrm-demo-accounts') || '{}') as Record<string, string>
    const valid = user?.id === 'employee-1' ? password === 'Admin123!' : user?.id === 'employee-2' ? password === 'Staff123!' : registered[email] === password
    if (!user || !valid) throw new Error('The email or password is incorrect. Try a demo account below.')
    return user.id
  },
  register(email: string, password: string) { const accounts = JSON.parse(preferenceStorage.getItem('smartcrm-demo-accounts') || '{}') as Record<string, string>; accounts[email] = password; preferenceStorage.setItem('smartcrm-demo-accounts', JSON.stringify(accounts)) },
}
