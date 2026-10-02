# Librería UI de EmpleoTecnia — diseño

Fecha: 2026-10-02. Repo: `EmpleoTecnia/ui`, clonado en `Plataformas\ui-library`.

## Para qué existe

Una colección curada de componentes y patrones de interfaz que al equipo le gustaron,
porteados a nuestro stack, con catálogo visual, que Claude consulta cuando diseña una
pantalla en cualquier app del ecosistema. Entra sólo lo que alguien eligió a mano, nunca
"todos los componentes" de una web de referencia.

Imagen que guía las decisiones: **las apps son ciudades de un mismo país.** No se ven
iguales (cada una tiene su `DESIGN.md`), pero comparten vocabulario. Un componente de la
librería trae su carácter —geometría, movimiento, interacción, estructura— y toma de cada
app el color, el radio y la tipografía. Un botón que llegó rojo sale azul en una app azul.

### Quién

Todo el equipo alimenta y todo el equipo consume, desde Claude Code, con tres comandos
que funcionan parados en cualquier carpeta de `Plataformas`.

### Cómo se usa, en una frase cada uno

- `/ui-agregar <url | descripción | captura>` — "me gustó esto, guardalo".
- `/ui-buscar <qué necesito>` — "mostrame qué tengo para un navbar sutil".
- `/ui-usar <slug>` — desde una app: "ponemelo acá, pintado con mis tokens".

### Lo que no es

No es un paquete npm, no versiona componentes, no tiene galería pública ni Figma, y no
guarda variantes por app (la variante vive en la app que la adaptó). La galería pública
como recurso gratuito de la web de EmpleoTecnia es una fase futura: el playground de este
repo es su semilla, y por eso cada ficha lleva licencia y `publicable` desde el día uno.

## Estructura del repo

```
ui-library/
├── CLAUDE.md                  reglas del bibliotecario (ver sección "El bibliotecario")
├── README.md                  qué es, cómo se usa desde una app, índice general (generado)
├── catalog.json               índice de todas las fichas, generado. Lo que Claude lee para buscar
├── tokens.css                 el contrato de tokens --ui-* y el tema de muestra
├── package.json               scripts: catalogar, capturar, dev (playground), test
├── components/
│   ├── README.md              grilla animada por categoría (generado)
│   └── <categoria>/
│       ├── README.md          grilla animada de la categoría (generado)
│       └── <slug>/
│           ├── meta.json      la ficha
│           ├── README.md      escrito a mano: qué es, por qué entró, cómo se usa, qué tokens toma
│           ├── preview.png    quieta, claro y oscuro lado a lado. La ve Claude en el chat
│           ├── preview.webp   animada, 3 s en loop. La ve el humano en GitHub
│           └── *.tsx          sólo si está adoptado. Uno o más archivos
├── patterns/                  pantallas enteras (pricing, perfil, onboarding). Misma estructura
├── playground/                app Next.js mínima que renderiza cada componente adoptado
├── scripts/
│   ├── catalogar.mjs          valida fichas y código, escribe catalog.json y los README generados
│   └── capturar.mjs           levanta el playground y saca preview.png / preview.webp con Playwright
├── temas/                     copias de los tokens de cada app mapeados a --ui-* (mi, etconecta, campus, proyectos)
├── .github/workflows/ci.yml   catalogar + build del playground en cada push
└── docs/superpowers/specs/
```

Categorías iniciales, en español como todo el ecosistema: `botones`, `tarjetas`,
`navegacion`, `formularios`, `fondos`, `animaciones`, `secciones`, `feedback`. Una
categoría nueva se crea cuando hay algo que meter en ella, no antes. Los `patterns` usan
las suyas: `landing`, `perfil`, `onboarding`, `dashboard`, `auth`, `pricing`.

## La ficha: `meta.json`

