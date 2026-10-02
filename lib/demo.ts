import type { ReactNode } from 'react'

/** Un ejemplo que el playground renderiza y el capturador fotografía.
 *  Cada componente adoptado exporta `Demo[]` por defecto desde su `demo.tsx`.
 *  El primero de la lista es el que sale en preview.png y preview.webp. */
export type Demo = {
  nombre: string
  render: () => ReactNode
}
