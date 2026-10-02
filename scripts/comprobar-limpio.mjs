#!/usr/bin/env node
// Falla si hay salidas generadas sin commitear (modificadas O nuevas). Lo usa CI
// después de catalogar: si cambia algo, alguien olvidó correr `npm run catalogar`.
import { execFileSync } from 'node:child_process'

const vigilados = ['catalog.json', 'README.md', 'components', 'patterns', 'playground/registro.generado.tsx']
const cambios = execFileSync('git', ['status', '--porcelain', '--', ...vigilados], { encoding: 'utf8' }).trim()
if (cambios) {
  console.error('✗ Hay salidas generadas sin commitear. Corré `npm run catalogar` y commiteá:\n' + cambios)
  process.exit(1)
}
console.log('✓ Lo generado está commiteado.')
