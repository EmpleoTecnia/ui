# Mensual o anual

Un interruptor de dos opciones para elegir cómo se paga: un solo pulgar se desliza entre
"Mensual" y "Anual" con un resorte que llega sin rebote, y la nota de ahorro de la opción
anual pasa de gris a verde y se reescribe en el lugar ("Ahorrá 20%" → "Ahorrás 20%") sin
mover nada alrededor. Viene con `BillingPrice`, un precio cuyos dígitos ruedan como un
cuentakilómetros hasta el monto nuevo, con el precio anterior tachado que abre y cierra su
ancho. Se maneja con flechas, Inicio y Fin como un grupo de radios.

## Por qué entró

Muy simple: mensual o anual, para cuando no hay que dar mucho detalle de los planes u opciones.

## Sirve para

- páginas de precios o planes con poco detalle
- cualquier precio que tenga que rodar a un monto nuevo al cambiar de período o de plan (`BillingPrice`)

## No sirve para

- cuando hay que explicar las diferencias entre planes
- cambiar vistas o filtros sin sentido de precio: para eso un control segmentado
- un solo ajuste prendido o apagado: ahí va un switch

Origen: [Arc UI](https://uiarc.dev/components/billing-toggle), porteado a nuestro stack y
traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se publica.

## Cómo se usa

```tsx
import { BillingToggle, BillingPrice } from '@/components/ui/billing-toggle/BillingToggle'

const [periodo, setPeriodo] = useState('monthly')
const anual = periodo === 'yearly'

<BillingToggle value={periodo} onValueChange={setPeriodo} />
<BillingPrice amount={anual ? 12000 : 15000} was={anual ? 15000 : undefined} period="/ mes" />
```

`BillingToggle`:

- `value` / `onValueChange`: siempre controlado; el valor es el `value` de la opción.
- `options`: por defecto Mensual y Anual con "Ahorrá 20%" que pasa a "Ahorrás 20%". Cada una
  lleva `value`, `label`, y opcionalmente `badge` (la nota) y `activeBadge` (la nota cuando
  está elegida; por defecto, la misma).
- `label`: nombre accesible del grupo. Por defecto "Período de facturación".
- `size`: `md` (34 px) o `lg` (42 px).
- Flechas, Inicio y Fin cambian de opción y mueven el foco, como un grupo de radios nativo.

`BillingPrice`:

- `amount`: el monto; cuando cambia, cada dígito rueda hacia el nuevo y las columnas que
  sobran o faltan abren y cierran su ancho.
- `was`: el precio anterior, tachado al lado si es mayor que `amount`.
- `period`: texto después del precio ("/ mes"); se cambia en el lugar cuando cambia.
- `currency` (por defecto "$"), `decimals` (0) y `locale` (`es-AR`: miles con punto).
- Con `prefers-reduced-motion` todo cambia sin viaje ni rueda, con un fundido corto.

## Qué toma de tu app

Fondo del riel, pulgar, bordes y textos salen de los tokens `--ui-*`; el pulgar lleva una
sombra derivada del color del texto, así en oscuro también se ve. El foco usa el acento. La
nota de ahorro elegida es verde siempre, en todas las apps: del acento toma sólo la luz y la
saturación. El precio grande usa la fuente de títulos. Las duraciones salen de `--ui-dur` y
`--ui-ease`. Necesita `motion`.
