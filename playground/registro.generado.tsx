// Generado por scripts/catalogar.mjs. No editar a mano.
import type { Demo } from '../lib/demo'
import d0 from '../components/botones/boton-iman/demo'

export type Entrada = {
  slug: string
  nombre: string
  tipo: 'components' | 'patterns'
  categoria: string
  por_que_entro: string
  url_github: string
  demos: Demo[]
}

export const registro: Entrada[] = [
  { slug: "boton-iman", nombre: "Botón imán", tipo: "components", categoria: "botones", por_que_entro: "Se corre hacia el cursor y vuelve con un resorte: se siente vivo sin gritar, y en el celular es un botón común.", url_github: "https://github.com/EmpleoTecnia/ui/tree/main/components/botones/boton-iman", demos: d0 },
]
