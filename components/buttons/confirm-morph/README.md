# Confirmar con deshacer

Un botón para eliminar que pregunta en el lugar, sin diálogo. Al tocar "Eliminar", la misma
píldora se estira con un resorte y se convierte en la pregunta con Cancelar y Eliminar;
al confirmar pasa a un spinner con "Eliminando…" y termina en "Eliminado" con un disco
verde donde se dibuja un tilde y, al lado, Deshacer. Cada cara entra desde la derecha y la
anterior se va desenfocada hacia la izquierda, así el ojo lee una sola transformación.
Si la pregunta queda sin responder, o el resultado se queda quieto, vuelve solo al reposo
pasado un tiempo (el puntero encima lo pausa); Escape y un clic afuera también cancelan.
Si la acción falla, muestra "No se pudo" con Reintentar.

## Por qué entró

Para eliminar cosas de una lista está genial: el botón se transforma y te da la oportunidad de restablecer.

## Sirve para

- eliminar ítems de una lista con deshacer
- quitar personas, archivos o filas
- la barra de una tabla con selección ("2 de 5 seleccionados · Eliminar")
- quitar un acceso, archivar o descartar un borrador, con tono neutro si es reversible

## No sirve para

- Consecuencias que necesitan más de una línea, o escribir un nombre para confirmar: ahí va un diálogo
- Acciones seguras que no necesitan pregunta: ahí va [action-button](../action-button)
- Cuando un toque accidental tiene que ser casi imposible: ahí va [hold-to-confirm](../hold-to-confirm)

Origen: [Arc UI](https://uiarc.dev/components/confirm-morph), porteado a nuestro stack y
traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se publica.

## Cómo se usa

```tsx
import { ConfirmMorph } from '@/components/ui/confirm-morph/ConfirmMorph'

<ConfirmMorph label="Eliminar" prompt={`¿Eliminar a ${nombre}?`} onConfirm={eliminar} onUndo={restaurar} />
<ConfirmMorph label="Eliminar" prompt="¿Eliminar 2 archivos?" doneLabel="Eliminados" onConfirm={eliminarSeleccion} />
<ConfirmMorph tone="neutral" label="Archivar" confirmLabel="Archivar" pendingLabel="Archivando…" doneLabel="Archivada" onConfirm={archivar} onUndo={desarchivar} />
```

Para una lista, lo cómodo es dejar la fila tachada mientras se puede deshacer y sacarla
cuando el resultado vence: `onStateChange` avisa cuando vuelve a `idle` (mirá
`DemoConfirmMorph.tsx`).

- `label`: el texto en reposo. `icon` va antes. `prompt` es la pregunta; por defecto el
  texto entre signos ("¿Eliminar?").
- `confirmLabel` ("Eliminar"), `cancelLabel` ("Cancelar"), `pendingLabel` ("Eliminando…"),
  `doneLabel` ("Eliminado"), `errorLabel` ("No se pudo"), `retryLabel` ("Reintentar"),
  `undoLabel` ("Deshacer"), `undoingLabel` ("Restableciendo…").
- `onConfirm`: si devuelve una promesa muestra el spinner hasta que resuelva; si rechaza,
  pasa a error con Reintentar. `onUndo`: si está, el resultado ofrece Deshacer. `onCancel`.
- `tone`: `danger` (por defecto; texto y confirmar en rojo) o `neutral`.
- `confirmTimeout` (6000) y `resultTimeout` (5000): cuánto dura la pregunta y el resultado
  antes de volver al reposo; `0` los apaga. `cancelOnOutsidePress` (sí).
- `state` / `defaultState` / `onStateChange` para controlarlo desde afuera:
  `idle · confirming · pending · done · error`.
- Teclado: el foco cae en la opción segura de cada cara (Cancelar, Deshacer, Reintentar);
  Escape cancela o cierra el resultado. Cada cambio se anuncia en un `role="status"`.
- Con `prefers-reduced-motion` las caras cambian con un fundido y el ancho salta.

## Qué toma de tu app

La píldora es la superficie de la app con su borde, y los textos salen de `--ui-ink`,
`--ui-ink-soft` y `--ui-ink-muted`; la fuente de texto es la de la app. "Eliminar" y el
botón de confirmar son rojos en todas las apps, y el disco de "Eliminado" es verde: del
acento toman sólo la luz y la saturación. El texto sobre rojo y el tilde sobre verde usan
`--ui-bg`. Las duraciones salen de `--ui-dur` y `--ui-ease`. Necesita `motion` y
`lucide-react` (el spinner y el ícono de error).
