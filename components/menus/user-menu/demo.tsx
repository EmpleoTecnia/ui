import type { Demo } from '../../../lib/demo'
import { DemoUserMenu } from './DemoUserMenu'

const demos: Demo[] = [
  {
    nombre: 'Menú abierto',
    render: () => (
      <div className="flex h-[340px] w-[360px] items-start justify-end">
        <DemoUserMenu showName defaultOpen />
      </div>
    ),
  },
  {
    nombre: 'Con estado de presencia',
    render: () => (
      <div className="flex h-[400px] w-[360px] items-start justify-end">
        <DemoUserMenu showName defaultOpen presence />
      </div>
    ),
  },
  {
    nombre: 'Sólo el avatar',
    render: () => (
      <div className="flex h-[340px] w-[360px] items-start justify-end">
        <DemoUserMenu />
      </div>
    ),
  },
]
export default demos
