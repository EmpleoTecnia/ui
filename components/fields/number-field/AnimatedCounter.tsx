'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type MotionValue, type Transition, type Variants } from 'motion/react'

/**
 * Un número grande cuyos dígitos giran como un cuentakilómetros cuando cambia: cada columna
 * da la vuelta en la dirección en que se movió el número entero, y las columnas que aparecen
 * o desaparecen abren o cierran su ancho. Para un total que acompaña a un campo numérico, o
 * una cifra destacada en un panel. El lector de pantalla lee el texto plano.
 */
export interface AnimatedCounterProps {
  value: number
  label?: string
  prefix?: string
  suffix?: string
  decimals?: number
  /** Hace girar todos los dígitos desde cero la primera vez que el contador entra en pantalla. */
  animateOnView?: boolean
  /** Configuración regional del formato. Fija por defecto para que servidor y cliente dibujen los mismos dígitos. */
  locale?: string
  className?: string
}

type Part = { key: string; digit: number; order: number } | { key: string; text: string }
type Bezier = [number, number, number, number]

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const enterEase: Bezier = [0.22, 1, 0.36, 1]
const standardEase: Bezier = [0.2, 0, 0, 1]
const BLUR_SUBTLE = 4
const BLUR_SOFT = 8
/** La ventana de cada rueda se pasa un poco de la línea y se desvanece en los bordes: un dígito que gira se apaga, no se corta. */
const COLUMN_STYLE: CSSProperties = {
  marginBlock: 'calc(var(--feather) * -1)', paddingBlock: 'var(--feather)',
  maskImage: 'linear-gradient(to bottom, transparent, black calc(var(--feather) * 1.5), black calc(100% - var(--feather) * 1.5), transparent)', // color-ok: la máscara sólo usa el alfa
}

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}

type Motion = ReturnType<typeof motionFor>
/** Todo el movimiento sale de --ui-dur. */
function motionFor(d: number, reduced: boolean) {
  const smooth: Transition = { type: 'spring', duration: d * 2.2, bounce: 0 }
  const morph: Transition = { type: 'spring', duration: d * 1.8, bounce: 0.15 }
  const reveal: Transition = { type: 'spring', duration: d * 2.4, bounce: 0 }
  const rise: Variants = { hidden: { opacity: 0, y: '0.3em', filter: `blur(${BLUR_SOFT}px)` }, shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: d * 1.6, ease: enterEase } }, gone: { opacity: 0, y: '-0.3em', filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d, ease: standardEase } } }
  const fade: Variants = { hidden: { opacity: 0, y: 0, filter: 'blur(0px)' }, shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: d * 0.5 } }, gone: { opacity: 0, y: 0, filter: 'blur(0px)', transition: { duration: d * 0.5 } } }
  return { d, reduced, smooth, morph, reveal, rise, fade, stagger: d * 0.25, staggerCap: d * 1.4, presence: reduced ? { duration: 0 } as Transition : morph }
}

/** Parte un número formateado en columnas con clave por valor posicional, así 999 → 1.000 deja la columna de las unidades donde estaba. */
function partsFor(value: number, decimals: number, locale: string): Part[] {
  const parts = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, numberingSystem: 'latn' }).formatToParts(value)
  let place = parts.reduce((count, part) => count + (part.type === 'integer' ? part.value.length : 0), 0)
  let fraction = 0
  let order = 0
  return parts.flatMap((part, index): Part[] => {
    if (part.type === 'integer') return [...part.value].map(char => ({ key: `i${--place}`, digit: Number(char), order: order++ }))
    if (part.type === 'fraction') return [...part.value].map(char => ({ key: `f${fraction++}`, digit: Number(char), order: order++ }))
    return [{ key: part.type === 'group' ? `g${place}` : part.type === 'decimal' ? 'd' : `${part.type}${index}`, text: part.value }]
  })
}

