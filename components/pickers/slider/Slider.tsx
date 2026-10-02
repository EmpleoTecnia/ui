'use client'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionStyle, type MotionValue, type Transition, type Variants } from 'motion/react'

export type SliderValue = number | [number, number]
export interface SliderMark { value: number; label?: string }

export interface SliderProps<T extends SliderValue = number> {
  /** Etiqueta visible. Los dos pulgares de un rango se nombran a partir de ella salvo que `thumbLabels` diga otra cosa. */
  label: string
  /** Un número para un pulgar, un par para un rango. */
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
  /** Corre una vez al soltar el arrastre o cuando una tecla cambia el valor, para trabajo pesado que no conviene en cada paso. */
  onValueCommit?: (value: T) => void
  min?: number
  max?: number
  step?: number
  /** Cuánto mueven RePág, AvPág y Shift con una flecha. Por defecto, un décimo del rango. */
  largeStep?: number
  /** Marcas en la pista. Un número dibuja un punto; una marca con `label` también lo escribe abajo, y hacerle clic lleva ahí. */
  marks?: (number | SliderMark)[]
  /** Lo más cerca que pueden quedar los dos pulgares de un rango, en pasos. */
  minStepsBetweenThumbs?: number
  /** Formatea el valor al lado de la etiqueta, el globo y el valor hablado. */
  format?: (value: number) => string
  /** Mostrar el valor al lado de la etiqueta. El globo sobre el pulgar aparece igual al arrastrar o al enfocar con teclado. */
  showValue?: boolean
  /** Nombres accesibles de los dos pulgares de un rango. */
  thumbLabels?: [string, string]
  /** Contenido al lado de la pista, como un ícono o un botón de silencio. */
  start?: ReactNode
  end?: ReactNode
  /** Manda el valor con un formulario, un input oculto por pulgar. */
  name?: string
  disabled?: boolean
  className?: string
  /** Para cambiar el tamaño: `--sl-thumb` (22px) y `--sl-track` (6px). */
  style?: CSSProperties
}

type Part = { key: string; digit: number } | { key: string; text: string }
type Drag = { pointer: number; index: number | null; grab: number; x: number; raw: number; samples: { t: number; p: number }[] }
type Bezier = [number, number, number, number]
type Springs = { thumb: Transition; kick: Transition; snappy: Transition; morph: Transition; smooth: Transition }

const enterEase: Bezier = [0.22, 1, 0.36, 1]
const exitEase: Bezier = [0.2, 0, 0, 1]
const BLUR_SUBTLE = 4
const BLUR_SOFT = 8
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
/** Motion descarta la velocidad en los resortes por duración, así que todo lo que recibe un gesto usa el mismo resorte escrito como
 *  rigidez y amortiguación. Las posiciones son porcentajes de la pista, por eso los umbrales de reposo están muy por debajo de un píxel. */
const physical = (visualDuration: number, bounce: number): Transition => { const root = (2 * Math.PI) / (visualDuration * 1.2); return { type: 'spring', stiffness: root * root, damping: 2 * (1 - bounce) * root, restDelta: 0.002, restSpeed: 0.02 } }
/** Píxeles de estiramiento más allá del límite, la velocidad de una tecla en el límite y el tamaño en píxeles de un paso que el impulso al soltar puede elegir. */
const STRETCH = 9, BUMP_PX = 150, SNAP_PX = 12
/** Resistencia estilo iOS: más allá del límite cada píxel rinde menos, y nunca más de `limit`. */
const rubber = (distance: number, limit = STRETCH) => Math.sign(distance) * (1 - 1 / ((Math.abs(distance) * 0.55) / limit + 1)) * limit
/** Hacia dónde va una soltada, con una desaceleración tipo scroll (tasa .99), en las mismas unidades que la velocidad. */
const project = (velocity: number) => velocity * 0.099
const decimalsOf = (value: number) => (String(value).split('.')[1] ?? '').length
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const isDigit = (char: string) => char >= '0' && char <= '9'

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}

