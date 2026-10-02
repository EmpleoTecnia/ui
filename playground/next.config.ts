import type { NextConfig } from 'next'
import { resolve } from 'node:path'

// El playground vive adentro del repo y los componentes afuera (../components).
// `turbopack.root` le dice a Next que el proyecto es todo el repo.
const config: NextConfig = {
  turbopack: { root: resolve(__dirname, '..') },
  outputFileTracingRoot: resolve(__dirname, '..'),
  // Sin el botón "N" de Next: se colaba en las capturas.
  devIndicators: false,
  // Sitio estático: `npm run build` deja playground/out/ listo para Vercel (o cualquier
  // hosting de archivos). Las rutas dinámicas se enumeran con generateStaticParams y lo
  // que depende de la URL (?slugs=, ?modo=) se lee en el navegador.
  output: 'export',
  trailingSlash: true,
}
export default config
