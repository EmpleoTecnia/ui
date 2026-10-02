'use client'
import { useEffect, useEffectEvent, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls, type MotionValue, type TargetAndTransition } from 'motion/react'
import { Trash2 } from 'lucide-react'

export interface HoldToConfirmProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick' | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'onAnimationEnd'> {
  /** La instrucción y la acción, por ejemplo "Mantené apretado para eliminar". */
  label: string
  /** Lo que dice cuando terminó, por ejemplo "Eliminado". */
  confirmedLabel?: string
  /** Se llama una vez, cuando se completó la presión. */
  onConfirm: () => void
  /** Cuánto hay que mantener, en milisegundos. */
  duration?: number
  icon?: ReactNode
  tone?: 'danger' | 'neutral'
  /** Controla el estado de terminado. Volvelo a `false` para reiniciar el botón; dejalo sin definir para que el botón se maneje solo. */
  confirmed?: boolean
  /** Avisa cuando empieza y termina una presión, para pistas alrededor como "Seguí apretando". */
  onHoldChange?: (holding: boolean) => void
}

/** Colores semánticos: del acento toman la luz y la saturación; el matiz no se negocia. */
const semantico = (hue: number) => `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) ${hue})`
const TONE_DANGER = semantico(25)

const enter: [number, number, number, number] = [0.22, 1, 0.36, 1]
const standard: [number, number, number, number] = [0.2, 0, 0, 1]
const BLUR_SOFT = 8
const BLUR_SUBTLE = 4
const rest: TargetAndTransition = { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
const textIn: TargetAndTransition = { opacity: 0, y: '0.3em', filter: `blur(${BLUR_SOFT}px)` }
const iconIn: TargetAndTransition = { opacity: 0, scale: 0.6, filter: `blur(${BLUR_SUBTLE}px)` }
const fadeIn: TargetAndTransition = { opacity: 0 }

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}

/** El tilde se dibuja desde el trazo corto, como lo haría una mano. */
function DrawnCheck({ reduced, d }: { reduced: boolean; d: number }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="M4 12.5l5 5L20 6.5" initial={reduced ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ pathLength: { duration: d * 1.8, ease: enter, delay: 0.08 }, opacity: { duration: 0.05, delay: 0.08 } }} />
    </svg>
  )
}

type FaceProps = { icon: ReactNode; text: string; done: boolean; width: MotionValue<number | 'auto'>; reduced: boolean; d: number; measure?: (node: HTMLSpanElement | null) => void }

/** Ícono y texto. El botón lo dibuja dos veces: una sobre la superficie y otra adentro del relleno, así el texto cambia de color justo en el borde del relleno. */
function Face({ icon, text, done, width, reduced, d, measure }: FaceProps) {
  const snappy = { type: 'spring' as const, duration: d * 1.4, bounce: 0.1 }
  /** La escala va en resorte; opacidad y desenfoque en curva, así el desenfoque nunca pasa de cero. */
  const iconEnter = { ...snappy, opacity: { duration: d, ease: enter }, filter: { duration: d, ease: enter } }
  const textOut: TargetAndTransition = { opacity: 0, y: '-0.3em', filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d * 0.8, ease: standard } }
  const iconOut: TargetAndTransition = { ...iconIn, transition: { duration: d * 0.8, ease: standard } }
  const fadeOut: TargetAndTransition = { opacity: 0, transition: { duration: d * 0.55 } }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="grid size-[18px] flex-none place-items-center">
        <AnimatePresence initial={false}>
          <motion.span key={done ? 'done' : 'idle'} className="grid [grid-area:1/1] place-items-center [&>svg]:size-[18px]" initial={reduced ? fadeIn : iconIn} animate={rest} exit={reduced ? fadeOut : iconOut} transition={reduced ? { duration: d * 0.8 } : iconEnter}>
            {done ? <DrawnCheck reduced={reduced} d={d} /> : icon}
          </motion.span>
        </AnimatePresence>
      </span>
      {/* Recorta el texto saliente mientras el marco se angosta, con lugar para la subida y el desenfoque. */}
      <motion.span className="relative inline-flex min-w-0 [clip-path:inset(-0.6em_-3px)]" style={{ width }}>
        {measure && <span ref={measure} className="pointer-events-none invisible absolute top-0 left-0 whitespace-nowrap">{text}</span>}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={text} className="block whitespace-nowrap" initial={reduced ? fadeIn : textIn} animate={rest} exit={reduced ? fadeOut : textOut} transition={{ duration: reduced ? d * 0.8 : d * 1.2, ease: enter }}>{text}</motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  )
}

