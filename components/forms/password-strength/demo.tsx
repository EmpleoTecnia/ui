import type { Demo } from '../../../lib/demo'
import { PasswordStrength } from './PasswordStrength'
import { NewPasswordForm } from './NewPasswordForm'

const demos: Demo[] = [
  {
    nombre: 'Formulario completo',
    render: () => (
      <div className="w-[360px]">
        <NewPasswordForm subtitle="maria@empleotecnia.com" />
      </div>
    ),
  },
  {
    nombre: 'Sólo el campo',
    render: () => (
      <div className="w-[340px]">
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
