import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
const { chromium } = await import(pathToFileURL(process.env.SMARTCRM_PLAYWRIGHT_PATH).href)
const browser = await chromium.launch({ headless: true, executablePath: process.env.SMARTCRM_CHROMIUM_PATH })
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
await mkdir('artifacts', { recursive: true })
await page.goto('http://127.0.0.1:5173/dashboard', { waitUntil: 'networkidle' })
await page.waitForSelector('h1', { timeout: 30000 })
await page.waitForTimeout(1200)
await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true })
console.log(JSON.stringify({ title: await page.title(), url: page.url(), errors, viewport: await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })), heading: await page.locator('h1').allTextContents() }))
await browser.close()
