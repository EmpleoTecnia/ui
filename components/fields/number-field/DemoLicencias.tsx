'use client'
import { useState } from 'react'
import { NumberField } from './NumberField'
import { AnimatedCounter } from './AnimatedCounter'

const PRECIO = 4500
const pesos = (n: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
const licencias = (n: number) => (n === 1 ? ' licencia' : ' licencias')

/** Licencias de un equipo con el total al lado: el contador gira cada vez que se agrega o se saca una. */
export function DemoLicencias() {
  const [cantidad, setCantidad] = useState(3)
  return (
    <div className="grid w-[360px] gap-5 rounded-ui-lg border border-ui-line bg-ui-surface p-6 font-ui-text">
      <NumberField label="Licencias" value={cantidad} onValueChange={setCantidad} min={1} max={10} suffix={licencias} description={`$ ${pesos(PRECIO)} por licencia al mes, hasta 10 por equipo`} scrub />
      <div className="flex items-end justify-between gap-4 border-t border-ui-line pt-4">
        <span className="text-sm text-ui-ink-muted">Total por mes</span>
        <AnimatedCounter value={cantidad * PRECIO} prefix="$ " className="text-2xl" />
      </div>
    </div>
  )
}

/** El total va en la descripción: las palabras que cambian suben y se enfocan, las demás se quedan quietas. */
export function DemoTotalEnDescripcion() {
  const [cantidad, setCantidad] = useState(8)
  return (
    <div className="w-[300px]">
      <NumberField label="Puestos" value={cantidad} onValueChange={setCantidad} min={1} max={50} suffix={n => (n === 1 ? ' puesto' : ' puestos')} description={`$ ${pesos(cantidad * 1250)} por mes, facturado mensualmente`} />
    </div>
  )
}
