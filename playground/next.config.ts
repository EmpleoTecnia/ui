import type { NextConfig } from 'next'
import { resolve } from 'node:path'

// El playground vive adentro del repo y los componentes afuera (../components).
// `turbopack.root` le dice a Next que el proyecto es todo el repo.
const config: NextConfig = {
  turbopack: { root: resolve(__dirname, '..') },
  outputFileTracingRoot: resolve(__dirname, '..'),
  // Sin el botón "N" de Next: se colaba en las capturas.
  devIndicators: false,
}
export default config
