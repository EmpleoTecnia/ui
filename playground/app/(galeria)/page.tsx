import Link from 'next/link'
import { registro } from '../../lib/registro'
import { Marco } from '../../componentes/Marco'

export default function Indice() {
  if (registro.length === 0) return <p className="text-ui-ink-muted">Todavía no hay componentes adoptados.</p>
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {registro.map(e => (
        <Link key={e.slug} href={`/c/${e.categoria}/${e.slug}`} className="group">
          <Marco>{e.demos[0]?.render()}</Marco>
          <p className="mt-2 text-sm font-medium group-hover:text-ui-accent">{e.nombre}</p>
          <p className="text-xs text-ui-ink-muted">{e.categoria}</p>
        </Link>
      ))}
    </div>
  )
}
