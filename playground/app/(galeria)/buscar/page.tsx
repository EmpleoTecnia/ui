import { porSlug } from '../../../lib/registro'
import { Marco } from '../../../componentes/Marco'

export default async function Buscar({ searchParams }: { searchParams: Promise<{ slugs?: string }> }) {
  const { slugs = '' } = await searchParams
  const entradas = slugs.split(',').map(s => porSlug(s.trim())).filter(e => e !== undefined)
  if (entradas.length === 0) return <p className="text-ui-ink-muted">Pasá <code>?slugs=a,b,c</code> con los candidatos.</p>
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
