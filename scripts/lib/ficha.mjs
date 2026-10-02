import { CATEGORIAS, ESTADOS, LICENCIAS, PUBLICABLES, CARACTER, TOKENS, FRASES_VACIAS } from './contrato.mjs'

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/

const CAMPOS = new Set([
  'slug', 'nombre', 'categoria', 'estado', 'origen', 'publicable', 'por_que_entro', 'por_que_salio',
  'sirve_para', 'no_sirve_para', 'etiquetas', 'caracter', 'tokens', 'dependencias', 'usado_en',
  'agregado_por', 'fecha', 'capturas', 'captura_de',
])

const esTexto = v => typeof v === 'string' && v.trim().length > 0
const esLista = v => Array.isArray(v) && v.every(x => typeof x === 'string')

/** Devuelve la lista de errores de una ficha. Vacía si está bien. */
export function validarFicha(ficha, { carpeta, tipo }) {
  const e = []
  if (!ficha || typeof ficha !== 'object') return ['la ficha no es un objeto']

  for (const campo of Object.keys(ficha)) {
    if (!CAMPOS.has(campo)) e.push(`campo "${campo}" no existe en la ficha`)
  }

  for (const campo of ['slug', 'nombre', 'categoria', 'estado', 'agregado_por', 'fecha']) {
    if (!esTexto(ficha[campo])) e.push(`falta ${campo}`)
  }

  if (esTexto(ficha.slug)) {
    if (!SLUG.test(ficha.slug)) e.push(`slug "${ficha.slug}" inválido: minúsculas, números y guiones simples, sin acentos`)
    if (ficha.slug !== carpeta) e.push(`la carpeta "${carpeta}" no se llama como el slug "${ficha.slug}"`)
  }

  const categorias = CATEGORIAS[tipo] ?? []
  if (esTexto(ficha.categoria) && !categorias.includes(ficha.categoria)) {
    e.push(`categoría "${ficha.categoria}" no existe en ${tipo}; las conocidas: ${categorias.join(', ')}`)
  }

  if (esTexto(ficha.estado) && !ESTADOS.includes(ficha.estado)) e.push(`estado "${ficha.estado}" no existe; vale ${ESTADOS.join(', ')}`)
  if (ficha.estado === 'retirado' && !esTexto(ficha.por_que_salio)) e.push('un retirado necesita por_que_salio')

  if (!ficha.origen || typeof ficha.origen !== 'object') e.push('falta origen { nombre, url, licencia }')
  else {
    if (!esTexto(ficha.origen.nombre)) e.push('falta origen.nombre')
    if (typeof ficha.origen.url !== 'string') e.push('origen.url tiene que ser texto (vacío si es propio)')
    if (!LICENCIAS.includes(ficha.origen.licencia)) e.push(`origen.licencia "${ficha.origen.licencia}" no vale; vale ${LICENCIAS.join(', ')}`)
  }

  if (typeof ficha.publicable !== 'boolean') e.push('publicable tiene que ser true o false')
  else if (ficha.publicable && ficha.origen && !PUBLICABLES.includes(ficha.origen.licencia)) {
    e.push(`publicable no puede ser true con licencia "${ficha.origen.licencia}"`)
  }

  const razon = (typeof ficha.por_que_entro === 'string' ? ficha.por_que_entro : '').trim().toLowerCase().replace(/[.!]+$/, '')
  if (!razon) e.push('por_que_entro está vacío')
  else if (razon.length < 20 || FRASES_VACIAS.includes(razon)) {
    e.push(`por_que_entro "${ficha.por_que_entro}" no dice nada concreto; contá qué detalle te gustó`)
  }

  if (!esLista(ficha.sirve_para) || ficha.sirve_para.length === 0) e.push('sirve_para tiene que ser una lista con al menos un uso')
  if (ficha.no_sirve_para !== undefined && !esLista(ficha.no_sirve_para)) e.push('no_sirve_para tiene que ser una lista')
  if (!esLista(ficha.etiquetas) || ficha.etiquetas.length === 0) e.push('etiquetas tiene que ser una lista con al menos una')
  if (ficha.dependencias !== undefined && !esLista(ficha.dependencias)) e.push('dependencias tiene que ser una lista')
  if (ficha.usado_en !== undefined && !esLista(ficha.usado_en)) e.push('usado_en tiene que ser una lista')

  if (ficha.caracter !== undefined) {
    if (typeof ficha.caracter !== 'object' || ficha.caracter === null) e.push('caracter tiene que ser un objeto')
    else for (const [eje, valor] of Object.entries(ficha.caracter)) {
      if (!CARACTER[eje]) e.push(`caracter.${eje} no es un eje; valen ${Object.keys(CARACTER).join(', ')}`)
      else if (!CARACTER[eje].includes(valor)) e.push(`caracter.${eje} "${valor}" no vale; vale ${CARACTER[eje].join(', ')}`)
    }
  }

  if (ficha.tokens !== undefined && !esLista(ficha.tokens)) e.push('tokens tiene que ser una lista')
  else if (ficha.estado === 'adoptado' && (!ficha.tokens || ficha.tokens.length === 0)) e.push('un adoptado declara en tokens los --ui-* que usa')
  for (const t of ficha.tokens ?? []) if (!TOKENS.includes(t)) e.push(`token "${t}" no está en el contrato`)

  if (esTexto(ficha.fecha) && !FECHA.test(ficha.fecha)) e.push(`fecha "${ficha.fecha}" tiene que ser AAAA-MM-DD`)
  if (ficha.capturas !== undefined && ficha.capturas !== 'manual') e.push('capturas sólo puede valer "manual"')
  if (ficha.captura_de !== undefined && !esTexto(ficha.captura_de)) e.push('captura_de tiene que ser texto')

  return e
}
