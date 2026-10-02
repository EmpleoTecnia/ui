'use client'
import { useState } from 'react'
import { Archive } from 'lucide-react'
import { HoldToConfirm } from './HoldToConfirm'

/** La ficha de una oferta con la consecuencia a la vista, el botón y una pista que cambia mientras se aprieta. */
export function DemoEliminarOferta() {
  const [eliminada, setEliminada] = useState(false)
  const [apretando, setApretando] = useState(false)
  const pista = eliminada ? 'La oferta ya no está.' : apretando ? 'Seguí apretando…' : 'Mantené 1,2 segundos, o Espacio.'
  return (
    <div className="w-[380px] rounded-ui-lg border border-ui-line bg-ui-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ui-ink">Analista de datos Sr.</p>
          <p className="text-xs text-ui-ink-muted">Oferta · 12 postulaciones</p>
        </div>
        <span className={`rounded-full border border-ui-line px-2 py-0.5 text-xs text-ui-ink-soft transition-opacity duration-(--ui-dur) ease-ui ${eliminada ? 'opacity-40' : ''}`}>{eliminada ? 'Eliminada' : 'Activa'}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ui-ink-soft">Al eliminarla se borran la oferta, sus postulaciones y los enlaces compartidos.</p>
      <div className="mt-4 flex items-center gap-3">
        <HoldToConfirm label="Mantené apretado para eliminar la oferta" confirmedLabel="Oferta eliminada" confirmed={eliminada} onConfirm={() => setEliminada(true)} onHoldChange={setApretando} />
      </div>
      <p className="mt-2.5 text-xs text-ui-ink-muted" aria-live="polite">
        {pista}
        {eliminada && <> <button type="button" className="cursor-pointer text-ui-accent underline-offset-2 hover:underline" onClick={() => setEliminada(false)}>Restaurar</button></>}
      </p>
    </div>
  )
}

/** Tono neutro, para algo importante pero que se puede revertir. */
export function DemoNeutro() {
  return <HoldToConfirm tone="neutral" icon={<Archive strokeWidth={1.75} />} label="Mantené para archivar" confirmedLabel="Archivada" onConfirm={() => {}} />
}

/** Dos segundos: para cuando el error cuesta más. */
export function DemoLargo() {
  return <HoldToConfirm label="Mantené 2 segundos para quitar el acceso" confirmedLabel="Acceso quitado" duration={2000} onConfirm={() => {}} />
}
