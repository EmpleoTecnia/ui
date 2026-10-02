'use client'
import { useEffect, useState } from 'react'
import { ChevronDown, Moon, Sun } from 'lucide-react'
import { TEMAS, type Tema, type Modo } from '../lib/registro'

const NOMBRES: Record<Tema, string> = { muestra: 'Sample', mi: 'MI', etconecta: 'ET Conecta', campus: 'Campus', proyectos: 'Proyectos' }

function aplicar(tema: Tema, modo: Modo) {
  document.documentElement.dataset.tema = tema
  document.documentElement.dataset.modo = modo
  try { localStorage.setItem('ui-tema', tema); localStorage.setItem('ui-modo', modo) } catch {}
}

/** Con qué app y en qué modo se ven los componentes. Se recuerda en el navegador. */
export function Selector() {
  const [tema, setTema] = useState<Tema>('muestra')
  const [modo, setModo] = useState<Modo>('claro')

  useEffect(() => {
    try {
      const t = localStorage.getItem('ui-tema') as Tema | null
      const m = localStorage.getItem('ui-modo') as Modo | null
      if (t && TEMAS.includes(t)) setTema(t)
      if (m === 'claro' || m === 'oscuro') setModo(m)
    } catch {}
  }, [])
  useEffect(() => { aplicar(tema, modo) }, [tema, modo])

  const control = 'h-9 rounded-ui border border-ui-line bg-ui-surface text-sm text-ui-ink transition-colors duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent'

  return (
    <div className="flex items-center gap-2">
      <label className="relative">
        <span className="sr-only">View with the colors of</span>
        <select value={tema} onChange={e => setTema(e.target.value as Tema)} className={`${control} appearance-none pl-3 pr-8`}>
          {TEMAS.map(t => <option key={t} value={t}>{NOMBRES[t]}</option>)}
        </select>
        <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ui-ink-muted" />
      </label>
      <button
        type="button"
        onClick={() => setModo(modo === 'claro' ? 'oscuro' : 'claro')}
        aria-label={modo === 'claro' ? 'Switch to dark mode' : 'Switch to light mode'}
        title={modo === 'claro' ? 'Dark mode' : 'Light mode'}
        className={`${control} grid w-9 place-items-center`}
      >
        {modo === 'claro' ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
      </button>
    </div>
  )
}
