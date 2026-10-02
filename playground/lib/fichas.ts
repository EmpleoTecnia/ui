// Sólo en el servidor (se corre al construir el sitio): lee catalog.json, el README y el
// código de cada entrada desde el repo. El sitio es estático, así que esto nunca corre
// en el navegador.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { marked } from 'marked'
import type { Tipo } from './categorias'

export type Ficha = {
  slug: string
  nombre: string
  tipo: Tipo
  categoria: string
  estado: 'referencia' | 'adoptado' | 'retirado'
  origen: { nombre: string; url: string; licencia: string }
  publicable: boolean
  por_que_entro: string
  sirve_para: string[]
  no_sirve_para?: string[]
  etiquetas: string[]
  tokens: string[]
  dependencias?: string[]
  usado_en?: string[]
  agregado_por: string
  fecha: string
  ruta: string
  url_github: string
  preview_png: string | null
  preview_webp: string | null
  archivos_codigo: string[]
}

export const raiz = existsSync(join(process.cwd(), 'catalog.json')) ? process.cwd() : join(process.cwd(), '..')
const REPO_RAW = 'https://raw.githubusercontent.com/EmpleoTecnia/ui/main'

const catalogo = JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8')) as { entradas: Ficha[] }

/** Todas las entradas vivas, en el orden del catálogo (tipo, categoría, nombre). */
export const fichas: Ficha[] = catalogo.entradas.filter(e => e.estado !== 'retirado')
export const fichaPorSlug = (slug: string) => fichas.find(e => e.slug === slug)
export const rutaDe = (e: Ficha) => `/c/${e.categoria}/${e.slug}/`

/** La captura, servida desde GitHub: el sitio no copia imágenes. */
export const capturaDe = (e: Ficha) =>
  e.preview_webp ? `${REPO_RAW}/${e.preview_webp}` : e.preview_png ? `${REPO_RAW}/${e.preview_png}` : null

export type Seccion = { id: string; titulo: string }

const idDe = (texto: string) =>
  texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const sinMarcas = (md: string) => md.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').trim()

/** El README de la entrada: la descripción (primer párrafo), el resto como HTML y sus secciones. */
export function documentacion(e: Ficha): { descripcion: string; html: string; secciones: Seccion[] } {
  const archivo = join(raiz, e.ruta, 'README.md')
  if (!existsSync(archivo)) return { descripcion: e.por_que_entro, html: '', secciones: [] }
  const md = readFileSync(archivo, 'utf8').replace(/^# .*\n/, '').trim()
  const corte = md.search(/\n\s*\n/)
  const descripcion = sinMarcas(corte === -1 ? md : md.slice(0, corte)).replace(/\s+/g, ' ')
  const resto = corte === -1 ? '' : md.slice(corte).trim()
  const secciones: Seccion[] = []
  const html = (marked.parse(resto, { async: false }) as string).replace(/<h2>(.*?)<\/h2>/g, (_, t: string) => {
    const titulo = t.replace(/<[^>]+>/g, '')
    const id = idDe(titulo)
    secciones.push({ id, titulo })
    return `<h2 id="${id}">${t}</h2>`
  })
  return { descripcion, html, secciones }
}

/** Los archivos de código de un adoptado, con su contenido. */
export function codigoDe(e: Ficha): { nombre: string; contenido: string }[] {
  return (e.archivos_codigo ?? []).map(nombre => ({ nombre, contenido: readFileSync(join(raiz, e.ruta, nombre), 'utf8') }))
}
