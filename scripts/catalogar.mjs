#!/usr/bin/env node
// Valida todas las fichas y genera catalog.json, los README y el registro del playground.
// Falla con código 1 si algo no cumple. Es el test del repo.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { construirCatalogo, escribirSalidas } from './lib/catalogo.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { entradas, errores } = await construirCatalogo(raiz)

if (errores.length) {
  console.error(`✗ ${errores.length} problema${errores.length === 1 ? '' : 's'}:\n`)
  for (const e of errores) console.error(`  · ${e}`)
  process.exit(1)
}

escribirSalidas(raiz, entradas)
const adoptados = entradas.filter(e => e.estado === 'adoptado').length
const referencias = entradas.filter(e => e.estado === 'referencia').length
console.log(`✓ ${entradas.length} entradas (${adoptados} adoptadas, ${referencias} referencias). catalog.json, READMEs y registro escritos.`)
