# Brief: portear un componente a la librería UI de EmpleoTecnia

Repo: la raíz de la librería (`ui-library`). Leé primero
`CLAUDE.md` (reglas del bibliotecario) y `tokens.css` (el contrato). Después mirá los dos
porteos ya hechos, que son el modelo exacto a seguir:

- `components/fields/password-strength/` (PasswordStrength.tsx, NewPasswordForm.tsx, demo.tsx, guion.mjs, README.md, meta.json)
- `components/feedback/status-mark/` (StatusMark.tsx, demo.tsx, guion.mjs, README.md, meta.json)

Cada componente que te toca ya tiene su carpeta con `meta.json`, `README.md` (generado,
corto), `preview.png` (captura de la página original) y `codigo-origen/` con el `.tsx` y el
`.module.css` originales de Arc UI más `pagina.txt` (el texto de la página de docs: ahí
están los ejemplos, la API y las notas de accesibilidad y movimiento). Tu trabajo: dejar
en esa carpeta el componente porteado, listo para que lo use cualquier app.

## Qué entregar en cada carpeta

1. **`<PascalCase>.tsx`** (p. ej. `UserMenu.tsx`): el componente porteado. Si hace falta
   más de un archivo (helpers, un subcomponente), van en la misma carpeta con nombre en
   inglés. **Nada de `.module.css`**: todo con clases de Tailwind v4 y estilos inline con
   variables. Si el original importa `../text-morph/text-morph` o
   `../animated-counter/animated-counter`, el código original de esos helpers está en
   el registry de Arc (`https://uiarc.dev/r/<nombre>.json`, campo `files[].content`):
   porteá sólo lo que uses, dentro de tu carpeta (un `TextMorph.tsx` chico, por ejemplo).
2. **`demo.tsx`**: `const demos: Demo[] = [{ nombre, render }]; export default demos`,
   con `import type { Demo } from '../../../lib/demo'`. Entre 2 y 4 demos con nombre en
   español ("Menú abierto", "Con progreso"). El primero es el que se ve en la galería y en
   la captura: tiene que mostrar el componente en su mejor estado, con tamaño razonable
   (un `div` con `w-[360px]` o similar). **demo.tsx es un módulo de servidor**: no puede
   pasar funciones (callbacks) a componentes cliente. Si el demo necesita estado o
   callbacks, hacé un `Demo<Algo>.tsx` con `'use client'` en la misma carpeta y usalo
   desde demo.tsx.
3. **`guion.mjs`**: `export default async function guion(page) { ... }` con Playwright.
   Es lo que pasa mientras se graba la animación de 3 segundos (viewport 600×400, sólo
   el primer demo). Hacé que se vea el movimiento: abrir el menú, escribir, mantener
   apretado, arrastrar el slider. Usá `page.locator(...)`, `page.getByRole(...)`,
   `page.mouse`, `waitForTimeout`. Mirá los dos guiones existentes.
4. **`README.md`**: mismo esquema que el de password-strength: `# Nombre en español`,
   un párrafo de descripción (qué hace, en concreto, cómo se mueve), `## Por qué entró`
   (dejá la frase que ya está: es de Franco, no se toca), `## Sirve para` y `## No sirve
   para` (dejá lo que está; podés sumar viñetas), la línea `Origen: [Arc UI](url),
   porteado a nuestro stack y traducido. La licencia del sitio no está declarada: se usa
   en nuestras apps, no se publica.`, `## Cómo se usa` (import desde
   `@/components/ui/<slug>/<Archivo>`, ejemplos de uso, lista de props con una línea
   cada una) y `## Qué toma de tu app` (qué tokens usa y qué queda fijo).
5. **`meta.json`**: actualizá `tokens` (la lista EXACTA de `--ui-*` que usa el código,
   ni uno más ni uno menos: `scripts/revisar.mjs` lo controla), `dependencias`
   (`motion`, `lucide-react`, y `@radix-ui/react-select` sólo si lo usás; nada más) y,
   si cambió algo, `caracter`. **No toques `estado`, `por_que_entro`, `sirve_para`,
   `origen`, `fecha`, `agregado_por`.** `preview.png`/`preview.webp` las saco yo después.

## Reglas que no se negocian (las revisa `scripts/revisar.mjs`)

