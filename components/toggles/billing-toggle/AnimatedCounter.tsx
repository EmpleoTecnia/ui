'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue, type Transition } from 'motion/react'

export interface AnimatedCounterProps {
  value: number
  decimals?: number
  /** Locale del formato. Fijo para que el servidor y el navegador escriban los mismos dígitos. */
  locale?: string
  /** `--ui-dur` en segundos; lo pasa quien lo usa para no leerlo dos veces. */
  d: number
  className?: string
}

type Part = { key: string; digit: number; order: number } | { key: string; text: string }

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const BLUR_SUBTLE = 4

/** Parte un número formateado en columnas con clave por valor posicional: 999 → 1.000 deja la columna de las unidades donde estaba. */
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

/** Un dígito de la rueda. Su distancia a la posición de la rueda dice dónde se sienta y cuánto se ve. */
function Glyph({ position, digit }: { position: MotionValue<number>; digit: number }) {
  const offset = useTransform(position, current => ((((digit - current) % 10) + 15) % 10) - 5)
  const y = useTransform(offset, current => `${current}em`)
  const opacity = useTransform(offset, current => Math.max(0, 1 - Math.abs(current)))
  const visibility = useTransform(offset, current => (Math.abs(current) >= 1 ? 'hidden' : 'visible'))
  const filter = useTransform(offset, current => (Math.abs(current) < 0.02 || Math.abs(current) >= 1 ? 'none' : `blur(${(Math.abs(current) * BLUR_SUBTLE).toFixed(2)}px)`))
  return <motion.span className="absolute inset-x-0 inset-y-[.16em] text-center" style={{ y, opacity, filter, visibility }}>{digit}</motion.span>
}

const presence = { initial: { width: 0, opacity: 0 }, animate: { width: 'auto', opacity: 1 }, exit: { width: 0, opacity: 0 } }

/** Una rueda de dígitos. Gira siempre hacia donde se movió el número entero, y da la vuelta 9 → 0 como un cuentakilómetros. */
function Column({ digit, direction, reduced, smooth, morph }: { digit: number; direction: number; reduced: boolean; smooth: Transition; morph: Transition }) {
  const position = useMotionValue(digit)
  const wheel = useRef({ digit, target: digit })
  useEffect(() => {
    const state = wheel.current
    if (state.digit === digit) return
    state.target += direction < 0 ? -((state.digit - digit + 10) % 10) : (digit - state.digit + 10) % 10
    state.digit = digit
    if (reduced) position.jump(state.target)
    else animate(position, state.target, smooth)
  }, [digit, direction, position, reduced, smooth])
  return (
    <motion.span
      className="relative inline-block overflow-hidden -my-[.16em] py-[.16em] [mask-image:linear-gradient(to_bottom,transparent,black_.24em,black_calc(100%_-_.24em),transparent)]"
      {...presence}
      transition={reduced ? { duration: 0 } : morph}
    >
      <span className="invisible">0</span>
      {DIGITS.map(item => <Glyph key={item} position={position} digit={item} />)}
    </motion.span>
  )
}

/** Un número cuyos dígitos ruedan hacia el valor nuevo; las columnas que aparecen o desaparecen abren y cierran su ancho. */
export function AnimatedCounter({ value, decimals = 0, locale = 'es-AR', d, className }: AnimatedCounterProps) {
  const reduced = !!useReducedMotion()
  const [previous, setPrevious] = useState(value)
  const [direction, setDirection] = useState(1)
  if (value !== previous) { setPrevious(value); setDirection(value > previous ? 1 : -1) }
  const parts = partsFor(value, decimals, locale)
  const text = parts.map(part => ('text' in part ? part.text : part.digit)).join('')
  const smooth = useMemo<Transition>(() => ({ type: 'spring', duration: d * 2.2, bounce: 0 }), [d])
  const morph = useMemo<Transition>(() => ({ type: 'spring', duration: d * 1.8, bounce: 0.15 }), [d])
  return (
    <span className={`relative inline-flex tabular-nums${className ? ` ${className}` : ''}`}>
      <span className="sr-only">{text}</span>
      <span className="inline-flex items-start whitespace-nowrap select-none" aria-hidden="true">
        <AnimatePresence initial={false}>
          {parts.map(part => 'digit' in part
            ? <Column key={part.key} digit={part.digit} direction={direction} reduced={reduced} smooth={smooth} morph={morph} />
            : <motion.span key={part.key} className="inline-block overflow-x-clip" {...presence} transition={reduced ? { duration: 0 } : morph}>{part.text}</motion.span>)}
        </AnimatePresence>
      </span>
    </span>
  )
}

export default AnimatedCounter
