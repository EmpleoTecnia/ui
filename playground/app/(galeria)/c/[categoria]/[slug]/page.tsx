import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { porSlug } from '../../../../../lib/registro'
import { fichas, fichaPorSlug, documentacion, codigoDe, capturaDe, type Seccion } from '../../../../../lib/fichas'
import { TIPOS, nombreCategoria } from '../../../../../lib/categorias'
import { Vitrina } from '../../../../../componentes/Vitrina'
import { Copiar } from '../../../../../componentes/Copiar'

export const dynamicParams = false
export function generateStaticParams() {
  return fichas.map(e => ({ categoria: e.categoria, slug: e.slug }))
}

const LICENCIAS: Record<string, string> = {
  'MIT': 'MIT', 'Apache-2.0': 'Apache 2.0', 'ISC': 'ISC', 'CC0': 'CC0', 'MIT+Commons-Clause': 'MIT + Commons Clause (not for resale)',
  'propia': 'Our own', 'desconocida': 'Not declared',
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ui-ink-muted">{titulo}</dt>
      <dd className="mt-1.5 text-sm text-ui-ink-soft">{children}</dd>
    </div>
  )
}

const chip = 'inline-block rounded-full border border-ui-line bg-ui-surface px-2 py-0.5 text-xs text-ui-ink-soft'

export default async function Detalle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = fichaPorSlug(slug)
  if (!e) notFound()
  const vivo = porSlug(slug)
  const { descripcion, html, secciones } = documentacion(e)
  const archivos = vivo ? codigoDe(e) : []
  const captura = capturaDe(e)
  const fecha = new Date(e.fecha + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  const indice: Seccion[] = [
    { id: 'preview', titulo: vivo ? 'Preview' : 'Screenshot' },
    ...secciones,
    { id: 'details', titulo: 'Details' },
  ]

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-12">
      <article className="min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ui-ink-muted">
          <Link href="/" className="hover:text-ui-ink">{TIPOS[e.tipo]}</Link>
          <ChevronRight size={12} aria-hidden />
          <span>{nombreCategoria(e.categoria)}</span>
        </nav>

        <header className="mt-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-ui-display text-3xl font-semibold tracking-tight text-ui-ink sm:text-4xl">{e.nombre}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${vivo ? 'bg-ui-accent/12 text-ui-accent' : 'bg-ui-surface-2 text-ui-ink-muted'}`}>{vivo ? 'Code ready' : 'Saved idea'}</span>
          </div>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ui-ink-soft">{descripcion}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {vivo && <Copiar texto={`/ui-usar ${e.slug}`} etiqueta={`Copy  /ui-usar ${e.slug}`} />}
            <a href={e.url_github} className="inline-flex h-8 items-center gap-1 rounded-ui border border-ui-line bg-ui-surface px-2.5 text-xs font-medium text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 hover:text-ui-ink">GitHub <ArrowUpRight size={13} aria-hidden /></a>
            {e.origen.url && <a href={e.origen.url} className="inline-flex h-8 items-center gap-1 rounded-ui border border-ui-line bg-ui-surface px-2.5 text-xs font-medium text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 hover:text-ui-ink">Original at {e.origen.nombre} <ArrowUpRight size={13} aria-hidden /></a>}
          </div>
        </header>

        <div className="mt-8">
          {vivo ? (
            <Vitrina nombres={vivo.demos.map(d => d.nombre)} paneles={vivo.demos.map(d => <div key={d.nombre} className="max-w-full">{d.render()}</div>)} archivos={archivos} />
          ) : (
            <section id="preview" className="scroll-mt-24 overflow-hidden rounded-ui-lg border border-ui-line bg-ui-bg">
              {captura ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={captura} alt={`Screenshot of ${e.nombre}`} className="mx-auto block max-w-full" />
              ) : <p className="p-8 text-sm text-ui-ink-muted">No screenshot.</p>}
              <p className="border-t border-ui-line bg-ui-surface px-4 py-2 text-xs text-ui-ink-muted">
                A saved idea, not ported yet. To see it working, <a href={e.origen.url} className="text-ui-accent underline-offset-4 hover:underline">open the original</a>.
              </p>
            </section>
          )}
        </div>

        {html && <div className="prosa mt-10" dangerouslySetInnerHTML={{ __html: html }} />}

        <section id="details" className="mt-12 scroll-mt-24 rounded-ui-lg border border-ui-line bg-ui-surface p-5 sm:p-6">
          <h2 className="font-ui-display text-lg font-semibold text-ui-ink">Details</h2>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            <Dato titulo="Source">
              {e.origen.url ? <a href={e.origen.url} className="text-ui-accent underline-offset-4 hover:underline">{e.origen.nombre}</a> : e.origen.nombre}
              {' · '}{LICENCIAS[e.origen.licencia] ?? e.origen.licencia}
            </Dato>
            <Dato titulo="Added">{fecha} · {e.agregado_por}</Dato>
            <Dato titulo="Tags"><span className="flex flex-wrap gap-1.5">{e.etiquetas.map(t => <span key={t} className={chip}>{t}</span>)}</span></Dato>
            <Dato titulo="Tokens used">
              {e.tokens.length ? <span className="flex flex-wrap gap-1.5">{e.tokens.map(t => <code key={t} className={`${chip} font-mono`}>{t}</code>)}</span> : '—'}
            </Dato>
            <Dato titulo="Dependencies">
              {e.dependencias?.length ? <span className="flex flex-wrap gap-1.5">{e.dependencias.map(d => <code key={d} className={`${chip} font-mono`}>{d}</code>)}</span> : 'None'}
            </Dato>
            <Dato titulo="Used in">{e.usado_en?.length ? e.usado_en.join(', ') : 'Not in any app yet'}</Dato>
          </dl>
        </section>
      </article>

      <aside className="hidden xl:block">
        <nav aria-label="On this page" className="sticky top-22 text-sm">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ui-ink-muted">On this page</p>
          <ul className="border-l border-ui-line">
            {indice.map(s => (
              <li key={s.id}><a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-3 text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui hover:border-ui-ink hover:text-ui-ink">{s.titulo}</a></li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  )
}
