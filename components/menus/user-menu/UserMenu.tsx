'use client'
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { PanInfo, Transition, Variants } from 'motion/react'
import { ChevronDown, LoaderCircle, LogOut, Monitor, Moon, Sun, SunMoon } from 'lucide-react'

export type UserStatus = 'available' | 'busy' | 'away'
export type ThemePreference = 'light' | 'dark' | 'system'

/** Estados de presencia en el orden del menú. Cada uno tiene forma propia además de color: lleno, con barra o hueco. */
export const userStatuses: { value: UserStatus; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'busy', label: 'Ocupado' },
  { value: 'away', label: 'Ausente' },
]

const themes: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun size={15} strokeWidth={1.75} aria-hidden="true" /> },
  { value: 'dark', label: 'Oscuro', icon: <Moon size={15} strokeWidth={1.75} aria-hidden="true" /> },
  { value: 'system', label: 'Sistema', icon: <Monitor size={15} strokeWidth={1.75} aria-hidden="true" /> },
]

export interface UserMenuUser { name: string; email: string; plan?: string; avatarSrc?: string; avatarSrcSet?: string }
export interface UserMenuItem { label: string; icon?: ReactNode; keys?: string[]; onSelect?: () => void }

/**
 * El menú de la cuenta detrás de la foto de la persona en la cabecera de una app: cabecera compacta con
 * nombre y correo, un grupo corto de destinos de la cuenta, el selector de tema adentro y "Cerrar sesión".
 * En pantallas angostas (menos de `sheetBelow` px) se abre como hoja desde abajo. Elegir tema o estado deja
 * el menú abierto; todo lo demás lo cierra y devuelve el foco al botón. Si `onSignOut` devuelve una
 * promesa, el ítem muestra el progreso y el menú se cierra cuando termina.
 */
export interface UserMenuProps {
  user: UserMenuUser
  /** Estado de presencia. Pasar `status` u `onStatusChange` muestra el punto y el selector de estado. */
  status?: UserStatus
  defaultStatus?: UserStatus
  onStatusChange?: (status: UserStatus) => void
  theme?: ThemePreference
  defaultTheme?: ThemePreference
  /** Avisa la elección. Aplicarla a la página es cosa de la app. */
  onThemeChange?: (theme: ThemePreference) => void
  /** Muestra el selector claro, oscuro y sistema adentro del menú. */
  showTheme?: boolean
  /** Destinos de la cuenta, con atajo opcional como pista visual (p. ej. ["⌘", ","]). Tres o cuatro, no más. */
  items?: UserMenuItem[]
  onSignOut?: () => void | Promise<unknown>
  signOutKeys?: string[]
  align?: 'start' | 'center' | 'end'
  /** Muestra el nombre y un chevron al lado del avatar (no en pantallas angostas). */
  showName?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Renderiza el panel en un portal sobre el body. `false` lo deja adentro del contenedor del botón. */
  portal?: boolean
  /** Ancho de pantalla (px) por debajo del cual se abre como hoja desde abajo. `0` lo desactiva. */
  sheetBelow?: number
  /** El botón, para devolverle el foco desde afuera. */
  ref?: Ref<HTMLButtonElement>
  className?: string
}

type Highlight = { top: number; height: number; tone?: string; glide: boolean }
type OpenReason = 'first' | 'last' | 'pointer' | null

const subscribeNothing = () => () => {}
const statusLabel = (status: UserStatus) => userStatuses.find(option => option.value === status)?.label ?? status

/** Colores semánticos con matiz fijo: del acento de la app toman sólo luz y saturación. */
const semantico = (hue: number) => `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) ${hue})`
const TONE_OK = semantico(150)
const TONE_DANGER = semantico(25)
const TONE_WARN = semantico(55)
const DOT_COLOR: Record<UserStatus | 'offline', string> = {
  available: TONE_OK,
  busy: TONE_DANGER,
  away: TONE_WARN,
  offline: 'var(--ui-ink-muted)',
}

