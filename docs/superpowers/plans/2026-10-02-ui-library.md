# Librería UI de EmpleoTecnia — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar funcionando el repo `EmpleoTecnia/ui` con catálogo validado, playground, capturas automáticas, un primer componente adoptado, y los tres comandos de Claude repartidos desde `base`.

**Architecture:** Un repo plano: fichas `meta.json` por carpeta, un catalogador en Node que valida y genera `catalog.json` + READMEs + el registro del playground, un playground Next.js que renderiza los adoptados con selector de tema, y un capturador con Playwright + ffmpeg. Los comandos son archivos Markdown de Claude Code que viven en `base/claude/commands/` y `armar-plataformas.mjs` los copia a `Plataformas/.claude/commands/`.

**Tech Stack:** Node 24, Next 16 (app router, Turbopack), React 19, Tailwind v4, `motion` 12, Lucide, Vitest 4, Playwright 1.63, ffmpeg 7 (ya instalado en la máquina de Franco; CI no lo necesita).

**Spec:** `docs/superpowers/specs/2026-10-02-ui-library-design.md`

## Global Constraints

- Todo en español: nombres de carpetas, slugs, categorías, textos, mensajes de error, commits. Código en TypeScript (los scripts del catalogador en `.mjs` plano, sin build).
- Un componente adoptado usa **sólo** los 15 tokens `--ui-*` del contrato. Nunca hex, `rgb()`, `hsl()`, `oklch()` absoluto ni clases de color crudas de Tailwind.
- Estados de ficha: `referencia`, `adoptado`, `retirado`. `adoptado` sólo si `catalogar.mjs` pasa.
- `preview.webp` ≤ 400 KB. `preview.png` 1200×600.
- `/ui-buscar` devuelve hasta 5. Sólo la categoría excluye; carácter, uso y app ordenan.
- `/ui-usar` nunca commitea en la app, sólo en `ui`.
- Versiones alineadas con las apps: `next ^16.3.1`, `react ^19.2.4`, `tailwindcss ^4.2.1`, `motion ^12.38.0`, `lucide-react ^1.11.0`.
- Commits en el repo `ui` con formato `tipo: qué` o `agrega(categoria): nombre (estado)`; todos terminan con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Los cambios en `base` (comandos, `armar-plataformas.mjs`, `CLAUDE.md`, `diseno.md`) se commitean en `base`, no en `ui`.

## Review Focus

1. **`meta.json` con JSON inválido** (coma de más): el catalogador debe decir el archivo y la línea, no tirar un stack trace. Prueba en Task 4.
2. **Carpeta cuyo nombre no coincide con el `slug`** (`components/botones/Boton-Iman/` con `slug: "boton-iman"`): debe fallar nombrando las dos. Prueba en Task 2.
3. **Clase de color cruda con variante** (`hover:bg-blue-500`, `dark:text-slate-400`, `bg-red-500/20`): el detector debe atraparla igual que sin variante. Prueba en Task 3.
4. **Token usado en el código pero no declarado en la ficha, y al revés**: las dos direcciones fallan con mensaje que dice cuál falta. Prueba en Task 4.
5. **`preview.webp` que no entra en 400 KB** después de bajar calidad, fps y largo: `capturar.mjs` falla nombrando el componente y el tamaño final, y no deja un archivo a medias. Prueba en Task 8.

---

### Task 1: Esqueleto del repo, contrato de tokens y repo en GitHub

**Files:**
- Create: `package.json`, `.gitignore`, `.editorconfig`, `tokens.css`, `lib/demo.ts`, `CLAUDE.md`, `README.md`, `components/.gitkeep`, `patterns/.gitkeep`, `temas/.gitkeep`
- Create (GitHub): repo privado `EmpleoTecnia/ui`

**Interfaces:**
- Produces: `tokens.css` con tres secciones marcadas (`PUENTE`, `MAPEO DE MUESTRA`, `TEMA DE MUESTRA`) que Task 5, 6 y el comando `/ui-usar` leen por marcador. `lib/demo.ts` exporta `type Demo = { nombre: string; render: () => ReactNode }` que Task 5 y 7 importan.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@empleotecnia/ui-library",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "next dev playground",
    "build": "next build playground",
    "start": "next start playground",
    "catalogar": "node scripts/catalogar.mjs",
    "capturar": "node scripts/capturar.mjs",
    "test": "vitest run",
    "verificar": "npm test && node scripts/catalogar.mjs && git diff --exit-code -- catalog.json README.md components patterns playground/registro.generado.tsx"
  },
  "dependencies": {
    "lucide-react": "^1.11.0",
    "motion": "^12.38.0",
    "next": "^16.3.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.1",
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "playwright": "^1.63.0",
    "tailwindcss": "^4.2.1",
    "typescript": "^5",
    "vitest": "^4.1.11"
  }
}
```

- [ ] **Step 2: `.gitignore` y `.editorconfig`**

`.gitignore`:
```
node_modules/
playground/.next/
playground/next-env.d.ts
.capturas-tmp/
*.log
.DS_Store
```

`.editorconfig`:
```
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
```

- [ ] **Step 3: `tokens.css`**

```css
/* ══════════════════════════════════════════════════════════════
   Contrato de tokens --ui-* de la librería UI de EmpleoTecnia
   ══════════════════════════════════════════════════════════════

   Un componente adoptado usa SÓLO estas 15 variables. Cada app las
   mapea una vez, en su globals.css, a sus tokens reales. Para eso:

   1. Copiá la sección PUENTE tal cual (convierte los tokens en
      clases de Tailwind: bg-ui-accent, rounded-ui, font-ui-display...).
   2. Copiá la sección MAPEO DE MUESTRA y reemplazá cada valor por el
      token de tu app (`/ui-usar` lo propone solo).

   La sección TEMA DE MUESTRA es sólo del playground: pinta los
   componentes cuando no hay app. No se copia. */

/* ── PUENTE (va tal cual en cada app) ─────────────────────────── */
@theme inline {
  --color-ui-bg: var(--ui-bg);
  --color-ui-surface: var(--ui-surface);
  --color-ui-surface-2: var(--ui-surface-2);
  --color-ui-ink: var(--ui-ink);
  --color-ui-ink-soft: var(--ui-ink-soft);
  --color-ui-ink-muted: var(--ui-ink-muted);
  --color-ui-line: var(--ui-line);
  --color-ui-accent: var(--ui-accent);
  --color-ui-accent-ink: var(--ui-accent-ink);
  --radius-ui: var(--ui-radius);
  --radius-ui-lg: var(--ui-radius-lg);
  --font-ui-display: var(--ui-font-display);
  --font-ui-text: var(--ui-font-text);
  --ease-ui: var(--ui-ease);
}
/* ── FIN PUENTE ───────────────────────────────────────────────── */

/* ── MAPEO DE MUESTRA (en tu app, cada var() apunta a tu token) ── */
/*
:root {
  --ui-bg: var(--tu-fondo);
  --ui-surface: var(--tu-tarjeta);
  --ui-surface-2: var(--tu-campo);
  --ui-ink: var(--tu-texto);
  --ui-ink-soft: var(--tu-texto-secundario);
  --ui-ink-muted: var(--tu-metadato);
  --ui-line: var(--tu-borde);
  --ui-accent: var(--tu-acento);
  --ui-accent-ink: var(--tu-texto-sobre-acento);
  --ui-radius: 0.75rem;
  --ui-radius-lg: 1.25rem;
  --ui-font-display: var(--tu-fuente-titulos);
  --ui-font-text: var(--tu-fuente-texto);
  --ui-dur: 180ms;
  --ui-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
*/
/* ── FIN MAPEO DE MUESTRA ─────────────────────────────────────── */

