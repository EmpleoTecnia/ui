#!/usr/bin/env node
// Completa la ficha con las respuestas de la persona, cataloga, commitea y pushea.
//
//   node scripts/guardar.mjs <slug> --razon "qué le gustó" --usos "uso 1; uso 2"
//        [--etiquetas "a,b,c"] [--no-sirve "x; y"] [--caracter movimiento=sutil,tono=sobrio,densidad=aire]
//        [--adoptar]   → el código ya está porteado en la carpeta: captura, pasa a adoptado
//        [--sin-push]
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import { tokensUsados } from './lib/codigo.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const slug = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
const opcion = nombre => { const i = args.indexOf(`--${nombre}`); return i >= 0 ? args[i + 1] : null }
const bandera = nombre => args.includes(`--${nombre}`)
const lista = (texto, sep) => (texto ?? '').split(sep).map(s => s.trim()).filter(Boolean)

if (!slug) { console.error('uso: node scripts/guardar.mjs <slug> --razon "..." --usos "a; b" [--etiquetas a,b] [--no-sirve "x; y"] [--caracter k=v,...] [--adoptar] [--actualiza "qué cambió"] [--sin-push]'); process.exit(1) }

// ── ubicar la carpeta ──
let dir = null
for (const tipo of ['components', 'patterns']) {
  const dirTipo = join(raiz, tipo)
  if (!existsSync(dirTipo)) continue
  for (const cat of readdirSync(dirTipo).filter(n => statSync(join(dirTipo, n)).isDirectory())) {
    if (existsSync(join(dirTipo, cat, slug, 'meta.json'))) dir = join(dirTipo, cat, slug)
  }
}
if (!dir) { console.error(`✗ No encuentro la carpeta de "${slug}". ¿Corriste scripts/agregar.mjs?`); process.exit(1) }

// ── completar la ficha ──
const rutaMeta = join(dir, 'meta.json')
const meta = JSON.parse(readFileSync(rutaMeta, 'utf8'))
if (opcion('razon')) meta.por_que_entro = opcion('razon').trim()
if (opcion('usos')) meta.sirve_para = lista(opcion('usos'), ';')
if (opcion('no-sirve')) meta.no_sirve_para = lista(opcion('no-sirve'), ';')
if (opcion('etiquetas')) meta.etiquetas = lista(opcion('etiquetas'), ',')
if (opcion('caracter')) {
  meta.caracter = Object.fromEntries(lista(opcion('caracter'), ',').map(par => par.split('=').map(s => s.trim())))
}
if (bandera('adoptar')) {
  meta.estado = 'adoptado'
  delete meta.capturas
  // los tokens salen del código, no de la memoria de nadie
  const usados = new Set()
  for (const n of readdirSync(dir)) {
    if (!/\.(tsx|ts|css)$/.test(n) || n === 'demo.tsx') continue
    for (const t of tokensUsados(readFileSync(join(dir, n), 'utf8')).tokens) usados.add(t)
  }
  meta.tokens = [...usados]
}
if (!meta.por_que_entro) { console.error('✗ Falta --razon: la frase de la persona sobre qué le gustó. Sin eso no entra.'); process.exit(1) }
if (!meta.sirve_para?.length) { console.error('✗ Falta --usos: para qué lo usaría.'); process.exit(1) }
if (!meta.etiquetas?.length) { console.error('✗ Falta --etiquetas.'); process.exit(1) }
writeFileSync(rutaMeta, JSON.stringify(meta, null, 2) + '\n')

// ── README: reemplazar el "pendiente" con la razón y los usos ──
const rutaReadme = join(dir, 'README.md')
let readme = readFileSync(rutaReadme, 'utf8')
readme = readme.replace(/_Pendiente:[^\n]*_\n/, `## Por qué entró\n\n${meta.por_que_entro}\n\n## Sirve para\n\n${meta.sirve_para.map(u => `- ${u}`).join('\n')}\n${meta.no_sirve_para?.length ? `\n## No sirve para\n\n${meta.no_sirve_para.map(u => `- ${u}`).join('\n')}\n` : ''}`)
writeFileSync(rutaReadme, readme)

// ── capturar si es adoptado, catalogar siempre ──
function correr(cmd, argumentos, opciones = {}) {
  const r = spawnSync(cmd, argumentos, { cwd: raiz, stdio: 'inherit', shell: process.platform === 'win32', ...opciones })
  return r.status === 0
}
if (bandera('adoptar') && !correr('node', ['scripts/capturar.mjs', '--solo', slug])) process.exit(1)
if (!correr('node', ['scripts/catalogar.mjs'])) {
  console.error('\n✗ El catalogador no pasó. Arreglá lo de arriba y volvé a correr guardar.mjs.')
  process.exit(1)
}

// ── commit y push ──
const rel = dir.slice(raiz.length + 1).split('\\').join('/')
const tipo = rel.split('/')[0]
const generados = ['catalog.json', 'README.md', `${tipo}/README.md`, `${tipo}/${meta.categoria}/README.md`, 'playground/registro.generado.tsx']
execFileSync('git', ['add', rel, ...generados.filter(g => existsSync(join(raiz, g)))], { cwd: raiz })
// --actualiza "qué cambió" cuando la entrada ya existía: el commit dice actualiza(...) en vez de agrega(...)
const actualiza = opcion('actualiza')
const mensaje = actualiza ? `actualiza(${slug}): ${actualiza}` : `agrega(${meta.categoria}): ${meta.nombre} (${meta.estado})`
execFileSync('git', ['commit', '-q', '-m', mensaje], { cwd: raiz })
console.log(`✓ commit: ${mensaje}`)
if (!bandera('sin-push')) {
  if (!correr('git', ['push', '-q'])) {
    console.log('  push rechazado: traigo lo del equipo y reintento una vez')
    if (!correr('git', ['pull', '--rebase', '--autostash', '-q'])) {
      console.error('✗ El rebase se frenó. Si el conflicto es en archivos generados: git checkout --theirs -- <archivo>, node scripts/catalogar.mjs, git add, git rebase --continue, git push.')
      process.exit(1)
    }
    if (!correr('node', ['scripts/catalogar.mjs']) || !correr('git', ['push', '-q'])) process.exit(1)
  }
  console.log('✓ push')
}
console.log(`✓ ${meta.nombre} · ${meta.estado} · https://github.com/EmpleoTecnia/ui/tree/main/${rel}`)
