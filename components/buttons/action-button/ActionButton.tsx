'use client'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition, type Variants } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { TextMorph } from './TextMorph'

export type ActionButtonState = 'idle' | 'pending' | 'success' | 'error'

export interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart'> {
  /** La acción en reposo, por ejemplo "Guardar". */
  label: string
  /** Mientras corre `onAction`. */
  pendingLabel?: string
  /** Cuando `onAction` resolvió. */
  successLabel?: string
  /** Cuando `onAction` rechazó. */
  errorLabel?: string
  /** Lo que hace el botón. Si devuelve una promesa, muestra "cargando" hasta que resuelva. */
  onAction: () => void | Promise<void>
  /** Milisegundos que dura el resultado (listo o error) antes de volver al reposo. 0 lo deja fijo. */
  resetAfterMs?: number
  onActionError?: (error: unknown) => void
}

/** Colores semánticos: del acento toman la luz y la saturación; el matiz no se negocia. */
const semantico = (hue: number) => `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) ${hue})`
const TONE_OK = semantico(150)
const TONE_DANGER = semantico(25)

const enter: [number, number, number, number] = [0.22, 1, 0.36, 1]
const standard: [number, number, number, number] = [0.2, 0, 0, 1]
const BLUR_SUBTLE = 4

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}

const rest: TargetAndTransition = { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
const iconRest: TargetAndTransition = { ...rest, x: 0 }
const iconIn: TargetAndTransition = { opacity: 0, scale: 0.6, filter: `blur(${BLUR_SUBTLE}px)` }
/** La flecha se va hacia donde apunta la acción y vuelve desde atrás cuando el botón descansa. */
const arrowIn: TargetAndTransition = { opacity: 0, x: -6, filter: `blur(${BLUR_SUBTLE}px)` }
const fadeIn: TargetAndTransition = { ...rest, opacity: 0 }

/** El tilde se dibuja desde el trazo corto, como lo haría una mano. */
function DrawnCheck({ reduced, d }: { reduced: boolean; d: number }) {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="M4 12l5 5L20 6" initial={reduced ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ pathLength: { duration: d * 1.6, ease: enter, delay: 0.05 }, opacity: { duration: 0.05, delay: 0.05 } }} />
    </svg>
  )
}

