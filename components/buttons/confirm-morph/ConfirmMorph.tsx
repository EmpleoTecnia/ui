'use client'
import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref } from 'react'
import { AnimatePresence, animate, motion, useIsPresent, useMotionValue, useReducedMotion, type AnimationPlaybackControls, type Transition, type Variants } from 'motion/react'
import { CircleAlert, LoaderCircle } from 'lucide-react'

/** En qué está el control: en reposo, preguntando, trabajando, terminado o fallido. */
export type ConfirmMorphState = 'idle' | 'confirming' | 'pending' | 'done' | 'error'

export interface ConfirmMorphProps {
  /** El texto en reposo, por ejemplo "Eliminar". */
  label: ReactNode
  /** Un ícono antes del texto en reposo. */
  icon?: ReactNode
  /** La pregunta mientras confirma, por ejemplo "¿Eliminar 3 archivos?". Por defecto, el texto entre signos de pregunta. */
  prompt?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Al lado del spinner mientras `onConfirm` resuelve. */
  pendingLabel?: string
  doneLabel?: string
  errorLabel?: string
  retryLabel?: string
  undoLabel?: string
  /** Al lado del spinner mientras `onUndo` resuelve. */
  undoingLabel?: string
  /** `danger` pinta en rojo el texto en reposo y el botón de confirmar. `neutral` usa el color del texto, para acciones importantes pero reversibles. */
  tone?: 'danger' | 'neutral'
  /** Corre al confirmar. Si devuelve una promesa, muestra la cara "trabajando"; si rechaza, la de error con Reintentar. */
  onConfirm?: () => void | Promise<unknown>
  /** Si está, el resultado ofrece Deshacer. Si devuelve una promesa, muestra "trabajando" mientras corre. */
  onUndo?: () => void | Promise<unknown>
  onCancel?: () => void
  /** Estado controlado. Va con `onStateChange`. */
  state?: ConfirmMorphState
  /** Estado inicial si no es controlado. */
  defaultState?: ConfirmMorphState
  onStateChange?: (state: ConfirmMorphState) => void
  /** Milisegundos antes de que una pregunta sin responder vuelva al reposo. El puntero encima la pausa. 0 la apaga. */
  confirmTimeout?: number
  /** Milisegundos que dura un resultado antes de volver al reposo. El puntero encima lo pausa. 0 lo apaga. */
  resultTimeout?: number
  /** Un clic afuera cancela la pregunta abierta. Por defecto, sí. */
  cancelOnOutsidePress?: boolean
  disabled?: boolean
  className?: string
  /** Recibe el elemento raíz, que además toma el foco mientras la acción corre. */
  ref?: Ref<HTMLDivElement>
}

/** Colores semánticos: del acento toman la luz y la saturación; el matiz no se negocia. */
const semantico = (hue: number) => `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) ${hue})`
const TONE_DANGER = semantico(25)
const TONE_OK = semantico(150)

const TRAVEL = 12
const BLUR_SOFT = 8
type Bezier = [number, number, number, number]
const enter: Bezier = [0.22, 1, 0.36, 1]
const standard: Bezier = [0.2, 0, 0, 1]
/** Resortes expresados como rigidez y amortiguación, así un cambio de destino conserva la velocidad que ya traía. */
const physical = (visualDuration: number, bounce: number): Transition => {
  const root = (2 * Math.PI) / (visualDuration * 1.2)
  return { type: 'spring', stiffness: root * root, damping: 2 * (1 - bounce) * root, mass: 1 }
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
const subscribe = () => () => {}
/** Falso en el servidor y durante la hidratación: el modo reducido nunca cambia el primer render. */
function useReducedFlag() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  return !!useReducedMotion() && hydrated
}

/** Los pasos hacia adelante llegan desde la derecha, la vuelta desde la izquierda; la cara vieja se va para el otro lado, desenfocada, y el ojo lee una sola transformación. */
const faceVariants = (d: number, slide: Transition): Variants => ({
  hidden: (direction: number) => ({ opacity: 0, x: direction * TRAVEL, filter: `blur(${BLUR_SOFT}px)` }),
  shown: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { x: slide, opacity: { duration: d * 1.1, ease: enter, delay: 0.04 }, filter: { duration: d * 1.2, ease: enter, delay: 0.04 } } },
  gone: (direction: number) => ({ opacity: 0, x: direction * -TRAVEL * 0.6, filter: `blur(${BLUR_SOFT}px)`, transition: { x: slide, opacity: { duration: d * 0.65, ease: standard }, filter: { duration: d * 0.65, ease: standard } } }),
})
const fadeVariants = (d: number): Variants => ({ hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: d * 0.8 } }, gone: { opacity: 0, transition: { duration: d * 0.55 } } })

