'use client'
import { useEffect, useState } from 'react'
import { TEMAS, type Tema, type Modo } from '../lib/registro'

function aplicar(tema: Tema, modo: Modo) {
  document.documentElement.dataset.tema = tema
  document.documentElement.dataset.modo = modo
  try { localStorage.setItem('ui-tema', tema); localStorage.setItem('ui-modo', modo) } catch {}
}

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

  const boton = (activo: boolean) =>
    `rounded-ui px-3 py-1 text-xs font-medium transition-colors duration-(--ui-dur) ease-ui ${activo ? 'bg-ui-accent text-ui-accent-ink' : 'text-ui-ink-soft hover:bg-ui-surface-2'}`

  return (
    <div className="flex flex-wrap items-center gap-1">
      {TEMAS.map(t => <button key={t} className={boton(tema === t)} onClick={() => setTema(t)}>{t}</button>)}
      <span className="mx-2 h-4 w-px bg-ui-line" />
      <button className={boton(modo === 'claro')} onClick={() => setModo('claro')}>claro</button>
      <button className={boton(modo === 'oscuro')} onClick={() => setModo('oscuro')}>oscuro</button>
    </div>
  )
}
