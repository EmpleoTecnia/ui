# Botón imán

Un botón que se inclina hacia el cursor mientras lo tenés cerca y vuelve a su lugar
con un resorte cuando te vas. La idea es que el botón importante de la pantalla se
sienta vivo sin agrandarse, sin brillar y sin cambiar de color.

## Por qué entró

Para probar el circuito entero de la librería con algo propio. Y porque es la clase de
detalle que hace que una landing se sienta cuidada: nadie lo nota conscientemente, todos
lo sienten.

## Cómo se usa

```tsx
import { BotonIman } from '@/components/ui/boton-iman/BotonIman'

<BotonIman onClick={...}>Quiero ir</BotonIman>
<BotonIman alcance={0.15}>Guardar cambios</BotonIman>
```

- `alcance` (0 a 1, por defecto 0.35): cuánto se corre hacia el cursor.
- Acepta todo lo que acepta un `<button>`.
- Con `prefers-reduced-motion` y en pantallas táctiles no se mueve.

## Qué toma de tu app

`--ui-accent`, `--ui-accent-ink`, `--ui-radius`, `--ui-font-display`, `--ui-dur`, `--ui-ease`.
Necesita `motion`.
