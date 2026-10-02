'use client'
import { forwardRef, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type InputHTMLAttributes } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type AnimationPlaybackControls, type Transition, type Variants } from 'motion/react'

export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
  /** Cuántos caracteres faltan. Se muestra como contador al lado de la regla mientras no se cumple. */
  remaining?: (password: string) => number
}

export interface PasswordStrengthResult { level: 0 | 1 | 2 | 3 | 4; label: string; met: string[] }

/**
 * Campo de contraseña nueva que muestra qué tan fuerte es mientras se escribe: cuatro
 * segmentos se llenan y cambian de tono, cada regla se tilda con un tilde que se dibuja,
 * y la palabra de fuerza cambia en el lugar. Para crear o cambiar una contraseña; para
 * iniciar sesión va un campo común. Todo se calcula en el dispositivo.
 */
export interface PasswordStrengthProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'children'> {
  label: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, strength: PasswordStrengthResult) => void
  /** Reglas a comprobar. La fuerza es la proporción de reglas cumplidas, en cuatro pasos. */
  rules?: PasswordRule[]
  /** Texto de error atado al campo. El campo se sacude una vez cada vez que aparece un error nuevo. */
  error?: string
  revealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
}

const count = (password: string) => Array.from(password).length
export const defaultPasswordRules: PasswordRule[] = [
  { id: 'length', label: 'Al menos 12 caracteres', test: p => count(p) >= 12, remaining: p => Math.max(0, 12 - count(p)) },
  { id: 'case', label: 'Mayúsculas y minúsculas', test: p => /\p{Ll}/u.test(p) && /\p{Lu}/u.test(p) },
  { id: 'number', label: 'Al menos un número', test: p => /\p{N}/u.test(p) },
  { id: 'symbol', label: 'Al menos un símbolo', test: p => /[^\p{L}\p{N}\s]/u.test(p) },
]

const LEVELS = ['', 'Débil', 'Aceptable', 'Buena', 'Fuerte'] as const
/** Por debajo de este largo la contraseña se queda en el primer paso, por variada que sea. */
const SHORT = 8

/** Puntúa en el dispositivo: un paso por proporción de reglas cumplidas; menos de ocho caracteres, siempre el primero. */
export function estimateStrength(password: string, rules: PasswordRule[] = defaultPasswordRules): PasswordStrengthResult {
  if (!password) return { level: 0, label: '', met: [] }
  const met = rules.filter(rule => rule.test(password)).map(rule => rule.id)
  if (count(password) < SHORT) return { level: 1, label: 'Muy corta', met }
  const level = Math.min(4, Math.max(1, Math.round((met.length / Math.max(rules.length, 1)) * 4))) as 1 | 2 | 3 | 4
  return { level, label: LEVELS[level], met }
}

// ── movimiento: todo sale de --ui-dur y de tres resortes ──
const enter: [number, number, number, number] = [0.16, 1, 0.3, 1]
const standard: [number, number, number, number] = [0.4, 0, 0.2, 1]
const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 30 } as const,
  smooth: { type: 'spring', stiffness: 300, damping: 30 } as const,
  morph: { type: 'spring', stiffness: 420, damping: 32 } as const,
}
const BLUR_SOFT = 4
const BLUR_SUBTLE = 2

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}
const subscribe = () => () => {}
/** Falso en el servidor y durante la hidratación: el modo reducido nunca cambia el primer render. */
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false)

/** La palabra sube cuando la fuerza mejora y baja cuando empeora: la dirección se lee sin mirar la barra. */
const rise = (d: number): Variants => ({
  enter: (direction: number) => ({ opacity: 0, y: `${0.3 * direction}em`, filter: `blur(${BLUR_SOFT}px)` }),
  center: { opacity: 1, y: '0em', filter: 'blur(0px)', transition: { duration: d * 1.2, ease: enter } },
  exit: (direction: number) => ({ opacity: 0, y: `${-0.3 * direction}em`, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d * 0.8, ease: standard } }),
})
const fade = (d: number): Variants => ({ enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: d * 0.8 } }, exit: { opacity: 0, transition: { duration: d * 0.5 } } })
/** Los dígitos giran como un contador: si el número baja entra desde arriba, si sube desde abajo. */
const roll = (d: number): Variants => ({
  enter: (direction: number) => ({ opacity: 0, y: `${0.45 * direction}em`, filter: `blur(${BLUR_SUBTLE}px)` }),
  center: { opacity: 1, y: '0em', filter: 'blur(0px)', transition: { y: spring.snappy, opacity: { duration: d * 0.6 }, filter: { duration: d * 0.6 } } },
  exit: (direction: number) => ({ opacity: 0, y: `${-0.45 * direction}em`, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d * 0.75, ease: standard } }),
})

