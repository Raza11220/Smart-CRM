export const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'] as const
export type Stage = typeof stages[number]
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type Role = 'Admin' | 'Staff'
export interface Customer {
  city?: string; province?: string;
  id: string; name: string; email: string; phone: string; company: string; jobTitle: string;
  status: 'Active' | 'Inactive'; assignedTo: string; address: string; notes: string; createdAt: string; lastContact: string
}
export interface Lead {
  city?: string; province?: string; address?: string;
  id: string; name: string; email: string; phone: string; company: string; source: string;
  value: number; priority: Priority; stage: Stage; assignedTo: string; followUp: string; notes: string; createdAt: string
}
export interface Deal {
  closedAt?: string;
  id: string; name: string; company: string; value: number; stage: Stage; priority: Priority;
  assignedTo: string; customerId?: string; leadId?: string; closeDate: string; createdAt: string; notes: string
}
export interface Task {
  id: string; name: string; description: string; assignedTo: string; priority: Priority;
  status: 'Todo' | 'In Progress' | 'Completed'; dueDate: string; relatedId: string; createdAt: string
}
export interface Employee {
  department?: string; city?: string;
  id: string; name: string; email: string; role: Role; jobTitle: string; status: 'Active' | 'Inactive'; phone: string; createdAt: string
}
export interface Activity { id: string; text: string; type: 'deal' | 'lead' | 'task' | 'customer' | 'employee'; employeeId: string; relatedId?: string; createdAt: string; read: boolean }
export interface Database { customers: Customer[]; leads: Lead[]; deals: Deal[]; tasks: Task[]; employees: Employee[]; activities: Activity[] }
export type EntityKey = Exclude<keyof Database, 'activities'>
export type Entity = Customer | Lead | Deal | Task | Employee
export interface Preferences { theme: 'light' | 'dark' | 'system'; currency: string; locale: string; timezone: string; dateFormat: string; emailNotifications: boolean; desktopNotifications: boolean; weeklyDigest: boolean; collapsed: boolean }
