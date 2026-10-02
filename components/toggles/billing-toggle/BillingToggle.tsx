'use client'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from 'motion/react'
import { AnimatedCounter } from './AnimatedCounter'

export interface BillingToggleOption {
  value: string
  label: string
  /** Nota corta de ahorro, p. ej. "Ahorrá 20%". */
  badge?: string
  /** Texto de la nota cuando esta opción está elegida, p. ej. "Ahorrás $48". Por defecto, `badge`. */
  activeBadge?: string
}

export interface BillingToggleProps {
  value: string
  onValueChange: (value: string) => void
  options?: BillingToggleOption[]
  /** Nombre accesible del grupo. */
  label?: string
  size?: 'md' | 'lg'
  className?: string
}

type Bezier = [number, number, number, number]
const enter: Bezier = [0.22, 1, 0.36, 1]
const standard: Bezier = [0.2, 0, 0, 1]
const BLUR_SUBTLE = 4
/** Verde semántico: del acento de la app toma la luz y la saturación; el matiz es fijo. "Ahorrás" es una buena noticia. */
const TONE_OK = 'oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) 150)'

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}

export const defaultBillingOptions: BillingToggleOption[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual', badge: 'Ahorrá 20%', activeBadge: 'Ahorrás 20%' },
]

const swap = (d: number): Variants => ({
  hidden: { opacity: 0, y: '0.45em', filter: `blur(${BLUR_SUBTLE}px)` },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: d * 1.6, ease: enter } },
  gone: { opacity: 0, y: '-0.45em', filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d, ease: standard } },
})
const still = (d: number): Variants => ({
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: d } },
  gone: { opacity: 0, transition: { duration: 0 } },
})

/**
 * Texto que se cambia en el lugar. Todos los candidatos ocupan la misma celda, así la caja siempre
 * mide lo que el más largo y nada alrededor se mueve cuando cambia el texto.
 */
function StableSwap({ text, candidates, variants, className }: { text: string; candidates: string[]; variants: Variants; className?: string }) {
  return (
    <span className={`relative inline-grid justify-items-center overflow-y-clip [overflow-clip-margin:2px]${className ? ` ${className}` : ''}`}>
      {[...new Set(candidates)].map(candidate => <span key={candidate} className="invisible [grid-area:1/1]" aria-hidden="true">{candidate}</span>)}
      <AnimatePresence initial={false}>
        <motion.span key={text} className="inline-block [grid-area:1/1]" variants={variants} initial="hidden" animate="shown" exit="gone">{text}</motion.span>
      </AnimatePresence>
    </span>
  )
}

type Thumb = { x: number; width: number }

/**
 * Un interruptor de período de facturación. Un solo pulgar se desliza entre las opciones con un resorte
 * amortiguado (llega sin rebote), y la nota de ahorro de la opción más barata se tiñe de verde y se
 * reescribe en el lugar cuando la elegís.
 */
