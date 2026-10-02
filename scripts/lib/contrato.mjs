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
