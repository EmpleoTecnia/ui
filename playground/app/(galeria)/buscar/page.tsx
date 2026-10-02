'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { porSlug } from '../../../lib/registro'
import { Marco } from '../../../componentes/Marco'

/** /buscar?slugs=a,b,c: los candidatos de una búsqueda, uno debajo del otro. */
function Resultados() {
  const slugs = useSearchParams().get('slugs') ?? ''
  const entradas = slugs.split(',').map(s => porSlug(s.trim())).filter(e => e !== undefined)
  if (entradas.length === 0) return <p className="text-ui-ink-muted">Pass <code>?slugs=a,b,c</code> with the candidates.</p>
  return (
    <div className="space-y-10">
      {entradas.map(e => (
        <section key={e.slug}>
          <h2 className="mb-1 font-ui-display text-lg font-semibold">{e.nombre}</h2>
          <p className="mb-3 text-sm text-ui-ink-soft">{e.por_que_entro}</p>
          <Marco>{e.demos[0]?.render()}</Marco>
        </section>
      ))}
    </div>
  )
}

export default function Buscar() {
  return <Suspense fallback={null}><Resultados /></Suspense>
}
