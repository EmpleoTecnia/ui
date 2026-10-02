#!/usr/bin/env node
// Trae un componente de una URL y arma su carpeta, sin inteligencia de por medio.
//
//   node scripts/agregar.mjs <url> --categoria <cat> [--slug <slug>] [--nombre "..."] [--tipo components|patterns]
//
// Hace: detecta la web, baja el código del registry (o renderiza la página con Chromium
// y rescata los bloques de código), detecta licencia y dependencias, saca una captura,
// avisa si ya hay algo parecido, escribe meta.json (incompleta: faltan las respuestas de
// la persona) y README.md, y guarda lo bajado en codigo-origen/. Imprime un resumen corto.
// Después, con las respuestas: node scripts/guardar.mjs <slug> --razon ... --usos ...
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { detectarOrigen, slugDesde, tecnologias, dependenciasDe } from './lib/origen.mjs'
import { CATEGORIAS, PUBLICABLES } from './lib/contrato.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opcion = (nombre, porDefecto = null) => { const i = args.indexOf(`--${nombre}`); return i >= 0 ? args[i + 1] : porDefecto }
const url = args.find(a => /^https?:\/\//.test(a))
const tipo = opcion('tipo', 'components')
const categoria = opcion('categoria')

if (!url || !categoria || !CATEGORIAS[tipo]?.includes(categoria)) {
  console.error(`uso: node scripts/agregar.mjs <url> --categoria <cat> [--slug <slug>] [--nombre "..."] [--tipo components|patterns]
categorías de components: ${CATEGORIAS.components.join(', ')}
categorías de patterns:   ${CATEGORIAS.patterns.join(', ')}`)
  process.exit(1)
}

const origen = detectarOrigen(url)
const nombre = opcion('nombre', origen.nombre)
const slug = opcion('slug', slugDesde(nombre))
const dir = join(raiz, tipo, categoria, slug)
if (existsSync(dir)) { console.error(`✗ Ya existe ${tipo}/${categoria}/${slug}. Si es otro componente, pasá --slug distinto.`); process.exit(1) }

// ── 1. código: registry primero ──
async function traerJson(u) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(10000), headers: { accept: 'application/json' } })
    if (!r.ok) return null
    const j = await r.json()
    return Array.isArray(j.files) && j.files.length ? j : null
  } catch { return null }
}
let registry = null
for (const c of origen.candidatos) { registry = await traerJson(c); if (registry) { registry._url = c; break } }

const archivos = [] // { nombre, contenido }
if (registry) {
  for (const f of registry.files) if (typeof f.content === 'string') archivos.push({ nombre: basename(f.path ?? f.name ?? 'componente.tsx'), contenido: f.content })
}

// ── 2. la página: texto, código si el registry no dio, y captura ──
let textoPagina = ''
let capturaOk = false
let chromium = null
try { ({ chromium } = await import('playwright')) } catch {}
if (chromium && existsSync(chromium.executablePath())) {
  const nav = await chromium.launch()
  try {
    const page = await nav.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(1500)
    textoPagina = await page.evaluate(() => document.body.innerText)
    if (archivos.length === 0) {
      const bloques = await page.evaluate(() => [...document.querySelectorAll('pre')].map(e => e.innerText).filter(t => /import |export /.test(t) && t.length > 200))
      bloques.forEach((b, i) => archivos.push({ nombre: `bloque-${i + 1}.tsx`, contenido: b }))
    }
    mkdirSync(dir, { recursive: true })
    // la zona de la demo suele ser el primer bloque grande dentro de main; si no, el viewport
    const zona = await page.evaluate(() => {
      const cajas = [...document.querySelectorAll('main *')].map(e => e.getBoundingClientRect()).filter(r => r.width >= 500 && r.height >= 250 && r.height <= 800 && r.top >= 0 && r.top < 700)
      const mejor = cajas.sort((a, b) => a.top - b.top)[0]
      return mejor ? { x: mejor.x, y: mejor.y, width: mejor.width, height: mejor.height } : null
    })
    await page.screenshot({ path: join(dir, 'preview.png'), clip: zona ?? undefined })
    capturaOk = true
  } catch (err) {
    console.error(`  (no se pudo renderizar la página: ${err.message})`)
  } finally { await nav.close() }
} else {
  console.error('  (sin Chromium de Playwright: no hay captura ni lectura de la página; `npx playwright install chromium`)')
}