function RollingNumber({ value, reduced, d }: { value: number; reduced: boolean; d: number }) {
  const [track, setTrack] = useState({ value, direction: 1 })
  if (track.value !== value) setTrack({ value, direction: value > track.value ? 1 : -1 })
  const digits = String(value).split('')
  // Las columnas se identifican por su lugar (unidades, decenas): 10 → 9 angosta la de decenas mientras la de unidades gira.
  return (
    <span className="inline-flex tabular-nums">
      <AnimatePresence initial={false} custom={track.direction}>
        {digits.map((digit, index) => (
          <motion.span key={digits.length - 1 - index} className="relative inline-block overflow-x-clip" initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : { width: spring.morph, opacity: { duration: d * 0.6 } }}>
            <AnimatePresence mode="popLayout" initial={false} custom={track.direction}>
              <motion.span key={digit} className="inline-block" custom={track.direction} variants={reduced ? fade(d) : roll(d)} initial="enter" animate="center" exit="exit">{digit}</motion.span>
            </AnimatePresence>
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
}

/** Un solo ojo al que una barra le pasa por encima recortando el contorno, en vez de cambiar dos íconos. */
function EyeMorph({ slashed, reduced, d }: { slashed: boolean; reduced: boolean; d: number }) {
  const maskId = `eye-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const slash = { pathLength: slashed ? 1 : 0, opacity: slashed ? 1 : 0 }
  const transition: Transition = reduced ? { duration: 0 } : { pathLength: { duration: d, ease: standard }, opacity: { duration: d * 0.35 } }
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="white" stroke="none" />{/* color-ok: la máscara es blanco/negro por definición */}
        <motion.path d="M3 3l18 18" stroke="black" strokeWidth={5} initial={false} animate={slash} transition={transition} />{/* color-ok */}
      </mask>
      <g mask={`url(#${maskId})`}>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </g>
      <motion.path d="M3 3l18 18" initial={false} animate={slash} transition={transition} />
    </svg>
  )
}

/** El fondo crece debajo del tilde mientras el tilde se dibuja; destildar lo retrae más rápido. */
function RuleMark({ met, delay, reduced, d }: { met: boolean; delay: number; reduced: boolean; d: number }) {
  return (
    <span className="relative block size-4 shrink-0 rounded-full border-[1.25px] border-ui-line text-(--tone-ok) transition-colors duration-(--ui-dur) ease-ui group-data-[met]:border-transparent" aria-hidden="true">
      <motion.span className="absolute -inset-px rounded-[inherit] bg-[color-mix(in_oklch,var(--tone-ok)_16%,transparent)]" initial={false} animate={{ scale: met ? 1 : 0.5, opacity: met ? 1 : 0 }} transition={reduced ? { duration: 0 } : { scale: { ...spring.snappy, delay }, opacity: { duration: met ? d * 0.6 : d * 0.35, delay } }} />
      <svg className="absolute -inset-px size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M4.75 8.25 7 10.5l4.25-4.75" initial={false} animate={{ pathLength: met ? 1 : 0, opacity: met ? 1 : 0 }} transition={reduced ? { duration: 0 } : met ? { pathLength: { duration: d, ease: enter, delay: delay + 0.06 }, opacity: { duration: 0.05, delay: delay + 0.06 } } : { pathLength: { duration: d * 0.6, ease: standard }, opacity: { duration: d * 0.6, delay: 0.06 } }} />
      </svg>
    </span>
  )
}

/** El error abre su fila con un resorte y después entran las palabras. La fila sigue al texto medido, así un salto de línea nunca pega un tirón. */
function ErrorRow({ id, text, reduced, d }: { id: string; text: string; reduced: boolean; d: number }) {
  const copy = useRef<HTMLSpanElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  useEffect(() => {
    const node = copy.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <motion.span className="block overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height, opacity: 1 }} exit={{ height: 0, opacity: 0, transition: reduced ? { duration: 0 } : { height: spring.smooth, opacity: { duration: d * 0.35 } } }} transition={reduced ? { duration: 0 } : { height: spring.smooth, opacity: { duration: d * 0.6 } }}>
      <span ref={copy} id={id} className="relative block pt-2 text-xs leading-snug text-(--tone-danger)">
        <AnimatePresence mode="popLayout" initial={false} custom={1}>
          <motion.span key={text} className="block" custom={1} variants={reduced ? fade(d) : rise(d)} initial="enter" animate="center" exit="exit">{text}</motion.span>
        </AnimatePresence>
      </span>
    </motion.span>
  )
}

/** Tonos derivados del acento de la app: misma luz y saturación, el matiz dice débil/aceptable/buena. Fuerte es el acento tal cual. */
const TONOS: Record<number, string> = {
  0: 'var(--ui-line)',
  1: 'oklch(from var(--ui-accent) clamp(0.45, l, 0.65) clamp(0.12, c, 0.2) 25)',
  2: 'oklch(from var(--ui-accent) clamp(0.45, l, 0.65) clamp(0.12, c, 0.2) 70)',
  3: 'oklch(from var(--ui-accent) clamp(0.45, l, 0.65) clamp(0.12, c, 0.2) 150)',
  4: 'var(--ui-accent)',
}

export const PasswordStrength = forwardRef<HTMLInputElement, PasswordStrengthProps>(function PasswordStrength(
  { label, value: valueProp, defaultValue = '', onValueChange, onChange, rules = defaultPasswordRules, error, revealed: revealedProp, onRevealedChange, id, className, ...props },
  ref,
) {
  const generated = useId()
  const controlId = id ?? generated
  const rulesId = `${controlId}-rules`
  const errorId = `${controlId}-error`
  const hydrated = useHydrated()
  const prefersReduced = useReducedMotion()
  const reduced = hydrated && !!prefersReduced
  const d = useDur()
  const [internal, setInternal] = useState(defaultValue)
  const value = valueProp ?? internal
  const [revealedInternal, setRevealedInternal] = useState(false)
  const revealed = revealedProp ?? revealedInternal
  const strength = estimateStrength(value, rules)
  const met = new Set(strength.met)

  // El nivel y las reglas anteriores dicen hacia dónde se mueve la palabra y qué segmentos y tildes entran en ola.
  const rank = strength.label === 'Muy corta' ? 0.5 : strength.level
  const metKey = strength.met.join(' ')
  const [track, setTrack] = useState({ rank, level: strength.level, previousLevel: strength.level, direction: 1, metKey, previousMet: metKey })
  if (track.rank !== rank || track.metKey !== metKey) {
    setTrack({
      rank, level: strength.level,
      previousLevel: track.rank !== rank ? track.level : track.previousLevel,
      direction: track.rank === rank ? track.direction : rank > track.rank ? 1 : -1,
      metKey, previousMet: track.metKey !== metKey ? track.metKey : track.previousMet,
    })
  }
  const previousMet = new Set(track.previousMet.split(' ').filter(Boolean))
  const changed = rules.filter(rule => met.has(rule.id) !== previousMet.has(rule.id)).map(rule => rule.id)

  // Al mostrar u ocultar, los puntos y las letras se resuelven unos en otros en vez de saltar.
  const inputRef = useRef<HTMLInputElement | null>(null)
  const firstReveal = useRef(true)
  useEffect(() => {
    if (firstReveal.current) { firstReveal.current = false; return }
    if (reduced || !inputRef.current) return
    animate(inputRef.current, { opacity: [0.35, 1], filter: ['blur(2px)', 'blur(0px)'] }, { duration: d, ease: enter })
  }, [revealed, reduced, d])

  const shake = useMotionValue(0)
  const shaking = useRef<AnimationPlaybackControls | null>(null)
  const lastError = useRef(error)
  useEffect(() => {
    const previous = lastError.current
    lastError.current = error
    if (!error || error === previous || reduced) return
    // Un resorte soltado con velocidad lateral se apaga solo, como un campo rechazado en un teléfono.
    shaking.current?.stop()
    shaking.current = animate(shake, 0, { type: 'spring', velocity: -240, stiffness: 900, damping: 15, restDelta: 0.1 })
  }, [error, reduced, shake])

  function toggleReveal() {
    if (revealedProp === undefined) setRevealedInternal(!revealed)
    onRevealedChange?.(!revealed)
  }

  const summary = strength.level ? `Fuerza: ${strength.label}. ${strength.met.length} de ${rules.length} requisitos cumplidos.` : ''
  const describedBy = [props['aria-describedby'], error ? errorId : undefined, rulesId].filter(Boolean).join(' ')
  const vars = { '--tone': TONOS[strength.level], '--tone-ok': TONOS[3], '--tone-danger': TONOS[1] } as CSSProperties

  return (
    <div className="grid min-w-0 font-ui-text" data-level={strength.level} style={vars}>
      <label className="mb-2 text-sm font-medium text-ui-ink" htmlFor={controlId}>{label}</label>
      <motion.div
        className="flex min-h-11 items-center gap-1 rounded-ui border border-ui-line bg-ui-surface pr-1.5 pl-4 transition-[border-color,box-shadow] duration-(--ui-dur) ease-ui hover:border-ui-ink-muted focus-within:border-ui-ink focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ui-accent)_28%,transparent)] focus-within:hover:border-ui-ink data-[invalid]:border-(--tone-danger) data-[invalid]:focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--tone-danger)_24%,transparent)]"
        data-invalid={error ? '' : undefined}
        style={{ x: shake }}
      >
        <input
          autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          {...props}
          ref={node => { inputRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node }}
          id={controlId} type={revealed ? 'text' : 'password'} value={value}
          onChange={event => { const next = event.target.value; if (valueProp === undefined) setInternal(next); onChange?.(event); onValueChange?.(next, estimateStrength(next, rules)) }}
          aria-invalid={error ? true : props['aria-invalid']} aria-describedby={describedBy}
          className={`h-10 w-full min-w-0 bg-transparent text-sm text-ui-ink outline-none placeholder:text-ui-ink-muted ${className ?? ''}`}
        />
        <button type="button" className="grid size-8 shrink-0 place-items-center rounded-[calc(var(--ui-radius)-5px)] text-ui-ink-muted transition-[background-color,color,transform] duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 hover:text-ui-ink active:scale-95 aria-pressed:text-ui-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ui-accent" onClick={toggleReveal} aria-label="Mostrar contraseña" aria-pressed={revealed} aria-controls={controlId}>
          <EyeMorph slashed={revealed} reduced={reduced} d={d} />
        </button>
      </motion.div>
      <AnimatePresence initial={false}>{error ? <ErrorRow key="error" id={errorId} text={error} reduced={reduced} d={d} /> : null}</AnimatePresence>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5" role="meter" aria-label="Fuerza de la contraseña" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.level} aria-valuetext={strength.level ? strength.label : 'Todavía sin contraseña'}>
          {[0, 1, 2, 3].map(index => {
            const on = index < strength.level
            // Una contraseña pegada llena de izquierda a derecha; borrar vacía de derecha a izquierda.
            const wave = on ? index - track.previousLevel : track.previousLevel - 1 - index
            return (
              <span key={index} className="relative isolate h-1 overflow-hidden rounded-full bg-ui-line">
                <motion.span className="absolute inset-0 rounded-[inherit] bg-(--tone) transition-colors duration-(--ui-dur) ease-ui" initial={false} animate={{ x: on ? '0%' : '-101%' }} transition={reduced ? { duration: 0 } : { ...spring.smooth, delay: Math.max(0, wave) * (on ? 0.05 : 0.03) }} />
              </span>
            )
          })}
        </div>
        <span className="relative block h-[1.4em] w-20 shrink-0 text-right text-sm font-medium whitespace-nowrap text-ui-ink" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false} custom={track.direction}>
            {strength.level ? <motion.span key={strength.label} className="inline-block" custom={track.direction} variants={reduced ? fade(d) : rise(d)} initial="enter" animate="center" exit="exit">{strength.label}</motion.span> : null}
          </AnimatePresence>
        </span>
      </div>
      <ul id={rulesId} className="mt-4 grid list-none gap-1.5 p-0" aria-label="Requisitos de la contraseña">
        {rules.map(rule => {
          const ok = met.has(rule.id)
          const remaining = value && !ok ? rule.remaining?.(value) ?? 0 : 0
          const order = changed.indexOf(rule.id)
          return (
            <li key={rule.id} className="group flex min-h-5 items-center gap-2.5 text-sm text-ui-ink-muted transition-colors duration-(--ui-dur) ease-ui data-[met]:text-ui-ink" data-met={ok || undefined}>
              <RuleMark met={ok} delay={order > 0 ? order * 0.05 : 0} reduced={reduced} d={d} />
              <span className="min-w-0">{rule.label}<span className="sr-only">{ok ? ', cumplido' : ', pendiente'}</span></span>
              <span className="relative ml-auto block pl-2 text-xs whitespace-nowrap text-ui-ink-muted" aria-hidden="true">
                <AnimatePresence mode="popLayout" initial={false} custom={1}>
                  {remaining > 0 ? <motion.span key="remaining" className="inline-flex items-baseline gap-[0.28em]" custom={1} variants={reduced ? fade(d) : rise(d)} initial="enter" animate="center" exit="exit">faltan <RollingNumber value={remaining} reduced={reduced} d={d} /></motion.span> : null}
                </AnimatePresence>
              </span>
            </li>
          )
        })}
      </ul>
      <span className="sr-only" role="status">{summary}</span>
    </div>
  )
})

PasswordStrength.displayName = 'PasswordStrength'
export default PasswordStrength
