'use client'
import { useState, type ReactNode } from 'react'
import { Code2, Eye } from 'lucide-react'
import { Copiar } from './Copiar'

type Archivo = { nombre: string; contenido: string }

/** Vista previa / Código. Los demos vienen ya renderizados desde el servidor. */
export function Vitrina({ nombres, paneles, archivos }: { nombres: string[]; paneles: ReactNode[]; archivos: Archivo[] }) {
  const [pestana, setPestana] = useState<'vista' | 'codigo'>('vista')
  const [demo, setDemo] = useState(0)
  const [archivo, setArchivo] = useState(0)

  const pest = (activa: boolean) =>
    `inline-flex h-9 items-center gap-1.5 border-b-2 px-1 text-sm font-medium transition-colors duration-(--ui-dur) ease-ui ${activa ? 'border-ui-accent text-ui-ink' : 'border-transparent text-ui-ink-muted hover:text-ui-ink'}`
  const pastilla = (activa: boolean) =>
    `h-7 rounded-full px-3 text-xs font-medium transition-colors duration-(--ui-dur) ease-ui ${activa ? 'bg-ui-ink text-ui-bg' : 'bg-ui-surface-2 text-ui-ink-soft hover:text-ui-ink'}`

  return (
    <section id="preview" className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-line">
        <div className="flex gap-5">
          <button type="button" className={pest(pestana === 'vista')} onClick={() => setPestana('vista')}><Eye size={15} aria-hidden /> Preview</button>
          {archivos.length > 0 && <button type="button" className={pest(pestana === 'codigo')} onClick={() => setPestana('codigo')}><Code2 size={15} aria-hidden /> Code</button>}
        </div>
        {pestana === 'vista' && nombres.length > 1 && (
          <div className="flex flex-wrap gap-1 pb-2">
            {nombres.map((n, i) => <button key={n} type="button" className={pastilla(i === demo)} onClick={() => setDemo(i)}>{n}</button>)}
          </div>
        )}
        {pestana === 'codigo' && archivos.length > 1 && (
          <div className="flex flex-wrap gap-1 pb-2">
            {archivos.map((a, i) => <button key={a.nombre} type="button" className={pastilla(i === archivo)} onClick={() => setArchivo(i)}>{a.nombre}</button>)}
          </div>
        )}
      </div>

      {pestana === 'vista' ? (
        <div className="mt-4 overflow-hidden rounded-ui-lg border border-ui-line bg-ui-bg punteado">
          <div className="grid min-h-[380px] place-items-center p-8 sm:p-12">
            {paneles[demo] ?? paneles[0]}
          </div>
        </div>
      ) : (
        <div className="relative mt-4 overflow-hidden rounded-ui-lg border border-ui-line bg-ui-surface">
          <div className="flex items-center justify-between border-b border-ui-line px-4 py-2">
            <span className="font-mono text-xs text-ui-ink-muted">{archivos[archivo]?.nombre}</span>
            <Copiar texto={archivos[archivo]?.contenido ?? ''} />
          </div>
          <pre className="max-h-[560px] overflow-auto p-4 text-[12.5px] leading-relaxed text-ui-ink-soft"><code>{archivos[archivo]?.contenido}</code></pre>
        </div>
      )}
    </section>
  )
}