/** La cruz del error se dibuja igual que el tilde, en dos trazos. */
function DrawnCross({ reduced, d }: { reduced: boolean; d: number }) {
  const draw = (delay: number) => ({ pathLength: { duration: d * 1.2, ease: enter, delay }, opacity: { duration: 0.05, delay } })
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="M6 6l12 12" initial={reduced ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={draw(0.05)} />
      <motion.path d="M18 6L6 18" initial={reduced ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={draw(0.05 + d * 0.6)} />
    </svg>
  )
}

/**
 * Un botón que cuenta el resultado ahí mismo: "Guardar" se transforma en "Guardando…" con un spinner y después en
 * "Guardado" con un tilde dibujado sobre fondo verde (o en rojo si falló), y el ancho sigue al texto con un resorte.
 * Vuelve solo al reposo pasado `resetAfterMs`. Mientras carga queda enfocable (aria-disabled, no disabled), así quien
 * navega con teclado no pierde el foco a mitad del guardado.
 */
export function ActionButton({
  label, pendingLabel = 'Guardando…', successLabel = 'Guardado', errorLabel = 'No se guardó',
  onAction, resetAfterMs = 2400, onActionError, className, disabled, style, ...props
}: ActionButtonProps) {
  const [state, setState] = useState<ActionButtonState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion() ?? false
  const d = useDur()
  const text = state === 'pending' ? pendingLabel : state === 'success' ? successLabel : state === 'error' ? errorLabel : label

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  function settle(next: 'success' | 'error') {
    setState(next)
    if (resetAfterMs > 0) resetTimer.current = setTimeout(() => setState('idle'), resetAfterMs)
  }

  async function run() {
    if (state === 'pending') return
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setState('pending')
    try {
      await onAction()
      settle('success')
    } catch (error) {
      settle('error')
      onActionError?.(error)
    }
  }

  const pending = state === 'pending'
  const arrow = state === 'idle'

  const pressVariants: Variants = {
    pressed: (button: RefObject<HTMLButtonElement | null>) => ({ scale: (button.current?.offsetWidth ?? 0) > 220 ? 0.985 : 0.97, transition: { duration: d * 0.5, ease: standard } }),
  }
  const snappy = { type: 'spring' as const, duration: d * 1.4, bounce: 0.1 }
  /** La escala va en resorte; opacidad y desenfoque en curva, así el desenfoque nunca pasa de cero. */
  const iconEnter = { ...snappy, opacity: { duration: d, ease: enter }, filter: { duration: d, ease: enter } }
  const iconOut: TargetAndTransition = { ...iconIn, transition: { duration: d, ease: standard } }
  const arrowOut: TargetAndTransition = { opacity: 0, x: 8, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d, ease: standard } }
  const fadeOut: TargetAndTransition = { opacity: 0, transition: { duration: d * 0.5 } }
  const vars = { '--tone-ok': TONE_OK, '--tone-danger': TONE_DANGER, ...style } as CSSProperties

  return (
    <motion.button
      {...props}
      ref={buttonRef}
      tabIndex={props.tabIndex ?? 0}
      type={props.type ?? 'button'}
      className={`relative inline-flex min-h-10 cursor-pointer items-center justify-center overflow-hidden rounded-ui border border-ui-accent bg-ui-accent px-5 font-ui-text text-sm leading-normal font-medium text-ui-accent-ink [-webkit-tap-highlight-color:transparent] transition-[background-color,border-color,color,box-shadow,opacity] duration-(--ui-dur) ease-ui hover:shadow-[0_1px_2px_color-mix(in_oklch,var(--ui-ink)_14%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-70 data-[state=pending]:cursor-progress data-[state=success]:border-(--tone-ok) data-[state=success]:bg-(--tone-ok) data-[state=error]:border-(--tone-danger) data-[state=error]:bg-(--tone-danger) motion-reduce:transition-none${className ? ` ${className}` : ''}`}
      style={vars}
      disabled={disabled}
      aria-disabled={pending ? true : props['aria-disabled']}
      aria-busy={pending}
      data-state={state}
      onClick={run}
      custom={buttonRef}
      variants={pressVariants}
      whileTap={reduced || disabled || pending ? undefined : 'pressed'}
      transition={snappy}
    >
      <span className="inline-flex min-h-5 items-center justify-center gap-2 whitespace-nowrap" aria-hidden="true">
        <TextMorph text={text} reduced={reduced} d={d} />
        <span className="grid size-[17px] flex-none place-items-center">
          <AnimatePresence initial={false}>
            <motion.span
              key={state}
              className="grid size-[17px] [grid-area:1/1] place-items-center"
              initial={reduced ? fadeIn : arrow ? arrowIn : iconIn}
              animate={iconRest}
              exit={reduced ? fadeOut : arrow ? arrowOut : iconOut}
              transition={reduced ? { duration: d * 0.5 } : iconEnter}
            >
              {pending
                ? <span className="inline-block size-4 animate-spin rounded-full border-[1.5px] border-current border-r-transparent [animation-duration:0.7s] motion-reduce:animate-none" />
                : state === 'success'
                  ? <DrawnCheck reduced={reduced} d={d} />
                  : state === 'error'
                    ? <DrawnCross reduced={reduced} d={d} />
                    : <ArrowRight className="flex-none" width={17} height={17} aria-hidden="true" />}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      <span className="sr-only">{label}</span>
      <span className="sr-only" role="status">{state === 'idle' ? '' : text}</span>
    </motion.button>
  )
}

export default ActionButton
