import { readdirSync, readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { validarFicha } from './ficha.mjs'
import { coloresCrudos, tokensUsados } from './codigo.mjs'
import { CATEGORIAS, TOPE_WEBP, REPO_GITHUB } from './contrato.mjs'
import { renderCategoria, renderTipo, renderBloqueRaiz, renderRegistro } from './readme.mjs'

const TIPOS = ['components', 'patterns']
const EXT_CODIGO = ['.tsx', '.ts', '.css']
const posix = p => p.split('\\').join('/')

function esCodigo(nombre) {
  return EXT_CODIGO.some(ext => nombre.endsWith(ext))
}

/** Hash corto del código de una carpeta (no de sus capturas ni su ficha). */
export function hashCodigo(dir) {
  const h = createHash('sha256')
  const archivos = readdirSync(dir).filter(n => esCodigo(n) || n === 'guion.mjs').sort()
  for (const n of archivos) h.update(n).update('\0').update(readFileSync(join(dir, n))).update('\0')
  return h.digest('hex').slice(0, 12)
}

function leerJson(ruta) {
  const texto = readFileSync(ruta, 'utf8')
  try {
    return { valor: JSON.parse(texto) }
  } catch (err) {
    let linea = /line (\d+)/.exec(err.message)?.[1]
    if (!linea) {
      const pos = /position (\d+)/.exec(err.message)?.[1]
      linea = pos ? String(texto.slice(0, Number(pos)).split('\n').length) : '?'
    }
    return { error: `JSON inválido (línea ${linea}): ${err.message}` }
  }
}

function revisarAdoptado(dir, rutaRel, ficha, errores, sinCapturas) {
  const nombres = readdirSync(dir)
  const codigo = nombres.filter(n => esCodigo(n) && n !== 'demo.tsx')
  if (codigo.length === 0) errores.push(`${rutaRel}: un adoptado necesita al menos un archivo .tsx además de demo.tsx`)
  if (!nombres.includes('demo.tsx')) errores.push(`${rutaRel}: un adoptado necesita demo.tsx`)
  if (!sinCapturas) {
    if (!nombres.includes('preview.png')) errores.push(`${rutaRel}: falta preview.png (corré npm run capturar)`)
    if (!nombres.includes('preview.webp')) errores.push(`${rutaRel}: falta preview.webp (corré npm run capturar)`)
  }

  const usados = new Set()
  for (const n of [...codigo, ...(nombres.includes('demo.tsx') ? ['demo.tsx'] : [])]) {
    const src = readFileSync(join(dir, n), 'utf8')
    for (const h of coloresCrudos(src)) errores.push(`${rutaRel}/${n}:${h.linea}: ${h.motivo}: ${h.texto}`)
    if (n === 'demo.tsx') continue // la demo puede usar tokens de más para el fondo
    const { tokens, desconocidas } = tokensUsados(src)
    for (const t of tokens) usados.add(t)
    for (const c of desconocidas) errores.push(`${rutaRel}/${n}: la clase "${c}" no corresponde a ningún token del contrato`)
  }
  const declarados = new Set(ficha.tokens ?? [])
  for (const t of usados) if (!declarados.has(t)) errores.push(`${rutaRel}: el código usa ${t} y la ficha no lo declara en tokens`)
  for (const t of declarados) if (!usados.has(t)) errores.push(`${rutaRel}: la ficha declara ${t} y el código no lo usa`)
  return codigo
}

/** Recorre components/ y patterns/, valida todo y devuelve las entradas. */
export async function construirCatalogo(raiz, { sinCapturas = false } = {}) {
  const entradas = []
  const errores = []
  const vistos = new Map()

  for (const tipo of TIPOS) {
    const dirTipo = join(raiz, tipo)
    if (!existsSync(dirTipo)) continue
    for (const categoria of readdirSync(dirTipo).filter(n => statSync(join(dirTipo, n)).isDirectory())) {
      if (!CATEGORIAS[tipo].includes(categoria)) {
        errores.push(`${tipo}/${categoria}: categoría desconocida; las de ${tipo} son ${CATEGORIAS[tipo].join(', ')}`)
        continue
      }
      const dirCat = join(dirTipo, categoria)
      for (const carpeta of readdirSync(dirCat).filter(n => statSync(join(dirCat, n)).isDirectory())) {
        const dir = join(dirCat, carpeta)
        const rutaRel = posix(relative(raiz, dir))
        const rutaMeta = join(dir, 'meta.json')
        if (!existsSync(rutaMeta)) { errores.push(`${rutaRel}: falta meta.json`); continue }
        const { valor: ficha, error } = leerJson(rutaMeta)
        if (error) { errores.push(`${rutaRel}/meta.json: ${error}`); continue }

        const propios = validarFicha(ficha, { carpeta, tipo })
        for (const e of propios) errores.push(`${rutaRel}: ${e}`)
        if (!ficha || typeof ficha !== 'object') continue
        if (ficha.categoria && ficha.categoria !== categoria) errores.push(`${rutaRel}: la ficha dice categoría "${ficha.categoria}" pero está en "${categoria}"`)
        if (vistos.has(ficha.slug)) errores.push(`slug "${ficha.slug}" repetido: ${vistos.get(ficha.slug)} y ${rutaRel}`)
        else if (ficha.slug) vistos.set(ficha.slug, rutaRel)
        if (!existsSync(join(dir, 'README.md'))) errores.push(`${rutaRel}: falta README.md`)

        let archivos_codigo = []
        if (ficha.estado === 'adoptado') archivos_codigo = revisarAdoptado(dir, rutaRel, ficha, errores, sinCapturas)
        else if (ficha.estado === 'referencia' && !existsSync(join(dir, 'preview.png'))) errores.push(`${rutaRel}: una referencia necesita preview.png`)

        const rutaWebp = join(dir, 'preview.webp')
        if (existsSync(rutaWebp)) {
          const bytes = statSync(rutaWebp).size
          if (bytes > TOPE_WEBP) errores.push(`${rutaRel}: preview.webp pesa ${Math.ceil(bytes / 1024)} KB y el tope es ${TOPE_WEBP / 1024} KB`)
        }

        entradas.push({
          ...ficha,
          tipo,
          ruta: rutaRel,
          url_github: `${REPO_GITHUB}/tree/main/${rutaRel}`,
          preview_png: existsSync(join(dir, 'preview.png')) ? `${rutaRel}/preview.png` : null,
          preview_webp: existsSync(rutaWebp) ? `${rutaRel}/preview.webp` : null,
          archivos_codigo,
        })
      }
    }
  }

  const texto = v => String(v ?? '')
  entradas.sort((a, b) => texto(a.tipo).localeCompare(texto(b.tipo)) || texto(a.categoria).localeCompare(texto(b.categoria)) || texto(a.nombre).localeCompare(texto(b.nombre), 'es'))
  return { entradas, errores }
}

/** Escribe catalog.json, los README generados, el bloque del README raíz y el registro del playground. */
export function escribirSalidas(raiz, entradas) {
  // `generado` lleva la hora: sólo se reescribe si las entradas cambiaron, para que
  // `git diff --exit-code` en CI no se ensucie con cada corrida.
  const rutaCatalogo = join(raiz, 'catalog.json')
  const previo = existsSync(rutaCatalogo) ? JSON.parse(readFileSync(rutaCatalogo, 'utf8')) : null
  if (!previo || JSON.stringify(previo.entradas) !== JSON.stringify(entradas)) {
    writeFileSync(rutaCatalogo, JSON.stringify({ generado: new Date().toISOString(), entradas }, null, 2) + '\n')
  }

  for (const tipo of TIPOS) {
    const delTipo = entradas.filter(e => e.tipo === tipo)
    if (delTipo.length === 0 && !existsSync(join(raiz, tipo))) continue
    mkdirSync(join(raiz, tipo), { recursive: true })
    writeFileSync(join(raiz, tipo, 'README.md'), renderTipo(tipo, delTipo))
    for (const categoria of new Set(delTipo.map(e => e.categoria))) {
      writeFileSync(join(raiz, tipo, categoria, 'README.md'), renderCategoria(tipo, categoria, delTipo.filter(e => e.categoria === categoria)))
    }
  }

  const rutaRaiz = join(raiz, 'README.md')
  const actual = readFileSync(rutaRaiz, 'utf8')
  const nuevo = actual.replace(/<!-- catalogo:inicio -->[\s\S]*?<!-- catalogo:fin -->/, `<!-- catalogo:inicio -->\n${renderBloqueRaiz(entradas)}\n<!-- catalogo:fin -->`)
  writeFileSync(rutaRaiz, nuevo)

  mkdirSync(join(raiz, 'playground'), { recursive: true })
  writeFileSync(join(raiz, 'playground', 'registro.generado.tsx'), renderRegistro(entradas))
}
