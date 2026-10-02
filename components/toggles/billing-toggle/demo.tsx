import type { Demo } from '../../../lib/demo'
import { DemoPlans } from './DemoPlans'

const demos: Demo[] = [
  {
    nombre: 'Un plan con precio',
    render: () => (
      <div className="w-[360px]">
        <DemoPlans plans={[{ name: 'Equipo', detail: 'Espacios compartidos para hasta 20 personas', monthly: 15000 }]} />
      </div>
    ),
  },
  {
    nombre: 'Dos planes',
    render: () => (
      <div className="w-[360px]">
        <DemoPlans />
      </div>
    ),
  },
  {
    nombre: 'Grande, con el ahorro en pesos',
    render: () => (
      <div className="w-[380px]">
        <DemoPlans
          size="lg"
          plans={[{ name: 'Campus', detail: 'Todos los cursos, sin límite', monthly: 20000 }]}
          options={[
            { value: 'monthly', label: 'Mensual' },
            { value: 'yearly', label: 'Anual', badge: 'Ahorrá 20%', activeBadge: 'Ahorrás $48.000' },
          ]}
        />
      </div>
    ),
  },
]
export default demos
