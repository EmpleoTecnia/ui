'use client'
import { forwardRef, useEffect, useId, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

export interface SelectOption { value: string; label: string; disabled?: boolean }

/**
 * Un campo de elegir una opción de una lista corta, con menú manejable desde el teclado. Al abrir, el
 * menú crece desde el borde del botón, el chevron gira con un resorte y el botón cambia de tono; el valor
 * elegido rueda en la dirección de la lista (uno de más abajo sube, uno de más arriba baja) y el tilde
 * entra con un pequeño rebote. Radix guarda el valor real para lectores de pantalla y para enviar el
 * formulario por `name`.
 */
export interface SelectProps extends Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, 'children'> {
  label: string
  description?: string
  placeholder?: string
  id?: string
  className?: string
  options: SelectOption[]
  /** Renderiza el menú en un portal sobre el body. `false` lo deja adentro del campo. */
  portal?: boolean
}

// ── movimiento: todo sale de --ui-dur ──
const enter: [number, number, number, number] = [0.22, 1, 0.36, 1]
const standard: [number, number, number, number] = [0.2, 0, 0, 1]
const BLUR_SOFT = 8
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

/** El valor mostrado rueda en la dirección de la lista: una opción de más abajo sube, una de más arriba baja. */
const valueRoll = (d: number): Variants => ({
  enter: (direction: number) => ({ opacity: 0, y: `${direction * 0.35}em`, filter: `blur(${BLUR_SOFT}px)` }),
  center: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: d * 1.6, ease: enter } },
  exit: (direction: number) => ({ opacity: 0, y: `${direction * -0.3}em`, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d, ease: standard } }),
})
/** Con movimiento reducido queda un fundido corto; el estado de reposo coincide con valueRoll para que servidor y cliente pinten igual. */
const valueFade = (d: number): Variants => ({
  enter: { opacity: 0 },
  center: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: d * 0.5 } },
  exit: { opacity: 0, transition: { duration: d * 0.5 } },
})

/** Las animaciones del menú van por CSS porque Radix las espera así: sostiene la salida hasta que terminan
 *  y arranca la entrada recién cuando el menú está ubicado. React 19 sube este <style> al <head> una sola vez. */
