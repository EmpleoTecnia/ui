import type { Demo } from '../../../lib/demo'
import { DemoFijo, DemoGuardar, DemoPublicar } from './DemoActionButton'

const demos: Demo[] = [
  { nombre: 'Guardar un formulario', render: () => <DemoGuardar /> },
  { nombre: 'Sale bien y falla', render: () => <DemoPublicar /> },
  { nombre: 'Sin volver solo', render: () => <DemoFijo /> },
]
export default demos