// ── 3. escribir la carpeta ──
mkdirSync(dir, { recursive: true })
const codigoTodo = archivos.map(a => a.contenido).join('\n')
const dependencias = dependenciasDe(codigoTodo)
const puedeCopiar = PUBLICABLES.includes(origen.licencia) || origen.licencia === 'MIT+Commons-Clause'
const carpetaOrigen = join(dir, 'codigo-origen')
mkdirSync(carpetaOrigen, { recursive: true })
for (const a of archivos) writeFileSync(join(carpetaOrigen, a.nombre), a.contenido)
writeFileSync(join(carpetaOrigen, 'ORIGEN.md'), `Bajado de ${registry?._url ?? url} el ${hoy()}.\nLicencia del sitio: ${origen.licencia}.${puedeCopiar ? '' : '\n\nLa licencia no permite redistribuir: esto es sólo para leer y portear, no se publica.'}\n`)
if (textoPagina) writeFileSync(join(carpetaOrigen, 'pagina.txt'), recortar(textoPagina, nombre))

let agregadoPor = 'equipo'
try { agregadoPor = execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim() || agregadoPor } catch {}

const meta = {
  slug, nombre, categoria, estado: 'referencia',
  origen: { nombre: origen.sitio, url, licencia: origen.licencia },
  publicable: false,
  por_que_entro: '',
  sirve_para: [], no_sirve_para: [], etiquetas: [],
  tokens: [], dependencias, usado_en: [],
  agregado_por: agregadoPor, fecha: hoy(),
  ...(capturaOk ? { capturas: 'manual' } : {}),
}
writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
writeFileSync(join(dir, 'README.md'), `# ${nombre}

_Pendiente: lo completa \`scripts/guardar.mjs\` con las respuestas de quien lo agregó._

Origen: [${origen.sitio}](${url}) · licencia ${origen.licencia}.
Tecnologías: ${tecnologias(codigoTodo).join(', ') || 'sin código bajado'}. Dependencias: ${dependencias.join(', ') || 'ninguna'}.
`)

// ── 4. ¿hay algo parecido? ──
const parecidos = []
if (existsSync(join(raiz, 'catalog.json'))) {
  const { entradas } = JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8'))
  const palabras = new Set(slug.split('-').filter(p => p.length > 3))
  for (const e of entradas) {
    if (e.estado === 'retirado') continue
    const mismas = e.slug.split('-').filter(p => palabras.has(p)).length
    if (e.categoria === categoria || mismas > 0) parecidos.push(`${e.slug} (${e.categoria}, ${e.estado}): ${e.por_que_entro}`)
  }
}

// ── 5. resumen corto ──
console.log(`✓ ${tipo}/${categoria}/${slug}
  nombre:        ${nombre}
  origen:        ${origen.sitio} · licencia ${origen.licencia}${puedeCopiar ? '' : ' (no publicable)'}
  código:        ${archivos.length ? `${archivos.length} archivo(s) desde ${registry ? 'el registry' : 'la página'} → codigo-origen/` : 'NO se consiguió; pedir código pegado si se va a portear'}
  tecnologías:   ${tecnologias(codigoTodo).join(', ') || '-'}
  dependencias:  ${dependencias.join(', ') || '-'}
  captura:       ${capturaOk ? 'preview.png de la página' : 'NO; pedir una captura'}
  parecidos:     ${parecidos.length ? '\n    · ' + parecidos.join('\n    · ') : 'ninguno en la misma categoría'}
  siguiente:     preguntar qué le gustó, para qué lo usaría, y si lo guarda o lo arma; después
                 node scripts/guardar.mjs ${slug} --razon "..." --usos "a; b" --etiquetas "a,b,c" [--caracter movimiento=sutil,tono=sobrio,densidad=aire] [--adoptar]`)

function hoy() { return new Date().toISOString().slice(0, 10) }
function recortar(texto, nombre) {
  const i = texto.indexOf(nombre)
  const desde = i >= 0 ? i : 0
  return texto.slice(desde, desde + 3000)
}