/** Los dígitos llevan clave por valor posicional y el texto alrededor por lado, así $950 → $1.000 abre una columna y un punto mientras el resto rueda. */
function partsOf(text: string): Part[] {
  const chars = [...text]
  const first = chars.findIndex(isDigit)
  const last = chars.length - 1 - [...chars].reverse().findIndex(isDigit)
  let place = chars.filter(isDigit).length
  return chars.map((char, index): Part => {
    if (first < 0 || index < first) return { key: `p${index}${char}`, text: char }
    if (index > last) return { key: `s${chars.length - index}${char}`, text: char }
    if (isDigit(char)) return { key: `d${--place}`, digit: Number(char) }
    return { key: `g${place}${char}`, text: char }
  })
}

/* Una columna nueva abre su ancho mientras sube en la dirección del cambio; una que se va se cierra con un resorte que nunca pasa de cero. */
const slot = (d: number, s: Springs): Variants => ({
  enter: (direction: number) => ({ width: 0, scale: 0.6, opacity: 0, y: `${direction * 0.3}em`, filter: `blur(${BLUR_SOFT}px)` }),
  center: { width: 'auto', scale: 1, opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: { width: s.morph, scale: s.morph, opacity: s.morph, y: s.snappy, filter: { duration: d * 1.2, ease: enterEase } } },
  exit: (direction: number) => ({ width: 0, scale: 0.6, opacity: 0, y: `${direction * -0.3}em`, filter: `blur(${BLUR_SUBTLE}px)`, transition: { width: s.smooth, scale: s.smooth, y: { duration: d, ease: exitEase }, opacity: { duration: d * 0.5 }, filter: { duration: d * 0.5 } } }),
})
/* Movimiento reducido: un fundido corto y sin viaje. Su estado de reposo coincide con `slot`, así cualquiera de los dos hidrata el mismo marcado. */
const still = (d: number): Variants => ({
  enter: { width: 'auto', scale: 1, opacity: 0, y: 0, filter: 'none' },
  center: { width: 'auto', scale: 1, opacity: 1, y: 0, filter: 'none', transition: { duration: d * 0.5 } },
  exit: { width: 0, opacity: 0, transition: { duration: 0 } },
})

/** Un dígito de la rueda. Su distancia a la posición de la rueda dice dónde se sienta, qué tan nítido se ve y si se muestra. */
function Glyph({ position, digit }: { position: MotionValue<number>; digit: number }) {
  const offset = (current: number) => ((((digit - current) % 10) + 15) % 10) - 5
  const y = useTransform(position, current => `${offset(current) * 1.05}em`)
  const opacity = useTransform(position, current => Math.max(0, 1 - Math.abs(offset(current)) ** 1.5 * 1.1))
  const visibility = useTransform(position, current => (Math.abs(offset(current)) >= 1 ? 'hidden' : 'visible'))
  const filter = useTransform(position, current => { const distance = Math.abs(offset(current)); return distance < 0.02 || distance >= 1 ? 'none' : `blur(${(distance * BLUR_SOFT * 0.75).toFixed(2)}px)` })
  return <motion.span className="absolute inset-x-0 inset-y-[.2em] text-center" style={{ y, opacity, filter, visibility }}>{digit}</motion.span>
}

/** Una rueda de cuentakilómetros. Gira hacia donde se movió el valor, da la vuelta 9 → 0 y cambia de destino a mitad de giro mientras un arrastre la tiene ocupada. */
function Wheel({ digit, direction, spring }: { digit: number; direction: number; spring: Transition }) {
  const reduced = useReducedMotion()
  const position = useMotionValue(digit)
  const wheel = useRef({ digit, target: digit })
  useLayoutEffect(() => {
    const state = wheel.current
    if (state.digit === digit) return
    state.target += direction > 0 ? (digit - state.digit + 10) % 10 : -((state.digit - digit + 10) % 10)
    state.digit = digit
    if (reduced) position.jump(state.target)
    else animate(position, state.target, spring)
  }, [digit, direction, position, reduced, spring])
  return <><span className="invisible">0</span>{DIGITS.map(item => <Glyph key={item} position={position} digit={item} />)}</>
}

