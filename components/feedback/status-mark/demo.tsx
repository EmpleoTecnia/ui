import type { Demo } from '../../../lib/demo'
import { StatusMark } from './StatusMark'

const demos: Demo[] = [
  {
    nombre: 'Pasos de un proceso',
    render: () => (
      <ul className="grid gap-3 text-ui-ink">
        <li><StatusMark status="done" label="Verificar la contraseña actual" /></li>
        <li><StatusMark status="running" label="Guardar la contraseña nueva" /></li>
        <li><StatusMark status="pending" label="Cerrar las otras sesiones" /></li>
      </ul>
    ),
  },
  {
    nombre: 'Con progreso',
    render: () => <span className="text-ui-ink"><StatusMark status="running" progress={0.62} label="Subiendo el CV" /></span>,
  },
  {
    nombre: 'Falló y cancelado',
    render: () => (
      <ul className="grid gap-3 text-ui-ink">
        <li><StatusMark status="failed" label="Enviar el correo de confirmación" /></li>
        <li><StatusMark status="cancelled" label="Importar contactos" /></li>
      </ul>
    ),
  },
  {
    nombre: 'Sin etiqueta',
    render: () => (
      <span className="inline-flex gap-4 text-ui-ink">
        <StatusMark status="pending" /><StatusMark status="running" /><StatusMark status="done" /><StatusMark status="failed" />
      </span>
    ),
  },
]
export default demos
