'use client'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** Copia un texto al portapapeles y lo confirma un instante. */
export function Copiar({ texto, etiqueta = 'Copiar', className = '' }: { texto: string; etiqueta?: string; className?: string }) {
  const [listo, setListo] = useState(false)
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setListo(true); setTimeout(() => setListo(false), 1400) } catch {}
  }
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={listo ? 'Copiado' : etiqueta}
      title={etiqueta}
      className={`inline-flex h-8 items-center gap-1.5 rounded-ui border border-ui-line bg-ui-surface px-2.5 text-xs font-medium text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 hover:text-ui-ink ${className}`}
    >
      {listo ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {listo ? 'Copiado' : etiqueta}
    </button>
  )
}
