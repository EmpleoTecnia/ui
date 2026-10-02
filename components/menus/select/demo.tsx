import type { Demo } from '../../../lib/demo'
import { Select } from './Select'

const equipos = [
  { value: 'diseno', label: 'Diseño' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'soporte', label: 'Soporte' },
]

const paises = [
  { value: 'ar', label: 'Argentina' },
  { value: 'uy', label: 'Uruguay' },
  { value: 'cl', label: 'Chile' },
  { value: 'py', label: 'Paraguay' },
  { value: 'bo', label: 'Bolivia', disabled: true },
  { value: 'br', label: 'Brasil' },
]

const demos: Demo[] = [
  {
    nombre: 'Con valor elegido',
    render: () => (
      <div className="w-[300px]">
        <Select label="Equipo" description="Elegí el equipo responsable de este trabajo." options={equipos} defaultValue="diseno" portal={false} />
      </div>
    ),
  },
  {
    nombre: 'Vacío',
    render: () => (
      <div className="w-[300px]">
        <Select label="País" placeholder="Elegí un país" options={paises} portal={false} />
      </div>
    ),
  },
  {
    nombre: 'Deshabilitado',
    render: () => (
      <div className="w-[300px]">
        <Select label="Equipo" options={equipos} defaultValue="marketing" disabled portal={false} />
      </div>
    ),
  },
]
export default demos
