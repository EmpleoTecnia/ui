'use client'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'motion/react'

export type StatusMarkStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled'

export interface StatusMarkProps {
  status?: StatusMarkStatus
  /** De 0 a 1. Si viene con `running`, el anillo muestra progreso en vez de girar. */
  progress?: number
  label?: ReactNode
  /** Color del anillo en pendiente y en curso. Por defecto el del texto. */
  color?: string
  /** Color de listo. Por defecto, derivado del acento de la app. */
  doneColor?: string
  /** Color de falló. Por defecto, derivado del acento de la app. */
  errorColor?: string
  size?: number
  strokeWidth?: number
  dashes?: number
  fontSize?: number
  /** Milisegundos por vuelta cuando gira. */
  spinDuration?: number
  arcLength?: number
  fillOpacity?: number
  /** Tachar la etiqueta al terminar. */
  strike?: boolean
  className?: string
  style?: CSSProperties
}

const CHECK = 'M7.5 12.25 10.5 15.25 16.75 8.75'
const CROSS = 'M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5'
const TEXT: Record<StatusMarkStatus, string> = {
  pending: 'Pendiente',
  running: 'En curso',
  done: 'Listo',
  failed: 'Falló',
  cancelled: 'Cancelado',
}
const IDLE_DASH = 0.3
/** Tonos derivados del acento de la app: misma luz y saturación, cambia el matiz. */
const TONE_OK = 'oklch(from var(--ui-accent) clamp(0.45, l, 0.65) clamp(0.12, c, 0.2) 150)'
const TONE_ERROR = 'oklch(from var(--ui-accent) clamp(0.45, l, 0.65) clamp(0.12, c, 0.2) 25)'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}

/**
 * Un círculo chico que cuenta el estado de una tarea: punteado mientras espera, arco que
 * gira (o barra de progreso) mientras corre, tilde que se dibuja al terminar, cruz si
 * falló. Siempre es el mismo círculo que se transforma, no un cambio de ícono. Si tiene
 * etiqueta, al terminar la tacha.
 */
