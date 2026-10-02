'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type Grupo = {
  tipo: string
  tipoNombre: string
  categoria: string
  nombre: string
  entradas: { slug: string; nombre: string; estado: string; href: string }[]
}

/** Las categorías con sus piezas. Marca la que se está viendo. */
export function Lateral({ grupos }: { grupos: Grupo[] }) {
  const ruta = usePathname()
  const tipos = [...new Set(grupos.map(g => g.tipo))]
  return (
    <nav aria-label="Catalog" className="text-sm">
      {tipos.map(tipo => (
        <div key={tipo} className="mb-6">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ui-ink-muted">{grupos.find(g => g.tipo === tipo)!.tipoNombre}</p>
          {grupos.filter(g => g.tipo === tipo).map(g => (
            <div key={g.categoria} className="mb-3">
              <p className="flex items-center justify-between px-2 py-1 font-medium text-ui-ink">
                {g.nombre}
                <span className="rounded-full bg-ui-surface-2 px-1.5 text-[11px] font-normal text-ui-ink-muted">{g.entradas.length}</span>
              </p>
              <ul className="ml-2 border-l border-ui-line">
                {g.entradas.map(e => {
                  const actual = ruta === e.href || ruta === e.href.replace(/\/$/, '')
                  return (
                    <li key={e.slug}>
                      <Link
                        href={e.href}
                        aria-current={actual ? 'page' : undefined}
                        className={`-ml-px flex items-center justify-between gap-2 border-l py-1 pl-3 pr-2 transition-colors duration-(--ui-dur) ease-ui ${actual ? 'border-ui-accent text-ui-accent' : 'border-transparent text-ui-ink-soft hover:border-ui-line hover:text-ui-ink'}`}
                      >
                        <span className="truncate">{e.nombre}</span>
                        {e.estado === 'referencia' && <span className="shrink-0 text-[10px] uppercase tracking-wide text-ui-ink-muted">idea</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </nav>
  )
}
