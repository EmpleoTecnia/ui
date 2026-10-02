'use client'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue, type Transition, type Variants } from 'motion/react'
import { Minus, Plus } from 'lucide-react'
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type Ref } from 'react'

/** Texto al lado del número. Una función recibe el valor, así la unidad concuerda: `n => n === 1 ? ' licencia' : ' licencias'`. */
export type NumberFieldAffix = string | ((value: number) => string)
export type NumberFieldSize = 'sm' | 'md' | 'lg'

/**
 * Un número acotado con dígitos de cuentakilómetros. Los botones y las flechas repiten y aceleran
 * mientras se mantienen apretados, RePág y AvPág dan pasos grandes, Inicio y Fin saltan a los
 * límites, y con `scrub` la etiqueta se arrastra. Tipear edita un borrador que se aplica en vivo
 * mientras es válido; los dígitos que giran vuelven cuando se confirma con Enter, al salir o con
 * el próximo paso. Al llegar a un límite el número se tensa hacia el botón y vuelve, el botón se
 * sacude una vez y una nota al lado de la etiqueta dice cuál es el tope.
 */
export interface NumberFieldProps {
  label: string
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** RePág, AvPág y Shift con una flecha se mueven esto. Por defecto, diez pasos. */
  largeStep?: number
  description?: string
  disabled?: boolean
  id?: string
  /** Texto antes del número, como "$ ". */
  prefix?: NumberFieldAffix
  /** Texto después del número, como " licencias". */
  suffix?: NumberFieldAffix
  /** Arrastrar la etiqueta hacia los costados cambia el valor, un paso cada pocos píxeles. */
  scrub?: boolean
  /** Configuración regional del formato. Fija por defecto para que servidor y cliente dibujen los mismos dígitos. */
  locale?: string
  /** Decimales y separador de miles. Los decimales siguen a la precisión de `step` por defecto. */
  formatOptions?: { minimumFractionDigits?: number; maximumFractionDigits?: number; useGrouping?: boolean }
  /** Alto del control, tamaño del número y ancho por defecto. */
  size?: NumberFieldSize
  /** Ancho del control en píxeles. Por defecto depende de `size`. */
  width?: number
  /** Una nota corta al lado de la etiqueta cuando un paso llega a un límite o un valor tipeado lo pasa. `false` la oculta; una función escribe el texto. */
  limitHint?: boolean | ((edge: 'min' | 'max', limit: number) => string)
}

type Source = 'button' | 'key' | 'scrub' | 'type'
type Part = { key: string; digit: number } | { key: string; text: string }
type Bezier = [number, number, number, number]

const enterEase: Bezier = [0.22, 1, 0.36, 1]
const exitEase: Bezier = [0.2, 0, 0, 1]
const BLUR_SUBTLE = 4
const BLUR_SOFT = 8
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
/** Píxeles de arrastre por paso, la pausa antes de que un botón apretado repita, y la repetición más rápida. */
const SCRUB_PX = 6, HOLD_DELAY = 400, HOLD_FASTEST = 40
/** Apretado contra un límite empuja a este ritmo, la nota del límite dura esto, y un borrador por debajo del mínimo espera esto antes de avisar
 *  (un borrador corto suele ir camino a un número más grande). */
const LIMIT_PUSH = 240, LIMIT_HINT_MS = 1500, UNDER_WARN_MS = 700
/** Los empujones que llegan dentro de esta ventana cuentan como un mismo esfuerzo: cada uno se tensa un poco más, hasta el tope. */
const PUSH_WINDOW = 700, PUSH_GAIN = 0.22, PUSH_CAP = 4
/** Un golpe de velocidad sobre el valor en un límite: se tensa unos píxeles hacia el botón y vuelve con resorte. */
const BUMP_VELOCITY = 130
const SIZES: Record<NumberFieldSize, { h: number; step: number; inset: number; width: number; text: string; label: string }> = {
  sm: { h: 36, step: 28, inset: 3, width: 164, text: 'text-sm', label: 'text-xs' },
  md: { h: 44, step: 34, inset: 3, width: 196, text: 'text-base', label: 'text-sm' },
  lg: { h: 52, step: 40, inset: 4, width: 228, text: 'text-lg', label: 'text-sm' },
}
/** Aviso naranja de verdad: del acento de la app toma sólo la luz y la saturación. El matiz no se negocia. */
const TONE_WARN = 'oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) 55)'
/** La ventana de cada rueda se pasa un poco de la línea y se desvanece en los bordes: un dígito que gira se apaga, no se corta. */
const COLUMN_STYLE: CSSProperties = {
  marginBlock: 'calc(var(--feather) * -1)', paddingBlock: 'var(--feather)',
  maskImage: 'linear-gradient(to bottom, transparent, black calc(var(--feather) * 1.5), black calc(100% - var(--feather) * 1.5), transparent)', // color-ok: la máscara sólo usa el alfa
  maskRepeat: 'repeat-x', maskClip: 'no-clip',
}