function Face({ id, direction, variants, onSize, children, labelledBy }: { id: ConfirmMorphState; direction: number; variants: Variants; onSize: (id: ConfirmMorphState, width: number) => void; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || !present) return
    // Mide el ancho natural, no el que le deja un contenedor apretado: así el apriete nunca realimenta el resorte.
    const report = () => {
      const flex = node.style.flex
      node.style.flex = 'none'
      const width = node.offsetWidth
      node.style.flex = flex
      onSize(id, width)
    }
    report()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(report)
    observer.observe(node)
    return () => observer.disconnect()
  }, [id, onSize, present])
  // La cara que se va sale del flujo y queda centrada mientras la superficie se estira hacia la siguiente.
  return (
    <motion.div
      ref={ref}
      className={`flex h-full min-w-0 shrink items-center gap-0.5 whitespace-nowrap will-change-[transform,filter] data-[leaving]:pointer-events-none data-[leaving]:absolute data-[leaving]:top-0 data-[leaving]:left-1/2 data-[leaving]:-translate-x-1/2 ${id === 'idle' ? 'rounded-full p-0' : 'px-1'}`}
      data-face={id}
      data-leaving={present ? undefined : ''}
      custom={direction}
      role={labelledBy ? 'group' : undefined}
      aria-labelledby={labelledBy}
      variants={variants}
      initial="hidden"
      animate="shown"
      exit="gone"
      inert={!present || undefined}
    >
      {children}
    </motion.div>
  )
}

/** Un disco verde que aparece con un tilde dibujándose encima, en el momento en que la acción se concreta. */
function Check({ reduced, d }: { reduced: boolean; d: number }) {
  return (
    <svg className="size-[18px] flex-none" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <motion.circle className="fill-(--cm-success)" cx="9" cy="9" r="8" style={{ transformOrigin: '9px 9px' }} initial={reduced ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ scale: physical(d * 1.9, 0.3), opacity: { duration: d * 0.65 } }} />
      <motion.path className="stroke-ui-bg" d="M5.6 9.3 7.8 11.4 12.4 6.7" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: d * 1.55, ease: enter, delay: d * 0.65 }} />
    </svg>
  )
}

const SHADOW_RESTING = '0 1px 2px color-mix(in oklch, var(--ui-ink) 8%, transparent)'
/** Fondo, borde y sombra de la superficie según tono y estado. Peligro: un tinte rojo quieto en reposo que se intensifica al preguntar. */
function surfaceVars(tone: 'danger' | 'neutral', state: ConfirmMorphState, disabled: boolean): CSSProperties {
  let bg = 'var(--ui-surface)'
  let border = 'var(--ui-line)'
  let shadow = SHADOW_RESTING
  if (disabled && state === 'idle') {
    shadow = 'none'
    border = 'color-mix(in oklch, var(--ui-line) 60%, transparent)'
  } else if (tone === 'danger' && state === 'confirming') {
    bg = 'color-mix(in oklch, var(--cm-danger) 10%, var(--ui-surface))'
    border = 'color-mix(in oklch, var(--cm-danger) 34%, var(--ui-line))'
    shadow = '0 4px 14px color-mix(in oklch, var(--cm-danger) 12%, transparent)'
  } else if (tone === 'danger' && (state === 'idle' || state === 'error')) {
    bg = 'color-mix(in oklch, var(--cm-danger) 5%, var(--ui-surface))'
    border = 'color-mix(in oklch, var(--cm-danger) 18%, var(--ui-line))'
    shadow = 'none'
  }
  return { '--cm-bg': bg, '--cm-border': border, '--cm-shadow': shadow } as CSSProperties
}

