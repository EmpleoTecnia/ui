import type { ReactNode } from 'react'
import Link from 'next/link'
import { Selector } from '../../componentes/Selector'

export default function GaleriaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-ui-line bg-ui-surface/90 px-6 py-3 backdrop-blur">
        <Link href="/" className="font-ui-display text-sm font-semibold">Librería UI</Link>
        <Selector />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  )
}
