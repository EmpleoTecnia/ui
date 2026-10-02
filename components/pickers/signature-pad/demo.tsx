import type { Demo } from '../../../lib/demo'
import { SignaturePad } from './SignaturePad'

const demos: Demo[] = [
  {
    nombre: 'Certificado de asistencia',
    render: () => (
      <div className="grid w-[380px] gap-3">
        <header>
          <h2 className="font-ui-display text-lg font-semibold text-ui-ink">Certificado de asistencia</h2>
          <p className="mt-0.5 text-sm text-ui-ink-muted">Taller de entrevistas laborales · 2 de octubre de 2026</p>
        </header>
        <SignaturePad signer="Lucía Benítez" hint="Firmá acá" fileName="firma-lucia-benitez" />
      </div>
    ),
  },
  {
    nombre: 'Sólo el pad',
    render: () => (
      <div className="w-[360px]">
        <SignaturePad />
      </div>
    ),
  },
  {
    nombre: 'Tinta azul, trazo grueso',
    render: () => (
      <div className="w-[360px]">
        <SignaturePad signer="Martín Acosta" defaultColor="blue" defaultWidth="bold" fileName="firma-martin-acosta" />
      </div>
    ),
  },
]
export default demos
