// Qué sabemos de cada web de componentes: dónde está su registry (el JSON con el
// código, estilo shadcn) y qué licencia tiene. Para una web desconocida se prueban
// las rutas habituales y la licencia queda en `desconocida`.

const pascal = s => s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')

const SITIOS = [
  {
    host: 'reactbits.dev', nombre: 'React Bits', licencia: 'MIT+Commons-Clause', repo: 'DavidHDev/react-bits',
    registry: slug => ['TS-TW', 'JS-TW', 'TS-CSS', 'JS-CSS'].map(v => `https://reactbits.dev/r/${pascal(slug)}-${v}.json`),
  },
  { host: 'magicui.design', nombre: 'Magic UI', licencia: 'MIT', repo: 'magicuidesign/magicui', registry: s => [`https://magicui.design/r/${s}.json`] },
  { host: 'ui.aceternity.com', nombre: 'Aceternity UI', licencia: 'MIT', repo: null, registry: s => [`https://ui.aceternity.com/registry/${s}.json`] },
  { host: 'uiarc.dev', nombre: 'Arc UI', licencia: 'desconocida', repo: null, registry: s => [`https://uiarc.dev/r/${s}.json`] },
  { host: '21st.dev', nombre: '21st.dev', licencia: 'desconocida', repo: null, registry: () => [] },
  { host: 'useplanes.com', nombre: 'Planes', licencia: 'desconocida', repo: null, registry: s => [`https://useplanes.com/r/${s}.json`] },
]

/** Sitio, licencia conocida, slug de origen y URLs de registry a probar, en orden. */
export function detectarOrigen(url) {
  const u = new URL(url)
  const host = u.hostname.replace(/^www\./, '')
  const partes = u.pathname.split('/').filter(Boolean)
  const slugOrigen = (partes[partes.length - 1] || host).toLowerCase()
  const sitio = SITIOS.find(s => host === s.host || host.endsWith('.' + s.host))
  const genericos = [`${u.origin}/r/${slugOrigen}.json`, `${u.origin}/registry/${slugOrigen}.json`]
  return {
    sitio: sitio?.nombre ?? host,
    licencia: sitio?.licencia ?? 'desconocida',
    repo: sitio?.repo ?? null,
    slugOrigen,
    nombre: nombreDesdeSlug(slugOrigen),
    candidatos: [...(sitio ? sitio.registry(slugOrigen) : []), ...genericos],
  }
}

/** "Botón Imán!" → "boton-iman" */
export const slugDesde = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** "status-mark" → "Status Mark" */
export const nombreDesdeSlug = s => s.split('-').filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')

/** Qué usa el código, mirando imports y clases. */
export function tecnologias(codigo) {
  const t = new Set()
  if (/from ['"]motion(\/|['"])/.test(codigo)) t.add('motion')
  if (/framer-motion/.test(codigo)) t.add('framer-motion')
  if (/from ['"]gsap/.test(codigo)) t.add('gsap')
  if (/lucide-react/.test(codigo)) t.add('lucide-react')
  if (/@radix-ui/.test(codigo)) t.add('radix')
  if (/@react-three|from ['"]three['"]/.test(codigo)) t.add('three')
  if (/className=/.test(codigo)) t.add('tailwind')
  if (/\.module\.css|import ['"][^'"]+\.css['"]/.test(codigo)) t.add('css')
  return [...t]
}

const PROPIOS = new Set(['react', 'react-dom', 'next'])

/** Paquetes externos que importa el código (sin react/next, alias `@/` ni rutas relativas). */
export function dependenciasDe(codigo) {
  const paquetes = new Set()
  for (const m of codigo.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const ruta = m[1]
    if (ruta.startsWith('.') || ruta.startsWith('@/') || ruta.startsWith('~/')) continue
    const nombre = ruta.startsWith('@') ? ruta.split('/').slice(0, 2).join('/') : ruta.split('/')[0]
    if (PROPIOS.has(nombre) || nombre.endsWith('.css')) continue
    paquetes.add(nombre)
  }
  return [...paquetes].sort()
}
