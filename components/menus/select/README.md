# Desplegable

Un campo para elegir una opción de una lista corta, con menú manejable desde el teclado. Al
abrir, el menú crece desde el borde del botón, el chevron gira con un resorte y el botón
cambia de tono; al elegir, el valor rueda en la dirección de la lista (una opción de más
abajo sube, una de más arriba baja) y el tilde entra con un pequeño rebote. Si no entra
abajo se abre arriba. Radix guarda el valor real para lectores de pantalla y para enviar el
formulario por `name`.

## Por qué entró

Un desplegable simple pero con buena dinámica: buen reflejo al abrir y buen cambio de posición del ícono.

## Sirve para

- cualquier desplegable de una sola opción en formularios y filtros
- listas cortas donde no hace falta escribir: región, orden, equipo, estado

## No sirve para

- Listas largas o donde conviene buscar escribiendo: ahí va un combobox
- Elegir varios valores: para eso está la selección múltiple
- Dos a cuatro opciones que deberían quedar a la vista: ahí va un control segmentado

Origen: [Arc UI](https://uiarc.dev/components/select), porteado a nuestro stack y
traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se publica.

## Cómo se usa

```tsx
import { Select } from '@/components/ui/select/Select'

<Select
  label="Equipo"
  description="Elegí el equipo responsable de este trabajo."
  options={[
    { value: 'diseno', label: 'Diseño' },
    { value: 'desarrollo', label: 'Desarrollo' },
    { value: 'marketing', label: 'Marketing', disabled: true },
  ]}
  value={equipo}
  onValueChange={setEquipo}
/>

<Select label="País" name="pais" placeholder="Elegí un país" options={paises} />
```

- `label`: la etiqueta del campo. `description` va debajo, atada al botón para lectores de
  pantalla.
- `options`: lista de `{ value, label, disabled? }`.
- `value` / `defaultValue` / `onValueChange` para controlarlo o dejarlo solo.
- `placeholder`: por defecto "Elegí una opción".
- `name`, `required`, `disabled`, `open`, `onOpenChange`, `dir`: lo que acepta
  `@radix-ui/react-select`. Con `name` envía el valor en un formulario común.
- `portal={false}` deja el menú adentro del campo en vez de sobre el body.
- Teclado: Espacio o Enter abren, flechas recorren, escribir salta a la opción, Enter elige,
  Escape cierra. Con `prefers-reduced-motion` todo es un fundido corto.

## Qué toma de tu app

Fondo, bordes, textos, radio y foco salen de los tokens `--ui-*`; el aro de foco es el
acento al 28 %. Las duraciones salen de `--ui-dur` y `--ui-ease`. Las animaciones del menú
van por CSS (Radix las espera así) en un `<style>` que el componente sube al `<head>` una
sola vez. Necesita `@radix-ui/react-select`, `motion` y `lucide-react`.
