import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { porSlug } from '../../../lib/registro'

type Modo = 'claro' | 'oscuro'

function Panel({ modo, ancho, children }: { modo: Modo; ancho: number; children: ReactNode }) {
  return (
    <div data-tema="muestra" data-modo={modo} style={{ width: ancho, height: '100%' }} className="grid place-items-center bg-ui-bg p-10 font-ui-text text-ui-ink">
      {children}
    </div>
  )
}

/** /captura/<slug>: 1200×600 con claro y oscuro lado a lado.
 *  /captura/<slug>?modo=claro: un solo panel que ocupa todo (para el video). */
export default async function Captura({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ modo?: Modo }> }) {
  const { slug } = await params
  const { modo } = await searchParams
  const e = porSlug(slug)
  if (!e) notFound()
  const demo = e.demos[0]?.render()
  if (modo) return <div style={{ width: '100vw', height: '100vh' }}><Panel modo={modo} ancho={9999}>{demo}</Panel></div>
  return (
    <div style={{ width: 1200, height: 600, display: 'flex' }}>
      <Panel modo="claro" ancho={600}>{demo}</Panel>
      <Panel modo="oscuro" ancho={600}>{demo}</Panel>
    </div>
  )
}
