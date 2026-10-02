#!/usr/bin/env node
// Revisa UNA carpeta como si estuviera adoptada, sin pedirle capturas: código sin colores
// crudos, tokens del contrato declarados en la ficha, demo.tsx presente. Para usar mientras
// se portea, antes de `guardar --adoptar`.
//   node scripts/revisar.mjs <slug>
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { coloresCrudos, tokensUsados } from './lib/codigo.mjs'
import { validarFicha } from './lib/ficha.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const slug = process.argv[2]
if (!slug) { console.error('uso: node scripts/revisar.mjs <slug>'); process.exit(1) }

let dir = null, tipo = null
for (const t of ['components', 'patterns']) {
  for (const c of existsSync(join(raiz, t)) ? readdirSync(join(raiz, t)) : []) {
    if (existsSync(join(raiz, t, c, slug, 'meta.json'))) { dir = join(raiz, t, c, slug); tipo = t }
  }
}
if (!dir) { console.error(`✗ No existe ninguna carpeta ${slug}`); process.exit(1) }

const errores = []
const ficha = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'))
errores.push(...validarFicha({ ...ficha, estado: 'adoptado' }, { carpeta: slug, tipo }).map(e => `meta.json: ${e}`))

const nombres = readdirSync(dir)
const codigo = nombres.filter(n => /\.(tsx|ts|css)$/.test(n) && n !== 'demo.tsx')
if (codigo.length === 0) errores.push('falta al menos un archivo .tsx además de demo.tsx')
if (!nombres.includes('demo.tsx')) errores.push('falta demo.tsx')
if (!nombres.includes('guion.mjs')) errores.push('falta guion.mjs (lo que pasa mientras se graba la animación)')
if (!nombres.includes('README.md')) errores.push('falta README.md')

const usados = new Set()
for (const n of [...codigo, ...(nombres.includes('demo.tsx') ? ['demo.tsx'] : [])]) {
  const src = readFileSync(join(dir, n), 'utf8')
  for (const h of coloresCrudos(src)) errores.push(`${n}:${h.linea}: ${h.motivo}: ${h.texto}`)
  if (n === 'demo.tsx') continue
  const { tokens, desconocidas } = tokensUsados(src)
  for (const t of tokens) usados.add(t)
  for (const c of desconocidas) errores.push(`${n}: la clase "${c}" no corresponde a ningún token del contrato`)
}
const declarados = new Set(ficha.tokens ?? [])
for (const t of usados) if (!declarados.has(t)) errores.push(`el código usa ${t} y la ficha no lo declara en tokens`)
for (const t of declarados) if (!usados.has(t)) errores.push(`la ficha declara ${t} y el código no lo usa`)

if (errores.length) {
  console.error(`✗ ${slug}:\n` + errores.map(e => `  · ${e}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${slug}: código limpio, tokens declarados (${[...usados].join(', ') || 'ninguno'}).`)