/* ── TEMA DE MUESTRA (sólo playground). Hue 300: el hilo del ecosistema ── */
[data-tema="muestra"] {
  --ui-bg: oklch(0.975 0.006 300);
  --ui-surface: oklch(1 0 0);
  --ui-surface-2: oklch(0.945 0.010 300);
  --ui-ink: oklch(0.21 0.03 300);
  --ui-ink-soft: oklch(0.42 0.025 300);
  --ui-ink-muted: oklch(0.55 0.02 300);
  --ui-line: oklch(0.90 0.012 300);
  --ui-accent: oklch(0.55 0.20 300);
  --ui-accent-ink: oklch(0.99 0.01 300);
  --ui-radius: 0.75rem;
  --ui-radius-lg: 1.25rem;
  --ui-font-display: ui-sans-serif, system-ui, sans-serif;
  --ui-font-text: ui-sans-serif, system-ui, sans-serif;
  --ui-dur: 180ms;
  --ui-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
[data-tema="muestra"][data-modo="oscuro"] {
  --ui-bg: oklch(0.16 0.02 300);
  --ui-surface: oklch(0.21 0.025 300);
  --ui-surface-2: oklch(0.26 0.03 300);
  --ui-ink: oklch(0.98 0.005 300);
  --ui-ink-soft: oklch(0.80 0.02 300);
  --ui-ink-muted: oklch(0.68 0.022 300);
  --ui-line: oklch(0.33 0.03 300);
  --ui-accent: oklch(0.75 0.17 300);
  --ui-accent-ink: oklch(0.18 0.04 300);
}
/* ── FIN TEMA DE MUESTRA ──────────────────────────────────────── */
```

- [ ] **Step 4: `lib/demo.ts`**

```ts
import type { ReactNode } from 'react'

/** Un ejemplo que el playground renderiza y el capturador fotografía.
 *  Cada componente adoptado exporta `Demo[]` por defecto desde su `demo.tsx`.
 *  El primero de la lista es el que sale en preview.png y preview.webp. */
export type Demo = {
  nombre: string
  render: () => ReactNode
}
```

- [ ] **Step 5: `CLAUDE.md` del repo (el bibliotecario)**

```markdown
# Librería UI de EmpleoTecnia — reglas del bibliotecario

Este repo es la colección curada de componentes y patrones de interfaz del equipo.
Diseño completo en `docs/superpowers/specs/2026-10-02-ui-library-design.md`. Leelo
antes de agregar o cambiar algo.

## Qué es cada cosa

- `components/<categoria>/<slug>/` y `patterns/<categoria>/<slug>/`: una entrada por
  carpeta. `meta.json` es la ficha, `README.md` lo escribe quien agrega, `preview.png`
  y `preview.webp` las saca `npm run capturar`, y los `.tsx` existen sólo si está adoptado.
- `catalog.json`, `components/README.md`, `patterns/README.md`, los README de cada
  categoría, el bloque entre `<!-- catalogo:inicio -->` y `<!-- catalogo:fin -->` del
  README raíz y `playground/registro.generado.tsx` los **genera** `npm run catalogar`.
  No se editan a mano.
- `tokens.css`: el contrato de 15 tokens `--ui-*`. Un adoptado usa sólo eso.
- `temas/`: espejos de los tokens de cada app, mapeados a `--ui-*`. Si una app cambió,
  se copian; no se inventan.
- `playground/`: Next.js mínimo que renderiza los adoptados. `npm run dev`.

## Reglas

1. **Buscar antes de crear.** `catalog.json` primero. Si existe algo parecido, se
   actualiza o se declina; nunca se duplica.
2. **Nada entra sin `por_que_entro` con un detalle concreto**, en palabras de quien lo
   agregó. "Me gusta" no es una razón. Y sin licencia y `publicable` decididos.
3. **`adoptado` sólo si `npm run verificar` pasa.** No se marca a mano.
4. **Colores: sólo el contrato.** Nada de hex, `rgb()`, `hsl()`, `oklch()` absoluto ni
   `bg-blue-500`. Lo que falte se deriva del acento con `color-mix()` o
   `oklch(from var(--ui-accent) ...)`. Si no se puede derivar, queda como referencia.
5. **Movimiento desde `--ui-dur` y `--ui-ease`.** Se multiplican, no se fijan ms. Todo
   respeta `prefers-reduced-motion`.
6. **El carácter lo inferís vos**, nunca se lo preguntás a la persona. Es opcional y
   sólo ordena la búsqueda.
7. **Español** en nombres, slugs (sin acentos, con guiones), categorías y textos. Código
   en TypeScript.
8. **Un commit por componente.** `agrega(categoria): nombre (estado)`,
   `usa(slug): app`, `actualiza(slug): qué`, `retira(slug): por qué`.
9. **Retirar es `estado: "retirado"` + `por_que_salio`**, no borrar la carpeta: alguien
   lo puede estar usando.

## Comandos del equipo

`/ui-agregar`, `/ui-buscar`, `/ui-usar` viven en `base/claude/commands/` y se reparten
con `node base/scripts/armar-plataformas.mjs`. Si los cambiás, commiteá en `base`.
```

- [ ] **Step 6: `README.md` raíz con marcadores**

```markdown
# Librería UI de EmpleoTecnia

Componentes y patrones de interfaz que al equipo le gustaron, porteados a nuestro stack
(Next.js, React, Tailwind v4, `motion`, Lucide) y pintados con los tokens de cada app.
Las apps son ciudades de un mismo país: comparten el carácter de cada pieza —forma,
movimiento, interacción— y cada una pone su color, su radio y su tipografía.

## Cómo se usa

Desde Claude Code, parado en cualquier carpeta de `Plataformas`:

- `/ui-buscar navbar sutil para el perfil` — muestra hasta cinco candidatos con captura.
- `/ui-usar <slug>` — parado en una app: copia el componente a `src/components/ui/` y
  propone el mapeo de tokens si la app no lo tiene.
- `/ui-agregar <url | descripción | captura>` — guarda algo que te gustó. Te pregunta
  qué te gustó y para qué lo usarías. Nada más.

Para verlo vivo: `npm install && npm run dev` y abrí `http://localhost:3000`. El
selector de arriba pinta cada componente con los tokens de `mi`, `etconecta`, `campus`
o `proyectos`.

## El contrato de tokens

Un componente adoptado usa sólo las 15 variables `--ui-*` de [`tokens.css`](tokens.css).
Tu app las mapea una vez a sus propios tokens, y listo.

## Catálogo

<!-- catalogo:inicio -->
Todavía no hay entradas. Corré `npm run catalogar` después de agregar la primera.
<!-- catalogo:fin -->
```

- [ ] **Step 7: carpetas vacías, instalar, commit**

```bash
mkdir -p components patterns temas && touch components/.gitkeep patterns/.gitkeep temas/.gitkeep
npm install
git add -A
git commit -m "feat: esqueleto del repo y contrato de tokens --ui-*

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: `npm install` termina sin errores; `node_modules/` ignorado.

- [ ] **Step 8: crear el repo en GitHub y empujar**

```bash
gh repo create EmpleoTecnia/ui --private --description "Librería UI curada de EmpleoTecnia: componentes porteados a nuestro stack, pintados con los tokens de cada app" --source . --remote origin --push
git remote -v
```

Expected: `origin https://github.com/EmpleoTecnia/ui.git`, rama `main` arriba.

---

### Task 2: El contrato y la validación de fichas

**Files:**
- Create: `scripts/lib/contrato.mjs`, `scripts/lib/ficha.mjs`
- Test: `scripts/tests/ficha.test.mjs`

**Interfaces:**
- Produces: `contrato.mjs` exporta `TOKENS` (array de 15 strings), `CLASES` (objeto clase→token), `CATEGORIAS` (`{ components: string[], patterns: string[] }`), `ESTADOS`, `LICENCIAS`, `PUBLICABLES`, `CARACTER` (`{ movimiento, tono, densidad }` arrays), `TOPE_WEBP` (number), `FRASES_VACIAS`. `ficha.mjs` exporta `validarFicha(ficha, { carpeta, tipo }) => string[]` (lista de errores, vacía si está bien).

- [ ] **Step 1: `scripts/lib/contrato.mjs`**

```js
// Lo que el catalogador y los comandos dan por cierto. Si algo de acá cambia,
// cambia la spec primero (docs/superpowers/specs/2026-10-02-ui-library-design.md).

export const TOKENS = [
  '--ui-bg', '--ui-surface', '--ui-surface-2',
  '--ui-ink', '--ui-ink-soft', '--ui-ink-muted',
  '--ui-line',
  '--ui-accent', '--ui-accent-ink',
  '--ui-radius', '--ui-radius-lg',
  '--ui-font-display', '--ui-font-text',
  '--ui-dur', '--ui-ease',
]

// Sufijo de clase de Tailwind (lo que sigue al prefijo de utilidad) → token.
// `bg-ui-accent` → `--ui-accent`; `rounded-ui-lg` → `--ui-radius-lg`.
export const CLASES = {
  'ui-bg': '--ui-bg',
  'ui-surface': '--ui-surface',
  'ui-surface-2': '--ui-surface-2',
  'ui-ink': '--ui-ink',
  'ui-ink-soft': '--ui-ink-soft',
  'ui-ink-muted': '--ui-ink-muted',
  'ui-line': '--ui-line',
  'ui-accent': '--ui-accent',
  'ui-accent-ink': '--ui-accent-ink',
}

export const CATEGORIAS = {
  components: ['botones', 'tarjetas', 'navegacion', 'formularios', 'fondos', 'animaciones', 'secciones', 'feedback'],
  patterns: ['landing', 'perfil', 'onboarding', 'dashboard', 'auth', 'pricing'],
}

export const ESTADOS = ['referencia', 'adoptado', 'retirado']

export const LICENCIAS = ['MIT', 'Apache-2.0', 'ISC', 'CC0', 'propia', 'desconocida']
export const PUBLICABLES = ['MIT', 'Apache-2.0', 'ISC', 'CC0', 'propia']

export const CARACTER = {
  movimiento: ['ninguno', 'sutil', 'marcado', 'protagonista'],
  tono: ['sobrio', 'premium', 'jugueton', 'tecnico', 'editorial'],
  densidad: ['compacto', 'equilibrado', 'aire'],
}

export const TOPE_WEBP = 400 * 1024

// Razones que no cuentan como razón.
export const FRASES_VACIAS = ['me gusta', 'esta bueno', 'está bueno', 'lindo', 'copado', 'bueno', 'me gusto', 'me gustó']

export const REPO_GITHUB = 'https://github.com/EmpleoTecnia/ui'
```

- [ ] **Step 2: el test que falla**

`scripts/tests/ficha.test.mjs`:
```js
import { describe, it, expect } from 'vitest'
import { validarFicha } from '../lib/ficha.mjs'

const buena = () => ({
  slug: 'boton-iman',
  nombre: 'Botón imán',
  categoria: 'botones',
  estado: 'adoptado',
  origen: { nombre: 'EmpleoTecnia', url: '', licencia: 'propia' },
  publicable: true,
  por_que_entro: 'El botón se corre hacia el cursor y vuelve con un resorte; se siente vivo sin gritar.',
  sirve_para: ['CTA de landing'],
  no_sirve_para: ['listas largas'],
  etiquetas: ['hover', 'cursor', 'cta'],
  caracter: { movimiento: 'sutil', tono: 'premium', densidad: 'aire' },
  tokens: ['--ui-accent', '--ui-accent-ink', '--ui-radius'],
  dependencias: ['motion'],
  usado_en: [],
  agregado_por: 'franco',
  fecha: '2026-10-02',
})

const ctx = { carpeta: 'boton-iman', tipo: 'components' }

describe('validarFicha', () => {
  it('acepta una ficha completa', () => {
    expect(validarFicha(buena(), ctx)).toEqual([])
  })

  it('exige que la carpeta se llame como el slug', () => {
    const errores = validarFicha(buena(), { carpeta: 'Boton-Iman', tipo: 'components' })
    expect(errores.join('\n')).toMatch(/carpeta "Boton-Iman".*slug "boton-iman"/)
  })

  it('rechaza slugs con mayúsculas, acentos o guiones dobles', () => {
    for (const slug of ['Boton', 'botón', 'boton--iman', '-boton']) {
      expect(validarFicha({ ...buena(), slug }, { carpeta: slug, tipo: 'components' }).join()).toMatch(/slug/)
    }
  })

  it('rechaza una categoría que no existe para ese tipo', () => {
    expect(validarFicha({ ...buena(), categoria: 'landing' }, ctx).join()).toMatch(/categor/)
  })

  it('rechaza un estado desconocido y exige por_que_salio en retirado', () => {
    expect(validarFicha({ ...buena(), estado: 'probado' }, ctx).join()).toMatch(/estado/)
    expect(validarFicha({ ...buena(), estado: 'retirado' }, ctx).join()).toMatch(/por_que_salio/)
    expect(validarFicha({ ...buena(), estado: 'retirado', por_que_salio: 'Lo reemplazó boton-halo.' }, ctx)).toEqual([])
  })

  it('no deja publicable=true con licencia desconocida', () => {
    const f = buena(); f.origen.licencia = 'desconocida'
    expect(validarFicha(f, ctx).join()).toMatch(/publicable/)
  })

  it('rechaza una razón vacía o corta', () => {
    expect(validarFicha({ ...buena(), por_que_entro: 'me gusta' }, ctx).join()).toMatch(/por_que_entro/)
    expect(validarFicha({ ...buena(), por_que_entro: 'Está bueno.' }, ctx).join()).toMatch(/por_que_entro/)
    expect(validarFicha({ ...buena(), por_que_entro: '' }, ctx).join()).toMatch(/por_que_entro/)
  })

  it('el carácter es opcional pero, si viene, con valores cerrados', () => {
    const sin = buena(); delete sin.caracter
    expect(validarFicha(sin, ctx)).toEqual([])
    expect(validarFicha({ ...buena(), caracter: { movimiento: 'sutil' } }, ctx)).toEqual([])
    expect(validarFicha({ ...buena(), caracter: { movimiento: 'rapido' } }, ctx).join()).toMatch(/caracter\.movimiento/)
    expect(validarFicha({ ...buena(), caracter: { peso: 'liviano' } }, ctx).join()).toMatch(/caracter\.peso/)
  })

  it('en adoptado exige tokens del contrato', () => {
    expect(validarFicha({ ...buena(), tokens: [] }, ctx).join()).toMatch(/tokens/)
    expect(validarFicha({ ...buena(), tokens: ['--ui-rojo'] }, ctx).join()).toMatch(/--ui-rojo/)
    const ref = { ...buena(), estado: 'referencia', tokens: [] }
    expect(validarFicha(ref, ctx)).toEqual([])
  })

  it('exige fecha AAAA-MM-DD y listas donde van listas', () => {
    expect(validarFicha({ ...buena(), fecha: '2/10/2026' }, ctx).join()).toMatch(/fecha/)
    expect(validarFicha({ ...buena(), sirve_para: 'landing' }, ctx).join()).toMatch(/sirve_para/)
    expect(validarFicha({ ...buena(), etiquetas: [] }, ctx).join()).toMatch(/etiquetas/)
  })

  it('rechaza campos que no existen en la ficha', () => {
    expect(validarFicha({ ...buena(), color: 'rojo' }, ctx).join()).toMatch(/"color"/)
  })
})
```

- [ ] **Step 3: correr y ver que falla**

Run: `npx vitest run scripts/tests/ficha.test.mjs`
Expected: FAIL, `Cannot find module '../lib/ficha.mjs'`.

- [ ] **Step 4: `scripts/lib/ficha.mjs`**

```js
import { CATEGORIAS, ESTADOS, LICENCIAS, PUBLICABLES, CARACTER, TOKENS, FRASES_VACIAS } from './contrato.mjs'

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/

const CAMPOS = new Set([
  'slug', 'nombre', 'categoria', 'estado', 'origen', 'publicable', 'por_que_entro', 'por_que_salio',
  'sirve_para', 'no_sirve_para', 'etiquetas', 'caracter', 'tokens', 'dependencias', 'usado_en',
  'agregado_por', 'fecha', 'capturas', 'captura_de',
])

const esTexto = v => typeof v === 'string' && v.trim().length > 0
const esLista = v => Array.isArray(v) && v.every(x => typeof x === 'string')

/** Devuelve la lista de errores de una ficha. Vacía si está bien. */
export function validarFicha(ficha, { carpeta, tipo }) {
  const e = []
  if (!ficha || typeof ficha !== 'object') return ['la ficha no es un objeto']

  for (const campo of Object.keys(ficha)) {
    if (!CAMPOS.has(campo)) e.push(`campo "${campo}" no existe en la ficha`)
  }

  for (const campo of ['slug', 'nombre', 'categoria', 'estado', 'agregado_por', 'fecha']) {
    if (!esTexto(ficha[campo])) e.push(`falta ${campo}`)
  }

  if (esTexto(ficha.slug)) {
    if (!SLUG.test(ficha.slug)) e.push(`slug "${ficha.slug}" inválido: minúsculas, números y guiones simples, sin acentos`)
    if (ficha.slug !== carpeta) e.push(`la carpeta "${carpeta}" no se llama como el slug "${ficha.slug}"`)
  }

  const categorias = CATEGORIAS[tipo] ?? []
  if (esTexto(ficha.categoria) && !categorias.includes(ficha.categoria)) {
    e.push(`categoría "${ficha.categoria}" no existe en ${tipo}; las conocidas: ${categorias.join(', ')}`)
  }

  if (esTexto(ficha.estado) && !ESTADOS.includes(ficha.estado)) e.push(`estado "${ficha.estado}" no existe; vale ${ESTADOS.join(', ')}`)
  if (ficha.estado === 'retirado' && !esTexto(ficha.por_que_salio)) e.push('un retirado necesita por_que_salio')

  if (!ficha.origen || typeof ficha.origen !== 'object') e.push('falta origen { nombre, url, licencia }')
  else {
    if (!esTexto(ficha.origen.nombre)) e.push('falta origen.nombre')
    if (typeof ficha.origen.url !== 'string') e.push('origen.url tiene que ser texto (vacío si es propio)')
    if (!LICENCIAS.includes(ficha.origen.licencia)) e.push(`origen.licencia "${ficha.origen.licencia}" no vale; vale ${LICENCIAS.join(', ')}`)
  }

  if (typeof ficha.publicable !== 'boolean') e.push('publicable tiene que ser true o false')
  else if (ficha.publicable && ficha.origen && !PUBLICABLES.includes(ficha.origen.licencia)) {
    e.push(`publicable no puede ser true con licencia "${ficha.origen.licencia}"`)
  }

  const razon = (ficha.por_que_entro ?? '').trim().toLowerCase().replace(/[.!]+$/, '')
  if (!razon) e.push('por_que_entro está vacío')
  else if (razon.length < 20 || FRASES_VACIAS.includes(razon)) {
    e.push(`por_que_entro "${ficha.por_que_entro}" no dice nada concreto; contá qué detalle te gustó`)
  }

  if (!esLista(ficha.sirve_para) || ficha.sirve_para.length === 0) e.push('sirve_para tiene que ser una lista con al menos un uso')
  if (ficha.no_sirve_para !== undefined && !esLista(ficha.no_sirve_para)) e.push('no_sirve_para tiene que ser una lista')
  if (!esLista(ficha.etiquetas) || ficha.etiquetas.length === 0) e.push('etiquetas tiene que ser una lista con al menos una')
  if (ficha.dependencias !== undefined && !esLista(ficha.dependencias)) e.push('dependencias tiene que ser una lista')
  if (ficha.usado_en !== undefined && !esLista(ficha.usado_en)) e.push('usado_en tiene que ser una lista')

  if (ficha.caracter !== undefined) {
    if (typeof ficha.caracter !== 'object' || ficha.caracter === null) e.push('caracter tiene que ser un objeto')
    else for (const [eje, valor] of Object.entries(ficha.caracter)) {
      if (!CARACTER[eje]) e.push(`caracter.${eje} no es un eje; valen ${Object.keys(CARACTER).join(', ')}`)
      else if (!CARACTER[eje].includes(valor)) e.push(`caracter.${eje} "${valor}" no vale; vale ${CARACTER[eje].join(', ')}`)
    }
  }

  if (ficha.tokens !== undefined && !esLista(ficha.tokens)) e.push('tokens tiene que ser una lista')
  else if (ficha.estado === 'adoptado' && (!ficha.tokens || ficha.tokens.length === 0)) e.push('un adoptado declara en tokens los --ui-* que usa')
  for (const t of ficha.tokens ?? []) if (!TOKENS.includes(t)) e.push(`token "${t}" no está en el contrato`)

  if (esTexto(ficha.fecha) && !FECHA.test(ficha.fecha)) e.push(`fecha "${ficha.fecha}" tiene que ser AAAA-MM-DD`)
  if (ficha.capturas !== undefined && ficha.capturas !== 'manual') e.push('capturas sólo puede valer "manual"')
  if (ficha.captura_de !== undefined && !esTexto(ficha.captura_de)) e.push('captura_de tiene que ser texto')

  return e
}
```

- [ ] **Step 5: correr y ver que pasa**

Run: `npx vitest run scripts/tests/ficha.test.mjs`
Expected: PASS, 11 tests.

- [ ] **Step 6: commit**

```bash
git add scripts/lib/contrato.mjs scripts/lib/ficha.mjs scripts/tests/ficha.test.mjs
git commit -m "feat: contrato de tokens y validación de fichas

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Detector de colores crudos y de tokens usados

**Files:**
- Create: `scripts/lib/codigo.mjs`
- Test: `scripts/tests/codigo.test.mjs`

**Interfaces:**
- Produces: `coloresCrudos(src) => { linea: number, texto: string, motivo: string }[]` y `tokensUsados(src) => { tokens: Set<string>, desconocidas: string[] }`. Task 4 las usa sobre cada archivo de código de un adoptado.

- [ ] **Step 1: el test que falla**

`scripts/tests/codigo.test.mjs`:
```js
import { describe, it, expect } from 'vitest'
import { coloresCrudos, tokensUsados } from '../lib/codigo.mjs'

describe('coloresCrudos', () => {
  it('no se queja de un componente limpio', () => {
    const src = `className="bg-ui-accent text-ui-accent-ink rounded-ui hover:bg-ui-surface-2 ring-ui-line/40"
      style={{ boxShadow: '0 0 0 1px color-mix(in oklch, var(--ui-accent) 30%, transparent)' }}
      const brillo = 'oklch(from var(--ui-accent) calc(l + 0.1) c h)'`
    expect(coloresCrudos(src)).toEqual([])
  })

  it('atrapa hex, rgb, hsl y oklch absoluto con línea', () => {
    const src = ['const a = "#ff0000"', 'color: rgb(1,2,3)', 'x: hsla(1,2%,3%,.5)', 'y: oklch(0.5 0.2 300)'].join('\n')
    const h = coloresCrudos(src)
    expect(h.map(x => x.linea)).toEqual([1, 2, 3, 4])
    expect(h[0].texto).toBe('#ff0000')
    expect(h[3].motivo).toMatch(/oklch/)
  })

  it('atrapa clases crudas de Tailwind con y sin variante, con opacidad', () => {
    const src = 'className="bg-blue-500 hover:text-slate-400 dark:border-zinc-800 from-red-500/20 md:hover:bg-white"'
    expect(coloresCrudos(src).map(x => x.texto)).toEqual([
      'bg-blue-500', 'hover:text-slate-400', 'dark:border-zinc-800', 'from-red-500/20', 'md:hover:bg-white',
    ])
  })

  it('no confunde clases que no son de color', () => {
    expect(coloresCrudos('className="text-sm bg-cover border-2 ring-offset-2 shadow-lg to-50%"')).toEqual([])
  })

  it('respeta la marca color-ok en la línea', () => {
    expect(coloresCrudos('const transparente = "#0000" // color-ok: es transparente')).toEqual([])
  })
})

describe('tokensUsados', () => {
  it('junta var(--ui-*), clases puente y arbitrarias', () => {
    const src = `className="bg-ui-accent text-ui-ink/70 rounded-ui-lg font-ui-display ease-ui duration-(--ui-dur) hover:bg-ui-surface-2"
      style={{ borderColor: 'var(--ui-line)' }}`
    const { tokens, desconocidas } = tokensUsados(src)
    expect([...tokens].sort()).toEqual([
      '--ui-accent', '--ui-dur', '--ui-ease', '--ui-font-display', '--ui-ink', '--ui-line', '--ui-radius-lg', '--ui-surface-2',
    ])
    expect(desconocidas).toEqual([])
  })

  it('mapea rounded-ui a --ui-radius y font-ui-text a --ui-font-text', () => {
    const { tokens } = tokensUsados('className="rounded-ui rounded-t-ui font-ui-text"')
    expect([...tokens].sort()).toEqual(['--ui-font-text', '--ui-radius'])
  })

  it('reporta clases ui-* que no existen', () => {
    const { desconocidas } = tokensUsados('className="bg-ui-rojo text-ui-ink"')
    expect(desconocidas).toEqual(['bg-ui-rojo'])
  })
})
```

- [ ] **Step 2: correr y ver que falla**

Run: `npx vitest run scripts/tests/codigo.test.mjs`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: `scripts/lib/codigo.mjs`**

```js
import { CLASES, TOKENS } from './contrato.mjs'

const PALETA = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white'
const UTILIDADES = 'bg|text|border|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder|inset-ring|ring-offset'

const HEX = /#[0-9a-fA-F]{3,8}\b/g
const FUNCION = /\b(?:rgba?|hsla?)\(/g
const OKLCH_ABSOLUTO = /\boklch\((?!from var\(--ui-)/g
const CLASE_CRUDA = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTILIDADES})-(?:${PALETA})(?:-\\d{2,3})?(?:/\\d{1,3})?(?![\\w-])`, 'g')

/** Colores escritos a mano en el código. Una línea con `color-ok` se saltea. */
export function coloresCrudos(src) {
  const hallazgos = []
  src.split('\n').forEach((linea, i) => {
    if (linea.includes('color-ok')) return
    const n = i + 1
    for (const m of linea.matchAll(HEX)) hallazgos.push({ linea: n, texto: m[0], motivo: 'color hex' })
    for (const m of linea.matchAll(FUNCION)) hallazgos.push({ linea: n, texto: m[0], motivo: 'función de color' })
    for (const m of linea.matchAll(OKLCH_ABSOLUTO)) hallazgos.push({ linea: n, texto: m[0], motivo: 'oklch absoluto; sólo vale oklch(from var(--ui-...) ...)' })
    for (const m of linea.matchAll(CLASE_CRUDA)) hallazgos.push({ linea: n, texto: m[0], motivo: 'clase de color cruda de Tailwind' })
  })
  return hallazgos
}

const VAR_UI = /--ui-[a-z0-9-]+/g
// prefijos de variante, utilidad (no codiciosa), sufijo que empieza en `ui`
const CLASE_UI = /(?<![\w-])(?:[a-z0-9-]+:)*([a-z]+(?:-[a-z]+)*?)-(ui(?:-[a-z0-9]+)*)(?:\/\d{1,3})?(?![\w-])/g

function tokenDeClase(utilidad, sufijo) {
  if (utilidad.startsWith('rounded')) return sufijo === 'ui' ? '--ui-radius' : sufijo === 'ui-lg' ? '--ui-radius-lg' : null
  if (utilidad === 'font') return sufijo === 'ui-display' ? '--ui-font-display' : sufijo === 'ui-text' ? '--ui-font-text' : null
  if (utilidad === 'ease') return sufijo === 'ui' ? '--ui-ease' : null
  return CLASES[sufijo] ?? null
}

/** Qué tokens del contrato toca este código, por var() o por clase puente. */
export function tokensUsados(src) {
  const tokens = new Set()
  const desconocidas = []
  for (const m of src.matchAll(VAR_UI)) if (TOKENS.includes(m[0])) tokens.add(m[0])
  for (const m of src.matchAll(CLASE_UI)) {
    const token = tokenDeClase(m[1], m[2])
    if (token) tokens.add(token)
    else desconocidas.push(m[0])
  }
  return { tokens, desconocidas }
}
```

- [ ] **Step 4: correr y ver que pasa**

Run: `npx vitest run scripts/tests/codigo.test.mjs`
Expected: PASS, 8 tests. Si `md:hover:bg-white` no sale en el orden esperado, el problema es el `(?:[a-z0-9-]+:)*` de `CLASE_CRUDA`: tiene que tragar todas las variantes.

- [ ] **Step 5: commit**

```bash
git add scripts/lib/codigo.mjs scripts/tests/codigo.test.mjs
git commit -m "feat: detector de colores crudos y de tokens usados

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: El catalogador: recorre, valida, genera

**Files:**
- Create: `scripts/lib/catalogo.mjs`, `scripts/lib/readme.mjs`, `scripts/catalogar.mjs`
- Test: `scripts/tests/catalogo.test.mjs`

**Interfaces:**
- Consumes: `validarFicha`, `coloresCrudos`, `tokensUsados`, constantes de `contrato.mjs`.
- Produces: `construirCatalogo(raiz, { sinCapturas = false } = {}) => { entradas: Entrada[], errores: string[] }` donde `Entrada = ficha & { tipo: 'components'|'patterns', ruta: string, url_github: string, preview_png: string|null, preview_webp: string|null, archivos_codigo: string[] }`. `hashCodigo(dir) => string` (12 hex). `escribirSalidas(raiz, entradas)` escribe `catalog.json`, READMEs y `playground/registro.generado.tsx`. Task 8 usa `construirCatalogo(raiz, { sinCapturas: true })` y `hashCodigo`.

- [ ] **Step 1: el test que falla**

`scripts/tests/catalogo.test.mjs`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { construirCatalogo, escribirSalidas, hashCodigo } from '../lib/catalogo.mjs'

const ficha = (extra = {}) => ({
  slug: 'boton-iman', nombre: 'Botón imán', categoria: 'botones', estado: 'referencia',
  origen: { nombre: 'EmpleoTecnia', url: '', licencia: 'propia' }, publicable: true,
  por_que_entro: 'El botón se corre hacia el cursor y vuelve con un resorte; se siente vivo sin gritar.',
  sirve_para: ['CTA'], etiquetas: ['hover'], tokens: [], agregado_por: 'franco', fecha: '2026-10-02', ...extra,
})

let raiz
function entrada(tipo, categoria, slug, meta, archivos = {}) {
  const dir = join(raiz, tipo, categoria, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'meta.json'), typeof meta === 'string' ? meta : JSON.stringify(meta, null, 2))
  writeFileSync(join(dir, 'README.md'), '# x')
  for (const [nombre, contenido] of Object.entries(archivos)) writeFileSync(join(dir, nombre), contenido)
  return dir
}
const png = Buffer.alloc(100, 1)
const webp = Buffer.alloc(100, 2)

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'ui-'))
  mkdirSync(join(raiz, 'playground'))
  writeFileSync(join(raiz, 'README.md'), '# Librería\n\n<!-- catalogo:inicio -->\nviejo\n<!-- catalogo:fin -->\n')
})

describe('construirCatalogo', () => {
  it('lee una referencia con su png y arma la entrada', async () => {
    entrada('components', 'botones', 'boton-iman', ficha(), { 'preview.png': png })
    const { entradas, errores } = await construirCatalogo(raiz)
    expect(errores).toEqual([])
    expect(entradas).toHaveLength(1)
    expect(entradas[0]).toMatchObject({
      tipo: 'components', ruta: 'components/botones/boton-iman',
      url_github: 'https://github.com/EmpleoTecnia/ui/tree/main/components/botones/boton-iman',
      preview_png: 'components/botones/boton-iman/preview.png', preview_webp: null,
    })
  })

  it('dice archivo y línea cuando el JSON está roto', async () => {
    entrada('components', 'botones', 'boton-iman', '{ "slug": "boton-iman", }')
    const { errores } = await construirCatalogo(raiz)
    expect(errores[0]).toMatch(/components\/botones\/boton-iman\/meta\.json/)
    expect(errores[0]).toMatch(/JSON/)
  })

  it('rechaza slugs repetidos entre tipos', async () => {
    entrada('components', 'botones', 'boton-iman', ficha(), { 'preview.png': png })
    entrada('patterns', 'landing', 'boton-iman', ficha({ categoria: 'landing' }), { 'preview.png': png })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join()).toMatch(/slug "boton-iman" repetido/)
  })

  it('una referencia sin preview.png falla; sin README también', async () => {
    entrada('components', 'botones', 'boton-iman', ficha())
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join()).toMatch(/preview\.png/)
  })

  it('un adoptado exige código, demo, capturas y tokens coincidentes', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent', '--ui-radius'] })
    entrada('components', 'botones', 'boton-iman', meta, {
      'BotonIman.tsx': 'export const B = () => <button className="bg-ui-accent rounded-ui text-ui-ink" />',
      'demo.tsx': 'export default []',
      'preview.png': png, 'preview.webp': webp,
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join('\n')).toMatch(/usa --ui-ink y la ficha no lo declara/)
  })

  it('un adoptado con token declarado y no usado falla', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent', '--ui-line'] })
    entrada('components', 'botones', 'boton-iman', meta, {
      'BotonIman.tsx': 'export const B = () => <button className="bg-ui-accent" />',
      'demo.tsx': 'export default []', 'preview.png': png, 'preview.webp': webp,
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join('\n')).toMatch(/declara --ui-line y el código no lo usa/)
  })

  it('un adoptado con color crudo falla con archivo y línea', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent'] })
    entrada('components', 'botones', 'boton-iman', meta, {
      'BotonIman.tsx': 'const a = 1\nexport const B = () => <button className="bg-ui-accent" style={{ color: "#f00" }} />',
      'demo.tsx': 'export default []', 'preview.png': png, 'preview.webp': webp,
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join('\n')).toMatch(/BotonIman\.tsx:2.*#f00/)
  })

  it('con sinCapturas no exige png ni webp pero sí todo lo demás', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent'] })
    entrada('components', 'botones', 'boton-iman', meta, {
      'BotonIman.tsx': 'export const B = () => <button className="bg-ui-accent" />', 'demo.tsx': 'export default []',
    })
    const { errores } = await construirCatalogo(raiz, { sinCapturas: true })
    expect(errores).toEqual([])
  })

  it('un webp que pasa el tope falla con el tamaño', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent'] })
    entrada('components', 'botones', 'boton-iman', meta, {
      'BotonIman.tsx': 'export const B = () => <button className="bg-ui-accent" />', 'demo.tsx': 'export default []',
      'preview.png': png, 'preview.webp': Buffer.alloc(401 * 1024),
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join()).toMatch(/preview\.webp pesa 401 KB/)
  })
})

describe('hashCodigo', () => {
  it('cambia si cambia el código y no si cambian las capturas', async () => {
    const dir = entrada('components', 'botones', 'boton-iman', ficha(), { 'A.tsx': 'a', 'preview.png': png })
    const h1 = hashCodigo(dir)
    writeFileSync(join(dir, 'preview.png'), Buffer.alloc(5))
    expect(hashCodigo(dir)).toBe(h1)
    writeFileSync(join(dir, 'A.tsx'), 'b')
    expect(hashCodigo(dir)).not.toBe(h1)
    expect(h1).toMatch(/^[0-9a-f]{12}$/)
  })
})

describe('escribirSalidas', () => {
  it('escribe catalog.json, READMEs generados, el bloque del raíz y el registro', async () => {
    entrada('components', 'botones', 'boton-iman', ficha({ estado: 'adoptado', tokens: ['--ui-accent'] }), {
      'BotonIman.tsx': 'export const B = () => <button className="bg-ui-accent" />', 'demo.tsx': 'export default []',
      'preview.png': png, 'preview.webp': webp,
    })
    entrada('components', 'tarjetas', 'tarjeta-vidrio', ficha({ slug: 'tarjeta-vidrio', nombre: 'Tarjeta vidrio', categoria: 'tarjetas', estado: 'retirado', por_que_salio: 'Pesada.' }), { 'preview.png': png })
    const { entradas, errores } = await construirCatalogo(raiz)
    expect(errores).toEqual([])
    escribirSalidas(raiz, entradas)

    const catalogo = JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8'))
    expect(catalogo.entradas).toHaveLength(2)
    expect(catalogo.generado).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const cat = readFileSync(join(raiz, 'components/botones/README.md'), 'utf8')
    expect(cat).toMatch(/<img src="boton-iman\/preview\.webp"/)
    expect(cat).toMatch(/Botón imán/)

    const tipo = readFileSync(join(raiz, 'components/README.md'), 'utf8')
    expect(tipo).toMatch(/\[botones\]\(botones\/\)/)
    expect(tipo).not.toMatch(/<img src="tarjetas\/tarjeta-vidrio/)
    expect(tipo).toMatch(/Retirados.*tarjeta-vidrio/s)

    const raizMd = readFileSync(join(raiz, 'README.md'), 'utf8')
    expect(raizMd).not.toMatch(/viejo/)
    expect(raizMd).toMatch(/<!-- catalogo:inicio -->[\s\S]*boton-iman[\s\S]*<!-- catalogo:fin -->/)

    const registro = readFileSync(join(raiz, 'playground/registro.generado.tsx'), 'utf8')
    expect(registro).toMatch(/import d0 from '\.\.\/components\/botones\/boton-iman\/demo'/)
    expect(registro).toMatch(/slug: "boton-iman"/)
    expect(registro).not.toMatch(/tarjeta-vidrio/)
  })
})
```

- [ ] **Step 2: correr y ver que falla**

Run: `npx vitest run scripts/tests/catalogo.test.mjs`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: `scripts/lib/catalogo.mjs`**

```js
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { validarFicha } from './ficha.mjs'
import { coloresCrudos, tokensUsados } from './codigo.mjs'
import { CATEGORIAS, TOPE_WEBP, REPO_GITHUB } from './contrato.mjs'
import { renderCategoria, renderTipo, renderBloqueRaiz, renderRegistro } from './readme.mjs'

const TIPOS = ['components', 'patterns']
const EXT_CODIGO = ['.tsx', '.ts', '.css']
const posix = p => p.split('\\').join('/')

function esCodigo(nombre) {
  return EXT_CODIGO.some(ext => nombre.endsWith(ext))
}

/** Hash corto del código de una carpeta (no de sus capturas ni su ficha). */
export function hashCodigo(dir) {
  const h = createHash('sha256')
  const archivos = readdirSync(dir).filter(n => esCodigo(n) || n === 'guion.mjs').sort()
  for (const n of archivos) h.update(n).update('\0').update(readFileSync(join(dir, n))).update('\0')
  return h.digest('hex').slice(0, 12)
}

function leerJson(ruta) {
  const texto = readFileSync(ruta, 'utf8')
  try {
    return { valor: JSON.parse(texto) }
  } catch (err) {
    const pos = /position (\d+)/.exec(err.message)?.[1]
    const linea = pos ? texto.slice(0, Number(pos)).split('\n').length : '?'
    return { error: `JSON inválido (línea ${linea}): ${err.message}` }
  }
}

function revisarAdoptado(dir, rutaRel, ficha, errores, sinCapturas) {
  const nombres = readdirSync(dir)
  const codigo = nombres.filter(n => esCodigo(n) && n !== 'demo.tsx')
  if (codigo.length === 0) errores.push(`${rutaRel}: un adoptado necesita al menos un archivo .tsx además de demo.tsx`)
  if (!nombres.includes('demo.tsx')) errores.push(`${rutaRel}: un adoptado necesita demo.tsx`)
  if (!sinCapturas) {
    if (!nombres.includes('preview.png')) errores.push(`${rutaRel}: falta preview.png (corré npm run capturar)`)
    if (!nombres.includes('preview.webp')) errores.push(`${rutaRel}: falta preview.webp (corré npm run capturar)`)
  }

  const usados = new Set()
  for (const n of [...codigo, ...(nombres.includes('demo.tsx') ? ['demo.tsx'] : [])]) {
    const src = readFileSync(join(dir, n), 'utf8')
    for (const h of coloresCrudos(src)) errores.push(`${rutaRel}/${n}:${h.linea}: ${h.motivo}: ${h.texto}`)
    if (n === 'demo.tsx') continue // la demo puede usar tokens de más para el fondo
    const { tokens, desconocidas } = tokensUsados(src)
    for (const t of tokens) usados.add(t)
    for (const c of desconocidas) errores.push(`${rutaRel}/${n}: la clase "${c}" no corresponde a ningún token del contrato`)
  }
  const declarados = new Set(ficha.tokens ?? [])
  for (const t of usados) if (!declarados.has(t)) errores.push(`${rutaRel}: el código usa ${t} y la ficha no lo declara en tokens`)
  for (const t of declarados) if (!usados.has(t)) errores.push(`${rutaRel}: la ficha declara ${t} y el código no lo usa`)
  return codigo
}

/** Recorre components/ y patterns/, valida todo y devuelve las entradas. */
export async function construirCatalogo(raiz, { sinCapturas = false } = {}) {
  const entradas = []
  const errores = []
  const vistos = new Map()

  for (const tipo of TIPOS) {
    const dirTipo = join(raiz, tipo)
    if (!existsSync(dirTipo)) continue
    for (const categoria of readdirSync(dirTipo).filter(n => statSync(join(dirTipo, n)).isDirectory())) {
      if (!CATEGORIAS[tipo].includes(categoria)) {
        errores.push(`${tipo}/${categoria}: categoría desconocida; las de ${tipo} son ${CATEGORIAS[tipo].join(', ')}`)
        continue
      }
      const dirCat = join(dirTipo, categoria)
      for (const carpeta of readdirSync(dirCat).filter(n => statSync(join(dirCat, n)).isDirectory())) {
        const dir = join(dirCat, carpeta)
        const rutaRel = posix(relative(raiz, dir))
        const rutaMeta = join(dir, 'meta.json')
        if (!existsSync(rutaMeta)) { errores.push(`${rutaRel}: falta meta.json`); continue }
        const { valor: ficha, error } = leerJson(rutaMeta)
        if (error) { errores.push(`${rutaRel}/meta.json: ${error}`); continue }

        const propios = validarFicha(ficha, { carpeta, tipo })
        for (const e of propios) errores.push(`${rutaRel}: ${e}`)
        if (ficha.categoria && ficha.categoria !== categoria) errores.push(`${rutaRel}: la ficha dice categoría "${ficha.categoria}" pero está en "${categoria}"`)
        if (vistos.has(ficha.slug)) errores.push(`slug "${ficha.slug}" repetido: ${vistos.get(ficha.slug)} y ${rutaRel}`)
        else if (ficha.slug) vistos.set(ficha.slug, rutaRel)
        if (!existsSync(join(dir, 'README.md'))) errores.push(`${rutaRel}: falta README.md`)

        let archivos_codigo = []
        if (ficha.estado === 'adoptado') archivos_codigo = revisarAdoptado(dir, rutaRel, ficha, errores, sinCapturas)
        else if (ficha.estado === 'referencia' && !existsSync(join(dir, 'preview.png'))) errores.push(`${rutaRel}: una referencia necesita preview.png`)

        const rutaWebp = join(dir, 'preview.webp')
        if (existsSync(rutaWebp)) {
          const kb = Math.ceil(statSync(rutaWebp).size / 1024)
          if (statSync(rutaWebp).size > TOPE_WEBP) errores.push(`${rutaRel}: preview.webp pesa ${kb} KB y el tope es ${TOPE_WEBP / 1024} KB`)
        }

        entradas.push({
          ...ficha,
          tipo,
          ruta: rutaRel,
          url_github: `${REPO_GITHUB}/tree/main/${rutaRel}`,
          preview_png: existsSync(join(dir, 'preview.png')) ? `${rutaRel}/preview.png` : null,
          preview_webp: existsSync(rutaWebp) ? `${rutaRel}/preview.webp` : null,
          archivos_codigo,
        })
      }
    }
  }

  entradas.sort((a, b) => a.tipo.localeCompare(b.tipo) || a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre, 'es'))
  return { entradas, errores }
}

/** Escribe catalog.json, los README generados, el bloque del README raíz y el registro del playground. */
export function escribirSalidas(raiz, entradas) {
  writeFileSync(join(raiz, 'catalog.json'), JSON.stringify({ generado: new Date().toISOString(), entradas }, null, 2) + '\n')

  for (const tipo of TIPOS) {
    const delTipo = entradas.filter(e => e.tipo === tipo)
    if (delTipo.length === 0 && !existsSync(join(raiz, tipo))) continue
    mkdirSync(join(raiz, tipo), { recursive: true })
    writeFileSync(join(raiz, tipo, 'README.md'), renderTipo(tipo, delTipo))
    for (const categoria of new Set(delTipo.map(e => e.categoria))) {
      writeFileSync(join(raiz, tipo, categoria, 'README.md'), renderCategoria(tipo, categoria, delTipo.filter(e => e.categoria === categoria)))
    }
  }

  const rutaRaiz = join(raiz, 'README.md')
  const actual = readFileSync(rutaRaiz, 'utf8')
  const nuevo = actual.replace(/<!-- catalogo:inicio -->[\s\S]*?<!-- catalogo:fin -->/, `<!-- catalogo:inicio -->\n${renderBloqueRaiz(entradas)}\n<!-- catalogo:fin -->`)
  writeFileSync(rutaRaiz, nuevo)

  mkdirSync(join(raiz, 'playground'), { recursive: true })
  writeFileSync(join(raiz, 'playground', 'registro.generado.tsx'), renderRegistro(entradas))
}
```

- [ ] **Step 4: `scripts/lib/readme.mjs`**

```js
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const activos = entradas => entradas.filter(e => e.estado !== 'retirado')

/** Grilla HTML de 3 columnas que GitHub renderiza, con las animaciones adentro. */
function grilla(entradas, prefijo) {
  if (entradas.length === 0) return '_Todavía no hay nada acá._\n'
  const celdas = entradas.map(e => {
    const carpeta = `${prefijo}${e.slug}/`
    const img = e.preview_webp ? `${carpeta}preview.webp` : e.preview_png ? `${carpeta}preview.png` : null
    const imagen = img ? `<a href="${carpeta}"><img src="${img}" width="100%" alt="${esc(e.nombre)}"></a><br>` : ''
    return `<td width="33%" valign="top">\n${imagen}<b><a href="${carpeta}">${esc(e.nombre)}</a></b> · ${e.estado}<br>\n<sub>${esc(e.por_que_entro)}</sub>\n</td>`
  })
  const filas = []
  for (let i = 0; i < celdas.length; i += 3) filas.push(`<tr>\n${celdas.slice(i, i + 3).join('\n')}\n</tr>`)
  return `<table>\n${filas.join('\n')}\n</table>\n`
}

function retirados(entradas, prefijo) {
  const r = entradas.filter(e => e.estado === 'retirado')
  if (r.length === 0) return ''
  return `\n## Retirados\n\n${r.map(e => `- [${esc(e.nombre)}](${prefijo}${e.slug}/) — ${esc(e.por_que_salio)}`).join('\n')}\n`
}

const TITULO = { components: 'Componentes', patterns: 'Patrones' }

export function renderCategoria(tipo, categoria, entradas) {
  return `<!-- Generado por scripts/catalogar.mjs. No editar a mano. -->\n# ${TITULO[tipo]} · ${categoria}\n\n[← ${TITULO[tipo]}](../)\n\n${grilla(activos(entradas), '')}${retirados(entradas, '')}`
}

export function renderTipo(tipo, entradas) {
  const categorias = [...new Set(entradas.map(e => e.categoria))].sort()
  const indice = categorias.map(c => `- [${c}](${c}/) · ${activos(entradas.filter(e => e.categoria === c)).length}`).join('\n')
  return `<!-- Generado por scripts/catalogar.mjs. No editar a mano. -->\n# ${TITULO[tipo]}\n\n${indice || '_Todavía no hay categorías._'}\n\n${grilla(activos(entradas), '')
    .replace(/href="([a-z0-9-]+)\/"/g, (_, slug) => `href="${entradas.find(e => e.slug === slug).categoria}/${slug}/"`)
    .replace(/src="([a-z0-9-]+)\//g, (_, slug) => `src="${entradas.find(e => e.slug === slug).categoria}/${slug}/`)}${retirados(entradas, '').replace(/\]\(([a-z0-9-]+)\/\)/g, (_, slug) => `](${entradas.find(e => e.slug === slug).categoria}/${slug}/)`)}`
}

export function renderBloqueRaiz(entradas) {
  const vivos = activos(entradas)
  if (vivos.length === 0) return 'Todavía no hay entradas. Corré `npm run catalogar` después de agregar la primera.'
  const adoptados = vivos.filter(e => e.estado === 'adoptado').length
  const porTipo = ['components', 'patterns'].map(t => {
    const del = vivos.filter(e => e.tipo === t)
    if (del.length === 0) return null
    const cats = [...new Set(del.map(e => e.categoria))].sort().map(c => `[${c}](${t}/${c}/)`).join(' · ')
    return `- **[${TITULO[t]}](${t}/)** (${del.length}): ${cats}`
  }).filter(Boolean).join('\n')
  const ultimos = [...vivos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6)
  return `${vivos.length} entradas, ${adoptados} adoptadas.\n\n${porTipo}\n\n### Últimas que entraron\n\n${grilla(ultimos, '')
    .replace(/href="([a-z0-9-]+)\/"/g, (_, slug) => { const e = vivos.find(x => x.slug === slug); return `href="${e.tipo}/${e.categoria}/${slug}/"` })
    .replace(/src="([a-z0-9-]+)\//g, (_, slug) => { const e = vivos.find(x => x.slug === slug); return `src="${e.tipo}/${e.categoria}/${slug}/` })}`
}

/** El playground importa cada demo.tsx de los adoptados desde acá. */
export function renderRegistro(entradas) {
  const adoptados = entradas.filter(e => e.estado === 'adoptado')
  const imports = adoptados.map((e, i) => `import d${i} from '../${e.ruta}/demo'`).join('\n')
  const filas = adoptados.map((e, i) => `  { slug: ${JSON.stringify(e.slug)}, nombre: ${JSON.stringify(e.nombre)}, tipo: ${JSON.stringify(e.tipo)}, categoria: ${JSON.stringify(e.categoria)}, por_que_entro: ${JSON.stringify(e.por_que_entro)}, url_github: ${JSON.stringify(e.url_github)}, demos: d${i} },`).join('\n')
  return `// Generado por scripts/catalogar.mjs. No editar a mano.\nimport type { Demo } from '../lib/demo'\n${imports}\n\nexport type Entrada = {\n  slug: string\n  nombre: string\n  tipo: 'components' | 'patterns'\n  categoria: string\n  por_que_entro: string\n  url_github: string\n  demos: Demo[]\n}\n\nexport const registro: Entrada[] = [\n${filas}\n]\n`
}
```

- [ ] **Step 5: `scripts/catalogar.mjs`**

```js
#!/usr/bin/env node
// Valida todas las fichas y genera catalog.json, los README y el registro del playground.
// Falla con código 1 si algo no cumple. Es el test del repo.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { construirCatalogo, escribirSalidas } from './lib/catalogo.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { entradas, errores } = await construirCatalogo(raiz)

if (errores.length) {
  console.error(`✗ ${errores.length} problema${errores.length === 1 ? '' : 's'}:\n`)
  for (const e of errores) console.error(`  · ${e}`)
  process.exit(1)
}

escribirSalidas(raiz, entradas)
const adoptados = entradas.filter(e => e.estado === 'adoptado').length
const referencias = entradas.filter(e => e.estado === 'referencia').length
console.log(`✓ ${entradas.length} entradas (${adoptados} adoptadas, ${referencias} referencias). catalog.json, READMEs y registro escritos.`)
```

- [ ] **Step 6: correr los tests**

Run: `npx vitest run`
Expected: PASS, los 3 archivos. Si `leerJson` no saca la línea, el mensaje de Node 24 para JSON es `Unexpected token } in JSON at position N` o `... (line L column C)`: cubrir las dos formas con `/line (\d+)/` antes de `/position (\d+)/`.

- [ ] **Step 7: correr el catalogador sobre el repo vacío**

Run: `npm run catalogar`
Expected: `✓ 0 entradas (0 adoptadas, 0 referencias)...`; `catalog.json` y `playground/registro.generado.tsx` creados; `README.md` con el bloque "Todavía no hay entradas".

- [ ] **Step 8: commit**

```bash
git add scripts catalog.json playground/registro.generado.tsx README.md
git commit -m "feat: catalogador que valida fichas y genera catálogo, READMEs y registro

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: El playground

