import { notFound } from 'next/navigation'
import { porSlug, registro } from '../../../../../lib/registro'
import { Marco } from '../../../../../componentes/Marco'

export const dynamicParams = false
export function generateStaticParams() {
  return registro.map(e => ({ categoria: e.categoria, slug: e.slug }))
}

export default async function Detalle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = porSlug(slug)
  if (!e) notFound()
  return (
    <article className="space-y-6">
      <header>
        <p className="text-xs text-ui-ink-muted">{e.tipo} · {e.categoria}</p>
        <h1 className="font-ui-display text-2xl font-semibold">{e.nombre}</h1>
        <p className="mt-1 max-w-prose text-ui-ink-soft">{e.por_que_entro}</p>
        <p className="mt-2 flex gap-4 text-sm">
          <a href={e.url_github} className="text-ui-accent underline-offset-4 hover:underline">Ver en GitHub</a>
          {e.origen_url && <a href={e.origen_url} className="text-ui-accent underline-offset-4 hover:underline">Ver original en {e.origen_nombre || 'su sitio'} ↗</a>}
        </p>
      </header>
      {e.demos.map(d => <Marco key={d.nombre} titulo={d.nombre}>{d.render()}</Marco>)}
    </article>
  )
}
