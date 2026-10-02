# Menú de usuario

El menú de la cuenta detrás del avatar en la cabecera: una cabecera compacta con nombre,
plan y correo, un grupo corto de destinos (Perfil, Configuración, Facturación), el selector
de tema claro / oscuro / sistema adentro y "Cerrar sesión" en rojo. El panel crece desde el
avatar con un resorte y las filas entran en ola; un solo resaltado sigue al puntero y al
teclado deslizándose de fila en fila, y el pulgar del selector de tema se desliza entre los
íconos. Elegir tema o estado deja el menú abierto; todo lo demás lo cierra y devuelve el foco
al botón. Si cerrar sesión tarda, el ítem muestra un spinner y "Cerrando sesión…" hasta que
termina. En pantallas angostas se abre como hoja desde abajo, arrastrable para cerrar.

## Por qué entró

El desplegable con el formato y las opciones claras, el cambio de tonalidad del tema adentro y el cerrar sesión en otro color.

## Sirve para

- menú de la cuenta en la cabecera de todas las apps
- cambiar el tema
- cerrar sesión
- mostrar el estado de presencia (disponible, ocupado, ausente) y cambiarlo sin salir del menú

## No sirve para

- Listas de comandos genéricas: ahí va un menú desplegable común
- Un interruptor de tema suelto, fuera del menú de la cuenta

Origen: [Arc UI](https://uiarc.dev/components/user-menu), porteado a nuestro stack y
traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se publica.

## Cómo se usa

```tsx
import { UserMenu } from '@/components/ui/user-menu/UserMenu'
import { CreditCard, Settings, User } from 'lucide-react'

<UserMenu
  user={{ name: 'Emma Collins', email: 'emma@empleotecnia.com', plan: 'Pro', avatarSrc: '/avatares/emma.jpg' }}
  items={[
    { label: 'Perfil', icon: <User size={16} />, keys: ['⌘', 'P'], onSelect: () => router.push('/perfil') },
    { label: 'Configuración', icon: <Settings size={16} />, keys: ['⌘', ','], onSelect: () => router.push('/configuracion') },
    { label: 'Facturación', icon: <CreditCard size={16} />, onSelect: () => router.push('/facturacion') },
  ]}
  theme={tema}
  onThemeChange={setTema}
  onSignOut={cerrarSesion}
  signOutKeys={['⇧', '⌘', 'Q']}
  showName
/>
```

- `user`: `name`, `email` y opcionales `plan` (la pastilla al lado del nombre), `avatarSrc` y
  `avatarSrcSet`. Sin foto muestra las iniciales.
- `items`: destinos de la cuenta, cada uno con `label`, `icon`, `onSelect` y `keys` (el atajo
  como pista visual, p. ej. `['⌘', 'P']`; el atajo lo ata tu app). Tres o cuatro, no más.
- `theme` / `defaultTheme` / `onThemeChange`: `light`, `dark` o `system`. El menú avisa la
  elección; aplicarla a la página es cosa de la app. `showTheme={false}` lo saca.
- `status` / `defaultStatus` / `onStatusChange`: `available`, `busy` o `away`. Con cualquiera
  de los tres aparece el punto de presencia sobre el avatar y el selector de estado adentro.
- `onSignOut`: si devuelve una promesa, el ítem muestra el progreso y el menú se cierra al
  terminar. `signOutKeys` es la pista del atajo.
- `showName` muestra el nombre y un chevron al lado del avatar (no en pantallas angostas).
- `align`: `start`, `center` o `end` (por defecto) respecto del botón.
- `open` / `defaultOpen` / `onOpenChange` para controlarlo desde afuera.
- `portal={false}` deja el panel adentro del contenedor del botón en vez de sobre el body.
- `sheetBelow`: ancho en px por debajo del cual se abre como hoja desde abajo (640 por
  defecto; `0` lo desactiva).
- Teclado: flechas arriba y abajo recorren las filas, izquierda y derecha eligen dentro del
  selector de tema o de estado, Inicio y Fin saltan a los extremos, escribir salta a la fila
  que empiece con eso, Escape y Tab cierran y devuelven el foco. Con `prefers-reduced-motion`
  todo cambia sin animación.

## Qué toma de tu app

Fondo del panel, bordes, textos, la pastilla del plan y el resaltado salen de los tokens
`--ui-*`; el resaltado y la pastilla son el acento al 12 %. "Cerrar sesión" y el estado
"ocupado" son rojos, "ausente" naranja y "disponible" verde: semánticos, con el matiz fijo
y la luz y saturación del acento. Las duraciones salen de `--ui-dur` y `--ui-ease`.
Necesita `motion` y `lucide-react`.