/** Un dígito de la rueda. Su distancia a la posición de la rueda decide dónde está y cuánto se ve. */
function Glyph({ position, digit }: { position: MotionValue<number>; digit: number }) {
  const offset = useTransform(position, current => ((((digit - current) % 10) + 15) % 10) - 5)
  const y = useTransform(offset, current => `${current}em`)
  const opacity = useTransform(offset, current => Math.max(0, 1 - Math.abs(current)))
  const visibility = useTransform(offset, current => Math.abs(current) >= 1 ? 'hidden' : 'visible')
  const filter = useTransform(offset, current => Math.abs(current) < 0.02 || Math.abs(current) >= 1 ? 'none' : `blur(${(Math.abs(current) * BLUR_SUBTLE).toFixed(2)}px)`)
  return <motion.span className="absolute inset-x-0 text-center" style={{ y, opacity, filter, visibility, insetBlock: 'var(--feather)' }}>{digit}</motion.span>
}

const presence = { initial: { width: 0, opacity: 0 }, animate: { width: 'auto', opacity: 1 }, exit: { width: 0, opacity: 0 } }

/** Una rueda de dígitos. Siempre gira hacia donde se movió el número entero, dando la vuelta en 9 → 0 como un cuentakilómetros. */
function Column({ digit, direction, armed, delay, m }: { digit: number; direction: number; armed: boolean; delay: number; m: Motion }) {
  const position = useMotionValue(armed ? 0 : digit)
  const wheel = useRef({ digit: armed ? 0 : digit, target: armed ? 0 : digit, revealed: !armed })
  useEffect(() => {
    const state = wheel.current
    if (armed || state.digit === digit) { if (!armed) state.revealed = true; return }
    state.target += direction < 0 && state.revealed ? -((state.digit - digit + 10) % 10) : (digit - state.digit + 10) % 10
    state.digit = digit
    if (m.reduced) position.jump(state.target)
    else animate(position, state.target, state.revealed ? m.smooth : { ...m.reveal, delay })
    state.revealed = true
  }, [armed, delay, digit, direction, position, m])
  return <motion.span className="relative inline-block overflow-hidden [--feather:.16em]" style={COLUMN_STYLE} {...presence} transition={m.presence}>
    <span className="invisible">0</span>
    {DIGITS.map(item => <Glyph key={item} position={position} digit={item} />)}
  </motion.span>
}

export function AnimatedCounter({ value, label, prefix = '', suffix = '', decimals = 0, animateOnView = false, locale = 'es-AR', className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = !!useReducedMotion()
  const d = useDur()
  const m = motionFor(d, reduced)
  const [previous, setPrevious] = useState(value)
  const [direction, setDirection] = useState(1)
  if (value !== previous) { setPrevious(value); setDirection(value > previous ? 1 : -1) }
  const parts = partsFor(value, decimals, locale)
  const text = `${prefix}${parts.map(part => 'text' in part ? part.text : part.digit).join('')}${suffix}`
  const armed = animateOnView && !inView
  return <span ref={ref} className={`relative inline-flex flex-col font-ui-display text-3xl leading-none font-medium tracking-tight text-ui-ink tabular-nums${className ? ` ${className}` : ''}`}>
    {label && <span className="mb-2 font-ui-text text-xs leading-normal font-normal tracking-normal text-ui-ink-muted"><span className="relative block"><AnimatePresence mode="popLayout" initial={false}><motion.span key={label} className="inline-block" variants={reduced ? m.fade : m.rise} initial="hidden" animate="shown" exit="gone">{label}</motion.span></AnimatePresence></span></span>}
    <span className="sr-only">{text}</span>
    <span className="inline-flex items-start whitespace-nowrap select-none" aria-hidden="true">
      {prefix && <span className="inline-block overflow-x-clip whitespace-pre">{prefix}</span>}
      <AnimatePresence initial={false}>
        {parts.map(part => 'digit' in part
          ? <Column key={part.key} digit={part.digit} direction={direction} armed={armed} delay={Math.min(part.order * m.stagger, m.staggerCap)} m={m} />
          : <motion.span key={part.key} className="inline-block overflow-x-clip whitespace-pre" {...presence} transition={m.presence}>{part.text}</motion.span>)}
      </AnimatePresence>
      {suffix && <span className="inline-block overflow-x-clip whitespace-pre">{suffix}</span>}
    </span>
  </span>
}

export default AnimatedCounter