**Files:**
- Create: `playground/next.config.ts`, `playground/postcss.config.mjs`, `playground/tsconfig.json`, `playground/app/globals.css`, `playground/app/layout.tsx`, `playground/app/(galeria)/layout.tsx`, `playground/app/(galeria)/page.tsx`, `playground/app/(galeria)/c/[categoria]/[slug]/page.tsx`, `playground/app/(galeria)/buscar/page.tsx`, `playground/app/captura/[slug]/page.tsx`, `playground/componentes/Selector.tsx`, `playground/componentes/Marco.tsx`, `playground/lib/registro.ts`

**Interfaces:**
- Consumes: `playground/registro.generado.tsx` (Task 4), `tokens.css` y `temas/*.css` (Task 1 y 6).
- Produces: rutas `/`, `/c/<categoria>/<slug>`, `/buscar?slugs=a,b`, `/captura/<slug>[?modo=claro|oscuro]`. Task 8 fotografía `/captura/<slug>`.

- [ ] **Step 1: configuración de Next**

`playground/next.config.ts`:
```ts
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

// El playground vive adentro del repo y los componentes afuera (../components).
// `turbopack.root` le dice a Next que el proyecto es todo el repo.
const config: NextConfig = {
  turbopack: { root: resolve(__dirname, '..') },
  outputFileTracingRoot: resolve(__dirname, '..'),
}
export default config
```

