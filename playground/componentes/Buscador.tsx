'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { nombreCategoria } from '../lib/categorias'

export type Indexado = { slug: string; nombre: string; categoria: string; estado: string; href: string; texto: string }

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Searches name, tags and uses. Ctrl+K focuses it. */
export function Buscador({ indice }: { indice: Indexado[] }) {
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const campo = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); campo.current?.focus() }
    }
    window.addEventListener('keydown', atajo)
    return () => window.removeEventListener('keydown', atajo)
  }, [])

  const palabras = normalizar(q).split(/\s+/).filter(Boolean)
  const resultados = palabras.length === 0 ? [] : indice.filter(e => palabras.every(p => e.texto.includes(p))).slice(0, 8)

  function ir(e: Indexado) {
    setQ(''); setAbierto(false)
    router.push(e.href)
  }

  return (
    <div className="relative w-full max-w-xs">
      <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-ink-muted" />
      <input
        ref={campo}
        type="search"
        value={q}
        placeholder="Search components…"
        aria-label="Search"
        autoComplete="off"
        onChange={e => { setQ(e.target.value); setAbierto(true); setActivo(0) }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, resultados.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && resultados[activo]) ir(resultados[activo])
          if (e.key === 'Escape') { setQ(''); campo.current?.blur() }
        }}
        className="h-9 w-full rounded-ui border border-ui-line bg-ui-surface pl-9 pr-14 text-sm text-ui-ink placeholder:text-ui-ink-muted transition-colors duration-(--ui-dur) ease-ui focus:border-ui-accent focus:outline-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[4px] border border-ui-line px-1.5 py-0.5 font-sans text-[10px] text-ui-ink-muted">Ctrl K</kbd>
      {abierto && q && (
        <ul role="listbox" className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-ui-lg border border-ui-line bg-ui-surface py-1 shadow-xl shadow-black/10">
          {resultados.length === 0 && <li className="px-3 py-2 text-sm text-ui-ink-muted">Nothing for “{q}”.</li>}
          {resultados.map((e, i) => (
            <li key={e.slug} role="option" aria-selected={i === activo}>
              <button type="button" onMouseDown={() => ir(e)} onMouseEnter={() => setActivo(i)} className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === activo ? 'bg-ui-surface-2 text-ui-ink' : 'text-ui-ink-soft'}`}>
                <span>{e.nombre}</span>
                <span className="text-xs text-ui-ink-muted">{nombreCategoria(e.categoria)}{e.estado === 'referencia' ? ' · idea' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
