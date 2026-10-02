#!/usr/bin/env node
// Saca preview.png (1200×600, claro + oscuro) y preview.webp (600 px, ≤ 400 KB, 3 s)
// de cada adoptado que no tenga capturas o cuyo código haya cambiado.
//   npm run capturar            → sólo los que lo necesitan
//   npm run capturar -- --todos → todos
//   npm run capturar -- --solo boton-iman
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { construirCatalogo, escribirSalidas, hashCodigo } from './lib/catalogo.mjs'
import { comprimirHastaEntrar } from './lib/webp.mjs'
import { TOPE_WEBP } from './lib/contrato.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const todos = args.includes('--todos')
const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null
const PUERTO = 3999
const BASE = `http://localhost:${PUERTO}`
const tmp = join(raiz, '.capturas-tmp')

const { entradas, errores } = await construirCatalogo(raiz, { sinCapturas: true })
if (errores.length) {
  console.error('✗ Antes de capturar hay que arreglar esto:\n' + errores.map(e => `  · ${e}`).join('\n'))
  process.exit(1)
}
escribirSalidas(raiz, entradas) // el registro tiene que estar al día para que el playground los tenga

const pendientes = entradas.filter(e => {
  if (e.estado !== 'adoptado') return false
  if (solo) return e.slug === solo
  if (todos) return true
  const dir = join(raiz, e.ruta)
  return !e.preview_png || !e.preview_webp || e.captura_de !== hashCodigo(dir)
})
if (pendientes.length === 0) { console.log('✓ Nada que capturar.'); process.exit(0) }
console.log(`Capturando ${pendientes.length}: ${pendientes.map(e => e.slug).join(', ')}`)

// ── levantar el playground ──
const esWindows = process.platform === 'win32'
const servidor = spawn(esWindows ? 'npx.cmd' : 'npx', ['next', 'dev', 'playground', '-p', String(PUERTO)], { cwd: raiz, stdio: 'pipe', shell: esWindows })
servidor.stderr.on('data', d => { const t = String(d); if (/error/i.test(t)) process.stderr.write(t) })
async function esperarServidor() {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return } catch {}
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('el playground no levantó en 90 s')
}
function apagarServidor() {
  if (esWindows && servidor.pid) spawn('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' })
  else servidor.kill()
}

const fallas = []
try {
  await esperarServidor()
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp)
  const navegador = await chromium.launch()

  for (const e of pendientes) {
    const dir = join(raiz, e.ruta)
    process.stdout.write(`  ${e.slug} … `)
    try {
      // PNG: los dos modos lado a lado
      const pagina = await navegador.newPage({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 1 })
      await pagina.goto(`${BASE}/captura/${e.slug}`, { waitUntil: 'networkidle' })
      await pagina.waitForTimeout(700)
      await pagina.screenshot({ path: join(dir, 'preview.png') })
      await pagina.close()

      // WebP: grabación del guion en claro
      const contexto = await navegador.newContext({ viewport: { width: 600, height: 400 }, recordVideo: { dir: tmp, size: { width: 600, height: 400 } } })
      const grabando = await contexto.newPage()
      await grabando.goto(`${BASE}/captura/${e.slug}?modo=claro`, { waitUntil: 'networkidle' })
      await grabando.waitForTimeout(400)
      const rutaGuion = join(dir, 'guion.mjs')
      if (existsSync(rutaGuion)) {
        const { default: guion } = await import(pathToFileURL(rutaGuion).href)
        await guion(grabando)
      } else {
        await grabando.mouse.move(300, 200, { steps: 20 })
        await grabando.waitForTimeout(1200)
        await grabando.mouse.move(40, 40, { steps: 20 })
        await grabando.waitForTimeout(1200)
      }
      const video = grabando.video()
      await contexto.close()
      const rutaVideo = await video.path()
      const { bytes, intento } = await comprimirHastaEntrar({ entrada: rutaVideo, salida: join(dir, 'preview.webp'), tope: TOPE_WEBP })

      // anotar de qué código son estas capturas
      const rutaMeta = join(dir, 'meta.json')
      const ficha = JSON.parse(readFileSync(rutaMeta, 'utf8'))
      ficha.captura_de = hashCodigo(dir)
      writeFileSync(rutaMeta, JSON.stringify(ficha, null, 2) + '\n')
      console.log(`png ✓  webp ✓ ${Math.ceil(bytes / 1024)} KB${intento > 1 ? ` (escalón ${intento})` : ''}`)
    } catch (err) {
      console.log('✗')
      fallas.push(`${e.slug}: ${err.message}`)
    }
  }
  await navegador.close()
} finally {
  apagarServidor()
  rmSync(tmp, { recursive: true, force: true })
}

if (fallas.length) {
  console.error('\n✗ No se pudo capturar:\n' + fallas.map(f => `  · ${f}`).join('\n'))
  process.exit(1)
}
// Dejar el catálogo y los README al día con las capturas nuevas
const final = await construirCatalogo(raiz)
if (final.errores.length) { console.error(final.errores.join('\n')); process.exit(1) }
escribirSalidas(raiz, final.entradas)
console.log('✓ Capturas listas y catálogo regenerado.')
