import { pathToFileURL } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(pathToFileURL(process.env.SMARTCRM_PLAYWRIGHT_PATH).href)
const browser = await chromium.launch({ headless: true, executablePath: process.env.SMARTCRM_CHROMIUM_PATH })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const root = `artifacts/design-${process.env.SMARTCRM_REVIEW_PHASE || 'before'}`
const base = process.env.SMARTCRM_URL || 'http://127.0.0.1:5173'
await mkdir(root, { recursive: true })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const shots = []
async function capture(name, route, action) {
  await page.goto(base + route)
  await page.locator('h1').first().waitFor()
  if (action) await action()
  await page.waitForTimeout(220)
  await page.screenshot({ path: `${root}/${name}.png` })
  shots.push(name)
}
try {
  for (const [name, route] of [['dashboard', '/dashboard'], ['customers', '/customers'], ['leads', '/leads'], ['pipeline', '/pipeline'], ['tasks', '/tasks'], ['team', '/team'], ['reports', '/reports'], ['settings', '/settings'], ['profile', '/profile'], ['customer-detail', '/customers/customer-1'], ['lead-detail', '/leads/lead-1'], ['employee-profile', '/team/employee-3'], ['login', '/login'], ['register', '/register'], ['forgot-password', '/forgot-password'], ['404', '/missing-page'], ['403', '/access-denied']]) await capture(name, route)
  for (const tab of ['Account', 'Appearance', 'Notifications', 'Security', 'Preferences']) await capture(`settings-${tab.toLowerCase()}`, '/settings', () => page.getByRole('button', { name: tab, exact: true }).click())
  await capture('customer-form', '/customers', () => page.getByRole('button', { name: 'Add customer', exact: true }).click())
  await capture('deal-drawer', '/pipeline?deal=deal-1')
  await capture('task-board', '/tasks', () => page.getByRole('button', { name: 'Task board view', exact: true }).click())
  await capture('notifications', '/dashboard', () => page.getByRole('button', { name: /Notifications, \d+ unread/ }).click())
  for (let offset = 0; offset < shots.length; offset += 6) {
    const group = shots.slice(offset, offset + 6)
    const images = await Promise.all(group.map(async name => `<figure><figcaption>${name}</figcaption><img src="data:image/png;base64,${(await readFile(`${root}/${name}.png`)).toString('base64')}"/></figure>`))
    const sheet = await context.newPage()
    await sheet.setViewportSize({ width: 1480, height: Math.ceil(group.length / 2) * 520 })
    await sheet.setContent(`<html><body style="margin:0;padding:14px;background:#dce0e5;display:grid;grid-template-columns:1fr 1fr;gap:16px;font:14px sans-serif">${images.join('')}</body><style>figure{margin:0;min-width:0}figcaption{height:24px;font-weight:bold}img{display:block;width:100%;border:1px solid #b8c0ce}</style></html>`)
    await sheet.screenshot({ path: `${root}/sheet-${offset / 6 + 1}.png`, fullPage: true })
    await sheet.close()
  }
  await writeFile(`${root}/review.json`, JSON.stringify({ pages: shots, errors }, null, 2))
  console.log(JSON.stringify({ directory: root, captured: shots.length, errors }))
} finally { await browser.close() }
