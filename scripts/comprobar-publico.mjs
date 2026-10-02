#!/usr/bin/env node
// El repo es público: falla si algún archivo versionado tiene claves, tokens o correos
// reales. Corre en CI (verificar:ci) y a mano con `node scripts/comprobar-publico.mjs`.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hallazgosSensibles } from './lib/publico.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BINARIOS = /\.(png|webp|jpg|jpeg|gif|ico|woff2?|ttf|pdf|zip)$/i
// codigo-origen/ es copia de páginas ya públicas de terceros: lo que diga ya está afuera.
// El detector y su test llevan los patrones adrede.
const OMITIR = /^package-lock\.json$|\/codigo-origen\/|^scripts\/(lib\/publico|tests\/publico\.test)\.mjs$/

const archivos = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'utf8' })
  .split('\0').filter(f => f && !BINARIOS.test(f) && !OMITIR.test(f))

const hallazgos = []
for (const f of archivos) {
  let texto
  try { texto = readFileSync(resolve(raiz, f), 'utf8') } catch { continue }
  if (texto.includes('\0')) continue
  hallazgos.push(...hallazgosSensibles(texto, f))
}

if (hallazgos.length) {
  console.error('✗ El repo es público y esto no puede entrar:\n' + hallazgos.map(h => `  · ${h.ruta}:${h.linea}  ${h.motivo}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${archivos.length} archivos revisados, nada sensible.`)