```json
{
  "slug": "boton-magnetico",
  "nombre": "Botón magnético",
  "categoria": "botones",
  "estado": "adoptado",
  "origen": { "nombre": "React Bits", "url": "https://reactbits.dev/...", "licencia": "MIT" },
  "publicable": true,
  "por_que_entro": "El imán hacia el cursor se siente premium sin ser gritón.",
  "sirve_para": ["CTA de landing", "botón principal de una pantalla"],
  "no_sirve_para": ["listas con muchos botones", "móvil, no hay cursor"],
  "etiquetas": ["hover", "cursor", "cta", "sutil"],
  "caracter": { "movimiento": "sutil", "tono": "premium", "densidad": "aire" },
  "tokens": ["--ui-accent", "--ui-accent-ink", "--ui-radius"],
  "dependencias": ["motion"],
  "usado_en": ["etconecta"],
  "agregado_por": "franco",
  "fecha": "2026-10-02"
}
```

Reglas de la ficha:

- **`estado`** es `referencia` o `adoptado`. Dos, no tres: un estado intermedio es un
  cajón donde las cosas se pudren.
  - `referencia`: ficha, README, capturas (las que se puedan sacar del origen) y link.
    Sin código nuestro. Puede tener `codigo-origen/` con lo copiado tal cual, sólo si la
    licencia lo permite.
  - `adoptado`: porteado a React + Tailwind v4 + `motion` + Lucide, en TypeScript, usa
    sólo el contrato de tokens, está en el playground, tiene las dos capturas generadas.
- **`por_que_entro`** es obligatoria y es de quien lo agregó, con sus palabras. Es lo que
  te hace acordar a los 500. `/ui-agregar` rechaza "me gusta", "está bueno" y cualquier
  frase sin un detalle concreto.
- **`caracter`** tiene tres ejes con valores cerrados:
  `movimiento` ∈ {ninguno, sutil, marcado, protagonista};
  `tono` ∈ {sobrio, premium, jugueton, tecnico, editorial};
  `densidad` ∈ {compacto, equilibrado, aire}.
  **Lo infiere Claude** al analizar el origen y lo escribe solo; a la persona no se le
  pregunta nunca, porque el equipo no es técnico y tres ejes son abrumadores. Es
  opcional (puede faltar o venir incompleto) y en la búsqueda **suma relevancia, no
  filtra**: un componente sin `caracter` sigue apareciendo.
- **`licencia`**: `MIT`, `Apache-2.0`, `ISC`, `CC0`, `propia` (lo hicimos nosotros) o
  `desconocida`. `publicable` sólo puede ser `true` con las cinco primeras.
- **`tokens`** lista los `--ui-*` que el componente consume. `catalogar.mjs` comprueba
  que coincida con el código.
- **`usado_en`** lo mantiene `/ui-usar`. Sirve para buscar "lo que ya usamos en campus".
- `slug` es único en todo el repo, en minúsculas con guiones, sin acentos.

## El contrato de tokens

Un componente adoptado usa **sólo** estas variables. Nunca hex, `rgb()`, `hsl()`, ni
clases de color crudas de Tailwind (`bg-blue-500`, `text-slate-400`).

| Token | Qué es |
|---|---|
| `--ui-bg` | fondo de la pantalla |
| `--ui-surface`, `--ui-surface-2` | tarjeta o barra; hover y campos |
| `--ui-ink`, `--ui-ink-soft`, `--ui-ink-muted` | texto principal, secundario, metadato |
| `--ui-line` | bordes de 1px |
| `--ui-accent`, `--ui-accent-ink` | el color que destaca, y el texto que va encima |
| `--ui-radius`, `--ui-radius-lg` | radio de controles; de tarjetas y paneles |
| `--ui-font-display`, `--ui-font-text` | familia de títulos; de texto |
| `--ui-dur`, `--ui-ease` | duración y curva base del movimiento |

`tokens.css` define el contrato con un tema de muestra (claro y oscuro, en OKLCH) para
que el playground y las capturas tengan con qué pintar. Cada app lo mapea **una vez** en
su `globals.css`, a sus tokens reales. Ejemplo para `mi`:

