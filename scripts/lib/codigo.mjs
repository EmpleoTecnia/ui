import { CLASES, TOKENS } from './contrato.mjs'

const PALETA = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white'
// Utilidades de Tailwind que llevan color. `border-t`, `rounded-tl`, etc. incluidas.
const UTILIDADES = 'bg|text|border(?:-[trblxyse]{1,2})?|ring|fill|stroke|from|via|to|shadow|drop-shadow|text-shadow|inset-shadow|outline|decoration|accent|caret|divide|placeholder|inset-ring|ring-offset'

const HEX = /#[0-9a-fA-F]{3,8}\b/g
const FUNCION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|color)\(/g
const OKLCH_ABSOLUTO = /\boklch\((?!from var\(--ui-)/g
const CLASE_CRUDA = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTILIDADES})-(?:${PALETA})(?:-\\d{2,3})?(?:/\\d{1,3})?(?![\\w-])`, 'g')
// Las variables de paleta de Tailwind v4 (`--color-red-500`); las del puente (`--color-ui-*`) no.
const VAR_PALETA = /--color-(?!ui-)[a-z0-9-]+/g

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
    for (const m of linea.matchAll(VAR_PALETA)) hallazgos.push({ linea: n, texto: m[0], motivo: 'variable de paleta de Tailwind; usá un token --ui-*' })
  })
  return hallazgos
}

const VAR_UI = /--ui-[a-z0-9-]+/g
// Utilidades que pueden llevar un sufijo `ui-*` del puente. Sólo éstas: así `@radix-ui`,
// `data-ui-state` o un comentario "chakra-ui" no se toman por clases.
const UTILIDADES_UI = 'bg|text|border(?:-[trblxyse]{1,2})?|ring|outline|fill|stroke|from|via|to|shadow|divide|placeholder|accent|caret|decoration|inset-ring|ring-offset|rounded(?:-[trblxyse]{1,2})?|font|ease'
// prefijos de variante, utilidad conocida, sufijo que empieza en `ui`
const CLASE_UI = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(${UTILIDADES_UI})-(ui(?:-[a-z0-9]+)*)(?:/\\d{1,3})?(?![\\w-])`, 'g')

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
  for (const m of src.matchAll(VAR_UI)) {
    if (TOKENS.includes(m[0])) tokens.add(m[0])
    else desconocidas.push(m[0])
  }
  for (const m of src.matchAll(CLASE_UI)) {
    const token = tokenDeClase(m[1], m[2])
    if (token) tokens.add(token)
    else desconocidas.push(m[0])
  }
  return { tokens, desconocidas }
}