`playground/postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`playground/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "../components/**/*.tsx", "../patterns/**/*.tsx", "../lib/**/*.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: estilos globales**

`playground/app/globals.css`:
```css
@import "tailwindcss";
@source "../../components";
@source "../../patterns";
@import "../../tokens.css";
@import "../../temas/mi.css";
@import "../../temas/etconecta.css";
@import "../../temas/campus.css";
@import "../../temas/proyectos.css";

html { background: var(--ui-bg); color: var(--ui-ink); font-family: var(--ui-font-text); }
```

Hasta que exista `temas/` (Task 6), crear los cuatro archivos vacíos con `touch temas/mi.css temas/etconecta.css temas/campus.css temas/proyectos.css` y borrar `temas/.gitkeep`.

- [ ] **Step 3: registro tipado y el marco de cada demo**

`playground/lib/registro.ts`:
```ts
import { registro, type Entrada } from '../registro.generado'
export { registro, type Entrada }
export const porSlug = (slug: string): Entrada | undefined => registro.find(e => e.slug === slug)
export const TEMAS = ['muestra', 'mi', 'etconecta', 'campus', 'proyectos'] as const
export type Tema = (typeof TEMAS)[number]
export type Modo = 'claro' | 'oscuro'
```

`playground/componentes/Marco.tsx`:
```tsx
import type { ReactNode } from 'react'

/** La caja donde se ve cada demo: fondo de la app, borde, y aire alrededor. */
export function Marco({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <section className="rounded-ui-lg border border-ui-line bg-ui-surface">
      {titulo && <h3 className="border-b border-ui-line px-4 py-2 text-xs font-medium text-ui-ink-muted">{titulo}</h3>}
      <div className="grid min-h-48 place-items-center bg-ui-bg p-8">{children}</div>
    </section>
  )
}
```

