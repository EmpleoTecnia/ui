import type { Demo } from '../../../lib/demo'
import { NumberField } from './NumberField'
import { DemoLicencias, DemoTotalEnDescripcion } from './DemoLicencias'

const demos: Demo[] = [
  {
    nombre: 'Licencias con total',
    render: () => <DemoLicencias />,
  },
  {
    nombre: 'Total en la descripción',
    render: () => <DemoTotalEnDescripcion />,
  },
  {
    nombre: 'Con límite chico',
    render: () => (
      <div className="w-[300px]">
        <NumberField label="Invitados" defaultValue={1} min={0} max={3} description="$ 1.200 cada uno, hasta 3 por equipo" />
      </div>
    ),
  },
  {
    nombre: 'Tamaños',
    render: () => (
      <div className="grid gap-5">
        <NumberField label="Chico" size="sm" defaultValue={2} min={0} max={99} />
        <NumberField label="Grande, con decimales" size="lg" defaultValue={12.5} min={0} max={100} step={0.5} prefix="$ " />
      </div>
    ),
  },
]
export default demos