const decimalsOf = (value: number) => (String(value).split('.')[1] ?? '').length
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')
const affixText = (affix: NumberFieldAffix | undefined, value: number) => typeof affix === 'function' ? affix(value) : affix ?? ''
/** Resistencia estilo iOS: pasarse de un límite da cada vez menos, y nunca más de `limit` píxeles. */
const rubber = (distance: number, limit = 10) => Math.sign(distance) * (1 - 1 / (Math.abs(distance) * 0.55 / limit + 1)) * limit

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

/** Un resorte por duración reescrito como rigidez y amortiguación: motion descarta la velocidad en los resortes por tiempo. */
const physical = (visualDuration: number, bounce: number): Transition => {
  const root = (2 * Math.PI) / (visualDuration * 1.2)
  return { type: 'spring', stiffness: root * root, damping: 2 * (1 - bounce) * root }
}

type Motion = ReturnType<typeof motionFor>
/** Todo el movimiento sale de --ui-dur: resortes y duraciones son múltiplos de `d`. */
function motionFor(d: number, reduced: boolean) {
  const snappy: Transition = { type: 'spring', duration: d * 1.4, bounce: 0.1 }
  const smooth: Transition = { type: 'spring', duration: d * 2.2, bounce: 0 }
  const morph: Transition = { type: 'spring', duration: d * 1.8, bounce: 0.15 }
  const instant = d * 0.5, fast = d, standard = d * 1.6
  /* Una columna o un carácter abre su ancho mientras sube en la dirección del cambio, y se cierra con un resorte sin rebote para nunca pasar de cero.
     Escala y opacidad van en el mismo resorte que el ancho, así un dígito crece con su lugar en vez de caer sobre los vecinos. */
  const slot: Variants = {
    enter: (direction: number) => ({ width: 0, scale: 0.6, opacity: 0, y: `${direction * 0.3}em`, filter: `blur(${BLUR_SOFT}px)` }),
    center: { width: 'auto', scale: 1, opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: { width: morph, scale: morph, opacity: morph, y: snappy, filter: { duration: standard, ease: exitEase } } },
    exit: (direction: number) => ({ width: 0, scale: 0.6, opacity: 0, y: `${direction * -0.3}em`, filter: `blur(${BLUR_SUBTLE}px)`, transition: { width: smooth, scale: smooth, y: { duration: fast, ease: exitEase }, opacity: { duration: instant }, filter: { duration: instant } } }),
  }
  /* Con movimiento reducido queda un fundido corto y nada de viaje. Mientras se tipea, las columnas siguen al borrador al instante para no quedar detrás del cursor. */
  const rest = (opacity: number) => ({ width: 'auto', scale: 1, opacity, y: 0, filter: 'none' })
  const still: Variants = { enter: rest(0), center: { ...rest(1), transition: { duration: instant } }, exit: { width: 0, opacity: 0, transition: { duration: 0 } } }
  const cut: Variants = { enter: rest(1), center: { ...rest(1), transition: { duration: 0 } }, exit: { width: 0, opacity: 0, transition: { duration: 0 } } }
  const wordRise: Variants = {
    enter: (direction: number) => ({ opacity: 0, y: `${direction * 0.3}em`, filter: `blur(${BLUR_SOFT}px)` }),
    // La opacidad sigue al resorte del ancho, así una palabra más larga nunca se ve antes de que su lugar se haya abierto.
    center: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: { duration: d * 1.2, ease: enterEase, opacity: morph } },
    exit: (direction: number) => ({ opacity: 0, y: `${direction * -0.3}em`, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d * 0.8, ease: exitEase } }),
  }
  const wordFade: Variants = { enter: { opacity: 0, y: 0, filter: 'none' }, center: { opacity: 1, y: 0, filter: 'none', transition: { duration: instant } }, exit: { opacity: 0, transition: { duration: 0 } } }
  return { d, reduced, snappy, smooth, morph, kick: physical(d * 1.8, 0.15), instant, fast, standard, slot, still, cut, wordRise, wordFade }
}

/** Parte un número formateado en columnas con clave por valor posicional, así 9 → 10 deja la columna de las unidades donde estaba. */
function partsOf(value: number, format: Intl.NumberFormat): Part[] {
  const parts = format.formatToParts(value)
  let place = parts.reduce((count, part) => count + (part.type === 'integer' ? part.value.length : 0), 0)
  let fraction = 0
  return parts.flatMap((part, index): Part[] => {
    if (part.type === 'integer') return [...part.value].map(char => ({ key: `i${--place}`, digit: Number(char) }))
    if (part.type === 'fraction') return [...part.value].map(char => ({ key: `f${fraction++}`, digit: Number(char) }))
    return [{ key: part.type === 'group' ? `g${place}` : part.type === 'decimal' ? 'd' : part.type === 'minusSign' ? 'm' : `${part.type}${index}`, text: part.value }]
  })
}

