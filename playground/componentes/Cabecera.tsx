import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Buscador, type Indexado } from './Buscador'
import { Selector } from './Selector'
import { Marca } from './Marca'

const REPO = 'https://github.com/EmpleoTecnia/ui'

export function Cabecera({ indice }: { indice: Indexado[] }) {
  const enlace = 'text-sm font-medium text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui hover:text-ui-ink'
  return (
    <header className="sticky top-0 z-30 border-b border-ui-line bg-ui-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Marca />
        <nav className="hidden items-center gap-5 md:flex" aria-label="Sections">
          <Link href="/#components" className={enlace}>Components</Link>
          <Link href="/#patterns" className={enlace}>Patterns</Link>
          <a href={`${REPO}#readme`} className={enlace}>How to add</a>
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
