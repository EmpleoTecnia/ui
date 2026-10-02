import type { ReactNode } from 'react'
import { Cabecera } from '../../componentes/Cabecera'
import { Lateral, type Grupo } from '../../componentes/Lateral'
import type { Indexado } from '../../componentes/Buscador'
import { fichas, rutaDe } from '../../lib/fichas'
import { TIPOS, nombreCategoria } from '../../lib/categorias'

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function grupos(): Grupo[] {
  const lista: Grupo[] = []
  for (const e of fichas) {
    let g = lista.find(x => x.tipo === e.tipo && x.categoria === e.categoria)
    if (!g) { g = { tipo: e.tipo, tipoNombre: TIPOS[e.tipo], categoria: e.categoria, nombre: nombreCategoria(e.categoria), entradas: [] }; lista.push(g) }
    g.entradas.push({ slug: e.slug, nombre: e.nombre, estado: e.estado, href: rutaDe(e) })
  }
  return lista
}

const indice: Indexado[] = fichas.map(e => ({
  slug: e.slug, nombre: e.nombre, categoria: e.categoria, estado: e.estado, href: rutaDe(e),
  texto: normalizar([e.nombre, e.slug, e.categoria, nombreCategoria(e.categoria), ...e.etiquetas, ...e.sirve_para, e.por_que_entro].join(' ')),
}))

export default function GaleriaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Cabecera indice={indice} />
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-8 pr-2">
            <Lateral grupos={grupos()} />
          </div>
        </aside>
        <main className="min-w-0 py-8">{children}</main>
      </div>
    </>
  )
}
