const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const activos = entradas => entradas.filter(e => e.estado !== 'retirado')

const TITULO = { components: 'Componentes', patterns: 'Patrones' }

// Dónde está cada carpeta, relativa al README que se escribe.
const desdeCategoria = e => `${e.slug}/`
const desdeTipo = e => `${e.categoria}/${e.slug}/`
const desdeRaiz = e => `${e.tipo}/${e.categoria}/${e.slug}/`

/** Grilla HTML de 3 columnas que GitHub renderiza, con las animaciones adentro. */
function grilla(entradas, carpetaDe) {
  if (entradas.length === 0) return '_Todavía no hay nada acá._\n'
  const celdas = entradas.map(e => {
    const carpeta = carpetaDe(e)
    const img = e.preview_webp ? `${carpeta}preview.webp` : e.preview_png ? `${carpeta}preview.png` : null
    const imagen = img ? `<a href="${carpeta}"><img src="${img}" width="100%" alt="${esc(e.nombre)}"></a><br>` : ''
    // El webp cuenta poco: el enlace al original es para verlo funcionando de verdad.
    const urlOrigen = e.origen?.url
    const original = urlOrigen ? `<br>\n<sub><a href="${esc(urlOrigen)}">Ver original en ${esc(e.origen?.nombre || 'su sitio')} ↗</a></sub>` : ''
    return `<td width="33%" valign="top">\n${imagen}<b><a href="${carpeta}">${esc(e.nombre)}</a></b> · ${e.estado}<br>\n<sub>${esc(e.por_que_entro)}</sub>${original}\n</td>`
  })
  const filas = []
  for (let i = 0; i < celdas.length; i += 3) filas.push(`<tr>\n${celdas.slice(i, i + 3).join('\n')}\n</tr>`)
  return `<table>\n${filas.join('\n')}\n</table>\n`
}

function retirados(entradas, carpetaDe) {
  const r = entradas.filter(e => e.estado === 'retirado')
  if (r.length === 0) return ''
  return `\n## Retirados\n\n${r.map(e => `- [${esc(e.nombre)}](${carpetaDe(e)}) — ${esc(e.por_que_salio)}`).join('\n')}\n`
}

const cabecera = '<!-- Generado por scripts/catalogar.mjs. No editar a mano. -->\n'

export function renderCategoria(tipo, categoria, entradas) {
  return `${cabecera}# ${TITULO[tipo]} · ${categoria}\n\n[← ${TITULO[tipo]}](../)\n\n${grilla(activos(entradas), desdeCategoria)}${retirados(entradas, desdeCategoria)}`
}

export function renderTipo(tipo, entradas) {
  const categorias = [...new Set(entradas.map(e => e.categoria))].sort()
  const indice = categorias.map(c => `- [${c}](${c}/) · ${activos(entradas.filter(e => e.categoria === c)).length}`).join('\n')
  return `${cabecera}# ${TITULO[tipo]}\n\n${indice || '_Todavía no hay categorías._'}\n\n${grilla(activos(entradas), desdeTipo)}${retirados(entradas, desdeTipo)}`
}

export function renderBloqueRaiz(entradas) {
  const vivos = activos(entradas)
  if (vivos.length === 0) return 'Todavía no hay entradas. Corré `npm run catalogar` después de agregar la primera.'
  const adoptados = vivos.filter(e => e.estado === 'adoptado').length
  const porTipo = ['components', 'patterns'].map(t => {
    const del = vivos.filter(e => e.tipo === t)
    if (del.length === 0) return null
    const cats = [...new Set(del.map(e => e.categoria))].sort().map(c => `[${c}](${t}/${c}/)`).join(' · ')
    return `- **[${TITULO[t]}](${t}/)** (${del.length}): ${cats}`
  }).filter(Boolean).join('\n')
  const ultimos = [...vivos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6)
  return `${vivos.length} entradas, ${adoptados} adoptadas.\n\n${porTipo}\n\n### Últimas que entraron\n\n${grilla(ultimos, desdeRaiz)}`
}

/** El playground importa cada demo.tsx de los adoptados desde acá. */
export function renderRegistro(entradas) {
  const adoptados = entradas.filter(e => e.estado === 'adoptado')
  const imports = adoptados.map((e, i) => `import d${i} from '../${e.ruta}/demo'`).join('\n')
  const filas = adoptados.map((e, i) => `  { slug: ${JSON.stringify(e.slug)}, nombre: ${JSON.stringify(e.nombre)}, tipo: ${JSON.stringify(e.tipo)}, categoria: ${JSON.stringify(e.categoria)}, por_que_entro: ${JSON.stringify(e.por_que_entro)}, url_github: ${JSON.stringify(e.url_github)}, origen_url: ${JSON.stringify(e.origen?.url || '')}, origen_nombre: ${JSON.stringify(e.origen?.nombre || '')}, demos: d${i} },`).join('\n')
  return `// Generado por scripts/catalogar.mjs. No editar a mano.\nimport type { Demo } from '../lib/demo'\n${imports}\n\nexport type Entrada = {\n  slug: string\n  nombre: string\n  tipo: 'components' | 'patterns'\n  categoria: string\n  por_que_entro: string\n  url_github: string\n  origen_url: string\n  origen_nombre: string\n  demos: Demo[]\n}\n\nexport const registro: Entrada[] = [\n${filas}\n]\n`
}