const KEYFRAMES = `
@keyframes ui-select-in { from { opacity: 0; transform: translate(var(--menu-x), var(--menu-y)) scale(.97); } }
@keyframes ui-select-out { to { opacity: 0; transform: translate(calc(var(--menu-x) / 2), calc(var(--menu-y) / 2)) scale(.98); } }
@keyframes ui-select-fade { from { opacity: 0; } }
@keyframes ui-select-fade-out { to { opacity: 0; } }
@keyframes ui-select-check { from { opacity: 0; transform: scale(.6); filter: blur(2px); } }
`

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { label, description, placeholder = 'Elegí una opción', options, id, className, disabled, onValueChange, portal = true, ...rootProps },
  ref,
) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const hintId = description ? `${controlId}-description` : undefined
  const reduceMotion = useReducedMotion()
  const d = useDur()
  const [uncontrolledValue, setUncontrolledValue] = useState(rootProps.defaultValue ?? '')
  const currentValue = rootProps.value ?? uncontrolledValue
  const index = options.findIndex(option => option.value === currentValue)
  const shown = currentValue ? options[index]?.label ?? '' : placeholder
  const [previousIndex, setPreviousIndex] = useState(index)
  const [direction, setDirection] = useState(1)
  if (previousIndex !== index) { setPreviousIndex(index); setDirection(index > previousIndex ? 1 : -1) }

  const content = (
    <SelectPrimitive.Content
      className="z-[1000] box-border w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width) max-w-[min(24rem,calc(100vw-20px))] max-h-[min(320px,var(--radix-select-content-available-height))] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-[calc(var(--ui-radius)+2px)] border border-ui-line bg-ui-surface p-1.5 text-ui-ink shadow-[0_12px_32px_-12px_color-mix(in_oklch,var(--ui-ink)_28%,transparent),0_2px_6px_color-mix(in_oklch,var(--ui-ink)_8%,transparent)] [--menu-x:0px] [--menu-y:-6px] data-[side=top]:[--menu-y:6px] data-[side=left]:[--menu-x:6px] data-[side=left]:[--menu-y:0px] data-[side=right]:[--menu-x:-6px] data-[side=right]:[--menu-y:0px] animate-[ui-select-in_calc(var(--ui-dur)*1.2)_cubic-bezier(0.22,1,0.36,1)_both] data-[state=closed]:animate-[ui-select-out_calc(var(--ui-dur)*0.7)_cubic-bezier(0.2,0,0,1)_both] motion-reduce:animate-[ui-select-fade_calc(var(--ui-dur)*0.5)_linear_both] motion-reduce:data-[state=closed]:animate-[ui-select-fade-out_calc(var(--ui-dur)*0.5)_linear_both]"
      position="popper" sideOffset={4} collisionPadding={12}
    >
      <SelectPrimitive.ScrollUpButton className="grid h-7 place-items-center text-ui-ink-muted">
        <ChevronUp size={15} strokeWidth={1.8} aria-hidden="true" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="py-0.5">
        {options.map(option => (
          <SelectPrimitive.Item
            key={option.value} value={option.value} disabled={option.disabled}
            className="relative flex min-h-9 cursor-default items-center rounded-[max(2px,calc(var(--ui-radius)-8px))] pr-[34px] pl-[11px] text-sm text-ui-ink outline-none select-none transition-colors duration-[calc(var(--ui-dur)*0.45)] ease-[cubic-bezier(0.2,0,0,1)] data-[highlighted]:bg-ui-surface-2 data-[disabled]:opacity-45 motion-reduce:transition-none"
          >
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center text-ui-ink animate-[ui-select-check_calc(var(--ui-dur)*1.6)_cubic-bezier(0.22,1,0.36,1)_calc(var(--ui-dur)*0.2)_both] motion-reduce:animate-none">
              <Check size={16} strokeWidth={2} aria-hidden="true" />
            </SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>
        ))}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="grid h-7 place-items-center text-ui-ink-muted">
        <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  )

  return (
    <div className="grid min-w-0 gap-2 font-ui-text">
      <style href="ui-select-keyframes" precedence="ui">{KEYFRAMES}</style>
      <label className="text-sm font-medium text-ui-ink" htmlFor={controlId}>{label}</label>
      <SelectPrimitive.Root {...rootProps} disabled={disabled} onValueChange={next => { setUncontrolledValue(next); onValueChange?.(next) }}>
        {/* El botón ancla el menú. Radix abre al apretar y mide esta caja, así que nunca escala: responde sólo con color. */}
        <SelectPrimitive.Trigger
          ref={ref}
          id={controlId}
          aria-describedby={hintId}
          className={`group relative box-border flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-ui border border-ui-line bg-ui-surface px-3 text-left text-sm text-ui-ink transition-[border-color,background-color,box-shadow] duration-(--ui-dur) ease-ui enabled:hover:border-ui-ink-muted enabled:hover:bg-ui-surface-2 enabled:active:border-ui-ink-muted enabled:active:bg-ui-surface-2 data-[state=open]:border-ui-ink-muted data-[state=open]:bg-ui-surface-2 focus-visible:border-ui-accent focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--ui-accent)_28%,transparent)] focus-visible:outline-offset-0 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 motion-reduce:transition-none ${className ?? ''}`}
        >
          {/* Radix guarda el valor real para la tecnología de asistencia; la copia visible de abajo es la que se anima. */}
          <span className="sr-only"><SelectPrimitive.Value placeholder={placeholder} /></span>
          <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)]" aria-hidden="true">
            <AnimatePresence initial={false} custom={direction}>
              <motion.span
                key={currentValue ? `value-${currentValue}` : 'placeholder'}
                className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [grid-area:1/1] data-[placeholder]:text-ui-ink-muted"
                data-placeholder={currentValue ? undefined : ''} custom={direction}
                variants={reduceMotion ? valueFade(d) : valueRoll(d)} initial="enter" animate="center" exit="exit"
              >
                {shown}
              </motion.span>
            </AnimatePresence>
          </span>
          <SelectPrimitive.Icon className="inline-flex flex-none text-ui-ink-muted [transition:transform_calc(var(--ui-dur)*2.2)_cubic-bezier(0.34,1.4,0.64,1),color_var(--ui-dur)_var(--ui-ease)] group-data-[state=open]:rotate-180 motion-reduce:transition-none">
            <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        {portal ? <SelectPrimitive.Portal>{content}</SelectPrimitive.Portal> : content}
      </SelectPrimitive.Root>
      {description && <span id={hintId} className="text-xs text-ui-ink-muted">{description}</span>}
    </div>
  )
})

export default Select