- [ ] **Step 4: selector de tema (cliente)**

`playground/componentes/Selector.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { TEMAS, type Tema, type Modo } from '../lib/registro'

function aplicar(tema: Tema, modo: Modo) {
  document.documentElement.dataset.tema = tema
  document.documentElement.dataset.modo = modo
  try { localStorage.setItem('ui-tema', tema); localStorage.setItem('ui-modo', modo) } catch {}
}

export function Selector() {
  const [tema, setTema] = useState<Tema>('muestra')
  const [modo, setModo] = useState<Modo>('claro')

  useEffect(() => {
    try {
      const t = localStorage.getItem('ui-tema') as Tema | null
      const m = localStorage.getItem('ui-modo') as Modo | null
      if (t && TEMAS.includes(t)) setTema(t)
      if (m === 'claro' || m === 'oscuro') setModo(m)
    } catch {}
  }, [])
  useEffect(() => { aplicar(tema, modo) }, [tema, modo])

  const boton = (activo: boolean) =>
    `rounded-ui px-3 py-1 text-xs font-medium transition-colors duration-(--ui-dur) ease-ui ${activo ? 'bg-ui-accent text-ui-accent-ink' : 'text-ui-ink-soft hover:bg-ui-surface-2'}`

  return (
    <div className="flex flex-wrap items-center gap-1">
      {TEMAS.map(t => <button key={t} className={boton(tema === t)} onClick={() => setTema(t)}>{t}</button>)}
      <span className="mx-2 h-4 w-px bg-ui-line" />
      <button className={boton(modo === 'claro')} onClick={() => setModo('claro')}>claro</button>
      <button className={boton(modo === 'oscuro')} onClick={() => setModo('oscuro')}>oscuro</button>
    </div>
  )
}
```

- [ ] **Step 5: layouts**

`playground/app/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import './globals.css'

export const metadata = { title: 'Librería UI · EmpleoTecnia' }

// El tema se aplica antes de pintar para que no parpadee.
const restaurar = `try{var t=localStorage.getItem('ui-tema'),m=localStorage.getItem('ui-modo');if(t)document.documentElement.dataset.tema=t;if(m)document.documentElement.dataset.modo=m}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-tema="muestra" data-modo="claro" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: restaurar }} /></head>
      <body className="min-h-dvh font-ui-text antialiased">{children}</body>
    </html>
  )
}
```

`playground/app/(galeria)/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Selector } from '../../componentes/Selector'

export default function GaleriaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-ui-line bg-ui-surface/90 px-6 py-3 backdrop-blur">
        <Link href="/" className="font-ui-display text-sm font-semibold">Librería UI</Link>
        <Selector />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  )
}
```

- [ ] **Step 6: índice, detalle, buscar**

`playground/app/(galeria)/page.tsx`:
```tsx
import Link from 'next/link'
import { registro } from '../../lib/registro'
import { Marco } from '../../componentes/Marco'

export default function Indice() {
  if (registro.length === 0) return <p className="text-ui-ink-muted">Todavía no hay componentes adoptados.</p>
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {registro.map(e => (
        <Link key={e.slug} href={`/c/${e.categoria}/${e.slug}`} className="group">
          <Marco>{e.demos[0]?.render()}</Marco>
          <p className="mt-2 text-sm font-medium group-hover:text-ui-accent">{e.nombre}</p>
          <p className="text-xs text-ui-ink-muted">{e.categoria}</p>
        </Link>
      ))}
    </div>
  )
}
```

`playground/app/(galeria)/c/[categoria]/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { porSlug, registro } from '../../../../../lib/registro'
import { Marco } from '../../../../../componentes/Marco'

export function generateStaticParams() {
  return registro.map(e => ({ categoria: e.categoria, slug: e.slug }))
}

export default async function Detalle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = porSlug(slug)
  if (!e) notFound()
  return (
    <article className="space-y-6">
      <header>
        <p className="text-xs text-ui-ink-muted">{e.tipo} · {e.categoria}</p>
        <h1 className="font-ui-display text-2xl font-semibold">{e.nombre}</h1>
        <p className="mt-1 max-w-prose text-ui-ink-soft">{e.por_que_entro}</p>
        <a href={e.url_github} className="mt-2 inline-block text-sm text-ui-accent underline-offset-4 hover:underline">Ver en GitHub</a>
      </header>
      {e.demos.map(d => <Marco key={d.nombre} titulo={d.nombre}>{d.render()}</Marco>)}
    </article>
  )
}
```

`playground/app/(galeria)/buscar/page.tsx`:
```tsx
import { porSlug } from '../../../lib/registro'
import { Marco } from '../../../componentes/Marco'