/** El marco del texto va en resorte al ancho del texto nuevo, así el botón se transforma en vez de saltar. Una fuente tardía o un reflow lo siguen al instante. */
function useLabelWidth(reduced: boolean, d: number) {
  const width = useMotionValue<number | 'auto'>('auto')
  const [node, setNode] = useState<HTMLSpanElement | null>(null)
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return
    let lastText: string | null = null
    let sizing: AnimationPlaybackControls | null = null
    const observer = new ResizeObserver(([entry]) => {
      // El ancho de layout, no el pintado: el texto de terminado se mide mientras el botón apretado todavía está achicado.
      const next = entry?.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth
      const text = node.textContent
      const morph = lastText !== null && lastText !== text && !reduced && typeof width.get() === 'number'
      lastText = text
      sizing?.stop()
      if (morph) sizing = animate(width, next, { type: 'spring', duration: d * 1.8, bounce: 0.15 })
      else width.jump(next)
    })
    observer.observe(node)
    return () => { observer.disconnect(); sizing?.stop() }
  }, [node, reduced, width, d])
  return [width, setNode] as const
}

/**
 * Un botón que confirma sólo si se lo mantiene apretado, para acciones destructivas o difíciles de deshacer donde un toque
 * de más no puede contar. Un relleno avanza mientras se aprieta; soltar antes lo rebobina con un resorte, y completarlo
 * transforma el texto y el ícono en el estado de terminado. Con teclado se mantiene Espacio o Enter. Si hace falta leer las
 * consecuencias antes, va un diálogo; esto es para cuando la consecuencia ya está a la vista.
 */