export function BillingToggle({ value, onValueChange, options = defaultBillingOptions, label = 'Período de facturación', size = 'md', className }: BillingToggleProps) {
  const reduced = !!useReducedMotion()
  const d = useDur()
  const rootRef = useRef<HTMLDivElement>(null)
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const [thumb, setThumb] = useState<Thumb | null>(null)
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const lg = size === 'lg'
  /** Amortiguado crítico: el pulgar se desliza y aterriza sin pasarse. */
  const glide = useMemo<Transition>(() => ({ type: 'spring', visualDuration: d * 1.9, bounce: 0 }), [d])
  const variants = useMemo(() => (reduced ? still(d) : swap(d)), [d, reduced])

  const measure = useCallback(() => {
    const node = refs.current[selectedIndex]
    if (!node) return
    setThumb(current => (current && current.x === node.offsetLeft && current.width === node.offsetWidth ? current : { x: node.offsetLeft, width: node.offsetWidth }))
  }, [selectedIndex])

  useLayoutEffect(() => {
    measure()
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [measure])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : step ? (index + step + options.length) % options.length : -1
    if (target < 0) return
    event.preventDefault()
    onValueChange(options[target].value)
    refs.current[target]?.focus()
  }

  const vars = {
    '--bt-h': lg ? '42px' : '34px',
    '--bt-pad': lg ? '4px' : '3px',
    '--bt-ok': TONE_OK,
    '--bt-thumb-shadow': '0 0 0 1px var(--ui-line), 0 1px 2px color-mix(in oklch, var(--ui-ink) 6%, transparent), 0 2px 6px color-mix(in oklch, var(--ui-ink) 4%, transparent)',
  } as CSSProperties
  const thumbClass = 'pointer-events-none absolute -z-10 rounded-full bg-ui-surface shadow-(--bt-thumb-shadow)'

  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-label={label}
      className={`relative isolate inline-flex max-w-full items-center rounded-full border border-ui-line bg-ui-surface-2 p-(--bt-pad) font-ui-text leading-none ${lg ? 'text-base' : 'text-sm'}${className ? ` ${className}` : ''}`}
      data-size={size}
      style={vars}
    >
      {thumb ? (
        <motion.span
          className={`${thumbClass} top-(--bt-pad) bottom-(--bt-pad) left-0 will-change-[transform,width]`}
          aria-hidden="true"
          initial={false}
          animate={{ x: thumb.x, width: thumb.width }}
          transition={reduced ? { duration: 0 } : glide}
        />
      ) : null}
      {options.map((option, index) => {
        const selected = index === selectedIndex
        const badgeText = selected ? option.activeBadge ?? option.badge : option.badge
        const candidates = [option.badge, option.activeBadge].filter((text): text is string => !!text)
        const padding = badgeText ? (lg ? 'pl-[18px] pr-1.5' : 'pl-3.5 pr-[5px]') : lg ? 'px-[18px]' : 'px-3.5'
        return (
          <button
            key={option.value}
            ref={node => { refs.current[index] = node }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`group relative inline-flex h-(--bt-h) min-w-0 items-center rounded-full border-0 bg-transparent whitespace-nowrap transition-colors duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-accent ${padding} ${selected ? 'cursor-default text-ui-ink' : 'cursor-pointer text-ui-ink-muted hover:text-ui-ink-soft'}`}
            data-selected={selected || undefined}
            onClick={() => onValueChange(option.value)}
            onKeyDown={event => onKeyDown(event, index)}
          >
            {selected && !thumb ? <span className={`${thumbClass} inset-0`} aria-hidden="true" /> : null}
            <span className={`relative inline-flex items-center gap-2 transition-transform duration-(--ui-dur) ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none ${selected ? '' : 'group-active:scale-[.97]'}`}>
              <span className="font-medium">{option.label}</span>
              {badgeText ? (
                <span
                  className={`inline-flex h-[calc(var(--bt-h)_-_10px)] items-center rounded-full px-2 text-xs font-medium tabular-nums transition-colors duration-[calc(var(--ui-dur)*1.6)] ease-ui motion-reduce:transition-none ${selected ? 'bg-[color-mix(in_oklch,var(--bt-ok)_14%,transparent)] text-[color-mix(in_oklch,var(--bt-ok)_88%,var(--ui-ink))]' : 'bg-[color-mix(in_oklch,var(--ui-ink)_6%,transparent)] text-ui-ink-soft'}`}
                  data-active={selected || undefined}
                >
                  <StableSwap text={badgeText} candidates={candidates} variants={variants} />
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export interface BillingPriceProps {
  amount: number
  currency?: string
  /** Período después del precio, p. ej. "/ mes". Se cambia en el lugar cuando cambia. */
  period?: string
  /** Precio anterior, tachado cuando es mayor que `amount`. */
  was?: number
  decimals?: number
  /** Locale del formato de los números. Fijo para que el servidor y el navegador coincidan. */
  locale?: string
  className?: string
}

/** Un precio que rueda hasta el monto nuevo. El precio anterior y el período abren y cierran su ancho, así nada al lado salta. */
export function BillingPrice({ amount, currency = '$', period, was, decimals = 0, locale = 'es-AR', className }: BillingPriceProps) {
  const reduced = !!useReducedMotion()
  const d = useDur()
  const showWas = was !== undefined && was > amount
  const periodRef = useRef<HTMLSpanElement>(null)
  const [periodWidth, setPeriodWidth] = useState<number | null>(null)
  const clip = useMemo<Transition>(() => ({ type: 'spring', visualDuration: d * 2, bounce: 0 }), [d])
  const variants = useMemo(() => (reduced ? still(d) : swap(d)), [d, reduced])
  const wasText = was === undefined ? '' : new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, numberingSystem: 'latn' }).format(was)

  useLayoutEffect(() => {
    const sizer = periodRef.current
    if (sizer) setPeriodWidth(sizer.offsetWidth)
  }, [period])

  return (
    <span className={`inline-flex min-w-0 flex-wrap items-end gap-x-2.5 gap-y-1 font-ui-text${className ? ` ${className}` : ''}`}>
      <span className="inline-flex items-start font-ui-display text-3xl leading-none font-normal text-ui-ink tabular-nums">
        <span className="mt-[.12em] mr-[.04em] text-[.55em] text-ui-ink-soft">{currency}</span>
        <AnimatedCounter value={amount} decimals={decimals} locale={locale} d={d} />
      </span>
      <span className="inline-flex items-baseline pb-[.3em] text-sm leading-normal whitespace-nowrap text-ui-ink-muted">
        <AnimatePresence initial={false}>
          {showWas ? (
            <motion.span
              key="was"
              className="inline-block overflow-x-clip"
              initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, width: 0, transition: { ...clip, opacity: { duration: d } } }}
              transition={reduced ? { duration: d } : { ...clip, opacity: { duration: d * 1.6, ease: enter } }}
            >
              <del className="inline-block pr-1.5 text-ui-ink-muted tabular-nums [text-decoration-thickness:1px]">{currency}{wasText}</del>
            </motion.span>
          ) : null}
        </AnimatePresence>
        {period ? (
          <motion.span
            className="relative inline-block overflow-x-clip [overflow-clip-margin:2px]"
            initial={false}
            animate={periodWidth === null ? undefined : { width: periodWidth }}
            transition={reduced ? { duration: 0 } : clip}
          >
            <span ref={periodRef} className="invisible inline-block" aria-hidden="true">{period}</span>
            <AnimatePresence initial={false}>
              <motion.span key={period} className="absolute top-0 left-0 inline-block" variants={variants} initial="hidden" animate="shown" exit="gone">{period}</motion.span>
            </AnimatePresence>
          </motion.span>
        ) : null}
      </span>
    </span>
  )
}

export default BillingToggle