/** Un dígito de la rueda. Su distancia a la posición de la rueda dice dónde está, qué tan nítido se ve y si se muestra. */
function Glyph({ position, digit }: { position: MotionValue<number>; digit: number }) {
  // Cada estilo lee la rueda directo: una transformación encadenada puede actualizarse un cuadro tarde y dejar la rueda en blanco en un salto.
  const offset = (current: number) => ((((digit - current) % 10) + 15) % 10) - 5
  const y = useTransform(position, current => `${offset(current) * 1.05}em`)
  // Una caída suave mantiene legible al dígito que gira en mitad del giro en vez de lavarlo.
  const opacity = useTransform(position, current => Math.max(0, 1 - Math.abs(offset(current)) ** 1.5 * 1.1))
  const visibility = useTransform(position, current => Math.abs(offset(current)) >= 1 ? 'hidden' : 'visible')
  const filter = useTransform(position, current => { const distance = Math.abs(offset(current)); return distance < 0.02 || distance >= 1 ? 'none' : `blur(${(distance * BLUR_SOFT * 0.75).toFixed(2)}px)` })
  return <motion.span className="absolute inset-x-0 text-center" style={{ y, opacity, filter, visibility, insetBlock: 'var(--feather)' }}>{digit}</motion.span>
}

/** Una rueda de cuentakilómetros. Gira hacia donde se movió el número entero, da la vuelta en 9 → 0 y cambia de destino en pleno giro si los pasos llegan rápido. */
function Wheel({ digit, direction, instant, m }: { digit: number; direction: number; instant: boolean; m: Motion }) {
  const position = useMotionValue(digit)
  const wheel = useRef({ digit, target: digit })
  useLayoutEffect(() => {
    const state = wheel.current
    if (state.digit === digit) return
    // Gira hacia donde se movió el número, salvo que sea más de media vuelta: ahí toma el camino corto, así un salto grande al límite nunca da vueltas.
    let delta = direction > 0 ? (digit - state.digit + 10) % 10 : -((state.digit - digit + 10) % 10)
    if (Math.abs(delta) > 5) delta -= Math.sign(delta) * 10
    state.target += delta
    state.digit = digit
    if (instant || m.reduced) position.jump(state.target)
    else animate(position, state.target, m.snappy)
  }, [digit, direction, instant, position, m])
  return <><span className="invisible">0</span>{DIGITS.map(item => <Glyph key={item} position={position} digit={item} />)}</>
}

function Digits({ value, format, direction, instant, m }: { value: number; format: Intl.NumberFormat; direction: number; instant: boolean; m: Motion }) {
  const variants = instant ? m.cut : m.reduced ? m.still : m.slot
  return <AnimatePresence initial={false} custom={direction}>{partsOf(value, format).map(part => 'digit' in part
    ? <motion.span key={part.key} className="relative inline-block overflow-x-visible overflow-y-clip [--feather:.2em]" style={COLUMN_STYLE} custom={direction} variants={variants} initial="enter" animate="center" exit="exit">
      <Wheel digit={part.digit} direction={direction} instant={instant} m={m} />
    </motion.span>
    : <motion.span key={part.key} className="inline-block overflow-x-clip whitespace-pre" custom={direction} variants={variants} initial="enter" animate="center" exit="exit">{part.text}</motion.span>)}</AnimatePresence>
}

/** Los caracteres del prefijo y el sufijo van con clave por posición, así "licencia" → "licencias" sólo abre la "s" nueva y el resto se queda quieto. */
function AffixText({ text, direction, m }: { text: string; direction: number; m: Motion }) {
  return <span className="inline-flex font-normal text-ui-ink-soft"><AnimatePresence initial={false} custom={direction}>{[...text].map((char, index) => <motion.span key={`${index}:${char}`} className="inline-block overflow-x-clip whitespace-pre" custom={direction} variants={m.reduced ? m.still : m.slot} initial="enter" animate="center" exit="exit">{char}</motion.span>)}</AnimatePresence></span>
}