export function HoldToConfirm({ label, confirmedLabel = 'Listo', onConfirm, duration = 1200, icon = <Trash2 strokeWidth={1.75} />, tone = 'danger', confirmed, onHoldChange, className, disabled, style, ...props }: HoldToConfirmProps) {
  const reduced = useReducedMotion() ?? false
  const d = useDur()
  const hintId = useId()
  const [ownDone, setOwnDone] = useState(false)
  const [completions, setCompletions] = useState(0)
  const done = confirmed ?? ownDone
  const [holding, setHolding] = useState(false)
  const progress = useMotionValue(0)
  const scale = useMotionValue(1)
  const clipPath = useTransform(progress, value => `inset(0 ${((1 - Math.min(1, Math.max(0, value))) * 100).toFixed(3)}% 0 0)`)
  const [width, measure] = useLabelWidth(reduced, d)
  const source = useRef<'pointer' | 'key' | null>(null)
  const pointerType = useRef('mouse')
  const fill = useRef<AnimationPlaybackControls | null>(null)
  const press = useRef<AnimationPlaybackControls | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const text = done ? confirmedLabel : label
  const seconds = (duration / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })
  const snappy = { type: 'spring' as const, duration: d * 1.4, bounce: 0.1 }
  const smooth = { type: 'spring' as const, duration: d * 2.2, bounce: 0 }

  function pressTo(pressed: boolean) {
    press.current?.stop()
    if (reduced) { scale.jump(1); return }
    const depth = (button.current?.offsetWidth ?? 0) > 220 ? 0.985 : 0.97
    press.current = animate(scale, pressed ? depth : 1, snappy)
  }

  function rewind() {
    fill.current?.stop()
    if (reduced) progress.jump(0)
    else fill.current = animate(progress, 0, { ...smooth, velocity: 0 })
  }

  function stopHolding() {
    source.current = null
    setHolding(false)
    onHoldChange?.(false)
    pressTo(false)
  }

  function complete() {
    if (!source.current) return
    stopHolding()
    if (pointerType.current === 'touch') navigator.vibrate?.(12)
    setOwnDone(true)
    setCompletions(count => count + 1)
    onConfirm()
  }

  /** Arranca o retoma el relleno desde donde esté: volver a apretar enseguida después de soltar sigue en vez de empezar de cero. */
  function begin(from: 'pointer' | 'key') {
    if (done || disabled || source.current) return
    source.current = from
    setHolding(true)
    onHoldChange?.(true)
    pressTo(true)
    fill.current?.stop()
    fill.current = animate(progress, 1, { duration: ((1 - progress.get()) * duration) / 1000, ease: 'linear', onComplete: complete })
  }

  function release() {
    if (!source.current) return
    stopHolding()
    rewind()
  }

  // Un reinicio rebobina el relleno mientras el texto vuelve; una confirmación que el padre rechazó también rebobina.
  const syncFill = useEffectEvent(() => {
    if (done && progress.get() < 1 && !source.current) { fill.current?.stop(); if (reduced) progress.jump(1); else fill.current = animate(progress, 1, smooth) }
    if (!done && progress.get() > 0 && !source.current) rewind()
  })
  useEffect(() => { syncFill() }, [done, completions])
  useEffect(() => () => { fill.current?.stop(); press.current?.stop() }, [])

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return
    pointerType.current = event.pointerType
    event.currentTarget.setPointerCapture(event.pointerId)
    begin('pointer')
  }
  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (source.current !== 'pointer') return
    // Deslizar bien afuera del botón cancela, como una presión nativa.
    const box = event.currentTarget.getBoundingClientRect()
    const slack = 24
    if (event.clientX < box.left - slack || event.clientX > box.right + slack || event.clientY < box.top - slack || event.clientY > box.bottom + slack) release()
  }
  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    if (!event.repeat) begin('key')
  }
  function onKeyUp(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    if (source.current === 'key') release()
  }

  const vars = {
    '--hold-ink': tone === 'danger' ? TONE_DANGER : 'var(--ui-ink)',
    '--hold-fill': tone === 'danger' ? TONE_DANGER : 'var(--ui-ink)',
    '--hold-on-fill': 'var(--ui-bg)',
    '--hold-border': tone === 'danger' ? `color-mix(in oklch, ${TONE_DANGER} 32%, var(--ui-line))` : 'var(--ui-ink-muted)',
    ...style,
  } as CSSProperties

  // El botón abraza su texto; el relleno es una segunda copia invertida de la cara, revelada con clip-path, así el texto cambia de color justo en el borde.
  return (
    <>
      <motion.button
        {...props}
        ref={button}
        type="button"
        className={`relative inline-flex min-h-10 cursor-pointer touch-manipulation items-center justify-center rounded-ui border border-(--hold-border) bg-ui-surface px-5 font-ui-text text-sm leading-normal font-medium text-(--hold-ink) select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] transition-[background-color,border-color,opacity] duration-(--ui-dur) ease-ui hover:bg-[color-mix(in_oklch,var(--hold-fill)_6%,var(--ui-surface))] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ui-accent aria-disabled:cursor-default disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-ui-surface motion-reduce:transition-none${className ? ` ${className}` : ''}`}
        data-tone={tone}
        data-state={done ? 'done' : holding ? 'holding' : 'idle'}
        disabled={disabled}
        aria-disabled={done || undefined}
        aria-label={text}
        aria-describedby={done ? undefined : hintId}
        style={{ scale, ...vars }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={release}
        onContextMenu={event => event.preventDefault()}
      >
        <Face icon={icon} text={text} done={done} width={width} reduced={reduced} d={d} measure={measure} />
        {/* Tapa también el borde y conserva sus esquinas redondeadas; el recorte sólo corta un borde recto adelante. */}
        <motion.span className="pointer-events-none absolute -inset-px flex items-center justify-center rounded-ui bg-(--hold-fill) text-(--hold-on-fill)" style={{ clipPath }} aria-hidden="true">
          <Face icon={icon} text={text} done={done} width={width} reduced={reduced} d={d} />
        </motion.span>
      </motion.button>
      <span id={hintId} className="sr-only">{`Mantené apretado ${seconds} segundos para confirmar. Con teclado, mantené Espacio o Enter.`}</span>
      <span className="sr-only" role="status">{done ? confirmedLabel : ''}</span>
    </>
  )
}

export default HoldToConfirm