```css
:root {
  --ui-bg: var(--bg);
  --ui-surface: var(--surface);
  --ui-surface-2: var(--surface-2);
  --ui-ink: var(--ink);
  --ui-ink-soft: var(--ink-soft);
  --ui-ink-muted: var(--ink-muted);
  --ui-line: var(--line);
  --ui-accent: var(--accent);
  --ui-accent-ink: var(--accent-ink);
  --ui-radius: 0.75rem;
  --ui-radius-lg: 1.25rem;
  --ui-font-display: var(--font-display);
  --ui-font-text: var(--font-text);
  --ui-dur: 180ms;
  --ui-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

Si un componente necesita un color que el contrato no tiene (un degradé de tres pasos,
un brillo), lo **deriva** del acento o del fondo con `color-mix()` o con OKLCH relativo
(`oklch(from var(--ui-accent) calc(l + 0.1) c h)`). Si no se puede derivar, no está listo
para `adoptado`: entra como referencia hasta que alguien resuelva cómo.

Lo que el componente trae propio y la app no toca: geometría, movimiento, interacción,
estructura. Eso es su carácter y es la razón por la que entró.

Los `--ui-dur` y `--ui-ease` son la base; un componente puede multiplicarlos
(`calc(var(--ui-dur) * 2)`) pero no fijar milisegundos. Todo movimiento respeta
`prefers-reduced-motion`.

## El playground

App Next.js mínima en `playground/`, con la misma versión de Next, React, Tailwind y
`motion` que las apps del ecosistema. Es a la vez hoja de pruebas, fuente de las capturas
y semilla de la futura galería pública.

- Una ruta por componente adoptado: `/c/<categoria>/<slug>`. Y una ruta índice con la
  grilla de todos.
- Cada componente exporta, además del componente, un `demo.tsx` con uno o más ejemplos
  (`export default [{ nombre, render }]`). El playground renderiza esos ejemplos.
- **Selector de tema** arriba: tema de muestra, `mi`, `etconecta`, `campus`,
  `proyectos`. Los temas son archivos CSS en `temas/` que mapean `--ui-*` a valores
  copiados de cada app. Se actualizan a mano cuando una app cambia sus tokens; el
  playground es un espejo, no la fuente. Y botón claro/oscuro.
- Las rutas y el índice se generan a partir de `catalog.json`, nunca a mano.
- `npm run dev` lo levanta en `localhost:3100`: puerto propio, para no chocar con la app
  que la persona tenga corriendo en el 3000.

## Las capturas

`scripts/capturar.mjs` levanta el playground, recorre los adoptados que no tienen
captura o cuyo código cambió desde la última (hash en `meta.json`, campo `captura_de`),
y con Playwright saca:

- **`preview.png`**: 1200×600, el primer ejemplo del `demo.tsx`, tema de muestra, claro
  a la izquierda y oscuro a la derecha. Es la que Claude muestra en el chat.
- **`preview.webp`** animada: 600 px de ancho, 12 fps, 3 segundos en loop, tema de
  muestra claro. Playwright graba video del primer ejemplo del `demo.tsx` ejecutando el
  guion de interacción del componente (`guion.mjs` al lado, `export default async (page)
  => {...}` con hover, clic, scroll; va en un archivo aparte porque el capturador corre en
  Node y no importa TSX; si no existe, se graba la entrada y un hover al centro). El video pasa a WebP con
  `ffmpeg`. Tope: **400 KB**; si se pasa, `capturar.mjs` baja fps y largo hasta entrar, y
  si no entra falla y lo dice.

Para una `referencia`, las capturas las pone quien la agrega: lo que baje del origen, o
Playwright sobre la URL original si la página lo permite. Si no hay forma, `preview.png`
es obligatoria y `preview.webp` opcional, y la ficha lo anota (`capturas: "manual"`).

Por qué dos archivos: Claude lee PNG en el chat; el humano en GitHub necesita ver el
movimiento, y GitHub renderiza WebP animado dentro de un README sin ningún deploy.

## El catalogador

`scripts/catalogar.mjs` es el test del repo. Recorre `components/` y `patterns/` y:

1. Valida cada `meta.json` contra el esquema (campos, valores cerrados de `caracter`,
   `licencia` vs `publicable`, slug único, carpeta = slug, categoría conocida).
2. En los `adoptado`: exige al menos un `.tsx` y un `demo.tsx`, `preview.png`,
   `preview.webp`, y que el código no tenga hex, `rgb(`, `hsl(`, ni clases de color
   crudas de Tailwind. Comprueba que los `--ui-*` usados en el código sean exactamente
   los de `tokens` en la ficha.
3. Comprueba el tope de peso de cada `preview.webp`.
4. Escribe `catalog.json`: array de fichas más `ruta` y `url_github` de cada una.
5. Escribe los README generados: `components/README.md`, uno por categoría y el índice de
   `README.md` raíz. Cada entrada es la `preview.webp` (o el PNG si no hay), nombre,
   estado, `por_que_entro`, link a la carpeta. Los README de cada componente **no** se
   generan: los escribe quien agrega.

Falla con mensaje claro y código de salida 1. Corre en local (`npm test`) y en GitHub
Actions en cada push, junto con el build del playground.

## Los tres comandos

Viven en `base/claude/commands/` y `armar-plataformas.mjs` los copia a
`Plataformas\.claude\commands\`, igual que los agentes. Así funcionan desde cualquier
carpeta del ecosistema. Localizan la librería en `../ui-library` relativo a la app, o
en `Plataformas\ui-library`; si no está clonada, lo dicen y dan el `git clone`.

### `/ui-agregar <url | descripción | ruta a captura | código pegado>`

1. **Lee la fuente.** URL: WebFetch; si la página es JS pura y no se puede leer, pide
   una captura o el código pegado. Captura: la lee como imagen. Descripción: trabaja
   con eso.
2. **Busca duplicados** en `catalog.json` por categoría, etiquetas y carácter. Si hay
   algo parecido, lo muestra con su captura y pregunta si igual entra o si se actualiza
   el existente.
3. **Propone** categoría, nombre, slug, etiquetas, carácter, licencia detectada (busca
   LICENSE o la nota de licencia en la página; si no la encuentra, `desconocida`).
4. **Pregunta tres cosas, de a una, en castellano llano**, y espera cada respuesta.
   Son las únicas preguntas que se le hacen a la persona; todo lo demás (categoría,
   etiquetas, carácter, licencia) lo decide Claude y lo muestra como propuesta.
   - ¿Qué te gustó? (en tus palabras: esto va a `por_que_entro`, y no acepta frases
     vacías; si la respuesta es "me gusta", repregunta "¿qué cosa en particular?").
   - ¿Para qué lo usarías? (va a `sirve_para`; si nombra una app, va también a
     `etiquetas`).
   - ¿Lo guardo como idea o lo armo ahora para usarlo? (referencia o adoptado, sin
     usar esas palabras).
5. **Si referencia:** crea la carpeta, `meta.json`, `README.md`, baja o saca las
   capturas, anota `capturas: "manual"` si corresponde.
6. **Si adoptado:** portea el componente a nuestro stack contra el contrato de tokens;
   deriva los colores que falten; escribe `demo.tsx` con guion de interacción; corre
   `capturar.mjs` y `catalogar.mjs`; si el catalogador falla, arregla y repite. Si no
   logra que pase sin colores crudos, lo deja como `referencia` y explica qué falta.
7. **Commit y push** en `ui`: `agrega(<categoria>): <nombre> (<estado>)`. Si el push
   falla por conflicto, hace pull con rebase y reintenta una vez.

### `/ui-buscar <qué necesitás> [--vivo]`

1. Lee `catalog.json`. Si está desactualizado respecto de las carpetas (hash), corre
   `catalogar.mjs` primero.
2. Interpreta el pedido: categoría, carácter, uso, app. "Botón sutil para el perfil de
   ET Conecta" → `categoria: botones`, `sirve_para ~ perfil`, y suma puntos a
   `movimiento: sutil|ninguno` y a `usado_en: etconecta`. **Sólo la categoría excluye**;
   carácter, uso y app ordenan. Si la categoría no se puede inferir, no excluye nada.
3. Devuelve **hasta cinco** candidatos ordenados por relevancia. Por cada uno: nombre,
   estado, `por_que_entro`, `preview.png` mostrada en el chat, link a la carpeta en
   GitHub. Si hay más de cinco, lo dice y ofrece afinar.
4. Si no hay nada, lo dice y ofrece `/ui-agregar`.
5. Con `--vivo`: levanta el playground si no está corriendo y abre el navegador en
   `/buscar?slugs=a,b,c`, una ruta del playground que renderiza los candidatos uno abajo
   del otro con el selector de tema.

### `/ui-usar <slug> [--en <ruta de la app>]`

Se corre parado en una app (o con `--en`).

1. Comprueba que el slug exista y sea `adoptado`. Si es `referencia`, lo dice y ofrece
   portearlo (que es `/ui-agregar` sobre el existente).
2. Lee `DESIGN.md` y `globals.css` de la app.
3. Si la app no tiene el mapeo `--ui-*`, lo **propone** derivado de sus tokens, lo
   muestra, y recién con el sí lo escribe en `globals.css`. Si ya lo tiene, no lo toca.
4. Copia los archivos del componente a `src/components/ui/<slug>/` (o la carpeta de
   primitivas que la app use, según `DESIGN.md`), ajusta imports, y si la app está en JS
   lo convierte a JS. No copia `demo.tsx`.
5. Si el componente necesita una dependencia que la app no tiene (`motion`), lo dice y
   la instala sólo con el sí.
6. Actualiza `usado_en` en la ficha de la librería y commitea **en `ui`**:
   `usa(<slug>): <app>`.
7. **No commitea en la app.** Eso es de quien trabaja ahí, con la regla de un cambio por
   deploy.

## El bibliotecario: `CLAUDE.md` del repo

Reglas para cuando Claude trabaja parado en `ui-library`:

- Buscar antes de crear. Nunca duplicar: si existe algo parecido, se actualiza o se
  declina.
- Nada entra sin `por_que_entro` con contenido real, licencia y `publicable` decidido.
- `adoptado` sólo si `catalogar.mjs` pasa. No se marca a mano.
- Los README generados no se editan a mano; se corre `npm run catalogar`.
- Los temas de `temas/` son espejos de las apps: si una app cambió tokens, se copian; no
  se inventan.
- Español en nombres, slugs, categorías y textos. Código en TypeScript.
- Un commit por componente. Mensajes: `agrega(...)`, `usa(...)`, `actualiza(...)`,
  `retira(...)`.
- Retirar un componente es `estado: "retirado"` con `por_que_salio`, no borrar la
  carpeta: alguien lo puede estar usando. Único caso en que hay un tercer estado; no
  cuenta para búsqueda ni para el playground.

## Integración con el ecosistema

- **`base/scripts/armar-plataformas.mjs`**: suma `ui` a los repos que clona (en
  `ui-library`) y copia `base/claude/commands/` a `Plataformas\.claude\commands\`.
- **`base/CLAUDE.md`**: una fila en "Estructura en disco" (`ui-library\`), una fila en
  "Dónde quedamos" y una regla nueva: *antes de crear un componente visual, `/ui-buscar`;
  si creaste uno que vale la pena, `/ui-agregar`.*
- **Agente `diseno`** (`base/claude/agents/diseno.md`): el paso 1 de "Diseñar una
  pantalla" pasa a ser buscar en la librería; si usa algo, `/ui-usar`; si creó algo
  reutilizable, propone `/ui-agregar`. Y en "Fuentes de verdad", la librería entra como
  quinta fuente, después de las primitivas de la app.
- Las apps **no dependen** de la librería en tiempo de ejecución: todo se copia. Si el
  repo `ui` desaparece mañana, ninguna app se entera.

## Verificación

- `npm test` en `ui-library` = `catalogar.mjs` más las pruebas unitarias. Falla si algo
  de la sección "El catalogador" no se cumple.
- CI en GitHub Actions: `npm test` + `npm run build` del playground, en cada push a
  `main`.
- Pruebas unitarias con Vitest para `catalogar.mjs`: esquema, detección de colores
  crudos, coincidencia de tokens, tope de peso, slug duplicado.
- Prueba de fuego al cerrar la implementación, en este orden:
  1. `/ui-agregar https://useplanes.com/components/scratch-card` → entra, se le hacen las
     preguntas, se portea como adoptado, pasa el catalogador, aparece animado en
     `components/<categoria>/README.md` en GitHub.
  2. `/ui-buscar "botón para un perfil"` → devuelve candidatos con captura en el chat.
  3. `/ui-usar <slug>` parado en una app de prueba (`proyectos` en local con
     `npm run dev:local`) → propone el mapeo, copia, compila.

## Fuera de alcance, a propósito

Galería pública, paquete npm, versionado de componentes, Figma, variantes por app dentro
de la librería, búsqueda semántica con embeddings (grep sobre `catalog.json` alcanza
hasta varios cientos; si deja de alcanzar, se suma), y el soporte a stacks que no sean
el nuestro.
