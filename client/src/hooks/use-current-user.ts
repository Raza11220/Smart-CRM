import { useAuth } from '../store/auth-store'
import { useCRM } from '../store/crm-store'
export function useCurrentUser() { const id = useAuth(s => s.userId); const authenticatedUser = useAuth(s => s.user); const employee = useCRM(s => s.data.employees.find(e => e.id === id)); return employee || authenticatedUser }