// ── movimiento: todo sale de --ui-dur ──
const enter: [number, number, number, number] = [0.22, 1, 0.36, 1]
const standard: [number, number, number, number] = [0.2, 0, 0, 1]
const exitEase: [number, number, number, number] = [0.4, 0, 1, 1]
const BLUR_SUBTLE = 4
/** Un resorte vivo para el resaltado que sigue al puntero y al teclado. */
const snappy = (d: number): Transition => ({ type: 'spring', duration: d * 1.4, bounce: 0.1 })

/** El panel crece desde el avatar con un resorte sin rebote; las filas entran un instante después. Cerrar es un fundido corto. */
const panelMotion = (d: number): Variants => ({
  closed: { opacity: 0, scale: 0.94 },
  open: { opacity: 1, scale: 1, transition: { type: 'spring', duration: d * 2, bounce: 0, opacity: { duration: d * 0.8, ease: enter }, delayChildren: d * 0.17, staggerChildren: d * 0.09 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: d * 0.65, ease: exitEase } },
})
const sheetMotion = (d: number): Variants => ({
  closed: { y: '100%' },
  open: { y: 0, transition: { type: 'spring', duration: d * 2.4, bounce: 0, delayChildren: d * 0.33, staggerChildren: d * 0.11 } },
  exit: { y: '100%', transition: { duration: d * 1.2, ease: exitEase } },
})
const stillMotion = (d: number): Variants => ({
  closed: { opacity: 0 },
  open: { opacity: 1, transition: { duration: d * 0.65 } },
  exit: { opacity: 0, transition: { duration: d * 0.55 } },
})
const rowMotion = (d: number): Variants => ({ closed: { opacity: 0, y: 3 }, open: { opacity: 1, y: 0, transition: { duration: d * 1.1, ease: enter } } })

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}


