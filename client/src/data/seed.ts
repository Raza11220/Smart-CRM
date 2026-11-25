import { format, parseISO, subMonths } from 'date-fns'
import type { Activity, Database, Priority, Stage } from '../types'
import { dateKey, shiftDate } from '../lib/localization'
import { companies, companySlug, contactNames, demoPhone, locations, services, team } from './pakistan'

export const SEED_VERSION = 2
export const DATASET_ID = 'pakistan-b2b'
export const employeeNames = team.map(employee => employee.name)

export function createSeed(anchor = new Date()): Database {
  const today = dateKey(anchor)
  const priorities: Priority[] = ['Medium', 'High', 'Low', 'Medium', 'Urgent']
  const stageList: Stage[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Won', 'Lost']
  const employees: Database['employees'] = team.map((employee, i) => ({
    ...employee, id: `employee-${i + 1}`,
    email: i === 0 ? 'admin@smartcrm.example' : i === 1 ? 'staff@smartcrm.example' : `${employee.name.toLowerCase().replaceAll(' ', '.')}@smartcrm.example`,
    role: i === 0 || i === 3 ? 'Admin' : 'Staff', status: 'Active',
    phone: demoPhone(i + 100, true), createdAt: shiftDate(today, -300 - i * 7),
  }))
  const customers: Database['customers'] = companies.map((company, i) => {
    const namedCity = company.startsWith('Lahore') ? 'Lahore' : company.startsWith('Karachi') ? 'Karachi' : /^(Islamabad|Capital|Margalla)/.test(company) ? 'Islamabad' : company.startsWith('Multan') ? 'Multan' : company.startsWith('Sialkot') ? 'Sialkot' : company.startsWith('Gujranwala') ? 'Gujranwala' : company.startsWith('Khyber') ? 'Peshawar' : company.startsWith('Bolan') ? 'Quetta' : company.startsWith('Hyderabad') ? 'Hyderabad' : company.startsWith('Potohar') ? 'Rawalpindi' : undefined
    const location = locations.find(place => place.city === namedCity) || locations[i % locations.length]
    const service = services[i % services.length]
    return {
      id: `customer-${i + 1}`, name: contactNames[i], company,
      email: `${contactNames[i].toLowerCase().replaceAll(' ', '.')}@${companySlug(company)}.example`,
      phone: demoPhone(i), jobTitle: ['Managing Director', 'Head of Operations', 'Procurement Manager', 'IT Manager', 'Finance Director'][i % 5],
      status: i % 9 === 8 ? 'Inactive' : 'Active', assignedTo: employees[i % employees.length].id,
      ...location, address: `Office ${11 + i}, Business Centre, ${location.district}, ${location.city}, ${location.province}, Pakistan`,
      notes: `Fictional B2B account in ${location.city}. ${service.note} Commercial proposals are quoted in PKR.`,
      createdAt: shiftDate(today, -190 - i * 3), lastContact: shiftDate(today, -(i % 14)),
    }
  })
  const leads: Database['leads'] = contactNames.map((name, i) => {
    const customer = customers[i % customers.length]
    const service = services[i % services.length]
    return {
      id: `lead-${i + 1}`, name, company: customer.company,
      email: `${name.toLowerCase().replaceAll(' ', '.')}@${companySlug(customer.company)}.example`,
      phone: demoPhone(i + 40, i % 2 === 1), source: ['Website', 'Referral', 'Social media', 'Email campaign', 'Events'][i % 5],
      value: service.value + Math.floor(i / services.length) * 25000, priority: priorities[i % 5],
      stage: stageList[i % stageList.length], assignedTo: employees[i % employees.length].id,
      city: customer.city, province: customer.province, address: customer.address,
      followUp: shiftDate(today, i % 12 - 3),
      notes: `${service.name} enquiry from ${customer.city}. ${service.note} Next step: confirm scope and procurement timeline.`,
      createdAt: shiftDate(today, -(i % 7) * 24 - Math.floor(i / 7)),
    }
  })
  const deals: Database['deals'] = Array.from({ length: 35 }, (_, i) => {
    const lead = leads[i]
    const customer = customers[i]
    const service = services[i % services.length]
    const closed = lead.stage === 'Won' || lead.stage === 'Lost'
    const closeDate = closed ? shiftDate(format(subMonths(parseISO(today), Math.floor(i / 7)), 'yyyy-MM-dd'), -(i % 4)) : shiftDate(today, 5 + i)
    // A closed opportunity must have been created before its close date.
    const createdAt = shiftDate(closed ? closeDate : today, -21 - i % 18)
    if (lead.createdAt > createdAt) lead.createdAt = createdAt
    return {
      id: `deal-${i + 1}`, name: service.name, company: customer.company, value: lead.value,
      stage: lead.stage, priority: lead.priority, assignedTo: lead.assignedTo,
      customerId: customer.id, leadId: lead.id, closeDate, createdAt,
      notes: `${service.note} Delivery location: ${customer.city}. ${closed ? lead.stage === 'Won' ? 'Scope approved and purchase order received.' : 'Opportunity closed after the procurement review.' : 'Confirm the statement of work, payment milestones, and implementation schedule.'}`,
    }
  })
  const taskVerbs = ['Follow up on', 'Prepare proposal for', 'Schedule discovery for', 'Review scope for', 'Confirm procurement for', 'Plan handover for', 'Arrange demo for', 'Review renewal for']
  const tasks: Database['tasks'] = Array.from({ length: 40 }, (_, i) => {
    const related = i % 2 === 0 ? customers[i] : leads[i]
    const service = services[i % services.length]
    const createdAt = shiftDate(today, -7 - i % 24)
    const dueDate = shiftDate(today, i % 13 - 4)
    return {
      id: `task-${i + 1}`, name: `${taskVerbs[i % taskVerbs.length]} ${related.company}`,
      description: `Discuss ${service.name.toLowerCase()} with ${related.name} in ${related.city}. ${service.note}`,
      assignedTo: related.assignedTo, priority: priorities[i % priorities.length],
      status: (['Todo', 'In Progress', 'Completed'] as const)[i % 3],
      dueDate, relatedId: related.id, createdAt,
    }
  })
  const activities: Activity[] = Array.from({ length: 50 }, (_, i) => {
    const type = (['deal', 'lead', 'task', 'customer'] as const)[i % 4]
    const eligible = type === 'deal' ? deals.filter(deal => deal.stage === 'Won')
      : type === 'lead' ? leads : type === 'task' ? tasks.filter(task => task.status === 'Completed') : customers
    const linked = eligible[Math.floor(i / 4) % eligible.length]
    const text = type === 'deal' ? `closed ${linked.name.toLowerCase()} for ${'company' in linked ? linked.company : ''}`
      : type === 'lead' ? `added ${linked.name} as a lead at ${'company' in linked ? linked.company : ''}`
        : type === 'task' ? `completed ${linked.name.toLowerCase()}` : `updated the ${'company' in linked ? linked.company : ''} account`
    const activityDate = type === 'deal' && 'closeDate' in linked ? linked.closeDate : type === 'lead' ? linked.createdAt : today
    return {
      id: `activity-${i + 1}`, text, type, employeeId: linked.assignedTo, relatedId: linked.id,
      createdAt: new Date(Math.min(anchor.getTime(), new Date(`${activityDate}T${String(9 + i % 8).padStart(2, '0')}:${String(i * 7 % 60).padStart(2, '0')}:00+05:00`).getTime())).toISOString(),
      read: i > 4,
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { customers, leads, deals, tasks, employees, activities }
}
