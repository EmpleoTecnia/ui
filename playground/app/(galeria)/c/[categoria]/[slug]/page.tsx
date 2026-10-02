import { notFound } from 'next/navigation'
import { porSlug, registro } from '../../../../../lib/registro'
import { Marco } from '../../../../../componentes/Marco'

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
        <a href={e.url_github} className="mt-2 inline-block text-sm text-ui-accent underline-offset-4 hover:underline">Ver en GitHub</a>
      </header>
      {e.demos.map(d => <Marco key={d.nombre} titulo={d.nombre}>{d.render()}</Marco>)}
    </article>
  )
}