const SMALL = 'inline-flex h-7 flex-none cursor-pointer items-center rounded-full px-[11px] font-medium outline-none transition-[background-color,color,scale] duration-(--ui-dur) ease-ui active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100'
const SECONDARY = `${SMALL} bg-transparent hover:bg-[color-mix(in_oklch,var(--ui-ink)_7%,transparent)] hover:text-ui-ink focus-visible:bg-[color-mix(in_oklch,var(--ui-ink)_8%,transparent)] focus-visible:text-ui-ink`
const PRIMARY = {
  neutral: `${SMALL} bg-ui-ink text-ui-bg hover:bg-[color-mix(in_oklch,var(--ui-ink)_86%,var(--ui-bg))] focus-visible:bg-[color-mix(in_oklch,var(--ui-ink)_86%,var(--ui-bg))]`,
  danger: `${SMALL} bg-(--cm-danger) text-ui-bg shadow-[0_1px_2px_color-mix(in_oklch,var(--cm-danger)_30%,transparent)] hover:bg-[color-mix(in_oklch,var(--cm-danger)_88%,var(--ui-ink))] focus-visible:bg-[color-mix(in_oklch,var(--cm-danger)_86%,var(--ui-ink))]`,
}
const TRIGGER = {
  neutral: 'text-ui-ink hover:bg-[color-mix(in_oklch,var(--ui-ink)_5%,transparent)] focus-visible:bg-[color-mix(in_oklch,var(--ui-ink)_6%,transparent)]',
  danger: 'text-(--cm-danger) hover:bg-[color-mix(in_oklch,var(--cm-danger)_8%,transparent)] focus-visible:bg-[color-mix(in_oklch,var(--cm-danger)_9%,transparent)]',
}

/**
 * Un botón para acciones destructivas o importantes que pregunta en el lugar. Al tocarlo, la misma píldora se
 * transforma en una pregunta con Cancelar y Eliminar, después en un spinner, y al final en un resultado con Deshacer.
 * El ancho va en resorte a cada cara, así nada alrededor salta. Escape, un clic afuera o el tiempo lo devuelven al
 * reposo. Para donde un diálogo sería pesado: borrar una selección, quitar a alguien, descartar un borrador.
 */
