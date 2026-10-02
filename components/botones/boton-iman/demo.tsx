import { ArrowRight } from 'lucide-react'
import type { Demo } from '../../../lib/demo'
import { BotonIman } from './BotonIman'

const demos: Demo[] = [
  {
    nombre: 'Principal',
    render: () => (
      <BotonIman>
        Quiero ir <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
      </BotonIman>
    ),
  },
  {
    nombre: 'Alcance corto',
    render: () => <BotonIman alcance={0.15}>Guardar cambios</BotonIman>,
  },
]
export default demos
