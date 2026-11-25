import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' })
const checks = []
const check = message => { checks.push(message); console.log(`PASS ${message}`) }
class MemoryStorage {
  values = new Map()
  failKey = ''
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { if (this.failKey === key) throw new Error('Storage full'); this.values.set(key, String(value)) }
}
try {
  const { createSeed, SEED_VERSION, DATASET_ID } = await server.ssrLoadModule('/src/data/seed.ts')
  const { createDemoRepository } = await server.ssrLoadModule('/src/services/repositories/versioned-repository.ts')
  const { DATA_KEY, LEGACY_DATA_KEY, RESET_BACKUP_KEY } = await server.ssrLoadModule('/src/services/repositories/storage-keys.ts')
  const locale = await server.ssrLoadModule('/src/lib/localization.ts')
  const anchor = new Date('2026-11-25T12:00:00Z')
  const data = createSeed(anchor)
  assert.deepEqual([data.customers.length, data.leads.length, data.deals.length, data.tasks.length, data.employees.length, data.activities.length], [40, 50, 35, 40, 12, 50])
  assert.deepEqual(createSeed(anchor), data)
  for (const rows of Object.values(data)) assert.equal(new Set(rows.map(row => row.id)).size, rows.length)
  for (const rows of [data.customers, data.leads, data.employees]) {
    assert.equal(new Set(rows.map(row => row.name)).size, rows.length)
    assert.equal(new Set(rows.map(row => row.email)).size, rows.length)
    for (const row of rows) {
      assert.match(row.email, /^[^@]+@[^@]+\.example$/)
      assert.match(row.phone, /^(03\d{2}-\d{7}|\+92 3\d{2} \d{7})$/)
    }
  }
  check('Correct record counts, stable IDs, deterministic seed, distinct names, .example emails, and Pakistani phone formats')
  const validProvinces = { Lahore: 'Punjab', Karachi: 'Sindh', Islamabad: 'Islamabad Capital Territory', Rawalpindi: 'Punjab', Faisalabad: 'Punjab', Multan: 'Punjab', Sialkot: 'Punjab', Gujranwala: 'Punjab', Peshawar: 'Khyber Pakhtunkhwa', Quetta: 'Balochistan', Hyderabad: 'Sindh' }
  assert.equal(new Set(data.customers.map(c => c.city)).size, 11)
  for (const record of [...data.customers, ...data.leads]) { assert.equal(record.province, validProvinces[record.city]); assert.ok(record.address.includes(record.city)) }
  for (const employee of data.employees) { assert.ok(employee.department); assert.ok(employee.city in validProvinces) }
  check('All eleven Pakistani cities have correct provinces; employees have departments and territories')
  for (const record of [...data.customers, ...data.leads, ...data.deals, ...data.tasks]) assert.ok(data.employees.some(e => e.id === record.assignedTo))
  for (const deal of data.deals) {
    const customer = data.customers.find(c => c.id === deal.customerId)
    const lead = data.leads.find(l => l.id === deal.leadId)
    assert.ok(customer && lead)
    assert.equal(deal.company, customer.company)
    assert.equal(deal.company, lead.company)
    assert.equal(deal.stage, lead.stage)
    assert.equal(deal.value, lead.value)
    assert.ok(deal.value > 0)
    assert.ok(deal.createdAt <= deal.closeDate)
    assert.ok(customer.createdAt <= deal.createdAt)
    assert.ok(lead.createdAt <= deal.createdAt)
  }
  for (const task of data.tasks) { const related = [...data.customers, ...data.leads].find(r => r.id === task.relatedId); assert.ok(related); assert.equal(task.assignedTo, related.assignedTo); assert.ok(task.createdAt <= task.dueDate) }
  for (const activity of data.activities) {
    const record = data[`${activity.type === 'customer' ? 'customer' : activity.type}s`].find(r => r.id === activity.relatedId)
    assert.ok(record)
    assert.ok(data.employees.some(e => e.id === activity.employeeId))
    assert.ok(new Date(activity.createdAt) <= anchor)
    assert.ok(locale.dateKey(activity.createdAt) >= record.createdAt)
    if (activity.type === 'deal') assert.equal(record.stage, 'Won')
    if (activity.type === 'task') assert.equal(record.status, 'Completed')
  }
  assert.equal(new Set(data.deals.map(d => d.name)).size, 8)
  check('Deal/lead/customer relationships, owners, temporal ordering, tasks, eight B2B scenarios, and activity references are consistent')
  for (const amount of [25000, 150000, 450000, 1250000, 3500000]) assert.equal(locale.formatCurrency(amount), `Rs. ${amount.toLocaleString('en-PK')}`)
  assert.equal(locale.formatBusinessDate('2026-11-25'), '25 Nov 2026')
  const originalTZ = process.env.TZ
  for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Karachi']) {
    process.env.TZ = zone
    assert.equal(locale.dateKey('2026-11-25T20:00:00Z'), '2026-11-26')
    assert.equal(locale.formatBusinessDate('2026-11-25T23:30:00Z'), '26 Nov 2026')
    assert.equal(locale.periodStartKey('This year', new Date('2026-12-31T20:00:00Z')), '2027-01-01')
    assert.equal(locale.periodStartKey('Last 7 days', new Date('2026-11-25T20:00:00Z')), '2026-11-20')
    assert.equal(locale.formatWorkspaceTime('2026-11-25T23:30:00Z'), '26 Nov 2026, 04:30 PST (UTC+05:00)')
  }
  if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ
  check('Rs. currency examples, en-PK dates, Pakistan midnight/year boundaries, and PST timestamps are independent of host timezone')
  const storage = new MemoryStorage()
  storage.setItem('unrelated-browser-data', 'KEEP')
  const fresh = createDemoRepository(storage)
  const first = fresh.load()
  assert.equal(first.customers.length, 40)
  assert.equal(JSON.parse(storage.getItem(DATA_KEY)).seedVersion, SEED_VERSION)
  assert.equal(JSON.parse(storage.getItem(DATA_KEY)).dataset, DATASET_ID)
  assert.equal(JSON.parse(storage.getItem(DATA_KEY)).currency, 'PKR')
  assert.equal(JSON.parse(storage.getItem(DATA_KEY)).locale, 'en-PK')
  assert.equal(JSON.parse(storage.getItem(DATA_KEY)).timezone, 'Asia/Karachi')
  assert.equal(fresh.getSeedInfo().currency, 'PKR')
  first.customers[0].notes = 'A saved user edit'
  fresh.save(first)
  assert.equal(createDemoRepository(storage).load().customers[0].notes, 'A saved user edit')
  check('Fresh workspaces use a versioned Pakistani envelope and saved edits survive repository reloads')
  const legacyStorage = new MemoryStorage()
  legacyStorage.setItem('unrelated-browser-data', 'KEEP')
  const legacy = { customers: [{ ...data.customers[0], name: 'Kept Legacy Contact' }], employees: data.employees.slice(0, 2), leads: [], deals: [], tasks: [], activities: [] }
  legacyStorage.setItem(LEGACY_DATA_KEY, JSON.stringify(legacy))
  const repository = createDemoRepository(legacyStorage)
  assert.deepEqual(repository.load(), legacy)
  assert.equal(repository.getSeedInfo().requiresReset, true)
  assert.equal(repository.getSeedInfo().currency, 'USD')
  assert.equal(legacyStorage.getItem(DATA_KEY), null)
  legacy.customers[0].notes = 'An edit before confirmation'
  repository.save(legacy)
  const oldRaw = legacyStorage.getItem(LEGACY_DATA_KEY)
  assert.equal(JSON.parse(oldRaw).customers[0].notes, 'An edit before confirmation')
  assert.equal(legacyStorage.getItem(DATA_KEY), null)
  check('Existing legacy records remain active and editable without injecting or writing the new seed')
  legacyStorage.failKey = DATA_KEY
  assert.throws(() => repository.reset(), /Storage full/)
  assert.equal(repository.getSeedInfo().requiresReset, true)
  assert.equal(legacyStorage.getItem(LEGACY_DATA_KEY), oldRaw)
  legacyStorage.failKey = ''
  const reset = repository.reset()
  assert.equal(reset.customers.length, 40)
  assert.equal(JSON.parse(legacyStorage.getItem(RESET_BACKUP_KEY)).raw, oldRaw)
  assert.equal(legacyStorage.getItem(LEGACY_DATA_KEY), oldRaw)
  assert.equal(legacyStorage.getItem('unrelated-browser-data'), 'KEEP')
  assert.equal(repository.getSeedInfo().requiresReset, false)
  assert.equal(repository.getSeedInfo().currency, 'PKR')
  assert.deepEqual(createDemoRepository(legacyStorage).load(), reset)
  check('Failed resets preserve active records; successful reset backs up old data and leaves unrelated storage untouched')
  await mkdir('artifacts', { recursive: true })
  await writeFile('artifacts/pakistan-data-results.json', JSON.stringify({ passed: checks }, null, 2))
  console.log(`${checks.length} data/localization/migration checks passed.`)
} finally { await server.close() }
