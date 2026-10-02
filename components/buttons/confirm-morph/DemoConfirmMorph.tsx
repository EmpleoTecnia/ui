'use client'
import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Archive, Trash2 } from 'lucide-react'
import { ConfirmMorph, type ConfirmMorphState } from './ConfirmMorph'

const esperar = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

type Persona = { id: number; nombre: string; detalle: string }
const PERSONAS: Persona[] = [
  { id: 1, nombre: 'Lucía Fernández', detalle: 'Analista de datos · postuló ayer' },
  { id: 2, nombre: 'Martín Gómez', detalle: 'Desarrollador front-end · hace 3 días' },
  { id: 3, nombre: 'Sofía Pereyra', detalle: 'Diseñadora UX · hace una semana' },
]

/** Una lista de postulantes: cada fila tiene su botón. Al eliminar, la fila queda tachada mientras se puede deshacer;
 *  cuando el resultado vence sin deshacer, la fila se va de verdad. */
export function DemoLista() {
  const reduced = useReducedMotion()
  const [personas, setPersonas] = useState(PERSONAS)
  const [eliminadas, setEliminadas] = useState<number[]>([])
  const eliminadasRef = useRef<number[]>([])
  const marcar = (id: number, si: boolean) => {
    eliminadasRef.current = si ? [...eliminadasRef.current, id] : eliminadasRef.current.filter(x => x !== id)
    setEliminadas(eliminadasRef.current)
  }
  const alCambiar = (id: number, estado: ConfirmMorphState) => {
    if (estado !== 'idle' || !eliminadasRef.current.includes(id)) return
    marcar(id, false)
    setPersonas(lista => lista.filter(p => p.id !== id))
  }
  return (
    <div className="w-[380px] rounded-ui-lg border border-ui-line bg-ui-surface px-5 py-3">
      <p className="py-2 text-xs font-medium text-ui-ink-muted">Postulantes guardados</p>
      <ul className="grid">
        <AnimatePresence initial={false}>
          {personas.map(p => {
            const fuera = eliminadas.includes(p.id)
            return (
              <motion.li key={p.id} className="overflow-hidden" initial={false} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0 }}>
                <div className="flex items-center justify-between gap-3 border-t border-ui-line py-3">
                  <div className={`min-w-0 transition-opacity duration-(--ui-dur) ease-ui ${fuera ? 'opacity-50' : ''}`}>
                    <p className={`truncate text-sm font-medium text-ui-ink ${fuera ? 'line-through' : ''}`}>{p.nombre}</p>
                    <p className="truncate text-xs text-ui-ink-muted">{p.detalle}</p>
                  </div>
                  <ConfirmMorph
                    label="Eliminar"
                    icon={<Trash2 strokeWidth={1.75} />}
                    prompt={`¿Eliminar a ${p.nombre.split(' ')[0]}?`}
                    onConfirm={async () => { await esperar(600); marcar(p.id, true) }}
                    onUndo={async () => { await esperar(400); marcar(p.id, false) }}
                    onStateChange={estado => alCambiar(p.id, estado)}
                    resultTimeout={3000}
                  />
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}

/** La barra de una tabla con selección: pregunta por los seleccionados y termina sin deshacer. */
export function DemoSeleccion() {
  return (
    <div className="flex w-[380px] items-center justify-between gap-3 rounded-ui-lg border border-ui-line bg-ui-surface px-5 py-3">
      <p className="text-sm text-ui-ink-soft"><span className="font-medium text-ui-ink">2 de 5</span> seleccionados</p>
      <ConfirmMorph label="Eliminar" prompt="¿Eliminar 2 archivos?" pendingLabel="Eliminando…" doneLabel="Eliminados" onConfirm={() => esperar(800)} />
    </div>
  )
}

/** Falla la primera vez y sale bien al reintentar. */
export function DemoFalla() {
  const intentos = useRef(0)
  return (
    <ConfirmMorph
      label="Quitar acceso"
      confirmLabel="Quitar"
      pendingLabel="Quitando…"
      doneLabel="Acceso quitado"
      prompt="¿Quitar el acceso a Martín?"
      onConfirm={async () => { await esperar(700); if (intentos.current++ === 0) throw new Error('simulado') }}
      onUndo={() => esperar(400)}
    />
  )
}

/** Tono neutro: importante pero reversible. */
export function DemoNeutro() {
  return (
    <ConfirmMorph
      tone="neutral"
      label="Archivar"
      icon={<Archive strokeWidth={1.75} />}
      prompt="¿Archivar la oferta?"
      confirmLabel="Archivar"
      pendingLabel="Archivando…"
      doneLabel="Archivada"
      undoingLabel="Volviendo…"
      onConfirm={() => esperar(600)}
      onUndo={() => esperar(400)}
    />
  )
}
