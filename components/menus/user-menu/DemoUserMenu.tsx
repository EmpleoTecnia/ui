'use client'
import { CreditCard, Settings, User } from 'lucide-react'
import { UserMenu, type UserMenuProps } from './UserMenu'

const usuaria = { name: 'Emma Collins', email: 'emma@example.com', plan: 'Pro' }

const items = [
  { label: 'Perfil', icon: <User size={16} strokeWidth={1.75} />, keys: ['⌘', 'P'] },
  { label: 'Configuración', icon: <Settings size={16} strokeWidth={1.75} />, keys: ['⌘', ','] },
  { label: 'Facturación', icon: <CreditCard size={16} strokeWidth={1.75} /> },
]

/** Un cerrar sesión que tarda: deja ver el spinner y el texto que cambia antes de cerrarse. */
const cerrarSesion = () => new Promise(resolve => setTimeout(resolve, 1500))

/** El menú con usuaria, ítems y callbacks de muestra. demo.tsx es de servidor y no puede pasar funciones; esto sí.
 *  `presence` prende el punto y el selector de estado. */
export function DemoUserMenu({ presence = false, ...props }: Partial<UserMenuProps> & { presence?: boolean }) {
  const estado = presence ? { defaultStatus: 'busy' as const, onStatusChange: () => {} } : {}
  return <UserMenu user={usuaria} items={items} onSignOut={cerrarSesion} signOutKeys={['⇧', '⌘', 'Q']} portal={false} sheetBelow={0} {...estado} {...props} />
}