export function StatusMark({
  status = 'pending', progress, label,
  color = 'currentColor', doneColor = TONE_OK, errorColor = TONE_ERROR,
  size = 20, strokeWidth = 2, dashes = 8, fontSize = 14, spinDuration = 1100, arcLength = 0.68, fillOpacity = 0.06,
  strike = true, className = '', style,
}: StatusMarkProps) {
  const reduce = useReducedMotion()
  const d = useDur()
  const r = 10 - strokeWidth / 2
  const C = 2 * Math.PI * r
  const P = C / Math.max(1, dashes)
  const determinate = status === 'running' && typeof progress === 'number' && Number.isFinite(progress)
  const indeterminate = status === 'running' && !determinate
  const solid = status === 'running' || status === 'done' || status === 'failed'
  const targetArc = indeterminate ? arcLength : determinate ? clamp01(progress as number) : 1

  const ui = { type: 'spring' as const, duration: d * 1.6, bounce: 0 }
  const morph = { duration: d * 1.6, ease: [0.77, 0, 0.175, 1] as [number, number, number, number] }

  const mode = useMotionValue(solid ? 1 : 0)
  const arc = useMotionValue(targetArc)
  const travel = useMotionValue(0)
  const ringRef = useRef<SVGCircleElement>(null)
  const geo = useRef({ C, P })
  geo.current = { C, P }
  const gen = useRef(0)

  const writeDash = () => {
    const g = geo.current
    const m = mode.get()
    const a = arc.get()
    const dash = IDLE_DASH * g.P + (a * g.C - IDLE_DASH * g.P) * m
    const gap = (1 - IDLE_DASH) * g.P + ((1 - a) * g.C - (1 - IDLE_DASH) * g.P) * m
    ringRef.current?.setAttribute('stroke-dasharray', `${Math.max(0, dash)} ${Math.max(0, gap)}`)
  }
  useLayoutEffect(() => {
    writeDash()
    ringRef.current?.setAttribute('stroke-dashoffset', String(travel.get()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [C, P])
  useEffect(() => {
    const offs = [
      mode.on('change', writeDash),
      arc.on('change', writeDash),
      travel.on('change', (v: number) => ringRef.current?.setAttribute('stroke-dashoffset', String(v))),
    ]
    return () => {
      offs.forEach(off => off())
      mode.stop(); arc.stop(); travel.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const g = ++gen.current
    if (reduce) {
      mode.jump(solid ? 1 : 0)
      arc.jump(targetArc)
      travel.jump(0)
      return
    }
    if (mode.get() === 0) arc.jump(targetArc)
    animate(mode, solid ? 1 : 0, morph)
    animate(arc, targetArc, ui)
    if (indeterminate) {
      const t0 = travel.get()
      animate(travel, [t0, t0 - C], { duration: spinDuration / 1000, ease: 'linear', repeat: Infinity })
      return
    }
    const unit = determinate ? C : P
    const to = Math.floor(travel.get() / unit) * unit
    animate(travel, to, ui).then(() => { if (gen.current === g) travel.jump(0) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, determinate, targetArc, reduce, C, P, spinDuration, d])

  const spoken = TEXT[status] + (determinate ? `, ${Math.round(clamp01(progress as number) * 100)}%` : '')
  const hasLabel = label !== undefined && label !== null
  const draw = `${Math.round(d * 1300)}ms`
  const vars = {
    '--sm-size': `${size}px`, '--sm-stroke': strokeWidth, '--sm-color': color, '--sm-done': doneColor, '--sm-error': errorColor,
    '--sm-fill': fillOpacity, '--sm-font': `${fontSize}px`, '--sm-draw': draw, ...style,
  } as CSSProperties

  return (
    <span
      className={`group relative inline-flex items-center align-middle leading-none [gap:calc(var(--sm-size)*0.5)]${className ? ` ${className}` : ''}`}
      data-status={status}
      data-indeterminate={indeterminate ? '' : undefined}
      data-strike={strike ? '' : undefined}
      style={vars}
    >
      <svg
        className="shrink-0 overflow-visible [color:var(--sm-color)] [transition:color_var(--ui-dur)_var(--ui-ease)] group-data-[status=done]:[color:var(--sm-done)] group-data-[status=failed]:[color:var(--sm-error)]"
        viewBox="0 0 24 24" width={size} height={size}
        role={hasLabel ? undefined : 'img'} aria-label={hasLabel ? undefined : spoken} aria-hidden={hasLabel || undefined}
      >
        <circle
          className="[fill:currentColor] [stroke:currentColor] [stroke-width:var(--sm-stroke)] [fill-opacity:0] [stroke-opacity:0] [transition:fill-opacity_var(--ui-dur)_ease,stroke-opacity_var(--ui-dur)_ease] group-data-[status=running]:[stroke-opacity:0.2] group-data-[status=done]:[fill-opacity:var(--sm-fill)] group-data-[status=failed]:[fill-opacity:var(--sm-fill)]"
          cx="12" cy="12" r={r} transform="rotate(-90 12 12)"
        />
        <circle
          ref={ringRef}
          className="fill-none [stroke:currentColor] [stroke-width:var(--sm-stroke)] [stroke-linecap:round] opacity-[0.55] [transition:opacity_var(--ui-dur)_ease] group-data-[status=running]:opacity-100 group-data-[status=done]:opacity-100 group-data-[status=failed]:opacity-100"
          cx="12" cy="12" r={r} transform="rotate(-90 12 12)"
        />
        <path
          className="fill-none [stroke:currentColor] [stroke-width:var(--sm-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1_2] [stroke-dashoffset:1.05] opacity-0 [transition:stroke-dashoffset_var(--ui-dur)_cubic-bezier(0.23,1,0.32,1),opacity_0ms_linear_var(--ui-dur)] group-data-[status=done]:[stroke-dashoffset:0] group-data-[status=done]:opacity-100 group-data-[status=done]:[transition:stroke-dashoffset_var(--sm-draw)_cubic-bezier(0.23,1,0.32,1)_120ms,opacity_0ms_linear_120ms] motion-reduce:[stroke-dashoffset:0] motion-reduce:[transition:opacity_var(--ui-dur)_ease]"
          d={CHECK} pathLength="1"
        />
        <path
          className="fill-none [stroke:currentColor] [stroke-width:var(--sm-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1_2] [stroke-dashoffset:1.05] opacity-0 [transition:stroke-dashoffset_var(--ui-dur)_cubic-bezier(0.23,1,0.32,1),opacity_0ms_linear_var(--ui-dur)] group-data-[status=failed]:[stroke-dashoffset:0] group-data-[status=failed]:opacity-100 group-data-[status=failed]:[transition:stroke-dashoffset_var(--sm-draw)_cubic-bezier(0.23,1,0.32,1)_120ms,opacity_0ms_linear_120ms] group-data-[status=cancelled]:[stroke-dashoffset:0] group-data-[status=cancelled]:opacity-100 group-data-[status=cancelled]:[transition:stroke-dashoffset_var(--sm-draw)_cubic-bezier(0.23,1,0.32,1)_120ms,opacity_0ms_linear_120ms] motion-reduce:[stroke-dashoffset:0] motion-reduce:[transition:opacity_var(--ui-dur)_ease]"
          d={CROSS} pathLength="1"
        />
      </svg>
      {hasLabel ? <span className="sr-only">{spoken}: </span> : null}
      {hasLabel ? (
        <span className="relative leading-[1.25] opacity-[0.65] [color:var(--sm-color)] [font-size:var(--sm-font)] [transition:opacity_var(--ui-dur)_ease] group-data-[status=running]:opacity-100 group-data-[status=done]:opacity-60 group-data-[status=failed]:opacity-100 group-data-[status=cancelled]:opacity-[0.55]">
          {label}
          <span
            className="pointer-events-none absolute inset-x-0 top-1/2 origin-left scale-x-0 bg-current [translate:0_-50%] [height:max(1px,calc(var(--sm-font)/14))] [transition:transform_var(--ui-dur)_cubic-bezier(0.23,1,0.32,1)] group-data-[status=done]:group-data-[strike]:scale-x-100 group-data-[status=done]:group-data-[strike]:[transition:transform_calc(var(--ui-dur)*1.5)_cubic-bezier(0.23,1,0.32,1)_180ms] motion-reduce:scale-x-100! motion-reduce:opacity-0 motion-reduce:[transition:opacity_var(--ui-dur)_ease] motion-reduce:group-data-[status=done]:group-data-[strike]:opacity-100"
            aria-hidden="true"
          />
        </span>
      ) : null}
    </span>
  )
}

export default StatusMark
