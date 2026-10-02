import type { Demo } from '../../../lib/demo'
import { DemoFalla, DemoLista, DemoNeutro, DemoSeleccion } from './DemoConfirmMorph'

const demos: Demo[] = [
  { nombre: 'Quitar de una lista', render: () => <DemoLista /> },
  { nombre: 'Selección de una tabla', render: () => <DemoSeleccion /> },
  { nombre: 'Falla y reintenta', render: () => <DemoFalla /> },
  { nombre: 'Tono neutro', render: () => <DemoNeutro /> },
]
export default demos
