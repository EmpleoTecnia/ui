import type { Demo } from '../../../lib/demo'
import { PhoneInput } from './PhoneInput'

const demos: Demo[] = [
  {
    nombre: 'Para un código por SMS',
    render: () => (
      <div className="w-[360px]">
        <PhoneInput label="Celular" description="Te mandamos un código de 6 dígitos por SMS." />
      </div>
    ),
  },
  {
    nombre: 'Con número cargado',
    render: () => (
      <div className="w-[360px]">
        <PhoneInput label="WhatsApp" defaultValue="+5491123456789" description="Con el 9 adelante si es un celular." />
      </div>
    ),
  },
  {
    nombre: 'Con error',
    render: () => (
      <div className="w-[360px]">
        <PhoneInput label="Celular" defaultValue="+5491123456789" error="Ese número ya está en otra cuenta." />
      </div>
    ),
  },
  {
    nombre: 'Sólo algunos países',
    render: () => (
      <div className="w-[360px]">
        <PhoneInput label="Teléfono" countries={['AR', 'UY', 'PY', 'BO', 'CL', 'BR']} preferredCountries={['AR']} defaultCountry="UY" />
      </div>
    ),
  },
]
export default demos
