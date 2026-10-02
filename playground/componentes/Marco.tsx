import type { ReactNode } from 'react'

/** La caja donde se ve un demo: fondo de la app con un punteado suave, borde y aire. */
export function Marco({ children, titulo, alto = 'min-h-48', className = '' }: { children: ReactNode; titulo?: string; alto?: string; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-ui-lg border border-ui-line bg-ui-surface ${className}`}>
      {titulo && <h3 className="border-b border-ui-line px-4 py-2 text-xs font-medium text-ui-ink-muted">{titulo}</h3>}
      <div className={`grid ${alto} place-items-center bg-ui-bg p-8 punteado`}>{children}</div>
    </section>
  )
}
