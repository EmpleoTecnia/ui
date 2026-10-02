import type { Demo } from '../../../lib/demo'
import { PasswordStrength } from './PasswordStrength'

const demos: Demo[] = [
  {
    nombre: 'Elegir contraseña',
    render: () => (
      <div className="w-[340px] rounded-ui-lg border border-ui-line bg-ui-surface p-6">
        <PasswordStrength label="Nueva contraseña" defaultValue="Emple0tecnia" />
      </div>
    ),
  },
  {
    nombre: 'Con error',
    render: () => (
      <div className="w-[340px]">
        <PasswordStrength label="Nueva contraseña" defaultValue="hola1234" error="Esa contraseña ya la usaste antes." />
      </div>
    ),
  },
]
export default demos