/** Un valor formateado cuyos dígitos ruedan en la dirección en que se movió y cuyo ancho sigue a las columnas nuevas con un resorte. */
function RollingNumber({ value, text, d, springs }: { value: number; text: string; d: number; springs: Springs }) {
  const reduced = useReducedMotion()
  const [trail, setTrail] = useState({ value, direction: 1 })
  if (trail.value !== value) setTrail({ value, direction: value > trail.value ? 1 : -1 })
  const direction = trail.value === value ? trail.direction : value > trail.value ? 1 : -1
  const variants = useMemo(() => (reduced ? still(d) : slot(d, springs)), [d, reduced, springs])
  return (
    <span className="inline-flex items-center whitespace-nowrap tabular-nums">
      <AnimatePresence initial={false} custom={direction}>
        {partsOf(text).map(part => (
          <motion.span
            key={part.key}
            className={'digit' in part
              ? 'relative inline-block -my-[.2em] overflow-x-visible overflow-y-clip py-[.2em] [mask-image:linear-gradient(to_bottom,transparent,black_.3em,black_calc(100%_-_.3em),transparent)]'
              : 'inline-block overflow-x-clip whitespace-pre'}
            custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
          >
            {'digit' in part ? <Wheel digit={part.digit} direction={direction} spring={springs.thumb} /> : part.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
}

interface ThumbProps { quiet: boolean; index: number; shown: MotionValue<number>; value: number; text: string; low: number; high: number; ariaLabel?: string; labelledBy?: string; active: boolean; lifted: boolean; bubble: boolean; disabled?: boolean; d: number; springs: Springs; onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void; onFocus: (event: FocusEvent<HTMLDivElement>) => void; onBlur: () => void }

/** El pulgar viaja sobre una capa tan ancha como la pista, así un transform en porcentaje lo ubica sin medir nada, también en el servidor. */
function Thumb({ quiet, index, shown, value, text, low, high, ariaLabel, labelledBy, active, lifted, bubble, disabled, d, springs, onKeyDown, onFocus, onBlur }: ThumbProps) {
  const reduced = useReducedMotion()
  const x = useTransform(shown, current => `${current - 100}%`)
  const bubbleIn = { opacity: 0, scale: 0.6, y: 6, filter: `blur(${BLUR_SUBTLE}px)` }
  const bubbleRest = { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }
  const bubbleOut = { opacity: 0, scale: 0.8, y: 4, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d * 0.5, ease: exitEase } }
  const bubbleEnter: Transition = { ...springs.snappy, opacity: { duration: d, ease: enterEase }, filter: { duration: d, ease: enterEase } }
  // El globo se centra en el pulgar hasta que pasaría el borde del componente, y ahí se queda. --sl-at es la posición del pulgar en
  // porcentaje de la pista, escrita en cada cuadro, y cqw mide la pista, así el clamp no necesita medir nada en JavaScript.
  const anchorStyle = { '--sl-at': shown, '--sl-edge': 'calc(var(--sl-thumb) / 2)', '--sl-x': 'calc(var(--sl-at, 0) * 1cqw)', translate: 'clamp(calc(100% - var(--sl-edge) - var(--sl-x)), 50%, calc(100cqw + var(--sl-edge) - var(--sl-x))) 0' } as MotionStyle
  return (
    <motion.div className="absolute inset-0" style={{ x, zIndex: active ? 2 : 1 }}>
      <motion.div
        role="slider" data-thumb="" data-index={index} data-active={lifted || undefined} data-quiet={quiet || undefined}
        className="pointer-events-auto absolute top-1/2 right-0 box-border size-(--sl-thumb) cursor-grab rounded-full border-0 bg-ui-surface shadow-(--sl-thumb-shadow) outline-0 outline-ui-accent transition-shadow duration-(--ui-dur) ease-ui [translate:50%_-50%] after:absolute after:-inset-[11px] after:rounded-[inherit] after:content-[''] motion-reduce:transition-none [&:focus-visible:not([data-quiet])]:outline-[3px] [&:focus-visible:not([data-quiet])]:outline-offset-2 group-data-[dragging]:cursor-grabbing group-data-[disabled]:cursor-not-allowed"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel} aria-labelledby={ariaLabel ? undefined : labelledBy} aria-valuemin={low} aria-valuemax={high} aria-valuenow={value} aria-valuetext={text} aria-orientation="horizontal" aria-disabled={disabled || undefined}
        initial={false} animate={{ scale: lifted ? 1.16 : 1 }} transition={reduced ? { duration: 0 } : springs.snappy} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur}
      />
      <motion.span className="pointer-events-none absolute right-0 bottom-[calc(50%_+_var(--sl-thumb)_/_2_+_8px)] flex pointer-coarse:bottom-[calc(50%_+_var(--sl-thumb)_/_2_+_18px)]" style={anchorStyle}>
        <AnimatePresence>
          {bubble && (
            <motion.span
              key="bubble"
              className="inline-flex min-h-7 origin-[50%_100%] items-center rounded-full border border-[color-mix(in_oklch,var(--ui-bg)_14%,var(--ui-ink))] bg-ui-ink px-3 text-sm font-medium whitespace-nowrap text-ui-bg shadow-(--sl-bubble-shadow)"
              aria-hidden="true"
              initial={reduced ? { opacity: 0 } : bubbleIn} animate={bubbleRest}
              exit={reduced ? { opacity: 0, transition: { duration: d * 0.5 } } : bubbleOut}
              transition={reduced ? { duration: d * 0.8 } : bubbleEnter}
            >
              <RollingNumber value={value} text={text} d={d} springs={springs} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.div>
  )
}

/**
 * Un valor o un rango sobre una pista. El pulgar sigue al puntero 1:1, se estira con resistencia más allá de sus límites y se asienta en
 * la grilla de pasos con la velocidad con que lo soltaste; apretar la pista manda ahí al pulgar más cercano con un resorte. Un globo con
 * dígitos que ruedan acompaña al pulgar mientras lo arrastrás o lo enfocás con el teclado. Flechas, Shift+flechas, RePág, AvPág,
 * Inicio y Fin funcionan como en un input de rango nativo.
 */
export function Slider<T extends SliderValue = number>({ label, value, defaultValue, onValueChange, onValueCommit, min = 0, max = 100, step: stepProp = 1, largeStep, marks, minStepsBetweenThumbs = 0, format, showValue = true, thumbLabels, start, end, name, disabled, className, style }: SliderProps<T>) {
  const reduced = useReducedMotion()
  const d = useDur()
  const labelId = useId()
  const springs = useMemo<Springs>(() => ({
    thumb: physical(d * 1.4, 0.1),
    kick: physical(d * 1.8, 0.15),
    snappy: { type: 'spring', duration: d * 1.4, bounce: 0.1 },
    morph: { type: 'spring', duration: d * 1.8, bounce: 0.15 },
    smooth: { type: 'spring', duration: d * 2.2, bounce: 0 },
  }), [d])
  const step = stepProp > 0 ? stepProp : 1
  const span = max - min || 1
  const isRange = Array.isArray(value ?? defaultValue)
  const toArray = (input: SliderValue | undefined) => (input === undefined ? [min, max].slice(0, isRange ? 2 : 1) : Array.isArray(input) ? [input[0], input[1]] : [input])
  const [internal, setInternal] = useState(() => toArray(defaultValue))
  const values = value === undefined ? internal : toArray(value)
  const decimals = Math.max(decimalsOf(step), decimalsOf(min))
  const formatValue = format ?? ((input: number) => input.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
  const gap = isRange ? minStepsBetweenThumbs * step : 0
  const pct = (input: number) => ((input - min) / span) * 100
  const valueAt = (percent: number) => min + (percent / 100) * span
  const snap = (input: number) => Number((min + Math.round((input - min) / step) * step).toFixed(decimals))
  const lowOf = (index: number, current: number[]) => (index === 1 ? current[0] + gap : min)
  const highOf = (index: number, current: number[]) => (index === 0 && isRange ? current[1] - gap : max)
  const settle = (index: number, input: number, current: number[]) => clamp(snap(clamp(input, min, max)), lowOf(index, current), highOf(index, current))

  const trackRef = useRef<HTMLDivElement>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const latest = useRef(values)
  const goal = useRef(values.map(pct))
  const drag = useRef<Drag | null>(null)
  const pointerFocus = useRef(false)
  const lingerTimer = useRef<number | undefined>(undefined)
  const [dragging, setDragging] = useState<number | null>(null)
  const [keyFocus, setKeyFocus] = useState<number | null>(null)
  const [linger, setLinger] = useState<number | null>(null)
  const [lastActive, setLastActive] = useState(isRange ? 1 : 0)
  const [quiet, setQuiet] = useState<number | null>(null)

  // Cada pulgar es una posición comprometida más un desfase de alcance: apretar la pista lleva el desfase a cero con un resorte mientras
  // el puntero mueve la posición 1:1, así el pulgar se desliza hasta el dedo y nunca se le queda atrás.
  const pos0 = useMotionValue(pct(values[0])), pos1 = useMotionValue(pct(values[1] ?? values[0]))
  const lag0 = useMotionValue(0), lag1 = useMotionValue(0)
  const shown0 = useTransform(() => pos0.get() + lag0.get())
  const shown1 = useTransform(() => pos1.get() + lag1.get())
  const clipPath = useTransform(() => { const from = isRange ? clamp(shown0.get(), 0, 100) : 0; const to = clamp((isRange ? shown1 : shown0).get(), 0, 100); return `inset(0 ${(100 - to).toFixed(3)}% 0 ${from.toFixed(3)}% round 999px)` })
  const thumbs = [{ pos: pos0, lag: lag0, shown: shown0 }, { pos: pos1, lag: lag1, shown: shown1 }]

  const emit = (next: number[]) => (isRange ? [next[0], next[1]] : next[0]) as T
  function commit(index: number, next: number) {
    const current = latest.current
    if (current[index] === next) return
    const updated = current.map((item, at) => (at === index ? next : item))
    latest.current = updated
    if (value === undefined) setInternal(updated)
    onValueChange?.(emit(updated))
  }

  // Los valores que llegan desde afuera de un arrastre (teclas, props, una marca clickeada) llevan el pulgar a su lugar con un resorte.
  useLayoutEffect(() => {
    latest.current = values
    values.forEach((item, index) => {
      const target = pct(item), thumb = thumbs[index]
      if (drag.current?.index === index || goal.current[index] === target) return
      goal.current[index] = target
      const from = thumb.pos.get() + thumb.lag.get()
      thumb.lag.jump(0)
      thumb.pos.jump(from)
      if (reduced) thumb.pos.jump(target); else animate(thumb.pos, target, springs.thumb)
    })
  })
  useEffect(() => () => window.clearTimeout(lingerTimer.current), [])

  const thumbNode = (index: number) => thumbsRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)
  /** El foco que llega desde un puntero deja quieto al pulgar: sin anillo ni globo hasta que se aprieta una tecla. */
  function focusFromPointer(index: number) {
    const node = thumbNode(index)
    if (!node || document.activeElement === node) return
    setQuiet(index)
    pointerFocus.current = true
    node.focus({ preventScroll: true })
    pointerFocus.current = false
  }
  const trackWidth = () => trackRef.current?.getBoundingClientRect().width || 1
  function nearest(at: number, current: number[]) {
    if (!isRange) return 0
    const low = Math.abs(at - pct(current[0])), high = Math.abs(at - pct(current[1]))
    return low === high ? (at < pct(current[0]) ? 0 : 1) : low < high ? 0 : 1
  }
  function holdBubble(index: number) {
    window.clearTimeout(lingerTimer.current)
    setLinger(index)
    lingerTimer.current = window.setTimeout(() => setLinger(null), 700)
  }

  /** Empieza a seguir un pulgar. Apretar la pista lo trae con un resorte desde donde estaba; un pulgar agarrado conserva el desfase del agarre. */
  function begin(state: Drag, index: number, at: number, press: boolean) {
    const thumb = thumbs[index]
    const from = thumb.pos.get() + thumb.lag.get()
    state.index = index
    state.grab = press ? 0 : at - from
    thumb.lag.jump(0)
    thumb.pos.jump(from)
    setDragging(index)
    setLastActive(index)
    window.clearTimeout(lingerTimer.current)
    setLinger(null)
    focusFromPointer(index)
    if (press) follow(state, at, 0, true)
  }
  /** Pone el pulgar arrastrado bajo el puntero, con resistencia más allá de sus límites, y compromete el valor en pasos que queda debajo. */
  function follow(state: Drag, at: number, time: number, press = false) {
    const index = state.index
    if (index === null) return
    const thumb = thumbs[index], current = latest.current, width = trackWidth()
    const raw = at - state.grab
    const low = pct(lowOf(index, current)), high = pct(highOf(index, current))
    const edge = clamp(raw, low, high)
    const placed = reduced ? edge : edge + (rubber(((raw - edge) / 100) * width) / width) * 100
    if (press && !reduced) {
      const from = thumb.pos.get()
      thumb.pos.jump(placed)
      thumb.lag.jump(from - placed)
      animate(thumb.lag, 0, springs.thumb)
    } else thumb.pos.set(placed)
    state.raw = raw
    state.samples.push({ t: time, p: placed })
    if (state.samples.length > 6) state.samples.shift()
    commit(index, settle(index, valueAt(raw), current))
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0 || !event.isPrimary) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const at = ((event.clientX - rect.left) / (rect.width || 1)) * 100
    const grabbed = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]')
    const current = latest.current
    event.currentTarget.setPointerCapture(event.pointerId)
    const state: Drag = { pointer: event.pointerId, index: null, grab: 0, x: event.clientX, raw: at, samples: [] }
    drag.current = state
    // Dos pulgares apilados esperan al primer movimiento para saber a cuál se refiere el puntero.
    if (grabbed && isRange && current[0] === current[1]) { focusFromPointer(Number(grabbed.dataset.index)); return }
    begin(state, grabbed ? Number(grabbed.dataset.index) : nearest(at, current), at, !grabbed)
    state.samples = [{ t: event.timeStamp, p: thumbs[state.index ?? 0].pos.get() }]
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const at = ((event.clientX - rect.left) / (rect.width || 1)) * 100
    if (state.index === null) {
      const dx = event.clientX - state.x
      if (Math.abs(dx) < 2) return
      begin(state, dx < 0 ? 0 : 1, at - (dx / (rect.width || 1)) * 100, false)
    }
    follow(state, at, event.timeStamp)
  }
  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    drag.current = null
    const index = state.index
    if (index === null) return
    const thumb = thumbs[index], current = latest.current, width = trackWidth()
    // Velocidad de los últimos cuadros, en porcentaje por segundo; un puntero que se frenó antes de soltar no lleva ninguna.
    const samples = state.samples, first = samples[0], last = samples[samples.length - 1]
    const elapsed = last && first ? (last.t - first.t) / 1000 : 0
    // Soltar durante el resorte de alcance conserva también la velocidad de ese resorte.
    const velocity = (elapsed > 0.008 && event.timeStamp - last.t < 60 ? (last.p - first.p) / elapsed : 0) + thumb.lag.getVelocity()
    // En una grilla gruesa el impulso al soltar puede llevar el pulgar un paso más, nunca más que eso.
    const stepPct = (step / span) * 100
    const carry = event.type === 'pointerup' && (stepPct / 100) * width >= SNAP_PX ? clamp(project(velocity), -stepPct, stepPct) : 0
    const next = settle(index, valueAt(state.raw + carry), current)
    const from = thumb.pos.get() + thumb.lag.get(), target = pct(next)
    thumb.lag.jump(0)
    thumb.pos.jump(from)
    goal.current[index] = target
    if (reduced) thumb.pos.jump(target); else animate(thumb.pos, target, { ...springs.thumb, velocity })
    commit(index, next)
    setDragging(null)
    holdBubble(index)
    onValueCommit?.(emit(latest.current))
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    const current = latest.current, now = current[index]
    const large = largeStep ?? Math.max(step, snap(min + span / 10) - min)
    const moves: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: large, PageDown: -large }
    let wanted: number
    if (event.key === 'Home') wanted = lowOf(index, current)
    else if (event.key === 'End') wanted = highOf(index, current)
    else if (event.key in moves) wanted = now + (event.shiftKey && /^Arrow/.test(event.key) ? Math.sign(moves[event.key]) * large : moves[event.key])
    else return
    event.preventDefault()
    setKeyFocus(index)
    setQuiet(null)
    setLastActive(index)
    const next = settle(index, wanted, current)
    // En un límite el pulgar se tensa hacia la tecla y vuelve con un resorte, así la tecla igual responde.
    if (next === now) {
      const toward = Math.sign(wanted - now)
      if (toward && !reduced) animate(thumbs[index].pos, goal.current[index], { ...springs.kick, velocity: ((toward * BUMP_PX) / trackWidth()) * 100 })
      return
    }
    commit(index, next)
    onValueCommit?.(emit(latest.current))
  }

  function jumpTo(target: number) {
    if (disabled) return
    const current = latest.current, index = nearest(pct(target), current)
    const next = settle(index, target, current)
    setLastActive(index)
    focusFromPointer(index)
    if (next === current[index]) return
    commit(index, next)
    onValueCommit?.(emit(latest.current))
  }

  const markList = (marks ?? []).map(mark => (typeof mark === 'number' ? ({ value: mark } as SliderMark) : mark)).filter(mark => mark.value >= min && mark.value <= max)
  const ticks = markList.filter(mark => mark.value > min && mark.value < max)
  const labelled = markList.filter(mark => mark.label)
  const inRange = (mark: number) => (isRange ? mark >= values[0] && mark <= values[1] : mark <= values[0])
  const names = thumbLabels ?? [`${label}, mínimo`, `${label}, máximo`]
  const vars = {
    '--sl-thumb': '22px',
    '--sl-track': '6px',
    '--sl-thumb-shadow': '0 0 0 1px color-mix(in oklch, var(--ui-ink) 12%, transparent), 0 1px 3px color-mix(in oklch, var(--ui-ink) 16%, transparent)',
    '--sl-bubble-shadow': '0 4px 12px color-mix(in oklch, var(--ui-ink) 18%, transparent)',
    ...style,
  } as CSSProperties
  const edgeTranslate = (edge?: 'start' | 'end') => (edge === 'start' ? 'max(-50%, calc(var(--sl-thumb) / -2)) 0' : edge === 'end' ? 'min(-50%, calc(-100% + var(--sl-thumb) / 2)) 0' : '-50% 0')

  return (
    <div
      className={`group grid w-full min-w-0 font-ui-text text-sm leading-normal text-ui-ink select-none data-[disabled]:opacity-50${className ? ` ${className}` : ''}`}
      style={vars}
      data-disabled={disabled || undefined} data-dragging={dragging !== null || undefined} data-marks={labelled.length > 0 || undefined}
    >
      <div className="flex min-w-0 items-baseline justify-between gap-4">
        <span id={labelId} className="min-w-0 font-medium">{label}</span>
        {showValue && (
          <span className="inline-flex flex-none items-center gap-[.3em] whitespace-nowrap text-ui-ink-soft tabular-nums" aria-hidden="true">
            <RollingNumber value={values[0]} text={formatValue(values[0])} d={d} springs={springs} />
            {isRange && <><span className="text-ui-ink-muted">–</span><RollingNumber value={values[1]} text={formatValue(values[1])} d={d} springs={springs} /></>}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center">
        {start && <div className="mr-3 flex [grid-area:1/1]">{start}</div>}
        {/* Toda la fila recibe la presión; en touch, el desplazamiento vertical sigue moviendo la página. */}
        <div
          className={`relative h-10 touch-pan-y [-webkit-tap-highlight-color:transparent] [grid-area:1/2] ${disabled ? 'cursor-not-allowed' : dragging !== null ? 'cursor-grabbing' : 'cursor-pointer'}`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onLostPointerCapture={onPointerEnd} onMouseDown={event => event.preventDefault()}
        >
          <div ref={trackRef} className="absolute top-1/2 right-[calc(var(--sl-thumb)_/_2)] left-[calc(var(--sl-thumb)_/_2)] h-(--sl-track) mt-[calc(var(--sl-track)_/_-2)] rounded-full bg-ui-line">
            {ticks.map(mark => <span key={mark.value} className="absolute top-1/2 -mt-0.5 -ml-0.5 size-1 rounded-full bg-[color-mix(in_oklch,var(--ui-ink)_30%,transparent)]" style={{ left: `${pct(mark.value)}%` }} />)}
            {/* El relleno cubre toda la pista y lo revela un recorte que sigue a los pulgares en el mismo cuadro. Sus puntos son el conjunto "encendido", cortado justo en el pulgar. */}
            <motion.div className="absolute inset-0 rounded-[inherit] bg-ui-accent" style={{ clipPath }}>
              {ticks.map(mark => <span key={mark.value} className="absolute top-1/2 -mt-0.5 -ml-0.5 size-1 rounded-full bg-[color-mix(in_oklch,var(--ui-accent-ink)_60%,transparent)]" style={{ left: `${pct(mark.value)}%` }} />)}
            </motion.div>
          </div>
          <div ref={thumbsRef} className="pointer-events-none absolute inset-y-0 inset-x-[calc(var(--sl-thumb)_/_2)] @container">
            {values.map((item, index) => (
              <Thumb
                key={index} quiet={quiet === index} index={index} shown={thumbs[index].shown} value={item} text={formatValue(item)} low={lowOf(index, values)} high={highOf(index, values)}
                ariaLabel={isRange ? names[index] : undefined} labelledBy={labelId} active={lastActive === index} lifted={dragging === index} bubble={dragging === index || keyFocus === index || linger === index} disabled={disabled}
                d={d} springs={springs}
                onKeyDown={event => onKeyDown(index, event)}
                onFocus={event => { if (!pointerFocus.current && event.currentTarget.matches(':focus-visible')) setKeyFocus(index) }}
                onBlur={() => { setKeyFocus(current => (current === index ? null : current)); setQuiet(current => (current === index ? null : current)) }}
              />
            ))}
          </div>
        </div>
        {end && <div className="ml-3 flex [grid-area:1/3]">{end}</div>}
        {labelled.length > 0 && (
          <div className="relative -mt-1 mx-[calc(var(--sl-thumb)_/_2)] h-5 text-xs text-ui-ink-muted tabular-nums [grid-area:2/2]" aria-hidden="true">
            {labelled.map(mark => {
              const edge = mark.value === min ? 'start' : mark.value === max ? 'end' : undefined
              return (
                <span
                  key={mark.value}
                  className={`absolute top-0 whitespace-nowrap transition-colors duration-(--ui-dur) ease-ui motion-reduce:transition-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:text-ui-ink'} ${inRange(mark.value) ? 'text-ui-ink-soft' : ''}`}
                  data-on={inRange(mark.value) || undefined} data-edge={edge}
                  style={{ left: `${pct(mark.value)}%`, translate: edgeTranslate(edge) }}
                  onClick={() => jumpTo(mark.value)}
                >
                  {mark.label}
                </span>
              )
            })}
          </div>
        )}
      </div>
      {name && values.map((item, index) => <input key={index} type="hidden" name={name} value={item} disabled={disabled} />)}
    </div>
  )
}

export default Slider
