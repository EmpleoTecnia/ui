// Renderiza una página JS con Chromium y saca: texto visible, bloques de código, y una captura.
// uso: node leer-pagina.mjs <url> <salida.png>
import { chromium } from 'playwright'
const [url, salida] = process.argv.slice(2)
const nav = await chromium.launch()
const page = await nav.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1500)
const texto = await page.evaluate(() => document.body.innerText)
const codigos = await page.evaluate(() => [...document.querySelectorAll('pre, code')].map(e => e.innerText).filter(t => t.length > 80))
const enlaces = await page.evaluate(() => [...document.querySelectorAll('a[href*="github"], a[href*="license"], a[href*="LICENSE"]')].map(a => a.href))
if (salida) await page.screenshot({ path: salida })
await nav.close()
console.log('=== TEXTO ===\n' + texto.slice(0, 20000))
console.log('\n=== CODIGOS (' + codigos.length + ') ===')
for (const c of codigos.slice(0, 6)) console.log('--- ' + c.length + ' chars ---\n' + c.slice(0, 6000))
console.log('\n=== ENLACES ===\n' + [...new Set(enlaces)].join('\n'))
