# Campo numérico

Un número acotado con un botón − y uno + a los costados. Los dígitos giran como un
cuentakilómetros cada vez que cambia el valor; mantener apretado repite y acelera; al llegar
al máximo (o al mínimo) el número se tensa hacia el botón y vuelve, el botón se sacude una
vez y aparece al lado de la etiqueta una nota naranja que dice el tope ("Máx. 10
licencias"). La descripción de abajo puede llevar el precio: las palabras que cambian suben y
se enfocan, el resto se queda quieto. Se puede tipear directo, mover con las flechas y, con
`scrub`, arrastrar la etiqueta. Viene con `AnimatedCounter`, un contador grande para mostrar el
total al lado.

## Por qué entró

La dinámica: la alerta cuando llegás al máximo y cómo te va sumando el precio a medida que agregás.

## Sirve para

- agregar personas o licencias a un equipo
- cantidades con precio total
- cupos, invitados o puestos con un tope claro

## No sirve para

- un valor aproximado donde importa más la posición que el número exacto: ahí va un slider
- códigos, documentos o teléfonos: son texto, no cantidades

Origen: [Arc UI](https://uiarc.dev/components/number-field), porteado a nuestro stack
y traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se
publica.

## Cómo se usa

```tsx
import { NumberField } from '@/components/ui/number-field/NumberField'
import { AnimatedCounter } from '@/components/ui/number-field/AnimatedCounter'

<NumberField label="Licencias" value={cantidad} onValueChange={setCantidad} min={1} max={10} suffix={n => n === 1 ? ' licencia' : ' licencias'} description={`$ ${precio} por licencia al mes`} />
<AnimatedCounter value={cantidad * precio} prefix="$ " />

<NumberField label="Precio" defaultValue={12.5} step={0.5} prefix="$ " size="lg" />
<NumberField label="Invitados" max={3} limitHint={(borde, tope) => borde === 'max' ? `Hasta ${tope}` : `Mínimo ${tope}`} />
```

- `value` / `defaultValue` / `onValueChange(valor)`: controlado o no. Siempre sale un número
  dentro de `min` y `max` (por defecto 0 y sin tope) y en la grilla de `step` (1).
- `largeStep`: lo que se mueven RePág, AvPág y Shift + flecha. Por defecto diez pasos.
- `prefix` / `suffix`: texto pegado al número, fijo o una función del valor para que
  concuerde (`' licencia'` / `' licencias'`).
- `description`: la línea de abajo. Si ponés el total ahí, el número cambia con movimiento.
- `limitHint`: la nota junto a la etiqueta al tocar un límite. `true` (por defecto) escribe
  "Máx. …" / "Mín. …", una función escribe lo que quieras, `false` la saca.
- `scrub`: arrastrar la etiqueta a los costados cambia el valor; pasado el límite resiste y
  vuelve.
- `size`: `sm`, `md` (por defecto) o `lg`; `width` en píxeles si el ancho por defecto no va.
- `locale` (`es-AR`) y `formatOptions` para decimales y separador de miles.
- Teclado: flechas (mantener repite), RePág/AvPág, Inicio/Fin a los límites, Enter
  confirma lo tipeado, Escape lo descarta. Es un `spinbutton` para el lector de pantalla.
- `AnimatedCounter`: `value`, `prefix`, `suffix`, `decimals`, `label`, `locale`,
  `animateOnView` (gira desde cero al entrar en pantalla) y `className` para el tamaño.
- Con `prefers-reduced-motion` todo cambia sin viaje: los dígitos se funden y al tocar un
  límite el número sólo cambia de color un instante.

## Qué toma de tu app

Fondo, bordes, textos, el radio del control y los botones salen de los tokens `--ui-*`. La
nota del límite y el borde cuando tipeás un valor fuera de rango son naranja de aviso:
semántico, no cambia de app, del acento toma sólo la luz y la saturación. El contador usa
`--ui-font-display`. Las duraciones y los resortes salen de `--ui-dur` y `--ui-ease`.
Necesita `motion` y `lucide-react`.