/** Una marca de presencia que se transforma entre estados: el color se funde mientras se abre un hueco (ausente) o entra una barra (ocupado). */
export function PresenceDot({ status, size = 10, className = '' }: { status: UserStatus | 'offline'; size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-block flex-none rounded-full bg-(--dot-color) [transition:background-color_calc(var(--ui-dur)*1.6)_var(--ui-ease),box-shadow_var(--ui-dur)_var(--ui-ease)] before:absolute before:inset-0 before:m-auto before:size-[46%] before:scale-0 before:rounded-full before:bg-(--presence-surface) before:content-[''] before:[transition:transform_calc(var(--ui-dur)*2.2)_cubic-bezier(0.34,1.4,0.64,1),background-color_var(--ui-dur)_var(--ui-ease)] after:absolute after:inset-0 after:m-auto after:h-[22%] after:min-h-[1.5px] after:w-[58%] after:scale-x-0 after:rounded-[1px] after:bg-(--presence-surface) after:content-[''] after:[transition:transform_calc(var(--ui-dur)*2.2)_cubic-bezier(0.34,1.4,0.64,1),background-color_var(--ui-dur)_var(--ui-ease)] data-[status=busy]:after:scale-x-100 data-[status=away]:before:scale-100 data-[status=offline]:before:scale-100 motion-reduce:transition-none motion-reduce:before:transition-none motion-reduce:after:transition-none ${className}`}
      data-status={status}
      style={{ width: size, height: size, '--dot-color': DOT_COLOR[status] } as CSSProperties}
      aria-hidden="true"
    />
  )
}

function Portrait({ user, size }: { user: UserMenuUser; size: number }) {
  const [failed, setFailed] = useState<string>()
  const portrait = 'block h-full w-full select-none rounded-full bg-ui-surface-2 object-cover object-[50%_15%] [outline:1px_solid_color-mix(in_oklch,var(--ui-ink)_9%,transparent)] -outline-offset-1'
  if (!user.avatarSrc || failed === user.avatarSrc) {
    const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('')
    return <span className={`${portrait} grid place-items-center font-medium leading-none text-ui-ink-soft`} style={{ fontSize: size * 0.36 }}>{initials}</span>
  }
  // Sin next/image a propósito: el componente no depende del framework. Pasá URLs ya optimizadas en avatarSrc y avatarSrcSet.
  return <img className={portrait} src={user.avatarSrc} srcSet={user.avatarSrcSet} alt="" decoding="async" draggable={false} onError={() => setFailed(user.avatarSrc)} />
}

function Face({ user, status, size }: { user: UserMenuUser; status?: UserStatus; size: 'sm' | 'md' }) {
  const px = size === 'sm' ? 32 : 40
  return (
    <span className="relative inline-grid flex-none" style={{ width: px, height: px }}>
      <Portrait user={user} size={px} />
      {status && <PresenceDot status={status} size={size === 'sm' ? 11 : 12} className="absolute -right-px -bottom-px shadow-[0_0_0_2px_var(--presence-surface)]" />}
    </span>
  )
}

/** El texto que cambia sube desde un desenfoque chico mientras el anterior se va para arriba. */
function Rise({ text, reduced, d }: { text: string; reduced: boolean; d: number }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={text} className="inline-block whitespace-nowrap"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: '0.35em', filter: `blur(${BLUR_SUBTLE}px)` }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: '-0.35em', filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d, ease: standard } }}
        transition={reduced ? { duration: 0 } : { duration: d * 1.6, ease: enter }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  )
}

function Keys({ keys, hidden }: { keys: string[]; hidden?: boolean }) {
  if (hidden) return null
  return (
    <kbd className="ml-auto inline-flex flex-none items-center gap-px font-ui-text text-xs tracking-normal text-ui-ink-muted tabular-nums opacity-80" aria-hidden="true">
      {keys.map((key, index) => <kbd key={`${key}-${index}`} className="inline-block min-w-[1.05em] text-center [font:inherit]">{key}</kbd>)}
    </kbd>
  )
}

/** Un selector compacto en línea. Es una sola parada del menú: arriba y abajo pasan por él, izquierda y derecha eligen adentro. */
function Segmented<T extends string>({ label, icon, value, options, onChange, variants, sheet }: { label: string; icon: ReactNode; value: T; options: { value: T; label: string; icon: ReactNode }[]; onChange: (value: T) => void; variants?: Variants; sheet: boolean }) {
  const index = Math.max(0, options.findIndex(option => option.value === value))
  const segment = sheet ? 44 : 32
  return (
    <motion.div className={`relative flex items-center gap-3 pr-1.5 pl-3 ${sheet ? 'h-14' : 'h-11'}`} data-stop="group" data-label={label} variants={variants}>
      <span className="inline-grid w-4 flex-none place-items-center text-ui-ink-soft" aria-hidden="true">{icon}</span>
      <span className={`flex-1 text-ui-ink ${sheet ? 'text-base' : 'text-sm'}`} aria-hidden="true">{label}</span>
      <div
        className={`relative isolate inline-grid flex-none grid-flow-col auto-cols-(--segment) rounded-full bg-[color-mix(in_oklch,var(--ui-ink)_6%,transparent)] p-0.5 ${sheet ? 'h-[38px]' : 'h-[30px]'}`}
        role="group" aria-label={label}
        style={{ '--segment': `${segment}px` } as CSSProperties}
      >
        {/* El pulgar se desliza por debajo de los íconos; el grupo es su contexto de apilamiento. */}
        <span
          className={`absolute inset-y-0.5 left-0.5 -z-10 w-(--segment) rounded-full bg-ui-surface shadow-[0_1px_2px_color-mix(in_oklch,var(--ui-ink)_10%,transparent),0_0_0_1px_var(--ui-line)] [transition:transform_calc(var(--ui-dur)*2.2)_cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none`}
          style={{ transform: `translateX(${index * 100}%)` }}
          aria-hidden="true"
        />
        {options.map(option => (
          <button
            key={option.value} type="button" role="menuitemradio" tabIndex={-1} aria-checked={option.value === value} aria-label={option.label} title={option.label}
            className="m-0 grid cursor-pointer place-items-center rounded-full bg-transparent p-0 text-ui-ink-muted outline-none transition-colors duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] [--presence-surface:var(--ui-surface)] hover:text-ui-ink-soft aria-checked:text-ui-ink motion-reduce:transition-none"
            onClick={() => onChange(option.value)}
          >
            {option.icon}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

const getStops = (root: HTMLElement | null) => Array.from(root?.querySelectorAll<HTMLElement>('[data-stop]') ?? [])
function focusStop(stop: HTMLElement | undefined) {
  if (!stop) return
  const target = stop.dataset.stop === 'group' ? stop.querySelector<HTMLElement>('[aria-checked="true"]') ?? stop.querySelector<HTMLElement>('button') : stop
  target?.focus({ preventScroll: true })
}

export function UserMenu({ user, status: statusProp, defaultStatus = 'available', onStatusChange, theme: themeProp, defaultTheme = 'system', onThemeChange, showTheme = true, items = [], onSignOut, signOutKeys, align = 'end', showName = false, open: openProp, defaultOpen = false, onOpenChange, portal = true, sheetBelow = 640, ref, className }: UserMenuProps) {
  const id = useId()
  const menuId = `${id}-menu`
  const triggerId = `${id}-trigger`
  const reduced = !!useReducedMotion()
  const d = useDur()
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false)
  const compactQuery = `(max-width: ${sheetBelow - 1}px)`
  const compact = useSyncExternalStore(
    change => {
      if (sheetBelow <= 0) return () => {}
      const query = window.matchMedia(compactQuery)
      query.addEventListener('change', change)
      return () => query.removeEventListener('change', change)
    },
    () => sheetBelow > 0 && window.matchMedia(compactQuery).matches,
    () => false,
  )
  const [innerOpen, setInnerOpen] = useState(defaultOpen)
  const [innerStatus, setInnerStatus] = useState(defaultStatus)
  const [innerTheme, setInnerTheme] = useState(defaultTheme)
  const [signingOut, setSigningOut] = useState(false)
  const [highlight, setHighlight] = useState<Highlight | null>(null)
  const open = openProp ?? innerOpen
  const showStatus = statusProp !== undefined || onStatusChange !== undefined
  const status = statusProp ?? innerStatus
  const theme = themeProp ?? innerTheme
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const reason = useRef<OpenReason>(null)
  const typed = useRef({ text: '', timer: 0 })
  const mounted = useRef(true)
  const pending = useRef(false)
  const sheet = hydrated && compact
  const inline = !portal && !sheet

  useEffect(() => { mounted.current = true; const current = typed.current; return () => { mounted.current = false; window.clearTimeout(current.timer) } }, [])

  function setTriggerRef(node: HTMLButtonElement | null) {
    triggerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = node
  }

  function setOpen(next: boolean, why: OpenReason = null) {
    reason.current = next ? why : null
    if (next) setSigningOut(pending.current)
    setHighlight(null)
    setInnerOpen(next)
    onOpenChange?.(next)
  }
  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true })
  }

  // El foco entra sólo si una persona abrió el menú: uno que arranca abierto no roba el foco ni mueve la página.
  useEffect(() => {
    if (!open) return
    const why = reason.current
    reason.current = null
    if (!why) return
    const frame = requestAnimationFrame(() => {
      const stops = getStops(listRef.current)
      if (why === 'first') focusStop(stops[0])
      else if (why === 'last') focusStop(stops.at(-1))
      else surfaceRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, sheet])

  // El panel se apoya contra el botón y crece desde el centro del avatar; si no hay lugar abajo, se da vuelta arriba.
  useLayoutEffect(() => {
    if (!open || sheet) return
    const place = () => {
      const panel = surfaceRef.current, trigger = triggerRef.current
      if (!panel || !trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = panel.offsetWidth, height = panel.offsetHeight
      let left: number, top: number
      if (inline) {
        const root = rootRef.current?.getBoundingClientRect()
        left = (root?.left ?? 0) + panel.offsetLeft
        top = (root?.top ?? 0) + panel.offsetTop
      } else {
        const wanted = align === 'start' ? rect.left : align === 'center' ? rect.left + rect.width / 2 - width / 2 : rect.right - width
        left = Math.min(Math.max(12, wanted), window.innerWidth - width - 12)
        const below = rect.bottom + 8
        top = below + height > window.innerHeight - 12 && rect.top - 8 - height > 12 ? rect.top - 8 - height : below
        panel.style.left = `${left}px`
        panel.style.top = `${top}px`
      }
      const faceCenter = rect.left + Math.min(rect.width, 40) / 2
      const originX = align === 'end' && rect.width > 40 ? rect.right - 20 - left : faceCenter - left
      panel.style.setProperty('--origin-x', `${Math.min(Math.max(0, originX), width)}px`)
      panel.style.setProperty('--origin-y', top < rect.top ? `${height}px` : '0px')
    }
    place()
    if (inline) return
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, sheet, inline, align])

  // Tocar afuera cierra el panel. La hoja tiene su propio velo.
  useEffect(() => {
    if (!open || sheet) return
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node
      if (surfaceRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      reason.current = null
      setHighlight(null)
      setInnerOpen(false)
      onOpenChange?.(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, sheet, onOpenChange])

  // La página detrás de la hoja se queda quieta.
  useEffect(() => {
    if (!open || !sheet) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { root.style.overflow = previous }
  }, [open, sheet])

  function changeStatus(value: UserStatus) { setInnerStatus(value); onStatusChange?.(value) }
  function changeTheme(value: ThemePreference) { setInnerTheme(value); onThemeChange?.(value) }

  function signOut() {
    if (pending.current) return
    const result = onSignOut?.()
    if (!result || typeof result.then !== 'function') { close(true); return }
    // Cerrar sesión asíncrono: el menú queda abierto mostrando el progreso en el ítem y se cierra cuando termina.
    pending.current = true
    setSigningOut(true)
    const done = () => { pending.current = false; if (mounted.current) close(false) }
    result.then(done, done)
  }

  function onListFocus(event: FocusEvent<HTMLDivElement>) {
    const stop = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-stop]') : null
    if (!stop) { setHighlight(null); return }
    setHighlight(current => ({ top: stop.offsetTop, height: stop.offsetHeight, tone: stop.dataset.tone, glide: current !== null }))
  }

  // El foco sigue al mouse o al lápiz, así el teclado arranca desde donde el puntero dejó el resaltado.
  function onItemPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true })
  }
  // Los selectores en línea no son filas: el puntero encima suelta el resaltado en vez de arrastrarlo.
  function onListPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' || !highlight) return
    const group = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-stop="group"]') : null
    if (!group || group.contains(document.activeElement)) return
    setHighlight(null)
    surfaceRef.current?.focus({ preventScroll: true })
  }
  function onListPointerLeave(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    setHighlight(null)
    surfaceRef.current?.focus({ preventScroll: true })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const stops = getStops(listRef.current)
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const current = active?.closest<HTMLElement>('[data-stop]') ?? null
    const index = current ? stops.indexOf(current) : -1
    const step = (to: HTMLElement | undefined) => { event.preventDefault(); focusStop(to) }
    switch (event.key) {
      case 'ArrowDown': return step(stops[(index + 1) % stops.length])
      case 'ArrowUp': return step(stops[index <= 0 ? stops.length - 1 : index - 1])
      case 'Home': return step(stops[0])
      case 'End': return step(stops.at(-1))
      case 'Escape': case 'Tab': event.preventDefault(); return close(true)
      case 'ArrowLeft': case 'ArrowRight': {
        if (current?.dataset.stop !== 'group') return
        event.preventDefault()
        const segments = Array.from(current.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
        const at = Math.max(0, segments.findIndex(segment => segment.getAttribute('aria-checked') === 'true'))
        const next = segments[(at + (event.key === 'ArrowRight' ? 1 : -1) + segments.length) % segments.length]
        next?.focus({ preventScroll: true })
        next?.click()
        return
      }
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey || event.key === ' ') return
    // Escribir salta a la próxima fila cuya etiqueta empiece con lo tipeado.
    const memory = typed.current
    window.clearTimeout(memory.timer)
    memory.text += event.key.toLowerCase()
    memory.timer = window.setTimeout(() => { memory.text = '' }, 500)
    const ordered = [...stops.slice(index + 1), ...stops.slice(0, index + 1)]
    const search = memory.text.length > 1 && current?.dataset.label?.toLowerCase().startsWith(memory.text) ? [current] : ordered
    const match = search.find(stop => stop.dataset.label?.toLowerCase().startsWith(memory.text))
    if (match) step(match)
  }

  function onTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    if (open) { close(false); return }
    setOpen(true, event.detail === 0 ? 'first' : 'pointer')
  }
  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setOpen(true, event.key === 'ArrowDown' ? 'first' : 'last')
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 80 || info.velocity.y > 500) close(true)
  }

  const glide: Transition = highlight?.glide && !reduced ? snappy(d) : { duration: 0 }
  const row = reduced ? undefined : rowMotion(d)
  const menuProps = { id: menuId, role: 'menu', 'aria-labelledby': triggerId, tabIndex: -1, onKeyDown }
  const signOutLabel = 'Cerrar sesión'

  const rowRadius = 'rounded-[calc(var(--ui-radius-lg)-var(--inset))]'
  const item = `group/item relative m-0 flex h-(--row) w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 text-left text-ui-ink outline-none select-none transition-colors duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] [@media(hover:none)]:active:bg-ui-surface-2 motion-reduce:transition-none ${rowRadius} ${sheet ? 'text-base' : 'text-sm'}`
  const icon = 'inline-grid w-4 flex-none place-items-center text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui group-focus/item:text-ui-accent motion-reduce:transition-none'
  const separator = <div className="my-(--inset) -mx-(--inset) h-px bg-ui-line" role="separator" />

  const content = (
    <>
      <motion.div className={`flex items-center gap-3 ${sheet ? 'px-2 pt-1 pb-3' : 'px-2 pt-2 pb-2.5'}`} variants={row}>
        <Face user={user} status={showStatus ? status : undefined} size="md" />
        <div className="grid min-w-0 flex-1 gap-px">
          <div className="flex min-w-0 items-center gap-2">
            <span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-ui-ink">{user.name}</span>
            {user.plan && <span className="inline-flex h-[18px] flex-none items-center rounded-full bg-[color-mix(in_oklch,var(--ui-accent)_12%,transparent)] px-[7px] text-[11px] leading-none font-medium text-ui-accent">{user.plan}</span>}
          </div>
          <span className="overflow-hidden text-xs text-ellipsis whitespace-nowrap text-ui-ink-muted" title={user.email}>{user.email}</span>
        </div>
      </motion.div>
      <div ref={listRef} className="relative" onFocus={onListFocus} onPointerMove={onListPointerMove} onPointerLeave={onListPointerLeave}>
        {/* Un solo resaltado sigue al puntero y al teclado. Es el único tratamiento de hover del menú. */}
        <motion.span
          className={`pointer-events-none absolute inset-x-0 top-0 bg-[color-mix(in_oklch,var(--ui-accent)_12%,transparent)] opacity-0 data-[tone=danger]:bg-[color-mix(in_oklch,var(--tone-danger)_11%,transparent)] ${rowRadius}`}
          data-tone={highlight?.tone} aria-hidden="true" initial={false}
          animate={highlight ? { y: highlight.top, height: highlight.height, opacity: 1 } : { opacity: 0 }}
          transition={{ default: glide, opacity: { duration: reduced ? 0 : d * 0.55 } }}
        />
        {items.length > 0 && (
          <>
            {separator}
            {items.map(entry => (
              <motion.button
                key={entry.label} type="button" role="menuitem" tabIndex={-1} className={item} data-stop="item" data-label={entry.label} variants={row}
                onPointerMove={onItemPointerMove} onClick={() => { close(true); entry.onSelect?.() }}
              >
                <span className={icon} aria-hidden="true">{entry.icon}</span>
                <span className="relative inline-flex min-w-0 flex-1">{entry.label}</span>
                {entry.keys && <Keys keys={entry.keys} hidden={sheet} />}
              </motion.button>
            ))}
          </>
        )}
        {(showTheme || showStatus) && (
          <>
            {separator}
            {showStatus && (
              <Segmented
                label="Estado" icon={<PresenceDot status={status} />} value={status} onChange={changeStatus} sheet={sheet}
                options={userStatuses.map(option => ({ ...option, icon: <PresenceDot status={option.value} size={9} /> }))} variants={row}
              />
            )}
            {showTheme && <Segmented label="Tema" icon={<SunMoon size={16} strokeWidth={1.75} />} value={theme} onChange={changeTheme} options={themes} variants={row} sheet={sheet} />}
          </>
        )}
        {separator}
        {/* Cerrar sesión va en rojo semántico: nunca el acento para decir "peligro". */}
        <motion.button
          type="button" role="menuitem" tabIndex={-1}
          className={`${item} text-(--tone-danger-soft) focus:text-(--tone-danger)`}
          data-stop="item" data-tone="danger" data-label={signOutLabel} variants={row}
          aria-busy={signingOut || undefined} onPointerMove={onItemPointerMove} onClick={signOut}
        >
          <span className={`${icon} text-(--tone-danger-soft) group-focus/item:text-(--tone-danger)`} aria-hidden="true">
            {signingOut ? <LoaderCircle className="animate-spin [animation-duration:calc(var(--ui-dur)*4.5)] motion-reduce:[animation-duration:calc(var(--ui-dur)*13)]" size={16} strokeWidth={1.75} /> : <LogOut size={16} strokeWidth={1.75} />}
          </span>
          <span className="relative inline-flex min-w-0 flex-1"><Rise text={signingOut ? 'Cerrando sesión…' : signOutLabel} reduced={reduced} d={d} /></span>
          {signOutKeys && <Keys keys={signOutKeys} hidden={sheet} />}
        </motion.button>
      </div>
    </>
  )

  // El panel escala desde el avatar al que pertenece; el componente fija el origen una vez ubicado.
  const panelClass = 'box-border border border-ui-line bg-ui-surface p-(--inset) text-left leading-normal font-ui-text text-ui-ink shadow-[0_12px_32px_-12px_color-mix(in_oklch,var(--ui-ink)_28%,transparent),0_2px_6px_color-mix(in_oklch,var(--ui-ink)_8%,transparent)] outline-none [--presence-surface:var(--ui-surface)]'
  const panelVars = { '--row': '40px', '--inset': '6px', '--tone-danger': TONE_DANGER, '--tone-danger-soft': `color-mix(in oklch, ${TONE_DANGER} 88%, var(--ui-ink-soft))` } as CSSProperties
  const inlinePosition = align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -ml-[8.5rem]'

  const panel = (
    <AnimatePresence>
      {open && !sheet && (
        <motion.div
          key="panel" ref={surfaceRef} {...menuProps}
          className={`${panelClass} z-60 w-[17rem] max-w-[calc(100vw-24px)] rounded-ui-lg [transform-origin:var(--origin-x,100%)_var(--origin-y,0px)] ${inline ? `absolute top-[calc(100%+8px)] ${inlinePosition}` : 'fixed top-0 left-0'}`}
          style={panelVars}
          variants={reduced ? stillMotion(d) : panelMotion(d)} initial="closed" animate="open" exit="exit"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Por debajo de `sheetBelow` el mismo contenido sube como hoja, con filas más altas.
  const bottomSheet = (
    <AnimatePresence>
      {open && sheet && (
        <motion.div
          key="scrim" className="fixed inset-0 z-70 bg-[color-mix(in_oklch,var(--ui-ink)_32%,transparent)] [-webkit-tap-highlight-color:transparent]" aria-hidden="true"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduced ? d * 0.55 : d * 1.1, ease: standard }} onClick={() => close(true)}
        />
      )}
      {open && sheet && (
        <motion.div
          key="sheet" ref={surfaceRef} {...menuProps} aria-modal="true"
          className={`${panelClass} fixed inset-x-0 bottom-0 z-71 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-ui-lg border-b-0 px-(--inset) pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]`}
          style={{ ...panelVars, '--row': '48px', '--inset': '10px' } as CSSProperties}
          variants={reduced ? stillMotion(d) : sheetMotion(d)} initial="closed" animate="open" exit="exit"
          drag={reduced ? false : 'y'} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 0.9 }} dragMomentum={false} onDragEnd={onDragEnd}
        >
          <span className="mx-auto mb-2.5 block h-[5px] w-9 cursor-grab rounded-full bg-ui-ink-muted" aria-hidden="true" />
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  )

  const name = showName && !compact

  return (
    <span ref={rootRef} className="relative inline-flex flex-none align-middle">
      {/* El botón ancla el menú: responde al hover y al apretar con color, nunca con escala. */}
      <button
        ref={setTriggerRef} id={triggerId} type="button"
        className={`group relative m-0 inline-flex h-10 flex-none cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent p-1 font-ui-text text-sm text-ui-ink transition-colors duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] [--presence-surface:var(--ui-surface)] hover:bg-ui-surface-2 hover:[--presence-surface:var(--ui-surface-2)] active:bg-[color-mix(in_oklch,var(--ui-surface-2),var(--ui-ink)_8%)] active:[--presence-surface:color-mix(in_oklch,var(--ui-surface-2),var(--ui-ink)_8%)] data-[state=open]:bg-ui-surface-2 data-[state=open]:[--presence-surface:var(--ui-surface-2)] motion-reduce:transition-none ${name ? 'pr-2.5' : ''} ${className ?? ''}`}
        data-state={open ? 'open' : 'closed'}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-label={`Menú de la cuenta, ${user.name}${showStatus ? `, ${statusLabel(status)}` : ''}`}
        onClick={onTriggerClick} onKeyDown={onTriggerKeyDown}
      >
        <Face user={user} status={showStatus ? status : undefined} size="sm" />
        {name && (
          <>
            <span className="max-w-44 overflow-hidden leading-none font-medium text-ellipsis whitespace-nowrap">{user.name}</span>
            <ChevronDown className={`-ml-0.5 flex-none text-ui-ink-muted [transition:transform_calc(var(--ui-dur)*2.2)_cubic-bezier(0.34,1.4,0.64,1),color_var(--ui-dur)_var(--ui-ease)] group-hover:text-ui-ink group-data-[state=open]:rotate-180 group-data-[state=open]:text-ui-ink motion-reduce:transition-none`} size={15} strokeWidth={1.75} aria-hidden="true" />
          </>
        )}
      </button>
      {sheet ? createPortal(bottomSheet, document.body) : inline ? panel : hydrated ? createPortal(panel, document.body) : null}
    </span>
  )
}

export default UserMenu
