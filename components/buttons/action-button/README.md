# Botón con estado

Un botón que cuenta el resultado ahí mismo, sin mensajes afuera: "Guardar" se transforma
en "Guardando…" con un spinner, después en "Guardado" con un tilde que se dibuja y el fondo
en verde, o en "No se guardó" con una cruz y el fondo en rojo si la acción falló. Las letras
que se repiten entre un texto y el siguiente se quedan y se deslizan a su lugar, las nuevas
suben desde un desenfoque suave, y el ancho sigue al texto con un resorte para que nada
alrededor salte. La flecha se va hacia donde apunta la acción y vuelve cuando el botón
descansa, solo, pasados `resetAfterMs`.

## Por qué entró

Muy simple, pero tiene movimiento y la acción ahí mismo, sin depender de un label o mensajes fuera del botón: guardar, guardando, guardado.

## Sirve para

- guardar / guardando / guardado en formularios
- acciones cortas con resultado en el mismo botón
- publicar, enviar o confirmar algo que tarda un segundo y tiene que decir si salió

## No sirve para

- mensajes largos: no entran en el botón
- acciones destructivas: ahí va [confirm-morph](../confirm-morph) o [hold-to-confirm](../hold-to-confirm)

Origen: [Arc UI](https://uiarc.dev/components/action-button), porteado a nuestro stack y
traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se publica.

## Cómo se usa

```tsx
import { ActionButton } from '@/components/ui/action-button/ActionButton'

<ActionButton label="Guardar" onAction={guardarPerfil} />
<ActionButton label="Publicar oferta" pendingLabel="Publicando…" successLabel="Publicada" errorLabel="No se publicó" onAction={publicar} onActionError={avisar} />
<ActionButton label="Guardar" onAction={guardar} resetAfterMs={0} />
```

- `label`: la acción en reposo. `pendingLabel` ("Guardando…"), `successLabel` ("Guardado")
  y `errorLabel` ("No se guardó") son los otros tres textos; conviene que compartan letras
  con `label` para que la transformación se vea.
- `onAction`: lo que hace. Si devuelve una promesa, el botón queda en "cargando" hasta que
  resuelva; si rechaza, pasa a error y llama a `onActionError(error)`.
- `resetAfterMs`: cuánto dura el resultado antes de volver al reposo (2400 por defecto).
  Con `0` queda fijo hasta el próximo clic.
- Acepta todo lo que acepta un `<button>`. Mientras carga no se deshabilita: queda
  `aria-disabled` y `aria-busy`, así quien navega con teclado no pierde el foco. El texto
  del estado se anuncia en un `role="status"`.
- Con `prefers-reduced-motion` los textos cambian con un fundido seco y nada se desliza.
- `TextMorph.tsx`, en la misma carpeta, es la pieza que transforma el texto; se puede usar
  sola para otra palabra que cambie en el lugar (es decorativa: dale el texto plano aparte).

## Qué toma de tu app

El botón es el acento de la app con su texto (`--ui-accent`, `--ui-accent-ink`), el radio
y la fuente de texto; el foco usa el acento y la sombra al pasar el mouse se deriva del
texto. "Guardado" es verde y "No se guardó" rojo en todas las apps: del acento toman sólo
la luz y la saturación. Las duraciones salen de `--ui-dur` y `--ui-ease`. Necesita `motion`
y `lucide-react` (la flecha).
