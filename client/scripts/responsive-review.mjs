import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(pathToFileURL(process.env.SMARTCRM_PLAYWRIGHT_PATH).href)
const browser = await chromium.launch({ headless: true, executablePath: process.env.SMARTCRM_CHROMIUM_PATH })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' })
const page = await context.newPage()
page.setDefaultTimeout(15000)
const base = process.env.SMARTCRM_URL || 'http://127.0.0.1:5173'
const checks = [], errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
const routes = ['/dashboard', '/customers', '/leads', '/pipeline', '/tasks', '/team', '/reports', '/settings', '/profile', '/customers/customer-1', '/leads/lead-1', '/team/employee-3', '/login', '/register', '/forgot-password', '/missing-page', '/access-denied']
const output = 'artifacts/design-responsive'
await mkdir(output, { recursive: true })
async function go(route) { await page.goto(base + route); await page.locator('h1').first().waitFor() }
async function fits(label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }))
  assert.ok(size.page <= size.viewport + 1, `${label}: document overflows ${JSON.stringify(size)}`)
}
try {
  await go('/dashboard')
  for (const theme of ['light', 'dark']) {
    await go('/settings')
    await page.getByRole('button', { name: 'Appearance', exact: true }).click()
    await page.getByRole('button', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).click()
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 641 ? 844 : 960 })
      const selected = [320, 768, 1440].includes(width) ? routes : ['/dashboard', '/customers', '/pipeline', '/reports', '/settings']
      for (const route of selected) {
        await go(route)
        await fits(`${theme} ${width} ${route}`)
        checks.push(`${theme} ${width}px ${route}`)
        if ([390, 768, 1440].includes(width) && ['/dashboard', '/customers', '/pipeline', '/team', '/settings', '/login'].includes(route)) await page.screenshot({ path: `${output}/${theme}-${width}-${route.slice(1)}.png` })
      }
      console.log(`PASS ${theme} ${width}px: ${selected.length} routes fit`)
    }
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 960 : 640 })
    for (const [route, label] of [['/customers', 'Add customer'], ['/leads', 'Add lead'], ['/pipeline', 'Add deal'], ['/tasks', 'Create task'], ['/team', 'Add employee']]) {
      await go(route)
      await page.getByRole('button', { name: label, exact: true }).first().click()
      const modal = page.getByRole('dialog')
      await modal.waitFor()
      const bounds = await modal.boundingBox()
      const viewport = page.viewportSize()
      assert.ok(bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, `${width} ${label}: modal outside viewport`)
      await modal.locator('.modal-footer').waitFor({ state: 'visible' })
      const footer = await modal.locator('.modal-footer').boundingBox()
      assert.ok(footer.y + footer.height <= viewport.height, `${label}: footer clipped`)
      if (width === 1440 && route === '/customers') assert.equal(await page.evaluate(() => document.activeElement.id), 'field-firstName')
      await page.screenshot({ path: `${output}/dialog-${width}-${route.slice(1)}.png` })
      await page.keyboard.press('Escape')
      await modal.waitFor({ state: 'hidden' })
      checks.push(`Dialog ${width}px ${label}: bounds, actions, Escape`)
    }
    console.log(`PASS ${width}px: all five entity dialogs fit with visible actions`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await go('/customers')
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Workspace navigation' })
  await navigation.waitFor()
  for (let i = 0; i < 22; i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => document.querySelector('.sidebar').contains(document.activeElement)), 'Focus escaped mobile navigation') }
  await page.keyboard.press('Escape')
  await navigation.waitFor({ state: 'hidden' })
  assert.equal(await page.getByRole('button', { name: 'Open navigation' }).evaluate(node => node === document.activeElement), true)
  checks.push('Mobile navigation traps focus, closes on Escape, and restores focus')
  await go('/pipeline')
  assert.ok(await page.locator('.kanban-board').evaluate(node => node.scrollWidth > node.clientWidth))
  await go('/tasks')
  await page.getByRole('button', { name: 'Task board view' }).click()
  assert.ok(await page.locator('.task-board').evaluate(node => node.scrollWidth > node.clientWidth))
  await fits('Mobile task board')
  checks.push('Deal and task boards scroll inside their containers on mobile')
  assert.deepEqual(errors, [])
  await writeFile(`${output}/results.json`, JSON.stringify({ checks, errors }, null, 2))
  console.log(`${checks.length} responsive and accessibility checks passed. No browser errors.`)
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  console.error(error)
  console.error('Browser errors:', errors)
  process.exitCode = 1
} finally { await browser.close() }
