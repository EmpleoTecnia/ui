import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { porSlug } from '../../lib/registro'
import { fichas, rutaDe, capturaDe, type Ficha } from '../../lib/fichas'
import { TIPOS, nombreCategoria, type Tipo } from '../../lib/categorias'

function Tarjeta({ e }: { e: Ficha }) {
  const vivo = porSlug(e.slug)
  const captura = capturaDe(e)
  return (
    <Link href={rutaDe(e)} className="group flex flex-col overflow-hidden rounded-ui-lg border border-ui-line bg-ui-surface transition-colors duration-(--ui-dur) ease-ui hover:border-ui-accent">
      <div className="grid h-56 place-items-center overflow-hidden bg-ui-bg p-6 punteado">
        {vivo ? (
          <div className="pointer-events-none max-w-full scale-90 origin-center">{vivo.demos[0]?.render()}</div>
        ) : captura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captura} alt="" className="max-h-full max-w-full rounded-ui object-contain" loading="lazy" />
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-3 border-t border-ui-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ui-ink group-hover:text-ui-accent">{e.nombre}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ui-ink-muted">{e.por_que_entro}</p>
        </div>
        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${e.estado === 'adoptado' ? 'bg-ui-accent/12 text-ui-accent' : 'bg-ui-surface-2 text-ui-ink-muted'}`}>
          {e.estado === 'adoptado' ? 'Ready' : 'Idea'}
        </span>
      </div>
    </Link>
  )
}

export default function Indice() {
  const adoptados = fichas.filter(e => e.estado === 'adoptado').length
  const tipos = (Object.keys(TIPOS) as Tipo[]).filter(t => fichas.some(e => e.tipo === t))
  return (
    <div className="space-y-14">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-ui-accent">EmpleoTecnia</p>
        <h1 className="mt-2 font-ui-display text-3xl font-semibold tracking-tight text-ui-ink sm:text-4xl">UI Library</h1>
        <p className="mt-3 text-base leading-relaxed text-ui-ink-soft">
          The interface pieces we liked, ported to our stack and written against a token contract:
          every app paints them with its own colors without losing their character. Switch the app at the top right to see how they look.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ui-ink-muted">
          <span><b className="font-semibold text-ui-ink">{fichas.length}</b> {fichas.length === 1 ? 'piece' : 'pieces'}</span>
          <span><b className="font-semibold text-ui-ink">{adoptados}</b> with code ready</span>
          <span><b className="font-semibold text-ui-ink">{fichas.length - adoptados}</b> {fichas.length - adoptados === 1 ? 'saved idea' : 'saved ideas'}</span>
        </p>
      </header>

      {fichas.length === 0 && <p className="text-ui-ink-muted">Nothing yet. Run <code>node scripts/agregar.mjs</code> with the first URL.</p>}

      {tipos.map(tipo => {
        const categorias = [...new Set(fichas.filter(e => e.tipo === tipo).map(e => e.categoria))]
        return (
          <section key={tipo} id={tipo} className="scroll-mt-20 space-y-10">
            <h2 className="font-ui-display text-xl font-semibold text-ui-ink">{TIPOS[tipo]}</h2>
            {categorias.map(c => {
              const del = fichas.filter(e => e.tipo === tipo && e.categoria === c)
              return (
                <div key={c}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-ui-ink">{nombreCategoria(c)} <span className="ml-1 font-normal text-ui-ink-muted">{del.length}</span></h3>
                    <a href={`https://github.com/EmpleoTecnia/ui/tree/main/${tipo}/${c}`} className="inline-flex items-center gap-1 text-xs text-ui-ink-muted hover:text-ui-ink">Folder on GitHub <ArrowUpRight size={12} aria-hidden /></a>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {del.map(e => <Tarjeta key={e.slug} e={e} />)}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
