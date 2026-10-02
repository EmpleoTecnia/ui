// Generado por scripts/catalogar.mjs. No editar a mano.
import type { Demo } from '../lib/demo'
import d0 from '../components/feedback/status-mark/demo'
import d1 from '../components/forms/password-strength/demo'

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
  { slug: "status-mark", nombre: "Marca de estado", tipo: "components", categoria: "feedback", por_que_entro: "Me gustó todo: el mismo círculo que se transforma de punteado a girando a tilde o cruz, y que tacha la etiqueta al terminar.", url_github: "https://github.com/EmpleoTecnia/ui/tree/main/components/feedback/status-mark", demos: d0 },
  { slug: "password-strength", nombre: "Fuerza de contraseña", tipo: "components", categoria: "forms", por_que_entro: "Me gustó todo como está armado: las cuatro barras que se llenan, los requisitos que se van tildando con cuántos caracteres faltan, y el ojo que se tacha para mostrar la contraseña.", url_github: "https://github.com/EmpleoTecnia/ui/tree/main/components/forms/password-strength", demos: d1 },
]
