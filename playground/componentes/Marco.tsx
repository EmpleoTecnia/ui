import type { ReactNode } from 'react'

/** La caja donde se ve cada demo: fondo de la app, borde, y aire alrededor. */
export function Marco({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <section className="rounded-ui-lg border border-ui-line bg-ui-surface">
      {titulo && <h3 className="border-b border-ui-line px-4 py-2 text-xs font-medium text-ui-ink-muted">{titulo}</h3>}
      <div className="grid min-h-48 place-items-center bg-ui-bg p-8">{children}</div>
    </section>
  )
}
