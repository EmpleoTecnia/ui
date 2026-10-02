import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Buscador, type Indexado } from './Buscador'
import { Selector } from './Selector'

const REPO = 'https://github.com/EmpleoTecnia/ui'

export function Cabecera({ indice }: { indice: Indexado[] }) {
  const enlace = 'text-sm font-medium text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui hover:text-ui-ink'
  return (
    <header className="sticky top-0 z-30 border-b border-ui-line bg-ui-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-ui-display text-[15px] font-semibold text-ui-ink">
          <span className="grid size-6 place-items-center rounded-[7px] bg-ui-accent text-[11px] font-bold text-ui-accent-ink">UI</span>
          Librería UI
        </Link>
        <nav className="hidden items-center gap-5 md:flex" aria-label="Secciones">
          <Link href="/#componentes" className={enlace}>Componentes</Link>
          <Link href="/#patrones" className={enlace}>Patrones</Link>
          <a href={`${REPO}#readme`} className={enlace}>Cómo agregar</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block"><Buscador indice={indice} /></div>
          <Selector />
          <a href={REPO} className="inline-flex h-9 items-center gap-1 rounded-ui border border-ui-line bg-ui-surface px-3 text-sm font-medium text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 hover:text-ui-ink">
            GitHub <ArrowUpRight size={14} aria-hidden />
          </a>
        </div>
      </div>
    </header>
  )
}
