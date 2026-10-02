'use client'
import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export type Seccion = { id: string; titulo: string }

/** "On this page": marca la sección que está a la vista mientras se baja. */
export function Indice({ secciones }: { secciones: Seccion[] }) {
  const [activa, setActiva] = useState(secciones[0]?.id ?? '')

  useEffect(() => {
    const titulos = secciones.map(s => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null)
    if (titulos.length === 0) return
    // La sección activa es la última cuyo título ya pasó la línea de lectura (un cuarto de la pantalla).
    const elegir = () => {
      const linea = window.innerHeight * 0.25
      let actual = titulos[0].id
      for (const t of titulos) if (t.getBoundingClientRect().top <= linea) actual = t.id
      // Al fondo de la página, la última: si no, nunca se marca.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) actual = titulos[titulos.length - 1].id
      setActiva(actual)
    }
    elegir()
    window.addEventListener('scroll', elegir, { passive: true })
    window.addEventListener('resize', elegir)
    return () => { window.removeEventListener('scroll', elegir); window.removeEventListener('resize', elegir) }
  }, [secciones])

  return (
    <nav aria-label="On this page" className="sticky top-22 text-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ui-ink-muted">On this page</p>
      <ul className="border-l border-ui-line">
        {secciones.map(s => {
          const es = s.id === activa
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={es ? 'location' : undefined}
                className={`-ml-px block border-l py-1 pl-3 transition-colors duration-(--ui-dur) ease-ui ${es ? 'border-ui-ink font-medium text-ui-ink' : 'border-transparent text-ui-ink-soft hover:border-ui-line hover:text-ui-ink'}`}
              >
                {s.titulo}
              </a>
            </li>
          )
        })}
      </ul>
      <a href="#top" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="mt-5 inline-flex items-center gap-1 text-xs text-ui-ink-muted transition-colors duration-(--ui-dur) ease-ui hover:text-ui-ink">
        Back to top <ArrowUp size={12} aria-hidden />
      </a>
    </nav>
  )
}