export function ConfirmMorph({
  label, icon, prompt, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', pendingLabel = 'Eliminando…', doneLabel = 'Eliminado', errorLabel = 'No se pudo',
  retryLabel = 'Reintentar', undoLabel = 'Deshacer', undoingLabel = 'Restableciendo…', tone = 'danger', onConfirm, onUndo, onCancel,
  state: stateProp, defaultState = 'idle', onStateChange, confirmTimeout = 6000, resultTimeout = 5000, cancelOnOutsidePress = true, disabled = false, className, ref,
}: ConfirmMorphProps) {
  const reduced = useReducedFlag()
  const d = useDur()
  const uid = useId()
  const promptId = `${uid}-prompt`
  const rootRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, [])

  const springs = useMemo(() => ({ grow: physical(d * 2.4, 0.18), shrink: physical(d * 1.9, 0), slide: physical(d * 2, 0.06) }), [d])
  const variants = useMemo(() => (reduced ? fadeVariants(d) : faceVariants(d, springs.slide)), [reduced, d, springs])

  const [inner, setInner] = useState<ConfirmMorphState>(defaultState)
  const state = stateProp ?? inner
  const [direction, setDirection] = useState(1)
  const [working, setWorking] = useState<'confirm' | 'undo'>('confirm')
  const [announcement, setAnnouncement] = useState('')
  const [pressed, setPressed] = useState(false)

  const live = useRef({ state, onStateChange, controlled: stateProp !== undefined })
  useLayoutEffect(() => { live.current = { state, onStateChange, controlled: stateProp !== undefined } })
  const pendingFocus = useRef(false)
  const run = useRef(0)

  const go = useCallback((next: ConfirmMorphState) => {
    const current = live.current.state
    if (next === current) return
    const root = rootRef.current
    // El foco sigue al control entre caras, pero sólo si ya estaba adentro: un tiempo vencido nunca roba el foco de otro lado.
    pendingFocus.current = !!root && (root.contains(document.activeElement) || document.activeElement === document.body)
    // Cada paso va hacia adelante salvo la vuelta al reposo, que viene desde la izquierda.
    setDirection(next === 'idle' ? -1 : 1)
    if (!live.current.controlled) setInner(next)
    live.current.state = next
    live.current.onStateChange?.(next)
  }, [])

  const toIdle = useCallback(() => { run.current++; go('idle') }, [go])

  const perform = useCallback(async (kind: 'confirm' | 'undo') => {
    const handler = kind === 'confirm' ? onConfirm : onUndo
    const token = ++run.current
    setWorking(kind)
    let result: void | Promise<unknown> | undefined
    try { result = handler?.() } catch { go('error'); setAnnouncement(errorLabel); return }
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      go('pending')
      setAnnouncement(kind === 'confirm' ? pendingLabel : undoingLabel)
      try { await result } catch {
        if (token !== run.current) return
        go('error')
        setAnnouncement(errorLabel)
        return
      }
      if (token !== run.current) return
    }
    if (kind === 'undo') { go('idle'); setAnnouncement('Deshecho'); return }
    go('done')
    setAnnouncement(onUndo ? `${doneLabel}. Podés deshacer.` : doneLabel)
  }, [doneLabel, errorLabel, go, onConfirm, onUndo, pendingLabel, undoingLabel])

  const cancel = useCallback(() => { onCancel?.(); toIdle(); setAnnouncement('Cancelado') }, [onCancel, toIdle])
  const expire = useRef(() => {})
  useLayoutEffect(() => { expire.current = () => { if (live.current.state === 'confirming') cancel(); else toIdle() } })

  /* La forma: una superficie cuyo ancho va en resorte a la cara actual. En reposo es auto, así se ve bien antes de hidratar. */
  const width = useMotionValue<number | 'auto'>('auto')
  const target = useRef(0)
  const flight = useRef(0)
  const onFaceSize = useCallback((id: ConfirmMorphState, w: number) => {
    if (id !== live.current.state || Math.abs(w - target.current) < 0.5) return
    const from = target.current
    target.current = w
    if (!from || reduced) { width.jump('auto'); return }
    if (width.get() === 'auto') width.jump(from)
    const token = ++flight.current
    animate(width, w, w > from ? springs.grow : springs.shrink).then(() => { if (token === flight.current) width.jump('auto') })
  }, [reduced, width, springs])

  /* El tiempo corre como un reloj invisible. El puntero apoyado en el control lo frena; una pestaña oculta también. */
  const drain = useMotionValue(1)
  const clock = useRef<AnimationPlaybackControls | null>(null)
  const holds = useRef({ hover: false, hidden: false })
  const timeout = state === 'confirming' ? confirmTimeout : state === 'done' || state === 'error' ? resultTimeout : 0
  const sync = useCallback(() => {
    const control = clock.current
    if (!control) return
    const held = holds.current.hover || holds.current.hidden
    if (held) control.pause(); else control.play()
  }, [])
  useEffect(() => {
    if (!timeout) return
    drain.jump(1)
    const control = animate(drain, 0, { duration: timeout / 1000, ease: 'linear' })
    clock.current = control
    control.then(() => { if (clock.current === control) { clock.current = null; expire.current() } })
    sync()
    return () => { if (clock.current === control) clock.current = null; control.stop() }
  }, [drain, state, sync, timeout])
  useEffect(() => {
    const onVisibility = () => { holds.current.hidden = document.hidden; sync() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [sync])

  // Un clic afuera responde que no.
  useEffect(() => {
    if (state !== 'confirming' || !cancelOnOutsidePress) return
    const down = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) cancel() }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [cancel, cancelOnOutsidePress, state])

  // El foco cae en la opción segura: Cancelar mientras pregunta, Deshacer o Reintentar en un resultado, la raíz mientras trabaja, el botón en reposo.
  useLayoutEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    const root = rootRef.current
    if (!root) return
    const face = root.querySelector<HTMLElement>(`[data-face="${state}"]`)
    const autofocus = face?.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)')
    ;(autofocus ?? root).focus({ preventScroll: true })
  }, [state])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    if (state === 'confirming') { event.preventDefault(); event.stopPropagation(); cancel() }
    else if (state === 'done' || state === 'error') { event.preventDefault(); event.stopPropagation(); toIdle() }
  }

  const shownPrompt = prompt ?? (typeof label === 'string' ? `¿${label}?` : <>¿{label}?</>)
  const secondaryTone = state === 'done' || state === 'error' ? 'text-ui-ink' : tone === 'danger' && state === 'confirming' ? 'text-[color-mix(in_oklch,var(--cm-danger)_30%,var(--ui-ink-soft))]' : 'text-ui-ink-soft'
  const status = 'inline-flex items-center gap-[7px] font-medium tabular-nums [&>svg]:flex-none'
  const face = (() => {
    switch (state) {
      case 'confirming': return (
        <>
          <span id={promptId} className="max-w-64 min-w-[3ch] shrink overflow-hidden pr-1.5 pl-[11px] leading-[1.3] font-medium text-ellipsis text-ui-ink tabular-nums">{shownPrompt}</span>
          <button type="button" className={`${SECONDARY} ${secondaryTone}`} data-autofocus onClick={cancel}>{cancelLabel}</button>
          <button type="button" className={PRIMARY[tone]} onClick={() => void perform('confirm')}>{confirmLabel}</button>
        </>
      )
      case 'pending': return (
        <span className={`${status} pr-4 pl-3.5 text-ui-ink-soft`}>
          <LoaderCircle className="animate-spin [animation-duration:0.7s] motion-reduce:[animation-duration:1.6s]" size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{working === 'undo' ? undoingLabel : pendingLabel}</span>
        </span>
      )
      case 'done': return (
        <>
          <span className={`${status} ${onUndo ? 'pr-2' : 'pr-3'} pl-2.5 text-ui-ink`}><Check reduced={reduced} d={d} /><span className="leading-[1.3]">{doneLabel}</span></span>
          {onUndo && <button type="button" className={`${SECONDARY} ${secondaryTone}`} data-autofocus onClick={() => void perform('undo')}>{undoLabel}</button>}
        </>
      )
      case 'error': return (
        <>
          <span className={`${status} pr-2 pl-2.5 text-ui-ink`}><CircleAlert className="text-(--cm-danger)" size={16} strokeWidth={1.75} aria-hidden="true" /><span className="leading-[1.3]">{errorLabel}</span></span>
          <button type="button" className={`${SECONDARY} ${secondaryTone}`} data-autofocus onClick={() => void perform(working)}>{retryLabel}</button>
        </>
      )
      default: return (
        <button
          type="button"
          className={`inline-flex h-full cursor-pointer items-center gap-2 rounded-[inherit] bg-transparent pr-[15px] pl-[13px] font-medium outline-none transition-[background-color,color] duration-(--ui-dur) ease-ui disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ui-ink-muted motion-reduce:transition-none ${TRIGGER[tone]}`}
          data-autofocus
          disabled={disabled}
          onClick={() => { setAnnouncement(typeof shownPrompt === 'string' ? shownPrompt : ''); go('confirming') }}
          onPointerDown={() => { if (!disabled) setPressed(true) }}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
        >
          {icon && <span className={`grid size-4 place-items-center [&>svg]:size-4 ${disabled ? 'opacity-70' : ''}`} aria-hidden="true">{icon}</span>}
          <span>{label}</span>
        </button>
      )
    }
  })()

  const vars = { '--cm-danger': TONE_DANGER, '--cm-success': TONE_OK, ...surfaceVars(tone, state, disabled) } as CSSProperties

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex max-w-full min-w-0 align-middle font-ui-text text-sm leading-none tracking-[-0.005em] text-ui-ink outline-none [-webkit-tap-highlight-color:transparent]${className ? ` ${className}` : ''}`}
      style={vars}
      data-state={state}
      data-tone={tone}
      data-disabled={disabled || undefined}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      aria-busy={state === 'pending' || undefined}
      onPointerEnter={() => { holds.current.hover = true; sync() }}
      onPointerLeave={() => { holds.current.hover = false; sync() }}
      onPointerCancel={() => { holds.current.hover = false; sync() }}
    >
      {/* Una sola píldora para todos los estados. La cara actual va en el flujo y se centra; el borde es una capa encima, así nunca cambia una medida. */}
      <motion.div
        className="relative flex h-9 max-w-full justify-center overflow-clip rounded-full bg-(--cm-bg) shadow-(--cm-shadow) transition-[background-color,box-shadow,scale] duration-[calc(var(--ui-dur)*1.6)] ease-ui after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-(--cm-border) after:transition-[border-color] after:duration-[calc(var(--ui-dur)*1.6)] after:ease-ui after:content-[''] data-[pressed]:scale-[0.96] data-[pressed]:duration-[calc(var(--ui-dur)*0.5)] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100"
        data-pressed={pressed && state === 'idle' ? '' : undefined}
        style={{ width }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <Face key={state} id={state} direction={direction} variants={variants} onSize={onFaceSize} labelledBy={state === 'confirming' ? promptId : undefined}>{face}</Face>
        </AnimatePresence>
      </motion.div>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
    </div>
  )
}

export default ConfirmMorph