const numberIn = (word?: string) => { const digits = word?.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'); return digits && /\d/.test(digits) && Number.isFinite(Number(digits)) ? Number(digits) : null }
/** Una palabra con número baja si achicó y sube si creció; cualquier otra palabra que cambió, sube. */
const directionsBetween = (from: string, to: string) => { const before = from.split(' '); return to.split(' ').map((word, index) => { const a = numberIn(before[index]), b = numberIn(word); return a !== null && b !== null && b < a ? -1 : 1 }) }

/** El ancho de una palabra sigue a su texto nuevo con un resorte: un precio que gana un dígito corre al resto de la línea en vez de empujarlo. */
function WordSlot({ word, direction, m }: { word: string; direction: number; m: Motion }) {
  const sizerRef = useRef<HTMLSpanElement>(null)
  const width = useMotionValue<number | 'auto'>('auto')
  const measured = useRef(false)
  useLayoutEffect(() => {
    const node = sizerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (!measured.current || m.reduced) width.jump(node.offsetWidth)
      else animate(width, node.offsetWidth, m.morph)
      measured.current = true
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [m, width])
  return <motion.span className="relative inline-block align-top whitespace-pre" style={{ width }}>
    <span ref={sizerRef} className="invisible absolute top-0 left-0 whitespace-pre">{word}</span>
    <AnimatePresence initial={false} mode="popLayout" custom={direction}><motion.span key={word} className="inline-block whitespace-pre" custom={direction} variants={m.reduced ? m.wordFade : m.wordRise} initial="enter" animate="center" exit="exit">{word}</motion.span></AnimatePresence>
  </motion.span>
}

/** Las palabras que cambiaron suben y se enfocan; las que no, se quedan quietas. El lector de pantalla lee el texto plano. */
function MotionText({ text, m }: { text: string; m: Motion }) {
  const [trail, setTrail] = useState({ text, directions: [] as number[] })
  if (trail.text !== text) setTrail({ text, directions: directionsBetween(trail.text, text) })
  const directions = trail.text === text ? trail.directions : directionsBetween(trail.text, text)
  const words = text.split(' ')
  // Los espacios viven entre los lugares, así una palabra que todavía abre su ancho nunca choca con la siguiente.
  return <><span className="sr-only">{text}</span><span className="relative block" aria-hidden="true">{words.map((word, index) => <Fragment key={index}>{index > 0 && ' '}<WordSlot word={word} direction={directions[index] ?? 1} m={m} /></Fragment>)}</span></>
}

/** La fila sigue al texto medido, así un mensaje más largo que salta de línea abre la línea nueva en vez de pegar un tirón. */
function MessageRow({ id, text, m }: { id?: string; text: string; m: Motion }) {
  const copyRef = useRef<HTMLSpanElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  useLayoutEffect(() => {
    const node = copyRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <motion.span className="block overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height, opacity: 1 }} exit={{ height: 0, opacity: 0, transition: m.reduced ? { duration: 0 } : { height: m.smooth, opacity: { duration: m.instant } } }} transition={m.reduced ? { duration: 0 } : { height: m.smooth, opacity: { duration: m.fast } }}>
    <motion.span ref={copyRef} id={id} className="block pt-2 text-xs leading-normal text-ui-ink-muted tabular-nums" initial={m.reduced ? false : { y: '0.35em', filter: `blur(${BLUR_SOFT}px)` }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: m.reduced ? 0 : m.standard, ease: enterEase }}><MotionText text={text} m={m} /></motion.span>
  </motion.span>
}

/** La nota del límite entra desde el lado que cuida (de arriba el máximo, de abajo el mínimo) y se apaga en el lugar. */
function LimitNote({ id, edge, text, m }: { id: string; edge: 1 | -1 | 0; text: string; m: Motion }) {
  return <AnimatePresence initial={false}>{edge !== 0 && <motion.span key="limit" id={id} className="flex-none text-xs leading-normal font-medium whitespace-nowrap text-(--tone-warn) tabular-nums"
    initial={m.reduced ? { opacity: 0 } : { opacity: 0, y: `${edge * 0.45}em`, filter: `blur(${BLUR_SUBTLE}px)` }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
    exit={{ opacity: 0, transition: { duration: m.reduced ? m.instant : m.standard, ease: exitEase } }}
    transition={m.reduced ? { duration: m.instant } : { y: m.snappy, opacity: { duration: m.fast }, filter: { duration: m.fast } }}>
    {text}
  </motion.span>}</AnimatePresence>
}

/** Apretado con el puntero repite; teclado y clics asistidos (detail 0) dan un paso. */
function StepButton({ toward, label, disabled, controls, limit, pressed, strained, iconRef, onPress, onRelease, onActivate }: { toward: 1 | -1; label: string; disabled?: boolean; controls: string; limit: boolean; pressed: boolean; strained: boolean; iconRef: Ref<HTMLSpanElement>; onPress: () => void; onRelease: () => void; onActivate: () => void }) {
  const Icon = toward > 0 ? Plus : Minus
  // Un límite atenúa el botón pero lo deja enfocable: apretar ahí tensa el valor en vez de soltar el foco.
  // Los clics del mouse dejan el foco donde estaba: un borrador abierto se confirma con el paso, y el botón nunca roba el anillo.
  const base = 'grid size-(--nf-step) flex-none cursor-pointer touch-manipulation place-items-center rounded-[calc(var(--ui-radius)-var(--nf-inset)-1px)] border-0 bg-transparent p-0 text-ui-ink-soft transition-[background-color,color,opacity] duration-(--ui-dur) ease-ui select-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-ui-surface-2 focus-visible:text-ui-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 [&_svg]:transition-transform [&_svg]:duration-(--ui-dur) [&_svg]:ease-ui motion-reduce:[&_svg]:transition-none'
  // Apretón corto, suelta a resorte: el fondo se hunde y el ícono se achica. Un botón mantenido queda apretado mientras repite.
  const alive = disabled || limit ? '' : ' hover:bg-ui-surface-2 hover:text-ui-ink active:bg-[color-mix(in_oklch,var(--ui-ink)_10%,var(--ui-surface))] active:text-ui-ink active:[&_svg]:scale-[.82] data-[pressed]:bg-[color-mix(in_oklch,var(--ui-ink)_10%,var(--ui-surface))] data-[pressed]:text-ui-ink data-[pressed]:[&_svg]:scale-[.82] motion-reduce:[&_svg]:scale-100'
  // En un límite el botón se atenúa y se niega, pero sigue en el orden de tabulación; apretarlo tensa el valor hacia el límite y se sacude una vez.
  const edge = limit ? (strained ? ' cursor-not-allowed opacity-60 text-(--tone-warn) duration-75' : ' cursor-not-allowed opacity-[.32]') : ''
  return <button type="button" className={base + alive + edge} disabled={disabled} aria-controls={controls} aria-label={`${toward > 0 ? 'Aumentar' : 'Disminuir'} ${label}`} aria-disabled={limit || undefined} data-pressed={pressed || undefined}
    onPointerDown={event => { if (event.button === 0) onPress() }} onPointerUp={onRelease} onPointerLeave={onRelease} onPointerCancel={onRelease}
    onMouseDown={event => event.preventDefault()} onClick={event => { if (event.detail === 0) onActivate() }} onContextMenu={event => event.preventDefault()}>
    <span ref={iconRef} className="grid place-items-center"><Icon size={16} strokeWidth={1.75} aria-hidden="true" /></span>
  </button>
}

export function NumberField({ label, value, defaultValue = 0, onValueChange, min = 0, max = Number.MAX_SAFE_INTEGER, step: stepProp = 1, largeStep, description, disabled, id, prefix, suffix, scrub = false, locale = 'es-AR', formatOptions, size = 'md', width, limitHint = true }: NumberFieldProps) {
  const hydrated = useHydrated()
  const prefersReduced = useReducedMotion()
  const reduced = hydrated && !!prefersReduced
  const d = useDur()
  const m = useMemo(() => motionFor(d, reduced), [d, reduced])
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = description ? `${inputId}-description` : undefined
  const limitId = `${inputId}-limit`
  const step = stepProp > 0 ? stepProp : 1
  const [internal, setInternal] = useState(defaultValue)
  const current = value ?? internal
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pressed, setPressed] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  /** El límite que un paso acaba de tocar, un momento; qué botón está tensado; y si un borrador por debajo del mínimo ya esperó lo suficiente para avisar. */
  const [pushed, setPushed] = useState<1 | -1 | 0>(0)
  const [strain, setStrain] = useState<'max' | 'min' | null>(null)
  const [underWarn, setUnderWarn] = useState(false)
  const minusIcon = useRef<HTMLSpanElement>(null)
  const plusIcon = useRef<HTMLSpanElement>(null)
  const pushedTimer = useRef<number | undefined>(undefined)
  const underTimer = useRef<number | undefined>(undefined)
  const strainTimer = useRef<number | undefined>(undefined)
  const effort = useRef({ edge: 0, count: 0, at: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const groupRef = useRef<HTMLSpanElement>(null)
  const latest = useRef(current)
  const editStart = useRef(current)
  const hold = useRef<number | undefined>(undefined)
  const drag = useRef<{ pointer: number; x: number; from: number; active: boolean } | null>(null)
  const suppressClick = useRef(false)
  const shiftFrom = useRef<number | null>(null)
  const selectNext = useRef(false)
  const live = useRef<(direction: 1 | -1, steps: number, source: Source) => boolean>(() => false)
  const bumpY = useMotionValue(0)
  const scrubX = useMotionValue(0)
  const shiftX = useMotionValue(0)
  const x = useTransform(() => scrubX.get() + shiftX.get())

  const base = Number.isFinite(min) ? min : 0
  const decimals = Math.max(decimalsOf(step), decimalsOf(base))
  const minFraction = formatOptions?.minimumFractionDigits ?? decimals
  const maxFraction = Math.max(minFraction, formatOptions?.maximumFractionDigits ?? decimals)
  const grouping = formatOptions?.useGrouping ?? true
  const format = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction, useGrouping: grouping, numberingSystem: 'latn' }), [locale, minFraction, maxFraction, grouping])
  const symbols = useMemo(() => { const parts = new Intl.NumberFormat(locale).formatToParts(-1234.5); return { group: parts.find(part => part.type === 'group')?.value ?? '.', decimal: parts.find(part => part.type === 'decimal')?.value ?? ',' } }, [locale])
  const round = (next: number) => Number(next.toFixed(decimals)) || 0
  const clamp = (next: number) => Math.min(max, Math.max(min, next))
  const snap = (next: number) => round(base + Math.round((next - base) / step) * step)
  /** Un valor fuera de la grilla se mueve a la próxima línea en la dirección del viaje, y de ahí pasos enteros. */
  const stepFrom = (from: number, steps: number) => { const index = (from - base) / step; return round(base + ((steps > 0 ? Math.floor(index + 1e-7) : Math.ceil(index - 1e-7)) + steps) * step) }
  const spoken = (next: number) => `${affixText(prefix, next)}${format.format(next)}${affixText(suffix, next)}`.trim()
  function parse(text: string) {
    const normalized = text.split(symbols.group).join('').replace(symbols.decimal, '.').replace(/[^\d.-]/g, '')
    if (!/\d/.test(normalized)) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  const typed = editing ? parse(draft) : null
  const shown = typed ?? current
  const [trail, setTrail] = useState({ value: shown, direction: 1 as 1 | -1 })
  if (trail.value !== shown) setTrail({ value: shown, direction: shown > trail.value ? 1 : -1 })
  const direction = trail.value === shown ? trail.direction : shown > trail.value ? 1 : -1

  useEffect(() => () => { window.clearTimeout(hold.current); window.clearTimeout(pushedTimer.current); window.clearTimeout(underTimer.current); window.clearTimeout(strainTimer.current) }, [])

  /** Un paso más allá de un límite. El valor se tensa hacia él y vuelve con resorte, un poco más con cada empujón seguido (con tope, como el
   *  rebote de una lista); el botón que se negó se sacude una vez; la nota dice cuál es el límite. Con movimiento reducido queda sólo un cambio breve de color. */
  function strainTo(edge: 1 | -1, source: Source) {
    const now = performance.now(), push = effort.current
    push.count = push.edge === edge && now - push.at < PUSH_WINDOW ? push.count + 1 : 1
    push.edge = edge
    push.at = now
    setStrain(edge > 0 ? 'max' : 'min')
    window.clearTimeout(strainTimer.current)
    strainTimer.current = window.setTimeout(() => setStrain(null), 420)
    if (!reduced) {
      animate(bumpY, 0, { ...m.kick, velocity: -edge * BUMP_VELOCITY * (1 + Math.min(push.count - 1, PUSH_CAP) * PUSH_GAIN) })
      const icon = (edge > 0 ? plusIcon : minusIcon).current
      if (icon && (source === 'button' || source === 'key')) animate(icon, { x: [0, -2.5, 2.5, -1.5, 1, 0] }, { duration: d * 1.8, ease: 'easeOut' })
    }
    if (limitHint) {
      setPushed(edge)
      window.clearTimeout(pushedTimer.current)
      pushedTimer.current = window.setTimeout(() => setPushed(0), LIMIT_HINT_MS)
    }
  }
  /** Todo cambio pasa por acá. Un valor más allá de un límite se recorta, se tensa hacia él y dice qué límite tocó. */
  function commitValue(next: number, source: Source) {
    if (!Number.isFinite(next)) return false
    const clamped = clamp(next)
    const limit = Math.sign(next - clamped)
    if (limit && source !== 'scrub') { strainTo(limit > 0 ? 1 : -1, source); setAnnouncement(`${spoken(clamped)}, ${limit > 0 ? 'máximo' : 'mínimo'}`) }
    else if (source === 'button' && clamped !== latest.current) setAnnouncement(spoken(clamped))
    if (clamped === latest.current) return false
    latest.current = clamped
    if (value === undefined) setInternal(clamped)
    onValueChange?.(clamped)
    return true
  }
  const nudge = (toward: 1 | -1, steps: number, source: Source) => commitValue(stepFrom(latest.current, toward * steps), source)
  useLayoutEffect(() => { latest.current = current; live.current = nudge })

  /** El grupo vuelve al centro deslizándose cuando tipear le cambia el ancho, en vez de saltar medio carácter por tecla. */
  function captureShift() {
    const group = groupRef.current
    if (group && shiftFrom.current === null) shiftFrom.current = group.getBoundingClientRect().left - scrubX.get() - shiftX.get()
  }
  useLayoutEffect(() => {
    const from = shiftFrom.current, group = groupRef.current
    shiftFrom.current = null
    // Después de confirmar el cursor se va al final, así ninguna selección queda encima de los dígitos que giran.
    if (selectNext.current) { selectNext.current = false; const input = inputRef.current; if (input && document.activeElement === input) { const end = input.value.length; input.setSelectionRange(end, end) } }
    if (from === null || !group) return
    const delta = from - (group.getBoundingClientRect().left - scrubX.get() - shiftX.get())
    if (Math.abs(delta) < 0.5) return
    shiftX.set(shiftX.get() + delta)
    if (reduced) shiftX.jump(0); else animate(shiftX, 0, m.morph)
  })

  function clearUnder() {
    window.clearTimeout(underTimer.current)
    setUnderWarn(false)
  }
  function commitDraft() {
    if (!editing) return
    captureShift()
    setEditing(false)
    clearUnder()
    const parsed = parse(draft)
    if (parsed !== null) commitValue(snap(parsed), 'type')
  }
  function stopHold() {
    window.clearTimeout(hold.current)
    hold.current = undefined
    setPressed(0)
  }
  /** Un paso ahora; tras una pausa, repeticiones que aceleran de a poco hasta soltar. Apretado contra un límite sigue empujando a ritmo parejo,
   *  cada empujón tensando un poco más, hasta que se suelta. */
  function startHold(toward: 1 | -1, amount: number, source: Source) {
    stopHold()
    commitDraft()
    const steps = Math.max(1, Math.round(amount / step))
    if (source === 'button') setPressed(toward)
    let count = 0
    const tick = () => {
      const moved = live.current(toward, steps, source)
      hold.current = window.setTimeout(tick, moved ? Math.max(HOLD_FASTEST, 150 * 0.86 ** ++count) : LIMIT_PUSH)
    }
    hold.current = window.setTimeout(tick, nudge(toward, steps, source) ? HOLD_DELAY : LIMIT_PUSH + 120)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const large = largeStep ?? step * 10
    const move = ({ ArrowUp: [1, event.shiftKey ? large : step], ArrowDown: [-1, event.shiftKey ? large : step], PageUp: [1, large], PageDown: [-1, large] } as Record<string, [1 | -1, number]>)[event.key]
    if (move) { event.preventDefault(); if (!event.repeat) startHold(move[0], move[1], 'key'); return }
    // Inicio y Fin llegan a los límites; con un borrador abierto mueven el cursor como en cualquier campo de texto.
    if (!editing && ((event.key === 'Home' && Number.isFinite(min)) || (event.key === 'End' && max < Number.MAX_SAFE_INTEGER))) { event.preventDefault(); commitValue(event.key === 'Home' ? min : max, 'key'); return }
    if (event.key === 'Enter') { event.preventDefault(); if (editing) { selectNext.current = true; commitDraft() } else event.currentTarget.select() }
    if (event.key === 'Escape' && editing) { event.preventDefault(); captureShift(); setEditing(false); clearUnder(); selectNext.current = true; commitValue(editStart.current, 'type') }
  }
  function onChange(text: string) {
    const allowed = new RegExp(`[^0-9${escape(symbols.group)}${decimals || maxFraction ? escape(symbols.decimal) : ''}${min < 0 ? '\\-' : ''}]`, 'g')
    const next = text.replace(allowed, '')
    if (!editing) editStart.current = current
    captureShift()
    setDraft(next)
    setEditing(true)
    // Un borrador válido se aplica mientras se tipea, así lo que dependa del valor lo sigue.
    const parsed = parse(next)
    if (parsed !== null && parsed >= min && parsed <= max && snap(parsed) === parsed) commitValue(parsed, 'type')
    // Pasarse del máximo avisa al instante; quedar por debajo del mínimo espera, porque "1" suele ser el principio de "12".
    clearUnder()
    if (parsed !== null && parsed < min) underTimer.current = window.setTimeout(() => setUnderWarn(true), UNDER_WARN_MS)
  }

  function onScrubStart(event: PointerEvent<HTMLLabelElement>) {
    suppressClick.current = false
    if (!scrub || disabled || event.button !== 0) return
    commitDraft()
    drag.current = { pointer: event.pointerId, x: event.clientX, from: latest.current, active: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function onScrubMove(event: PointerEvent<HTMLLabelElement>) {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    const dx = event.clientX - state.x
    if (!state.active) { if (Math.abs(dx) < 3) return; state.active = true; setScrubbing(true) }
    const travel = dx / SCRUB_PX, steps = Math.trunc(travel)
    commitValue(steps ? stepFrom(state.from, steps) : state.from, 'scrub')
    // Más allá de un límite el valor sigue al puntero con resistencia, y vuelve con resorte al soltar.
    const raw = state.from + travel * step
    const over = raw > max ? (raw - max) / step * SCRUB_PX : raw < min ? (raw - min) / step * SCRUB_PX : 0
    scrubX.set(reduced ? 0 : rubber(over))
  }
  function onScrubEnd(event: PointerEvent<HTMLLabelElement>) {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    drag.current = null
    if (!state.active) return
    suppressClick.current = true
    setScrubbing(false)
    animate(scrubX, 0, reduced ? { duration: 0 } : m.snappy)
    setAnnouncement(spoken(latest.current))
  }

  const stepper = (toward: 1 | -1) => ({ toward, label, disabled, controls: inputId, limit: toward > 0 ? shown >= max : shown <= min, pressed: pressed === toward, strained: strain === (toward > 0 ? 'max' : 'min') })
  /** Un valor tipeado más allá de un límite sostiene un aviso tranquilo hasta que se confirma y vuelve. */
  const outside: 1 | -1 | 0 = typed === null ? 0 : typed > max ? 1 : typed < min && underWarn ? -1 : 0
  const noteEdge = limitHint ? outside || pushed : 0
  const noteLimit = noteEdge > 0 ? max : min
  const noteText = !noteEdge ? '' : typeof limitHint === 'function' ? limitHint(noteEdge > 0 ? 'max' : 'min', noteLimit) : `${noteEdge > 0 ? 'Máx.' : 'Mín.'} ${spoken(noteLimit)}`
  const describedBy = [hintId, outside && limitHint ? limitId : undefined].filter(Boolean).join(' ') || undefined

  const sz = SIZES[size]
  const vars = { '--nf-h': `${sz.h}px`, '--nf-step': `${sz.step}px`, '--nf-inset': `${sz.inset}px`, '--nf-width': `${width ?? sz.width}px`, '--tone-warn': TONE_WARN } as CSSProperties
  /* Un marco fino. El foco sólo oscurece el borde; un valor tipeado más allá de un límite lo tiñe con el naranja de aviso, tranquilo, no alarmante. */
  const shell = outside
    ? (focused ? 'border-[color-mix(in_oklch,var(--tone-warn)_80%,var(--ui-line))]' : 'border-[color-mix(in_oklch,var(--tone-warn)_55%,var(--ui-line))]') + ' bg-[color-mix(in_oklch,var(--tone-warn)_5%,var(--ui-surface))]'
    : scrubbing || focused ? 'border-ui-ink bg-ui-surface' : 'border-ui-line bg-ui-surface hover:border-ui-ink-muted'

  return <div className="grid min-w-0 font-ui-text" data-size={size} style={vars}>
    {/* La fila de la etiqueta mide lo mismo que el control, así la nota del límite queda sobre el botón al que responde. */}
    <div className="mb-2 flex w-[min(100%,var(--nf-width))] items-baseline justify-between gap-3">
      <label htmlFor={inputId} className={`min-w-0 ${sz.label} leading-normal font-medium text-ui-ink${scrub && !disabled ? ' cursor-ew-resize touch-pan-y select-none' : ''}`} onPointerDown={onScrubStart} onPointerMove={onScrubMove} onPointerUp={onScrubEnd} onPointerCancel={onScrubEnd} onClick={event => { if (suppressClick.current) { event.preventDefault(); suppressClick.current = false } }}>{label}</label>
      <LimitNote id={limitId} edge={noteEdge} text={noteText} m={m} />
    </div>
    <div className={`group/control flex min-h-(--nf-h) w-[min(100%,var(--nf-width))] items-center gap-0.5 rounded-ui border p-(--nf-inset) transition-[border-color,background-color,opacity] duration-(--ui-dur) ease-ui ${shell}${disabled ? ' bg-ui-surface-2 opacity-50' : ''}`} data-strain={strain ?? undefined} data-disabled={disabled || undefined}>
      <StepButton {...stepper(-1)} iconRef={minusIcon} onPress={() => startHold(-1, step, 'button')} onRelease={stopHold} onActivate={() => { commitDraft(); nudge(-1, 1, 'button') }} />
      <div className={`relative flex min-w-0 flex-1 items-center justify-center self-stretch ${disabled ? 'cursor-not-allowed' : 'cursor-text'}`} onMouseDown={event => { if (event.target !== inputRef.current) event.preventDefault() }} onClick={event => { if (!disabled && event.target !== inputRef.current) { inputRef.current?.focus(); inputRef.current?.select() } }}>
        {/* El número, su prefijo y su sufijo viajan como un solo grupo centrado. Los dígitos tabulares mantienen cada columna del mismo ancho. */}
        <motion.span ref={groupRef} className={`inline-flex items-center ${sz.text} leading-normal font-medium whitespace-nowrap text-ui-ink tabular-nums transition-colors duration-[calc(var(--ui-dur)*1.6)] ease-ui motion-reduce:transition-none motion-reduce:group-data-[strain]/control:text-(--tone-warn)`} style={{ x, y: bumpY }}>
          <AffixText text={affixText(prefix, shown)} direction={direction} m={m} />
          {/* Los dígitos que giran y el input real comparten una celda. El input sólo dibuja el cursor y la selección: el texto siempre lo pinta un span
              (los dígitos, o el espejo del borrador mientras se tipea), así el valor conserva un solo peso y lugar, gire o se edite. */}
          <span className="relative inline-grid items-center">
            <span className={`inline-flex [grid-area:1/1]${editing ? ' invisible absolute top-0 left-0' : ''}`} aria-hidden="true"><Digits value={shown} format={format} direction={direction} instant={editing} m={m} /></span>
            {editing && <span className="whitespace-pre [grid-area:1/1]" aria-hidden="true">{draft}</span>}
            <input ref={inputRef} id={inputId} className="absolute top-0 left-0 z-[1] m-0 h-full w-[calc(100%+1em)] border-0 bg-transparent p-0 text-left text-transparent caret-ui-ink outline-none [font:inherit] [letter-spacing:inherit] [line-height:inherit] tabular-nums selection:bg-[color-mix(in_oklch,var(--ui-ink)_16%,transparent)] selection:text-transparent disabled:cursor-not-allowed" type="text" role="spinbutton" inputMode={min < 0 ? 'text' : decimals || maxFraction ? 'decimal' : 'numeric'} autoComplete="off" spellCheck={false}
              value={editing ? draft : format.format(current)} disabled={disabled} aria-describedby={describedBy} aria-invalid={outside ? true : undefined} aria-valuenow={current} aria-valuetext={spoken(current)}
              aria-valuemin={Number.isFinite(min) ? min : undefined} aria-valuemax={max < Number.MAX_SAFE_INTEGER ? max : undefined}
              onChange={event => onChange(event.currentTarget.value)} onKeyDown={onKeyDown} onKeyUp={event => { if (/^(Arrow(Up|Down)|Page(Up|Down))$/.test(event.key)) stopHold() }}
              onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); stopHold(); commitDraft() }} />
          </span>
          <AffixText text={affixText(suffix, shown)} direction={direction} m={m} />
        </motion.span>
      </div>
      <StepButton {...stepper(1)} iconRef={plusIcon} onPress={() => startHold(1, step, 'button')} onRelease={stopHold} onActivate={() => { commitDraft(); nudge(1, 1, 'button') }} />
    </div>
    <AnimatePresence initial={false}>{description ? <MessageRow key="message" id={hintId} text={description} m={m} /> : null}</AnimatePresence>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>
}

export default NumberField
