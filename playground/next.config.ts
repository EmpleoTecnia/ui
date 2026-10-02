import type { NextConfig } from 'next'
import { resolve } from 'node:path'

// El playground vive adentro del repo y los componentes afuera (../components).
// `turbopack.root` le dice a Next que el proyecto es todo el repo.
const config: NextConfig = {
  turbopack: { root: resolve(__dirname, '..') },
  outputFileTracingRoot: resolve(__dirname, '..'),
}
export default config