export default async function Buscar({ searchParams }: { searchParams: Promise<{ slugs?: string }> }) {
  const { slugs = '' } = await searchParams
  const entradas = slugs.split(',').map(s => porSlug(s.trim())).filter(e => e !== undefined)
  if (entradas.length === 0) return <p className="text-ui-ink-muted">Pasá <code>?slugs=a,b,c</code> con los candidatos.</p>
  return (
    <div className="space-y-10">
      {entradas.map(e => (
        <section key={e.slug}>
          <h2 className="mb-1 font-ui-display text-lg font-semibold">{e.nombre}</h2>
          <p className="mb-3 text-sm text-ui-ink-soft">{e.por_que_entro}</p>
          <Marco>{e.demos[0]?.render()}</Marco>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: la ruta de captura (sin cabecera, paneles fijos)**

`playground/app/captura/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { porSlug } from '../../../lib/registro'

type Modo = 'claro' | 'oscuro'

function Panel({ modo, ancho, children }: { modo: Modo; ancho: number; children: React.ReactNode }) {
  return (
    <div data-tema="muestra" data-modo={modo} style={{ width: ancho, height: '100%' }} className="grid place-items-center bg-ui-bg p-10 text-ui-ink font-ui-text">
      {children}
    </div>
  )
}

/** /captura/<slug>: 1200×600 con claro y oscuro lado a lado.
 *  /captura/<slug>?modo=claro: un solo panel que ocupa todo (para el video). */
export default async function Captura({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ modo?: Modo }> }) {
  const { slug } = await params
  const { modo } = await searchParams
  const e = porSlug(slug)
  if (!e) notFound()
  const demo = e.demos[0]?.render()
  if (modo) return <div style={{ width: '100vw', height: '100vh' }}><Panel modo={modo} ancho={9999}>{demo}</Panel></div>
  return (
    <div style={{ width: 1200, height: 600, display: 'flex' }}>
      <Panel modo="claro" ancho={600}>{demo}</Panel>
      <Panel modo="oscuro" ancho={600}>{demo}</Panel>
    </div>
  )
}
```

Nota: `style={{ width }}` acá es valor de layout calculado, no de diseño; está permitido por la regla del agente `diseno`. La ruta `/captura` no pasa por `(galeria)`, así que no tiene cabecera.

- [ ] **Step 8: levantar y mirar**

Run: `npm run dev` y abrir `http://localhost:3000`.
Expected: cabecera con el selector, "Todavía no hay componentes adoptados". Cambiar a `oscuro`: el fondo cambia. `http://localhost:3000/captura/nada` → 404.

Run: `npm run build`
Expected: compila sin errores. Si Turbopack se queja de "multiple lockfiles" o de archivos fuera del root, revisar `turbopack.root`.

- [ ] **Step 9: commit**

```bash
git add playground temas
git commit -m "feat: playground con selector de tema y ruta de captura

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Los temas espejo de las apps

**Files:**
- Create: `temas/mi.css`, `temas/etconecta.css`, `temas/campus.css`, `temas/proyectos.css`, `temas/README.md`

**Interfaces:**
- Consumes: los `globals.css` de cada app (sólo lectura).
- Produces: selectores `[data-tema="<app>"]` y `[data-tema="<app>"][data-modo="oscuro"]` que definen los 15 `--ui-*`. El playground los importa (Task 5, Step 2).

Los valores salen de los `globals.css` reales, copiados, no inventados. Fuentes del sistema en todos: el playground no carga las fuentes de las apps.

- [ ] **Step 1: `temas/mi.css`** (de `mi/src/styles/globals.css`, líneas 33–87)

```css
/* Espejo de mi/src/styles/globals.css (tokens --c-*). Si mi cambia, copiar de nuevo. */
[data-tema="mi"] {
  --ui-bg: oklch(0.965 0.006 150);
  --ui-surface: oklch(0.995 0.003 150);
  --ui-surface-2: oklch(0.935 0.008 150);
  --ui-ink: oklch(0.215 0.022 258);
  --ui-ink-soft: oklch(0.415 0.018 258);
  --ui-ink-muted: oklch(0.545 0.016 258);
  --ui-line: oklch(0.855 0.012 150);
  --ui-accent: oklch(0.445 0.095 255);
  --ui-accent-ink: oklch(0.985 0.004 258);
  --ui-radius: 0.875rem;
  --ui-radius-lg: 1.25rem;
  --ui-font-display: ui-sans-serif, system-ui, sans-serif;
  --ui-font-text: ui-sans-serif, system-ui, sans-serif;
  --ui-dur: 180ms;
  --ui-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
[data-tema="mi"][data-modo="oscuro"] {
  --ui-bg: oklch(0.165 0.022 258);
  --ui-surface: oklch(0.215 0.028 258);
  --ui-surface-2: oklch(0.265 0.030 258);
  --ui-ink: oklch(0.975 0.006 258);
  --ui-ink-soft: oklch(0.795 0.020 258);
  --ui-ink-muted: oklch(0.675 0.022 258);
  --ui-line: oklch(0.335 0.032 258);
  --ui-accent: oklch(0.70 0.105 255);
  --ui-accent-ink: oklch(0.165 0.022 258);
}
```

- [ ] **Step 2: `temas/etconecta.css`** (de `etconecta/src/styles/globals.css`, líneas 46–110; `--tono: 285`)

```css
/* Espejo de etconecta/src/styles/globals.css (tokens --l-* claro, --d-* oscuro, tono 285). */
[data-tema="etconecta"] {
  --ui-bg: oklch(0.977 0.008 285);
  --ui-surface: oklch(0.947 0.017 285);
  --ui-surface-2: oklch(0.905 0.032 285);
  --ui-ink: oklch(0.215 0.075 285);
  --ui-ink-soft: oklch(0.395 0.062 285);
  --ui-ink-muted: oklch(0.505 0.055 285);
  --ui-line: oklch(0.60 0.05 285);
  --ui-accent: oklch(0.815 0.20 118);
  --ui-accent-ink: oklch(0.24 0.10 118);
  --ui-radius: 0.5rem;
  --ui-radius-lg: 1rem;
  --ui-font-display: ui-sans-serif, system-ui, sans-serif;
  --ui-font-text: ui-sans-serif, system-ui, sans-serif;
  --ui-dur: 160ms;
  --ui-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
[data-tema="etconecta"][data-modo="oscuro"] {
  --ui-bg: oklch(0.235 0.115 285);
  --ui-surface: oklch(0.185 0.095 285);
  --ui-surface-2: oklch(0.325 0.14 285);
  --ui-ink: oklch(0.985 0.012 285);
  --ui-ink-soft: oklch(0.855 0.045 285);
  --ui-ink-muted: oklch(0.755 0.055 285);
  --ui-line: oklch(0.58 0.085 285);
  --ui-accent: oklch(0.90 0.19 118);
  --ui-accent-ink: oklch(0.22 0.09 118);
}
```

- [ ] **Step 3: `temas/campus.css`** (de `campus/app/globals.css`, líneas 12–67; el campus no tiene modo oscuro, así que el oscuro se deriva bajando L en el mismo tono)

```css
/* Espejo de campus/app/globals.css. El campus está en hex y sin oscuro:
   el claro es traducción exacta a OKLCH; el oscuro, derivado. */
[data-tema="campus"] {
  --ui-bg: oklch(0.985 0 0);
  --ui-surface: oklch(1 0 0);
  --ui-surface-2: oklch(0.970 0.002 80);
  --ui-ink: oklch(0.145 0.004 285);
  --ui-ink-soft: oklch(0.440 0.012 60);
  --ui-ink-muted: oklch(0.710 0.014 60);
  --ui-line: oklch(0.950 0.003 60);
  --ui-accent: oklch(0.490 0.220 262);
  --ui-accent-ink: oklch(1 0 0);
  --ui-radius: 1rem;
  --ui-radius-lg: 1.5rem;
  --ui-font-display: ui-sans-serif, system-ui, sans-serif;
  --ui-font-text: ui-sans-serif, system-ui, sans-serif;
  --ui-dur: 200ms;
  --ui-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
[data-tema="campus"][data-modo="oscuro"] {
  --ui-bg: oklch(0.15 0.004 285);
  --ui-surface: oklch(0.20 0.005 285);
  --ui-surface-2: oklch(0.25 0.006 285);
  --ui-ink: oklch(0.98 0 0);
  --ui-ink-soft: oklch(0.80 0.01 60);
  --ui-ink-muted: oklch(0.65 0.012 60);
  --ui-line: oklch(0.30 0.005 285);
  --ui-accent: oklch(0.70 0.17 262);
  --ui-accent-ink: oklch(0.15 0.04 262);
}
```

- [ ] **Step 4: `temas/proyectos.css`** (de `proyectos/app/globals.css`, líneas 40–80 claro y 170–190 oscuro; `--tono: 262`, `--marca: 262`)

```css
/* Espejo de proyectos/app/globals.css (tokens en español, tono 262). */
[data-tema="proyectos"] {
  --ui-bg: oklch(0.975 0.007 262);
  --ui-surface: oklch(1 0 0);
  --ui-surface-2: oklch(0.953 0.011 262);
  --ui-ink: oklch(0.235 0.045 262);
  --ui-ink-soft: oklch(0.425 0.035 262);
  --ui-ink-muted: oklch(0.520 0.030 262);
  --ui-line: oklch(0.925 0.010 262);
  --ui-accent: oklch(0.502 0.216 262);
  --ui-accent-ink: oklch(1 0 0);
  --ui-radius: 14px;
  --ui-radius-lg: 22px;
  --ui-font-display: ui-sans-serif, system-ui, sans-serif;
  --ui-font-text: ui-sans-serif, system-ui, sans-serif;
  --ui-dur: 180ms;
  --ui-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
[data-tema="proyectos"][data-modo="oscuro"] {
  --ui-bg: oklch(0.172 0.022 262);
  --ui-surface: oklch(0.218 0.026 262);
  --ui-surface-2: oklch(0.142 0.020 262);
  --ui-ink: oklch(0.962 0.008 262);
  --ui-ink-soft: oklch(0.800 0.020 262);
  --ui-ink-muted: oklch(0.690 0.025 262);
  --ui-line: oklch(0.300 0.028 262);
  --ui-accent: oklch(0.720 0.155 262);
  --ui-accent-ink: oklch(0.175 0.040 262);
}
```

- [ ] **Step 5: `temas/README.md`**

```markdown
# Temas espejo

Cada archivo copia los tokens de una app y los mapea a los `--ui-*` del contrato, para
que el playground muestre un componente "como se vería en esa app". Son **espejos**: si
una app cambia sus tokens, se copian de nuevo desde su `globals.css`; nunca se inventan
acá. Las fuentes son las del sistema: el playground no carga las de las apps.

| Tema | Fuente | Oscuro |
|---|---|---|
| `mi` | `mi/src/styles/globals.css` (`--c-*`) | propio de la app |
| `etconecta` | `etconecta/src/styles/globals.css` (`--l-*` / `--d-*`) | propio de la app |
| `campus` | `campus/app/globals.css` (hex) | derivado: el campus no tiene oscuro |
| `proyectos` | `proyectos/app/globals.css` (`--papel`, `--tinta`, `--acento`…) | propio de la app |
```

- [ ] **Step 6: mirar los cuatro temas en el playground**

Run: `npm run dev`, abrir `http://localhost:3000`, pasar por los cinco temas en claro y oscuro.
Expected: el fondo y la cabecera cambian con cada tema; en `etconecta` oscuro el fondo es violeta profundo; en `campus` el acento es azul.

- [ ] **Step 7: commit**

```bash
git add temas
git commit -m "feat: temas espejo de mi, etconecta, campus y proyectos

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: El primer componente adoptado: botón imán

Propio, licencia `propia`, para probar el circuito entero antes de traer nada de afuera. Franco dijo que las URLs que mandó son ejemplos de lectura y **no** entran.

**Files:**
- Create: `components/botones/boton-iman/BotonIman.tsx`, `components/botones/boton-iman/demo.tsx`, `components/botones/boton-iman/guion.mjs`, `components/botones/boton-iman/meta.json`, `components/botones/boton-iman/README.md`
- Delete: `components/.gitkeep`

**Interfaces:**
- Consumes: `lib/demo.ts`.
- Produces: la primera entrada que Task 8 captura. `guion.mjs` exporta `default async (page) => void` (Playwright `Page`), que Task 8 ejecuta durante la grabación.

- [ ] **Step 1: el componente**

`components/botones/boton-iman/BotonIman.tsx`:
```tsx
'use client'
import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion, type HTMLMotionProps } from 'motion/react'

type Props = HTMLMotionProps<'button'> & {
  /** Cuánto se corre hacia el cursor: 0 = nada, 1 = lo sigue entero. */
  alcance?: number
}

/** Botón que se inclina hacia el cursor y vuelve con un resorte al soltarlo.
 *  Con `prefers-reduced-motion` se queda quieto y sigue siendo un botón normal. */
export function BotonIman({ alcance = 0.35, className = '', children, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const quieto = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 320, damping: 22, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 320, damping: 22, mass: 0.6 })

  function mover(e: React.PointerEvent<HTMLButtonElement>) {
    if (quieto || !ref.current || e.pointerType === 'touch') return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * alcance)
    y.set((e.clientY - (r.top + r.height / 2)) * alcance)
  }
  function soltar() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onPointerMove={mover}
      onPointerLeave={soltar}
      className={`inline-flex items-center gap-2 rounded-ui bg-ui-accent px-5 py-3 font-ui-display text-sm font-semibold text-ui-accent-ink transition-[filter] duration-(--ui-dur) ease-ui hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
```

- [ ] **Step 2: la demo y el guion**

`components/botones/boton-iman/demo.tsx`:
```tsx
import { ArrowRight } from 'lucide-react'
import type { Demo } from '../../../lib/demo'
import { BotonIman } from './BotonIman'

const demos: Demo[] = [
  {
    nombre: 'Principal',
    render: () => (
      <BotonIman>
        Quiero ir <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
      </BotonIman>
    ),
  },
  {
    nombre: 'Alcance corto',
    render: () => <BotonIman alcance={0.15}>Guardar cambios</BotonIman>,
  },
]
export default demos
```

`components/botones/boton-iman/guion.mjs`:
```js
/** Lo que hace el cursor mientras se graba preview.webp (3 segundos). */
export default async function guion(page) {
  const boton = page.locator('button').first()
  const caja = await boton.boundingBox()
  const cx = caja.x + caja.width / 2
  const cy = caja.y + caja.height / 2
  await page.mouse.move(cx - 140, cy - 70)
  await page.waitForTimeout(300)
  await page.mouse.move(cx - 24, cy - 8, { steps: 18 })
  await page.waitForTimeout(500)
  await page.mouse.move(cx + 28, cy + 10, { steps: 18 })
  await page.waitForTimeout(500)
  await page.mouse.move(cx + 220, cy + 130, { steps: 14 })
  await page.waitForTimeout(900)
}
```

- [ ] **Step 3: la ficha y el README**

`components/botones/boton-iman/meta.json`:
```json
{
  "slug": "boton-iman",
  "nombre": "Botón imán",
  "categoria": "botones",
  "estado": "adoptado",
  "origen": { "nombre": "EmpleoTecnia", "url": "", "licencia": "propia" },
  "publicable": true,
  "por_que_entro": "Se corre hacia el cursor y vuelve con un resorte: se siente vivo sin gritar, y en el celular es un botón común.",
  "sirve_para": ["CTA principal de una landing", "el único botón importante de una pantalla"],
  "no_sirve_para": ["listas con muchos botones", "formularios densos"],
  "etiquetas": ["hover", "cursor", "cta", "resorte", "sutil"],
  "caracter": { "movimiento": "sutil", "tono": "premium", "densidad": "aire" },
  "tokens": ["--ui-accent", "--ui-accent-ink", "--ui-radius", "--ui-font-display", "--ui-dur", "--ui-ease"],
  "dependencias": ["motion"],
  "usado_en": [],
  "agregado_por": "claude",
  "fecha": "2026-10-02"
}
```

`components/botones/boton-iman/README.md`:
```markdown
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
```

- [ ] **Step 4: catalogar sin capturas y ver que sólo faltan las capturas**

```bash
rm components/.gitkeep
npm run catalogar
```
Expected: falla con exactamente dos problemas: `falta preview.png` y `falta preview.webp`. Si aparece otro (token no declarado, clase desconocida), arreglarlo ahora.

- [ ] **Step 5: verlo en el playground**

Run: `npm run dev`, abrir `http://localhost:3000` y `/c/botones/boton-iman` y `/captura/boton-iman`.
Expected: el botón se corre hacia el cursor; en `/captura` se ven dos paneles, claro y oscuro, en 1200×600. Antes de eso hay que regenerar el registro: como el catalogador falla sin capturas, correr una vez `node -e "import('./scripts/lib/catalogo.mjs').then(async m=>{const r=await m.construirCatalogo(process.cwd(),{sinCapturas:true});m.escribirSalidas(process.cwd(),r.entradas)})"`.

- [ ] **Step 6: commit (sin capturas todavía; llegan en Task 8)**

```bash
git add components playground/registro.generado.tsx catalog.json README.md
git commit -m "agrega(botones): botón imán (adoptado, sin capturas)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: El capturador

**Files:**
- Create: `scripts/capturar.mjs`, `scripts/lib/webp.mjs`
- Test: `scripts/tests/webp.test.mjs`
- Modify: `components/botones/boton-iman/meta.json` (gana `captura_de`)

**Interfaces:**
- Consumes: `construirCatalogo(raiz, { sinCapturas: true })`, `hashCodigo(dir)`, rutas `/captura/<slug>` del playground, `guion.mjs` opcional por componente.
- Produces: `preview.png` y `preview.webp` en cada adoptado; `captura_de` en su ficha. `webp.mjs` exporta `aWebp({ entrada, salida, fps, segundos, calidad }) => Promise<number>` (bytes) y `comprimirHastaEntrar({ entrada, salida, tope }) => Promise<{ bytes, intento }>`.

- [ ] **Step 1: instalar Chromium de Playwright**

Run: `npx playwright install chromium`
Expected: descarga y termina. Comprobar ffmpeg: `ffmpeg -version | head -1`.

- [ ] **Step 2: el test de la compresión que falla**

`scripts/tests/webp.test.mjs`:
```js
import { describe, it, expect } from 'vitest'
import { escalonesDeCompresion } from '../lib/webp.mjs'

describe('escalonesDeCompresion', () => {
  it('baja primero calidad, después fps, después largo, y nunca pasa de 3 s ni de 12 fps', () => {
    const e = escalonesDeCompresion()
    expect(e[0]).toEqual({ fps: 12, segundos: 3, calidad: 75 })
    expect(e.map(x => x.calidad)).toEqual(expect.arrayContaining([75, 60, 45]))
    const ultimo = e[e.length - 1]
    expect(ultimo.segundos).toBeLessThanOrEqual(3)
    expect(ultimo.fps).toBeLessThan(12)
    expect(ultimo.segundos).toBeLessThan(3)
    for (let i = 1; i < e.length; i++) {
      const a = e[i - 1], b = e[i]
      expect(b.calidad <= a.calidad || b.fps < a.fps || b.segundos < a.segundos).toBe(true)
    }
  })
})
```

- [ ] **Step 3: correr y ver que falla**

Run: `npx vitest run scripts/tests/webp.test.mjs`
Expected: FAIL, módulo inexistente.

- [ ] **Step 4: `scripts/lib/webp.mjs`**

```js
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { statSync, unlinkSync, existsSync } from 'node:fs'

const run = promisify(execFile)

/** De más fiel a más liviano. El tope de 400 KB se persigue en este orden. */
export function escalonesDeCompresion() {
  return [
    { fps: 12, segundos: 3, calidad: 75 },
    { fps: 12, segundos: 3, calidad: 60 },
    { fps: 12, segundos: 3, calidad: 45 },
    { fps: 10, segundos: 3, calidad: 45 },
    { fps: 8, segundos: 3, calidad: 45 },
    { fps: 8, segundos: 2.5, calidad: 45 },
    { fps: 8, segundos: 2, calidad: 40 },
  ]
}

/** Convierte un video a WebP animado de 600 px de ancho. Devuelve el peso en bytes. */
export async function aWebp({ entrada, salida, fps, segundos, calidad, desde = 0.2 }) {
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-ss', String(desde), '-t', String(segundos),
    '-i', entrada,
    '-vf', `fps=${fps},scale=600:-2:flags=lanczos`,
    '-loop', '0', '-quality', String(calidad), '-compression_level', '6', '-an',
    salida,
  ])
  return statSync(salida).size
}

/** Prueba los escalones hasta que el archivo entre en el tope. Si ninguno entra, borra la salida y tira. */
export async function comprimirHastaEntrar({ entrada, salida, tope }) {
  let bytes = Infinity
  const escalones = escalonesDeCompresion()
  for (let i = 0; i < escalones.length; i++) {
    bytes = await aWebp({ entrada, salida, ...escalones[i] })
    if (bytes <= tope) return { bytes, intento: i + 1 }
  }
  if (existsSync(salida)) unlinkSync(salida)
  throw new Error(`no entra en ${Math.round(tope / 1024)} KB ni con el escalón más liviano (quedó en ${Math.ceil(bytes / 1024)} KB)`)
}
```

- [ ] **Step 5: correr y ver que pasa**

Run: `npx vitest run scripts/tests/webp.test.mjs`
Expected: PASS.

- [ ] **Step 6: `scripts/capturar.mjs`**

```js
#!/usr/bin/env node
// Saca preview.png (1200×600, claro + oscuro) y preview.webp (600 px, ≤ 400 KB, 3 s)
// de cada adoptado que no tenga capturas o cuyo código haya cambiado.
//   npm run capturar            → sólo los que lo necesitan
//   npm run capturar -- --todos → todos
//   npm run capturar -- --solo boton-iman
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { construirCatalogo, escribirSalidas, hashCodigo } from './lib/catalogo.mjs'
import { comprimirHastaEntrar } from './lib/webp.mjs'
import { TOPE_WEBP } from './lib/contrato.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const todos = args.includes('--todos')
const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null
const PUERTO = 3999
const BASE = `http://localhost:${PUERTO}`
const tmp = join(raiz, '.capturas-tmp')

const { entradas, errores } = await construirCatalogo(raiz, { sinCapturas: true })
if (errores.length) {
  console.error('✗ Antes de capturar hay que arreglar esto:\n' + errores.map(e => `  · ${e}`).join('\n'))
  process.exit(1)
}
escribirSalidas(raiz, entradas) // el registro tiene que estar al día para que el playground los tenga

const pendientes = entradas.filter(e => {
  if (e.estado !== 'adoptado') return false
  if (solo) return e.slug === solo
  if (todos) return true
  const dir = join(raiz, e.ruta)
  return !e.preview_png || !e.preview_webp || e.captura_de !== hashCodigo(dir)
})
if (pendientes.length === 0) { console.log('✓ Nada que capturar.'); process.exit(0) }
console.log(`Capturando ${pendientes.length}: ${pendientes.map(e => e.slug).join(', ')}`)

// ── levantar el playground ──
const servidor = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', 'playground', '-p', String(PUERTO)], { cwd: raiz, stdio: 'pipe', shell: process.platform === 'win32' })
servidor.stderr.on('data', d => { const t = String(d); if (/error/i.test(t)) process.stderr.write(t) })
async function esperarServidor() {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return } catch {}
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('el playground no levantó en 90 s')
}

const fallas = []
try {
  await esperarServidor()
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp)
  const navegador = await chromium.launch()

  for (const e of pendientes) {
    const dir = join(raiz, e.ruta)
    process.stdout.write(`  ${e.slug} … `)
    try {
      // PNG: los dos modos lado a lado
      const pagina = await navegador.newPage({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 1 })
      await pagina.goto(`${BASE}/captura/${e.slug}`, { waitUntil: 'networkidle' })
      await pagina.waitForTimeout(700)
      await pagina.screenshot({ path: join(dir, 'preview.png') })
      await pagina.close()

      // WebP: grabación del guion en claro
      const contexto = await navegador.newContext({ viewport: { width: 600, height: 400 }, recordVideo: { dir: tmp, size: { width: 600, height: 400 } } })
      const grabando = await contexto.newPage()
      await grabando.goto(`${BASE}/captura/${e.slug}?modo=claro`, { waitUntil: 'networkidle' })
      await grabando.waitForTimeout(400)
      const rutaGuion = join(dir, 'guion.mjs')
      if (existsSync(rutaGuion)) {
        const { default: guion } = await import(pathToFileURL(rutaGuion).href)
        await guion(grabando)
      } else {
        await grabando.mouse.move(300, 200, { steps: 20 })
        await grabando.waitForTimeout(1200)
        await grabando.mouse.move(40, 40, { steps: 20 })
        await grabando.waitForTimeout(1200)
      }
      const video = grabando.video()
      await contexto.close()
      const rutaVideo = await video.path()
      const { bytes, intento } = await comprimirHastaEntrar({ entrada: rutaVideo, salida: join(dir, 'preview.webp'), tope: TOPE_WEBP })

      // anotar de qué código son estas capturas
      const rutaMeta = join(dir, 'meta.json')
      const ficha = JSON.parse(readFileSync(rutaMeta, 'utf8'))
      ficha.captura_de = hashCodigo(dir)
      writeFileSync(rutaMeta, JSON.stringify(ficha, null, 2) + '\n')
      console.log(`png ✓  webp ✓ ${Math.ceil(bytes / 1024)} KB${intento > 1 ? ` (escalón ${intento})` : ''}`)
    } catch (err) {
      console.log('✗')
      fallas.push(`${e.slug}: ${err.message}`)
    }
  }
  await navegador.close()
} finally {
  servidor.kill()
  rmSync(tmp, { recursive: true, force: true })
}

if (fallas.length) {
  console.error('\n✗ No se pudo capturar:\n' + fallas.map(f => `  · ${f}`).join('\n'))
  process.exit(1)
}
// Dejar el catálogo y los README al día con las capturas nuevas
const final = await construirCatalogo(raiz)
if (final.errores.length) { console.error(final.errores.join('\n')); process.exit(1) }
escribirSalidas(raiz, final.entradas)
console.log('✓ Capturas listas y catálogo regenerado.')
```

- [ ] **Step 7: capturar el botón imán**

Run: `npm run capturar`
Expected: `boton-iman … png ✓  webp ✓ NN KB`, después `✓ Capturas listas`. Abrir `components/botones/boton-iman/preview.png`: dos paneles, claro y oscuro, el botón centrado. Abrir `preview.webp` en el navegador: el botón se mueve hacia el cursor invisible y vuelve. `meta.json` tiene `captura_de`.

Si en Windows `spawn` de `npx` no arranca, el fallback es `shell: true` (ya está puesto) y `npx.cmd`. Si el video sale negro, subir el `waitForTimeout(400)` a 1000.

- [ ] **Step 8: verificar que el catalogador ya pasa entero**

Run: `npm run verificar`
Expected: tests en verde, `✓ 1 entradas (1 adoptadas, 0 referencias)`, y `git diff --exit-code` sin salida (todo lo generado está commiteado, excepto lo que se commitea ahora). Abrir `components/botones/README.md` en el editor: la grilla apunta a `boton-iman/preview.webp`.

- [ ] **Step 9: commit y push**

```bash
git add -A
git commit -m "feat: capturador con Playwright y ffmpeg; capturas del botón imán

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

Después del push, abrir `https://github.com/EmpleoTecnia/ui/tree/main/components/botones` en el navegador: el README muestra la animación moviéndose. Si GitHub no la anima, es que el WebP salió de un solo cuadro: revisar `fps` y `-t` en `aWebp`.

---

### Task 9: CI en GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: el workflow**

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Tests del catalogador
        run: npm test
      - name: Catalogar y comprobar que lo generado está commiteado
        run: |
          node scripts/catalogar.mjs
          git diff --exit-code -- catalog.json README.md components patterns playground/registro.generado.tsx || (echo "::error::Hay salidas generadas sin commitear. Corré npm run catalogar y commiteá." && exit 1)
      - name: Build del playground
        run: npm run build
```

Nota: `catalog.json` lleva `generado` con la hora, así que `git diff` lo marcaría siempre. Cambiar `escribirSalidas` para que **no** reescriba `catalog.json` si lo único que cambia es `generado`: leer el existente, comparar `JSON.stringify(entradas)` con el guardado y escribir sólo si difieren. Agregar ese caso al test de `escribirSalidas`: escribir dos veces seguidas y comprobar que `generado` no cambió.

- [ ] **Step 2: el ajuste en `escribirSalidas` y su test**

En `scripts/lib/catalogo.mjs`, reemplazar la primera línea de `escribirSalidas` por:
```js
  const rutaCatalogo = join(raiz, 'catalog.json')
  const previo = existsSync(rutaCatalogo) ? JSON.parse(readFileSync(rutaCatalogo, 'utf8')) : null
  if (!previo || JSON.stringify(previo.entradas) !== JSON.stringify(entradas)) {
    writeFileSync(rutaCatalogo, JSON.stringify({ generado: new Date().toISOString(), entradas }, null, 2) + '\n')
  }
```
En `scripts/tests/catalogo.test.mjs`, al final del test de `escribirSalidas`:
```js
    const generado1 = JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8')).generado
    await new Promise(r => setTimeout(r, 5))
    escribirSalidas(raiz, entradas)
    expect(JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8')).generado).toBe(generado1)
```

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 3: commit, push, mirar el Action**

```bash
git add .github scripts
git commit -m "ci: tests, catálogo al día y build del playground en cada push

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
gh run watch --exit-status
```
Expected: el run termina en verde. Si `npm ci` falla por el lockfile, regenerar con `npm install` y commitear `package-lock.json`.

---

### Task 10: Los tres comandos en `base`

Los comandos son archivos Markdown de Claude Code. Viven en `base/claude/commands/` y se reparten a `Plataformas/.claude/commands/` (Task 11). Se escriben en segunda persona hacia Claude. Todo en español.

**Files:**
- Create: `../base/claude/commands/ui-agregar.md`, `../base/claude/commands/ui-buscar.md`, `../base/claude/commands/ui-usar.md`

**Interfaces:**
- Consumes: `catalog.json`, `tokens.css` (marcadores `PUENTE` y `MAPEO DE MUESTRA`), `scripts/catalogar.mjs`, `scripts/capturar.mjs`, `playground` en `localhost:3000`.

- [ ] **Step 1: `ui-agregar.md`**

```markdown
---
description: Guarda en la librería UI un componente o patrón que te gustó (URL, descripción, captura o código)
argument-hint: <url | descripción | ruta a una captura>
---

Sos el bibliotecario de la librería UI de EmpleoTecnia. Vas a guardar lo que la persona
te pasó en `$ARGUMENTS`. Las reglas completas están en el `CLAUDE.md` de la librería:
leelo antes de empezar.

## 0. Ubicá la librería

Es la carpeta `ui-library` al lado de las apps: probá `../ui-library` desde la carpeta
actual, y si no, `Plataformas/ui-library` subiendo hasta encontrar `Plataformas`. Tiene
que tener `catalog.json`. Si no está, decí:
"La librería no está clonada. Corré `node base/scripts/armar-plataformas.mjs` o
`git clone https://github.com/EmpleoTecnia/ui.git ui-library` al lado de las apps."
y pará. Todo lo que sigue se hace parado en esa carpeta. Primero `git pull --rebase`.

## 1. Leé la fuente

- **URL**: traela con WebFetch pidiendo: qué componente es, qué hace (interacción,
  animación), tecnologías, si la página trae el código completo, y qué licencia dice la
  página o el sitio. Si el sitio es de registry shadcn y la página no trae el código,
  probá `<origen>/r/<slug>.json` y `<origen>/registry/<slug>.json`. Si tiene repo en
  GitHub, traé el `LICENSE` de ahí. Si nada de eso trae el código y la persona pidió
  portearlo, pedile que pegue el código o una captura; mientras tanto seguís con la
  descripción.
- **Ruta a una captura**: leela como imagen y describí lo que ves.
- **Descripción en texto**: trabajá con eso.

Anotá: nombre tentativo, qué hace, tecnologías, si hay código y de dónde, licencia
(`MIT`, `Apache-2.0`, `ISC`, `CC0`, `propia` o `desconocida`; si la página no la dice y
el repo tampoco, es `desconocida`).

## 2. Buscá si ya está

Leé `catalog.json`. Compará por categoría, etiquetas y lo que hace. Si hay algo
parecido, mostralo (nombre, `por_que_entro`, su `preview.png` con Read, link
`url_github`) y preguntá: "¿Es lo mismo? ¿Lo actualizo, o entra igual como otro?".
Si la respuesta es que es lo mismo, actualizá la ficha existente en vez de crear una.

## 3. Proponé la clasificación (vos, no la persona)

Decidí y mostrá en cinco líneas: tipo (`components` o `patterns`), categoría (una de las
del `CLAUDE.md`), nombre en español, slug (minúsculas, guiones, sin acentos), etiquetas
(4 a 8), licencia detectada. También inferí el carácter (`movimiento`, `tono`,
`densidad`) pero **no lo preguntes ni lo muestres como pregunta**: va directo a la
ficha, y si no estás seguro de un eje, dejalo afuera.

## 4. Preguntá tres cosas, de a una, con AskUserQuestion

1. **"¿Qué te gustó de esto?"** Opciones: lo visual / cómo se mueve / cómo responde al
   usar / cómo está armado / todo. Y pedí que lo diga en una frase propia: esa frase
   es `por_que_entro`. Si contesta "me gusta", "está bueno" o algo sin un detalle,
   repreguntá: "¿Qué cosa en particular? Por ejemplo: el rebote al soltar, el degradé
   del borde, cómo se abre." No sigas sin una frase concreta de al menos 20 caracteres.
2. **"¿Para qué lo usarías?"** Texto libre. Va a `sirve_para` como lista. Si nombra una
   app (`mi`, `etconecta`, `campus`, `proyectos`, `web`, `admin`, `jornadas`), sumala a
   `etiquetas`.
3. **"¿Lo guardo como idea para después, o lo armo ahora para poder usarlo?"**
   Opciones: "Guardalo como idea" (= `referencia`) / "Armalo ahora" (= `adoptado`).
   No uses las palabras referencia/adoptado con la persona.

## 5. Si es referencia

Creá `<tipo>/<categoria>/<slug>/` con:
- `meta.json` con todos los campos (ver el ejemplo en la spec, sección "La ficha");
  `estado: "referencia"`, `tokens: []`, `usado_en: []`, `agregado_por` con el nombre de
  quien está trabajando (preguntalo si no lo sabés), `fecha` de hoy.
- `README.md`: qué es, por qué entró (la frase de la persona), para qué sirve, el link
  al origen, y qué habría que resolver para adoptarlo.
- `preview.png`: bajá la imagen de la página de origen si hay una; si no, sacale una
  captura a la URL con Playwright (`npx playwright screenshot --viewport-size=1200,600
  <url> preview.png`); si tampoco se puede, pedile una captura a la persona. Si la
  captura es manual, poné `"capturas": "manual"` en la ficha.
- `preview.webp` sólo si hay un video o GIF del origen que se pueda convertir.
- Si la licencia lo permite (MIT, Apache-2.0, ISC, CC0), guardá el código original en
  `codigo-origen/` tal cual, con un `ORIGEN.md` que diga URL y fecha.

## 6. Si es adoptado

Porteá el componente a nuestro stack: React 19, TypeScript, Tailwind v4, `motion`
(no `framer-motion`), Lucide. Reglas:
- Sólo tokens del contrato (`tokens.css`): clases `bg-ui-*`, `text-ui-*`,
  `border-ui-*`, `rounded-ui`, `rounded-ui-lg`, `font-ui-display`, `font-ui-text`,
  `ease-ui`, `duration-(--ui-dur)`, o `var(--ui-*)`. Nada de hex, `rgb()`, `hsl()`,
  `oklch()` absoluto ni `bg-blue-500`. Un color que falte se deriva:
  `color-mix(in oklch, var(--ui-accent) 30%, transparent)` o
  `oklch(from var(--ui-accent) calc(l + 0.1) c h)`.
- Movimiento desde `--ui-dur` y `--ui-ease` (se multiplican, no se fijan ms). Respeta
  `prefers-reduced-motion` (`useReducedMotion` o `motion-reduce:`).
- `'use client'` sólo si hace falta. Props tipadas. Nombres en español.
- `demo.tsx` que exporta `Demo[]` (`import type { Demo } from '../../../lib/demo'`),
  el primero es el que sale en las capturas. Si el valor está en la interacción,
  escribí `guion.mjs` (`export default async (page) => {...}`, Playwright) con 3
  segundos de hover/clic/scroll.
- `meta.json` con `estado: "adoptado"` y `tokens` con exactamente los `--ui-*` que usa
  el código. `README.md` como el del botón imán: qué es, por qué entró, cómo se usa,
  qué toma de tu app, dependencias.
Después: `npm run capturar -- --solo <slug>` y `npm run verificar`. Si el catalogador
se queja, arreglá y repetí. Si después de dos vueltas no lográs sacar los colores
crudos, dejalo como `referencia`, guardá tu intento en `codigo-origen/intento.tsx` y
explicale a la persona qué falta.

## 7. Commit y push, en la librería

```
git add <tipo>/<categoria>/<slug> catalog.json README.md <tipo>/README.md <tipo>/<categoria>/README.md playground/registro.generado.tsx
git commit -m "agrega(<categoria>): <nombre> (<estado>)"
git push
```
Si el push falla, `git pull --rebase` y de nuevo, una vez. Terminá mostrando: nombre,
estado, link `url_github`, y la `preview.png` con Read para que la persona la vea.
```

- [ ] **Step 2: `ui-buscar.md`**

```markdown
---
description: Busca en la librería UI y muestra hasta cinco candidatos con su captura
argument-hint: <qué necesitás, en tus palabras> [--vivo]
---

Buscá en la librería UI de EmpleoTecnia lo que la persona pide en `$ARGUMENTS`.

## 0. Ubicá la librería

Carpeta `ui-library` al lado de las apps: `../ui-library` desde acá, o
`Plataformas/ui-library` subiendo hasta `Plataformas`. Si no está, decilo con el
`git clone https://github.com/EmpleoTecnia/ui.git ui-library` y pará. Hacé
`git pull --rebase` ahí para tener lo último del equipo.

## 1. Leé `catalog.json`

Si falta o si hay carpetas en `components/` o `patterns/` que no están en él, corré
`npm run catalogar` primero.

## 2. Interpretá el pedido

Sacá de las palabras de la persona:
- **categoría** (si se puede: "botón" → `botones`, "navbar"/"menú" → `navegacion`,
  "tarjeta"/"card" → `tarjetas`, "formulario"/"input" → `formularios`, "fondo" →
  `fondos`, "pantalla de perfil" → patrón `perfil`, etc.). **Es lo único que excluye.**
  Si no se puede inferir, no excluyas nada.
- **carácter** ("sutil", "sobrio", "llamativo", "divertido", "denso", "con aire") →
  suma puntos a `caracter.*` pero no excluye; una entrada sin `caracter` sigue entrando.
- **uso** ("para el perfil", "para una landing", "para rewards") → suma por coincidencia
  con `sirve_para` y `etiquetas`.
- **app** (`mi`, `etconecta`, `campus`, `proyectos`…) → suma por `usado_en` y
  `etiquetas`.
Ordená por puntos; a igualdad, `adoptado` antes que `referencia`. Nunca muestres
`retirado`. Quedate con los **cinco** mejores.

## 3. Mostrá

Por cada candidato, en este orden:
1. **Nombre** · estado · categoría
2. `por_que_entro` tal cual está escrito
3. La `preview.png` mostrada con Read (la persona la ve en el chat)
4. `url_github`
5. Si está en `usado_en`, dónde.
Si había más de cinco, decí cuántos quedaron afuera y ofrecé afinar ("¿lo querés más
sutil? ¿para qué app?"). Si no hay ninguno, decilo en una línea y ofrecé
`/ui-agregar <url>` para traer uno.

Cerrá con: "Para ponerlo en tu app: `/ui-usar <slug>` parado en la carpeta de la app."

## 4. Si viene `--vivo`

Comprobá si `http://localhost:3000` responde. Si no, levantá `npm run dev` en la
librería en segundo plano y esperá a que responda (hasta 60 s). Después abrí en el
navegador `http://localhost:3000/buscar?slugs=<slugs adoptados separados por coma>`
(`start` en Windows, `open` en macOS). Las referencias no tienen código, así que no
aparecen vivas: avisalo si alguna de las cinco era referencia.
```

- [ ] **Step 3: `ui-usar.md`**

```markdown
---
description: Copia un componente de la librería UI a la app en la que estás parado, pintado con sus tokens
argument-hint: <slug> [--en <ruta de la app>]
---

Vas a poner en una app el componente `$ARGUMENTS` de la librería UI de EmpleoTecnia.

## 0. Ubicá las dos cosas

- **La app**: la carpeta actual, salvo que venga `--en <ruta>`. Tiene que tener
  `package.json` con `next`. Si no, decilo y pará.
- **La librería**: `../ui-library` desde la app, o `Plataformas/ui-library`. Si no
  está, decilo con el `git clone` y pará. `git pull --rebase` ahí.

## 1. Comprobá el slug

Buscalo en `catalog.json`. Si no existe, decilo y sugerí `/ui-buscar`. Si es
`referencia`, decí: "Todavía es una idea guardada, no tiene código nuestro. ¿Lo armo
ahora?" y, si dice que sí, seguí el paso 6 de `/ui-agregar` sobre esa carpeta (portearlo,
capturar, verificar, commitear en la librería) antes de continuar. Si es `retirado`,
mostrá `por_que_salio` y pará.

## 2. Leé cómo es la app

- `DESIGN.md` si existe (tokens, radios, duraciones, dónde viven las primitivas).
- Su `globals.css` (buscá `app/globals.css`, `src/app/globals.css`,
  `src/styles/globals.css`).
- Si la app está en JavaScript (no hay `tsconfig.json`), vas a convertir el componente
  a `.jsx` sin tipos.
- Dónde van las primitivas: `src/components/ui/` o `components/ui/` según exista; si
  `DESIGN.md` dice otra cosa, eso manda.

## 3. El mapeo de tokens, si falta

Buscá `--ui-accent` en el `globals.css` de la app. Si **no** está:
1. Leé en `tokens.css` de la librería la sección entre `── PUENTE` y `── FIN PUENTE`
   (el bloque `@theme inline`) y la sección `MAPEO DE MUESTRA`.
2. Armá el mapeo para esta app: cada `--ui-*` apunta al token real de la app
   (`--ui-bg: var(--c-bg)` en `mi`, `var(--papel)` en `proyectos`,
   `var(--l-papel)` en `etconecta`, `var(--color-bg)` en `campus`, etc.), y los
   radios, duración y curva con los valores que la app ya usa. Si la app tiene modo
   oscuro con otros nombres (`--d-*` en `etconecta`), agregá el mismo mapeo bajo su
   selector oscuro.
3. **Mostrá el bloque entero y preguntá antes de escribirlo.** Con el sí, agregalo al
   final de `globals.css`, con el comentario `/* Contrato --ui-* de la librería UI */`.
Si ya está, no lo toques.

## 4. Copiá el componente

- Copiá los archivos de código de `<ruta>/` **menos** `demo.tsx` y `guion.mjs` a
  `<primitivas>/<slug>/`. Ajustá los imports relativos. Si la app es JS, convertí a
  `.jsx` sacando tipos.
- Si `dependencias` tiene algo que la app no tiene en `package.json` (`motion`, por
  ejemplo), decilo y preguntá antes de `npm install`.
- Corré `npx tsc --noEmit` (o `npm run lint` si es JS) y arreglá lo que rompa.
- Mostrá un ejemplo de uso con los imports ya correctos para esta app.

## 5. Anotá el uso en la librería

En `meta.json` del componente, sumá el nombre de la app a `usado_en` si no está.
`npm run catalogar`. Commit y push **en la librería**:
```
git add <ruta>/meta.json catalog.json
git commit -m "usa(<slug>): <app>"
git push
```

## 6. En la app, no commitees

Mostrá `git status` de la app y decí qué archivos tocaste. El commit en la app es de la
persona, por la regla de un cambio por deploy.
```

- [ ] **Step 4: commit en `base`**

```bash
cd ../base
git add claude/commands
git commit -m "feat: comandos /ui-agregar, /ui-buscar y /ui-usar para la librería UI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Integración con `base`: armar-plataformas, guía, agente diseno

**Files:**
- Modify: `../base/scripts/armar-plataformas.mjs` (REPOS, guardia de ENTORNO, sección de comandos)
- Modify: `../base/CLAUDE.md` (estructura en disco, línea 79–98; "Dónde quedamos", después de la fila `3 · paquetes compartidos` en la línea 126; regla nueva después de la 10, línea 228)
- Modify: `../base/claude/agents/diseno.md` (líneas 16–21 "Fuentes de verdad" y línea 43, paso 1 de "Diseñar una pantalla")

- [ ] **Step 1: `armar-plataformas.mjs`**

En `REPOS`, agregar la última fila:
```js
  web: 'web',
  'ui-library': 'ui',
}
```
Encima del objeto `REPOS`, al final del comentario, agregar:
```js
// `ui-library` es la librería UI del equipo (repo `ui`): no es una app, no tiene
// `.env`, y los comandos /ui-* la buscan por ese nombre de carpeta.
```
En el bucle de repos, la comprobación del `.env` tiene que saltear las carpetas sin entorno. Reemplazar:
```js
  if (!existsSync(join(destino, ENTORNO[carpeta]))) {
```
por:
```js
  if (ENTORNO[carpeta] && !existsSync(join(destino, ENTORNO[carpeta]))) {
```
Después de la sección `// ── 3. Los agentes ──` y antes de `// ── 4. Lo que tenés que pedir ──`, agregar:
```js
// ── 3b. Los comandos ────────────────────────────────────────────
//
// `/ui-agregar`, `/ui-buscar`, `/ui-usar`: los comandos de la librería UI.
// Misma política que los agentes: lo que no está en base no existe.
console.log('\nComandos')
const comandosOrigen = join(base, 'claude', 'commands')
const comandosDestino = join(plataformas, '.claude', 'commands')
mkdirSync(comandosDestino, { recursive: true })
for (const archivo of readdirSync(comandosOrigen).filter(f => f.endsWith('.md'))) {
  const desde = join(comandosOrigen, archivo)
  const hasta = join(comandosDestino, archivo)
  const igual = existsSync(hasta) && readFileSync(hasta, 'utf8') === readFileSync(desde, 'utf8')
  if (!igual) copyFileSync(desde, hasta)
  console.log(`  ${igual ? '✓' : '+'} /${archivo.replace(/\.md$/, '')}`)
}
```
En el comentario de cabecera del archivo, debajo de la línea de `.claude/agents/`, agregar:
```
//   .claude/commands/  `/ui-agregar`, `/ui-buscar`, `/ui-usar`: los comandos de la
//                      librería UI. Sin ellos hay que ir a mano a `ui-library`.
```

- [ ] **Step 2: correrlo**

```bash
cd ../base && node scripts/armar-plataformas.mjs
```
Expected: `✓ ui-library` en Repos (ya está clonada), sección `Comandos` con `+ /ui-agregar`, `+ /ui-buscar`, `+ /ui-usar`, y existe `Plataformas/.claude/commands/ui-agregar.md`. No aparece `ui-library/undefined` en "Faltan las claves".

- [ ] **Step 3: `base/CLAUDE.md`**

En "Estructura en disco", después de la línea de `proyectos\`:
```
│   ├── ui-library\  la librería UI curada del equipo — repo EmpleoTecnia/ui. Se consulta con /ui-buscar, se alimenta con /ui-agregar
```
En "Dónde quedamos", después de la fila `| 3 · paquetes compartidos |`:
```
| 3b · librería UI | **Arrancada el 2/10.** Repo `EmpleoTecnia/ui` en `Plataformas\ui-library`: componentes y patrones que al equipo le gustaron, porteados a nuestro stack y escritos contra un contrato de 15 tokens `--ui-*` que cada app mapea a los suyos ("un país, distintas ciudades": el carácter es de la pieza, el color de la app). Catálogo visual en el repo mismo (`preview.webp` animadas en los README), playground local con selector de tema (`npm run dev`), capturas automáticas con Playwright. Tres comandos repartidos por `armar-plataformas.mjs`: `/ui-agregar` (pregunta sólo qué te gustó, para qué, y si lo guarda como idea o lo arma), `/ui-buscar` (hasta cinco candidatos con captura; sólo la categoría excluye), `/ui-usar` (copia a la app y propone el mapeo de tokens; no commitea en la app). Primer adoptado: el botón imán. **Falta la prueba de fuego con Franco**: `/ui-agregar` sobre la scratch card de Planes, `/ui-buscar`, `/ui-usar` en `proyectos` local. Spec: `ui-library/docs/superpowers/specs/2026-10-02-ui-library-design.md`. |
```
En "Reglas del ecosistema que no se negocian", después de la regla 10:
```
11. **Antes de crear un componente visual, `/ui-buscar`.** La librería UI existe para
    que lo que a alguien ya le gustó no se reinvente peor en la app siguiente. Si lo que
    hiciste vale la pena, `/ui-agregar` para que lo tenga el resto. Y lo que sale de la
    librería se pinta con los tokens de la app: el carácter es de la pieza, el color es
    de la ciudad.
```

- [ ] **Step 4: `base/claude/agents/diseno.md`**

En "Fuentes de verdad, en orden", después del punto 4:
```
5. **La librería UI** (`../ui-library/catalog.json`, repo `EmpleoTecnia/ui`): lo que al equipo ya le gustó, porteado y pintable con los tokens de esta app. Antes de inventar una primitiva nueva, `/ui-buscar`; si usás algo, `/ui-usar <slug>` (propone el mapeo `--ui-*` si la app no lo tiene); si creaste algo que vale la pena para las demás apps, proponé `/ui-agregar` al terminar.
```
Reemplazar el paso 1 de "Diseñar una pantalla o componente":
```
1. Lee `DESIGN.md` y las primitivas. Lista qué reutilizas. Busca en la librería UI (`/ui-buscar <qué necesitás>`) antes de crear cualquier pieza nueva; si hay candidato, `/ui-usar`.
```

- [ ] **Step 5: commit y push en `base`**

```bash
cd ../base
git add scripts/armar-plataformas.mjs CLAUDE.md claude/agents/diseno.md
git commit -m "feat: la librería UI entra al ecosistema (armar-plataformas, guía, agente diseno)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 12: Verificación final y traspaso

**Files:**
- Modify: `README.md` (sólo si algo de lo que dice no coincide con lo hecho)

- [ ] **Step 1: todo en verde desde cero**

En `ui-library`:
```bash
rm -rf node_modules playground/.next && npm ci && npm run verificar && npm run build
```
Expected: tests en verde, `✓ 1 entradas`, `git diff --exit-code` sin salida, build OK.

- [ ] **Step 2: el repo en GitHub se ve como tiene que verse**

Abrir en el navegador:
- `https://github.com/EmpleoTecnia/ui` — el README raíz muestra "1 entradas, 1 adoptadas" y la grilla con el botón imán animado.
- `https://github.com/EmpleoTecnia/ui/tree/main/components/botones` — la grilla animada.
- `https://github.com/EmpleoTecnia/ui/actions` — último run verde.

- [ ] **Step 3: los comandos están donde Claude los busca**

```bash
ls ../.claude/commands/
```
Expected: `ui-agregar.md  ui-buscar.md  ui-usar.md`. Abrir Claude Code en `Plataformas` y escribir `/ui-` : los tres aparecen en el autocompletado.

- [ ] **Step 4: ensayo en seco de `/ui-buscar`**

Desde `Plataformas/proyectos`, `/ui-buscar botón para un CTA`.
Expected: devuelve el botón imán con su `por_que_entro`, la `preview.png` en el chat y el link a GitHub, y cierra con la línea de `/ui-usar`.

- [ ] **Step 5: lo que queda para Franco (prueba de fuego)**

No lo hace el implementador: necesita las respuestas de Franco. Queda escrito en `base/CLAUDE.md` (Task 11) como pendiente:
1. `/ui-agregar https://useplanes.com/components/scratch-card`
2. `/ui-buscar "botón para un perfil"`
3. `/ui-usar boton-iman` parado en `proyectos` con `npm run dev:local`

- [ ] **Step 6: commit final si hubo ajustes de README**

```bash
git add -A && git commit -m "docs: ajustes del README tras la verificación

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

---

## Autorevisión del plan

- **Cobertura de la spec:** estructura del repo (T1, T5, T6), ficha (T2), contrato de tokens (T1, T3), playground (T5), capturas con tope y hash (T8), catalogador con todas sus comprobaciones y salidas (T4, T9), tres comandos con su flujo exacto (T10), bibliotecario (T1), integración con `base` (T11), verificación y prueba de fuego (T12). `/ui-buscar --vivo` está en T10 y la ruta `/buscar` en T5.
- **Desvío respecto de la spec, a propósito:** el guion de interacción va en `guion.mjs` aparte y no como export de `demo.tsx`, porque el capturador corre en Node y no puede importar TSX con JSX sin un paso de build. La spec dice "cada demo puede exportar `guion`"; el efecto es el mismo y el archivo es más simple de escribir. Actualizar esa línea de la spec en T7.
- **Nombres consistentes:** `construirCatalogo`, `escribirSalidas`, `hashCodigo` (T4) se usan igual en T8. `validarFicha` (T2) en T4. `coloresCrudos`, `tokensUsados` (T3) en T4. `Demo` (T1) en T5 y T7. `registro`, `porSlug`, `TEMAS` (T5) en las rutas. `comprimirHastaEntrar`, `escalonesDeCompresion`, `aWebp` (T8).
- **Review Focus:** 1 → test "dice archivo y línea cuando el JSON está roto" (T4). 2 → test "exige que la carpeta se llame como el slug" (T2). 3 → test "atrapa clases crudas con y sin variante, con opacidad" (T3). 4 → dos tests de tokens en T4. 5 → `comprimirHastaEntrar` borra la salida y tira; T8 lo prueba de forma indirecta con el botón imán y el test de escalones; si querés una prueba directa, un `.webm` de ruido de 10 s generado con `ffmpeg -f lavfi -i testsrc=size=600x400:rate=30 -t 10 ruido.webm` no entra en 400 KB y tiene que fallar con el mensaje y sin dejar `preview.webp`.