- **Colores: sólo el contrato.** Nada de hex, `rgb()`, `hsl()`, `oklch()` absoluto,
  `bg-blue-500`, `--color-red-500`. Se usan las clases del puente: `bg-ui-bg`,
  `bg-ui-surface`, `bg-ui-surface-2`, `text-ui-ink`, `text-ui-ink-soft`,
  `text-ui-ink-muted`, `border-ui-line`, `bg-ui-accent`, `text-ui-accent-ink`,
  `rounded-ui`, `rounded-ui-lg`, `font-ui-display`, `font-ui-text`, `ease-ui`, y en
  inline/arbitrary `var(--ui-accent)` etc. Lo que falte se deriva:
  `color-mix(in oklch, var(--ui-accent) 12%, transparent)` o
  `oklch(from var(--ui-accent) l c h)`. Un valor que es DATO y no estilo (un color por
  defecto de un color picker, un `stroke="black"` para una máscara SVG) va con el
  comentario `color-ok` en la misma línea; usalo poco y sólo cuando sea dato.
- **Colores semánticos, matiz fijo derivado del acento:** rojo
  `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) 25)`, naranja
  `55`, amarillo `88`, verde `150`. Error/peligro/eliminar es rojo (el "Sign out" del
  user-menu, el "Delete" del confirm-morph y del hold-to-confirm), éxito verde (el
  "Guardado" del action-button). Nunca el acento para decir bien o mal.
- **Movimiento desde `--ui-dur` y `--ui-ease`.** Copiá el hook `useDur()` de
  StatusMark.tsx (lee `--ui-dur` en segundos) y expresá cada duración como múltiplo
  (`d * 1.6`), los springs como en PasswordStrength.tsx (`spring.snappy`, `spring.morph`
  derivados de `d`). Los `motionTokens.*` de Arc se reemplazan así: `duration.instant`
  ≈ `d * 0.5`, `duration.fast` ≈ `d`, `duration.standard` ≈ `d * 1.6`,
  `duration.considered` ≈ `d * 2.4`; `ease.enter` = `[0.22, 1, 0.36, 1]`,
  `ease.standard` = `[0.2, 0, 0, 1]`; `blur.subtle` = 4px, `blur.soft` = 8px;
  `spring.snappy` = `{type:'spring', duration: d * 1.4, bounce: 0.1}`, `spring.smooth` =
  `{type:'spring', duration: d * 2.2, bounce: 0}`, `spring.morph` = `{type:'spring',
  duration: d * 1.8, bounce: 0.15}`; `stagger.item` ≈ `d * 0.25`, `stagger.char` ≈
  `d * 0.1`. Todo respeta `useReducedMotion()` de `motion/react` (sin animación, cambio
  seco).
- **Textos de interfaz en español rioplatense (vos, no tú):** "Cerrar sesión",
  "Mantené apretado para eliminar", "Guardando…", "Elegí un país". Props, nombres de
  archivos, componentes y variables en inglés. TypeScript estricto, `'use client'` arriba.
- **Fidelidad:** el comportamiento, el movimiento y la accesibilidad (roles, aria,
  teclado) tienen que ser los del original. Leé `pagina.txt` para no perder nada. Lo que
  Franco pidió cambiar está en `meta.json` → `no_sirve_para` (p. ej. phone-input sin el
  botón "Try"; color-picker con entrada RGB/RGBA además de hex).
- **Dependencias:** `motion/react` y `lucide-react` están. `@radix-ui/react-select` está
  instalado por si el select lo necesita. Ninguna otra: si el original usa algo más, se
  reemplaza con código propio. Nada de `next/*` dentro del componente.
- **Fuentes:** `font-ui-text` para texto, `font-ui-display` para títulos. Monoespaciada:
  `font-mono` está bien.
- Dark mode: no hay nada que hacer, los tokens cambian solos. Pero probá mentalmente que
  no quede un blanco fijo: todo fondo es un token o un `color-mix` sobre un token.

## Cómo verificar antes de terminar (obligatorio)

```
node scripts/revisar.mjs <slug>                 # código limpio y tokens declarados
npx tsc -p playground --noEmit --incremental false   # tipos de TODO el repo
```

Las dos tienen que salir sin errores. No corras `guardar.mjs`, `capturar.mjs`,
`catalogar.mjs` ni ningún comando de git: eso lo hago yo después con todos juntos.
Otros agentes están porteando otras carpetas al mismo tiempo: tocá sólo las tuyas.

## Al terminar

Respondé con, por componente: archivos creados, qué decidiste cambiar respecto del
original y por qué (en una línea cada uno), qué hace el guion, y la salida de los dos
comandos de verificación. Si algo no se pudo portear fiel (por una dependencia o una
limitación), decilo claro en vez de dejarlo a medias.
