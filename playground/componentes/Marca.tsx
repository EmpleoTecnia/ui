/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'

// El logo oficial de EmpleoTecnia, de los archivos de marca (public/brand), nunca
// redibujado. Van las dos versiones y el CSS muestra la que corresponde al modo
// (`.logo-claro` / `.logo-oscuro` en globals.css), así no hay parpadeo al cargar.
const PROPORCION = 420 / 154
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** Logo horizontal de EmpleoTecnia + "Librería UI" como contexto. */
export function Marca({ alto = 30 }: { alto?: number }) {
  const ancho = Math.round(alto * PROPORCION)
  return (
    <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="EmpleoTecnia · UI Library, home">
      <img src={`${BASE}/brand/logo-horizontal.png`} alt="EmpleoTecnia" width={ancho} height={alto} className="logo-claro w-auto" style={{ height: alto }} draggable={false} />
      <img src={`${BASE}/brand/logo-horizontal-blanco.png`} alt="EmpleoTecnia" width={ancho} height={alto} className="logo-oscuro w-auto" style={{ height: alto }} draggable={false} />
      <span className="h-5 w-px bg-ui-line" aria-hidden />
      <span className="font-ui-display text-[15px] font-semibold text-ui-ink-soft">UI Library</span>
    </Link>
  )
}
