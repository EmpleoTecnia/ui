// Generado por scripts/catalogar.mjs. No editar a mano.
import type { Demo } from '../lib/demo'
import d0 from '../components/feedback/status-mark/demo'
import d1 from '../components/fields/password-strength/demo'
import d2 from '../components/menus/select/demo'
import d3 from '../components/menus/user-menu/demo'

export type Entrada = {
  slug: string
  nombre: string
  tipo: 'components' | 'patterns'
  categoria: string
  por_que_entro: string
  url_github: string
  origen_url: string
  origen_nombre: string
  demos: Demo[]
}

export const registro: Entrada[] = [
  { slug: "status-mark", nombre: "Marca de estado", tipo: "components", categoria: "feedback", por_que_entro: "Me gustó todo: el mismo círculo que se transforma de punteado a girando a tilde o cruz, y que tacha la etiqueta al terminar.", url_github: "https://github.com/EmpleoTecnia/ui/tree/main/components/feedback/status-mark", origen_url: "https://reactbits.dev/micro/status-mark", origen_nombre: "React Bits", demos: d0 },
  { slug: "password-strength", nombre: "Fuerza de contraseña", tipo: "components", categoria: "fields", por_que_entro: "Me gustó todo como está armado: las cuatro barras que se llenan, los requisitos que se van tildando con cuántos caracteres faltan, y el ojo que se tacha para mostrar la contraseña.", url_github: "https://github.com/EmpleoTecnia/ui/tree/main/components/fields/password-strength", origen_url: "https://uiarc.dev/components/password-strength", origen_nombre: "Arc UI", demos: d1 },
  { slug: "select", nombre: "Desplegable", tipo: "components", categoria: "menus", por_que_entro: "Un desplegable simple pero con buena dinámica: buen reflejo al abrir y buen cambio de posición del ícono.", url_github: "https://github.com/EmpleoTecnia/ui/tree/main/components/menus/select", origen_url: "https://uiarc.dev/components/select", origen_nombre: "Arc UI", demos: d2 },
  { slug: "user-menu", nombre: "Menú de usuario", tipo: "components", categoria: "menus", por_que_entro: "El desplegable con el formato y las opciones claras, el cambio de tonalidad del tema adentro y el cerrar sesión en otro color.", url_github: "https://github.com/EmpleoTecnia/ui/tree/main/components/menus/user-menu", origen_url: "https://uiarc.dev/components/user-menu", origen_nombre: "Arc UI", demos: d3 },
]
