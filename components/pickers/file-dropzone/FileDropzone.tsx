'use client'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type DragEvent, type KeyboardEvent } from 'react'
import { ArrowUp, CircleAlert, File as FileIcon, FileArchive, FileImage, FilePlay, FileText, RotateCw, X } from 'lucide-react'
import { AnimatePresence, animate, motion, useIsPresent, useMotionTemplate, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform, type HTMLMotionProps, type TargetAndTransition, type Transition } from 'motion/react'

export type FileDropzoneStatus = 'uploading' | 'uploaded' | 'failed'
/** Una fila de la lista. Una fila sin estado es una selección simple.
 *  `preview` es la URL de una miniatura; las imágenes que agrega la persona la reciben solas. */
export type FileDropzoneItem = { id: string; name: string; size: number; status?: FileDropzoneStatus; progress?: number; error?: string; retryable?: boolean; file?: File; preview?: string }
/** Informá de 0 a 100 con onProgress, resolvé cuando el archivo llegó, o rechazá con un Error cuyo mensaje pasa a ser el motivo de la fila. Quitar la fila aborta la señal. */
export type FileDropzoneUpload = (item: FileDropzoneItem, options: { onProgress: (percent: number) => void; signal: AbortSignal }) => Promise<void>

export type FileDropzoneProps = {
  /** Tipos aceptados, como en un `<input type="file">`: `application/pdf,image/*,.docx`. */
  accept?: string
  multiple?: boolean
  maxFiles?: number
  onFilesChange?: (files: File[]) => void
  /** Título de la zona. */
  label?: string
  /** Línea debajo del título. */
  description?: string
  /** Filas presentes al montar, por ejemplo archivos subidos antes. Aparecen en su lugar, sin entrada. */
  defaultItems?: FileDropzoneItem[]
  /** Sube cada archivo agregado. Sin esto, la lista muestra selecciones simples. */
  onUpload?: FileDropzoneUpload
  /** Los archivos que pesan más que esto (en bytes) fallan con un motivo y nunca se suben. */
  maxSize?: number
  /** La lista de archivos, debajo de la zona o adentro de su borde. */
  listPlacement?: 'below' | 'inside'
  /** Reemplaza la línea chica debajo de la descripción. */
  note?: string
  /** Título mientras hay archivos encima de la zona. */
  dropLabel?: string
  /** Cuando la lista llega a esta cantidad, la zona se pliega a una barra fina para dejarle lugar. Un archivo arrastrado encima vuelve a abrir el ícono. */
  compactAt?: number
  className?: string
}

const MB = 1024 * 1024
const PERIOD = 7
const enter: [number, number, number, number] = [0.22, 1, 0.36, 1]
const standard: [number, number, number, number] = [0.2, 0, 0, 1]
const BLUR_SOFT = 8
const BLUR_SUBTLE = 4
const clamp = (value: number) => Math.min(Math.max(value, 0), 100)
/** Una sacudida corta que se apaga: el rechazo se lee como un "no" sin mover nada más. */
const SHAKE = { x: [0, -7, 6, -4, 3, -1.5, 0] }
/** Colores semánticos de verdad: del acento de la app toman sólo la luz y la saturación; el matiz no se negocia. */
const semantico = (hue: number) => `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) ${hue})`
const TONE_DANGER = semantico(25)
const TONE_OK = semantico(150)

/** Tamaño legible en español: "840 KB", "1,8 MB", "12 MB". */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`
  const mb = bytes / MB
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace('.', ',')} MB`
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

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

// ── movimiento: todo sale de --ui-dur ──
type MotionSet = ReturnType<typeof makeMotion>
function makeMotion(d: number) {
  const enterT: Transition = { duration: d * 1.6, ease: enter }
  const exitFast: Transition = { duration: d, ease: standard }
  const instant: Transition = { duration: 0 }
  const fade: Transition = { duration: d * 0.5 }
  const smooth: Transition = { type: 'spring', duration: d * 2.2, bounce: 0 }
  const snappy: Transition = { type: 'spring', duration: d * 1.4, bounce: 0.1 }
  /** Las salidas son más cortas que las entradas: el mismo resorte, asentado antes. */
  const collapse: Transition = { type: 'spring', visualDuration: d * 1.6, bounce: 0 }
  /** Las filas nuevas caen de la zona a la lista, con un toque de vida al aterrizar. */
  const land: Transition = { type: 'spring', visualDuration: d * 2.3, bounce: 0.14 }
  const shake: Transition = { duration: d * 2.3, ease: 'easeOut' }
  const textIn: TargetAndTransition = { opacity: 0, y: '0.3em', filter: `blur(${BLUR_SOFT}px)` }
  const textOut: TargetAndTransition = { opacity: 0, y: '-0.3em', filter: `blur(${BLUR_SUBTLE}px)`, transition: exitFast }
  const shown: TargetAndTransition = { opacity: 1, y: '0em', filter: 'blur(0px)' }
  return { d, enter: enterT, exitFast, instant, fade, smooth, snappy, collapse, land, shake, textIn, textOut, shown }
}

function TypeIcon({ name }: { name: string }) {
  const props = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const
  const extension = name.toLowerCase().split('.').pop() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic'].includes(extension)) return <FileImage {...props} />
  if (['mov', 'mp4', 'webm', 'm4v', 'avi'].includes(extension)) return <FilePlay {...props} />
  if (['zip', 'gz', 'tar', 'rar', '7z'].includes(extension)) return <FileArchive {...props} />
  if (['pdf', 'md', 'txt', 'doc', 'docx', 'rtf'].includes(extension)) return <FileText {...props} />
  return <FileIcon {...props} />
}

/** Las copias que se van quedan ocultas para la tecnología asistiva mientras salen, así sólo se lee el texto actual. */
function Swap(props: HTMLMotionProps<'span'>) {
  const present = useIsPresent()
  return <motion.span {...props} aria-hidden={present ? props['aria-hidden'] : true} />
}

/** El texto nuevo sube a su lugar y se enfoca mientras el viejo se levanta, en el mismo hueco. */
function TextSwap({ text, className, reduce, m }: { text: string; className?: string; reduce: boolean; m: MotionSet }) {
  return <AnimatePresence mode="popLayout" initial={false}><Swap key={text} className={className} initial={reduce ? { opacity: 0 } : m.textIn} animate={m.shown} exit={reduce ? { opacity: 0, transition: m.fade } : m.textOut} transition={reduce ? m.fade : m.enter}>{text}</Swap></AnimatePresence>
}

/** Las palabras que cambian suben y se enfocan mientras las que siguen iguales se quedan quietas. La tecnología asistiva lee el texto plano. */
function MotionText({ text, reduce, m }: { text: string; reduce: boolean; m: MotionSet }) {
  const words = text.split(' ')
  return <><span className="sr-only">{text}</span><span className="relative block" aria-hidden="true"><AnimatePresence initial={false} mode="popLayout">{words.map((word, index) => <motion.span key={`${index}:${word}`} className="inline-block whitespace-pre"
    initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.35em', filter: `blur(${BLUR_SOFT}px)` }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: '-0.35em', filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: m.d * 0.8, ease: standard } }}
    transition={reduce ? m.fade : m.enter}>{index < words.length - 1 ? `${word} ` : word}</motion.span>)}</AnimatePresence></span></>
}

/** La fila de error se abre con un resorte y sigue al texto medido: un mensaje largo que salta de línea abre su línea nueva en vez de pegar un tirón. */
function ErrorRow({ text, reduce, m }: { text: string; reduce: boolean; m: MotionSet }) {
  const copyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  useEffect(() => {
    const node = copyRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height, opacity: 1 }} exit={{ height: 0, opacity: 0, transition: reduce ? { duration: 0 } : { height: m.smooth, opacity: m.fade } }} transition={reduce ? { duration: 0 } : { height: m.smooth, opacity: { duration: m.d } }}>
    <motion.div ref={copyRef} className="flex items-start gap-1.5 pt-3 text-sm leading-snug text-(--dz-danger)" role="alert" initial={reduce ? false : { y: '0.35em', filter: `blur(${BLUR_SOFT}px)` }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: reduce ? 0 : m.d * 1.6, ease: enter }}>
      {/* El ícono se apoya en el centro óptico de la primera línea: un mensaje que salta de línea lo deja arriba. */}
      <CircleAlert className="mt-[3px] shrink-0" size={14} strokeWidth={2.25} aria-hidden="true" /><span className="relative min-w-0 flex-1"><MotionText text={text} reduce={reduce} m={m} /></span>
    </motion.div>
  </motion.div>
}

/** El círculo se cierra y después el tilde se dibuja a través. */
function DrawnCheck({ reduce, m }: { reduce: boolean; m: MotionSet }) {
  return <svg className="shrink-0 text-(--dz-ok)" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <motion.path d="M12 2.5a9.5 9.5 0 1 1 0 19a9.5 9.5 0 1 1 0-19" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: m.d * 1.7, ease: enter }} />
    <motion.path d="m8.2 12.4 2.6 2.6 5-5.2" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...m.enter, delay: m.d * 0.9 }} />
  </svg>
}

type RowProps = { item: FileDropzoneItem; reduce: boolean; m: MotionSet; delay: number; fresh: boolean; canRetry: boolean; onRemove: () => void; onRetry: () => void; removeRef: (node: HTMLButtonElement | null) => void }

function Thumb({ item }: { item: FileDropzoneItem }) {
  const [broken, setBroken] = useState(false)
  if (!item.preview || broken) return <span className="grid size-10 place-items-center text-ui-ink-soft @max-[300px]:hidden"><TypeIcon name={item.name} /></span>
  // Sin next/image a propósito: el componente no depende del framework y las miniaturas suelen ser object URLs.
  // eslint-disable-next-line @next/next/no-img-element
  return <span className="block size-10 overflow-hidden rounded-[10px] bg-ui-surface-2 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--ui-ink)_6%,transparent)] @max-[300px]:hidden"><img className="block size-full object-cover" src={item.preview} alt="" width={40} height={40} decoding="async" onError={() => setBroken(true)} /></span>
}

function FileRow({ item, reduce, m, delay, fresh, canRetry, onRemove, onRetry, removeRef }: RowProps) {
  const { status } = item
  const rowRef = useRef<HTMLDivElement>(null)
  // Un fallo sacude la fila una vez: un archivo rechazado al llegar, después de aterrizar; una subida que falla, en el momento en que falla.
  const shakenFor = useRef<FileDropzoneStatus | 'new' | undefined>(fresh ? 'new' : status)
  useEffect(() => {
    const previous = shakenFor.current
    if (status === previous) return
    shakenFor.current = status
    const node = rowRef.current
    if (status !== 'failed' || reduce || !node) return
    animate(node, SHAKE, { ...m.shake, delay: previous === 'new' ? delay + m.d * 1.6 : 0 })
  }, [status, reduce, delay, m])
  // Un solo resorte mueve la barra y el porcentaje contado, así siempre coinciden.
  const progress = useMotionValue(status === 'uploaded' ? 100 : item.progress ?? 0)
  const x = useTransform(progress, value => `${clamp(value) - 100}%`)
  const percent = useTransform(progress, value => `${Math.round(clamp(value))}%`)
  // Una subida terminada conserva la barra hasta que el resorte llega al final, así el 100 % se ve antes de que la etiqueta pase a "Subido".
  const [filled, setFilled] = useState(status !== 'uploading')
  const [seen, setSeen] = useState(status)
  if (seen !== status) { setSeen(status); if (status === 'uploading') setFilled(false) }
  const phase = status === 'uploaded' && !filled && !reduce ? 'uploading' : status
  const target = status === 'uploaded' ? 100 : item.progress ?? 0
  useEffect(() => {
    if (status !== 'uploading' && status !== 'uploaded') return
    // Toda subida arranca con la barra vacía, incluso un reintento que falló a mitad de camino.
    if (reduce || (status === 'uploading' && target === 0)) { progress.jump(target); return }
    const controls = animate(progress, target, { ...m.smooth, onComplete: status === 'uploaded' ? () => setFilled(true) : undefined })
    return () => controls.stop()
  }, [status, target, progress, reduce, m])
  // La etiqueta cambia apenas la cuenta dice 100 %, sin esperar la última fracción de píxel del resorte.
  useMotionValueEvent(progress, 'change', value => { if (status === 'uploaded' && value >= 99.5) setFilled(true) })
  const failed = status === 'failed'
  const retry = failed && canRetry && item.retryable !== false
  return <motion.li className="min-w-0 overflow-hidden" initial={reduce ? { opacity: 0 } : { height: 0 }} animate={{ height: 'auto', opacity: 1 }}
    exit={reduce ? { opacity: 0, transition: m.fade } : { height: 0, opacity: 0, transition: { height: m.collapse, opacity: { ...m.exitFast, delay: m.d * 0.2 } } }}
    transition={reduce ? m.fade : { height: { ...m.smooth, delay }, opacity: m.fade }}>
    {/* Las filas nuevas suben un poco y se enfocan mientras abren su alto, así las de abajo hacen lugar en vez de saltar. */}
    <motion.div ref={rowRef} data-row="" data-failed={failed ? '' : undefined} className="relative mt-2 grid min-h-[58px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-ui border border-ui-line bg-ui-surface py-2 pr-2 pl-[9px] transition-[border-color] duration-[calc(var(--ui-dur)*1.6)] ease-ui data-[failed]:[border-color:color-mix(in_oklch,var(--dz-danger)_26%,var(--ui-line))] motion-reduce:transition-none @max-[300px]:grid-cols-[minmax(0,1fr)_auto] @max-[300px]:pl-3.5" initial={reduce ? false : { opacity: 0, y: -22, scale: 0.94, filter: `blur(${BLUR_SOFT}px)` }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={reduce ? undefined : { scale: 0.97, filter: `blur(${BLUR_SUBTLE}px)`, transition: m.exitFast }}
      transition={reduce ? m.instant : { y: { ...m.land, delay }, scale: { ...m.land, delay }, opacity: { ...m.enter, delay }, filter: { ...m.enter, delay } }}>
      <Thumb item={item} />
      <span className="grid min-w-0">
        <span className="overflow-hidden text-sm leading-snug font-medium text-ellipsis whitespace-nowrap" title={item.name}>{item.name}</span>
        <span className="mt-px flex min-w-0 items-center text-xs leading-snug whitespace-nowrap text-ui-ink-muted tabular-nums">
          <span>{formatFileSize(item.size)}</span>
          {phase && <><span className="px-1.5" aria-hidden="true">·</span><span className="relative flex min-w-0 flex-1"><AnimatePresence mode="popLayout" initial={false}>
            <Swap key={phase} className={`inline-flex min-w-0 items-center gap-[5px] ${phase === 'uploaded' ? 'text-ui-ink-soft' : phase === 'failed' ? 'text-(--dz-danger)' : ''}`} initial={reduce ? { opacity: 0 } : m.textIn} animate={m.shown} exit={reduce ? { opacity: 0, transition: m.fade } : m.textOut} transition={reduce ? m.fade : m.enter}>
              {phase === 'uploading' ? <span>Subiendo <motion.span className="tabular-nums">{percent}</motion.span></span>
                : phase === 'uploaded' ? <><DrawnCheck reduce={reduce} m={m} /><span>Subido</span></>
                : <><CircleAlert className="shrink-0" size={14} strokeWidth={2.25} aria-hidden="true" /><span className="min-w-0 overflow-hidden text-ellipsis" title={item.error}><span className="sr-only">Falló: </span>{item.error || 'No se pudo subir'}</span></>}
            </Swap>
          </AnimatePresence></span></>}
        </span>
        {/* La barra se abre con la subida, se llena con un resorte y se pliega justo después de que el tilde se dibuja. */}
        <AnimatePresence initial={false}>{phase === 'uploading' && <motion.span key="bar" className="block overflow-hidden" initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
          exit={reduce ? { opacity: 0, transition: m.fade } : { height: 0, opacity: 0, transition: { height: { ...m.collapse, delay: m.d * 1.2 }, opacity: { ...m.exitFast, delay: m.d * 0.9 } } }}
          transition={reduce ? m.fade : { height: m.smooth, opacity: m.enter }}>
          <span className="mt-[7px] mb-0.5 block h-1 overflow-hidden rounded-full bg-ui-line" role="progressbar" aria-label={`Subiendo ${item.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp(target))}>
            {/* El relleno entra deslizándose desde la izquierda en vez de escalar, así su punta redonda conserva la forma a cualquier valor. */}
            <motion.span className="block size-full rounded-[inherit] bg-ui-accent" style={{ x }} />
          </span>
        </motion.span>}</AnimatePresence>
      </span>
      <span className="flex items-center">
        {/* Reintentar abre su propio ancho, así la columna del nombre se angosta con un resorte en vez de perder lugar en un cuadro. */}
        <AnimatePresence initial={false}>{retry && <motion.span key="retry" className="flex overflow-hidden" initial={reduce ? { opacity: 0 } : { width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }}
          exit={reduce ? { opacity: 0, transition: m.fade } : { width: 0, opacity: 0, transition: { width: m.collapse, opacity: m.fade } }}
          transition={reduce ? m.fade : { width: m.smooth, opacity: m.enter }}>
          <motion.span className="flex py-[3px] pr-1.5 pl-[3px]" initial={reduce ? false : { scale: 0.8, filter: `blur(${BLUR_SUBTLE}px)` }} animate={{ scale: 1, filter: 'blur(0px)' }} transition={reduce ? m.instant : m.snappy}>
            <button type="button" data-retry="" className="flex h-[30px] cursor-pointer items-center gap-[5px] rounded-full border border-ui-line bg-ui-surface pr-3 pl-2.5 text-xs font-medium whitespace-nowrap text-ui-ink transition-[background-color,color,border-color,transform] duration-(--ui-dur) ease-ui hover:border-(--dz-edge) hover:bg-ui-surface-2 active:scale-[.97] focus-visible:shadow-[0_0_0_2px_var(--dz-ring)] focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:transform-none @max-[440px]:w-[30px] @max-[440px]:justify-center @max-[440px]:p-0" onClick={onRetry} aria-label={`Reintentar ${item.name}`} title="Reintentar"><RotateCw size={14} strokeWidth={2} aria-hidden="true" /><span className="@max-[440px]:hidden">Reintentar</span></button>
          </motion.span>
        </motion.span>}</AnimatePresence>
        <button ref={removeRef} type="button" data-remove="" className="grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ui-ink-soft transition-[background-color,color,transform] duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 hover:text-ui-ink active:scale-[.97] focus-visible:shadow-[0_0_0_2px_var(--dz-ring)] focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:transform-none" onClick={onRemove} aria-label={`Quitar ${item.name}`} title="Quitar"><X size={16} strokeWidth={1.75} aria-hidden="true" /></button>
      </span>
    </motion.div>
  </motion.li>
}

/**
 * Una zona generosa para soltar uno o varios archivos, con selector al hacer clic y pegado desde el portapapeles. Tres hojas de
 * papel se abren al pasar el mouse y se abren más cuando hay un archivo encima; el borde punteado se cierra en una línea
 * continua y una luz sigue al puntero. Cada archivo cae a la lista con su tipo, su tamaño, progreso y estado (Subiendo,
 * Subido, Falló con reintentar), y se puede quitar. Los tipos no aceptados y los que pesan de más se rechazan con una sacudida.
 */
export function FileDropzone({ accept, multiple = true, maxFiles = 5, onFilesChange, label = 'Agregá archivos', description = 'Arrastrá archivos acá o elegilos desde tu dispositivo', defaultItems, onUpload, maxSize, listPlacement = 'below', note, dropLabel, compactAt, className }: FileDropzoneProps) {
  const [items, setItems] = useState<FileDropzoneItem[]>(() => defaultItems ?? [])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  // Índice de la primera fila de la última tanda, así sólo esa tanda entra escalonada.
  const [batchStart, setBatchStart] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLButtonElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const edgeRef = useRef<SVGRectElement>(null)
  const dragDepth = useRef(0)
  const nextId = useRef(0)
  const controllers = useRef(new Map<string, AbortController>())
  const removeRefs = useRef(new Map<string, HTMLButtonElement>())
  const descriptionId = useId()
  const noteId = useId()
  const reduce = useReducedFlag()
  const d = useDur()
  const m = useMemo(() => makeMotion(d), [d])
  const inside = listPlacement === 'inside'
  const compact = compactAt !== undefined && items.length >= compactAt
  // Filas que la persona agregó en esta sesión: sólo éstas vuelan al entrar y se sacuden si se rechazan.
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(() => new Set())
  // Las miniaturas hechas acá son object URLs: se liberan cuando su fila se va o el componente se desmonta.
  const ownedPreviews = useRef(new Map<string, string>())
  const [hovered, setHovered] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)

  useEffect(() => {
    const active = controllers.current
    const previews = ownedPreviews.current
    return () => { active.forEach(controller => controller.abort()); previews.forEach(url => URL.revokeObjectURL(url)) }
  }, [])

  /* La luz del arrastre: un brillo suave en el borde y un lavado tenue que siguen al puntero con un resorte, así el contorno se inclina hacia el archivo. */
  const pointerX = useMotionValue(50), pointerY = useMotionValue(50)
  const glowSpring = { stiffness: 260, damping: 32, mass: 0.8 }
  const glowX = useSpring(pointerX, glowSpring), glowY = useSpring(pointerY, glowSpring)
  const edgeLight = useMotionTemplate`radial-gradient(180px circle at ${glowX}% ${glowY}%, var(--ui-accent), transparent 70%)`
  const washLight = useMotionTemplate`radial-gradient(260px circle at ${glowX}% ${glowY}%, color-mix(in oklch, var(--ui-accent) 6%, transparent), transparent 70%)`
  const track = (event: DragEvent) => {
    const zone = zoneRef.current
    if (!zone) return
    const box = zone.getBoundingClientRect()
    const x = ((event.clientX - box.left) / Math.max(1, box.width)) * 100, y = ((event.clientY - box.top) / Math.max(1, box.height)) * 100
    if (reduce || !dragging) { pointerX.jump(x); pointerY.jump(y); glowX.jump(x); glowY.jump(y) }
    else { pointerX.set(x); pointerY.set(y) }
  }

  const shakeZone = () => { if (!reduce && zoneRef.current) animate(zoneRef.current, SHAKE, m.shake) }

  // El borde punteado se dibuja, no se bordea, así sus guiones pueden cerrarse en una línea continua. Su largo se ajusta al
  // perímetro medido, así cada guión mide lo mismo y la costura nunca se ve, a cualquier ancho o alto de lista.
  useLayoutEffect(() => {
    const zone = zoneRef.current, edge = edgeRef.current
    if (!zone || !edge) return
    const fit = () => {
      const width = zone.offsetWidth - 1, height = zone.offsetHeight - 1
      const radius = Math.max(0, Math.min(parseFloat(getComputedStyle(zone).borderTopLeftRadius) - 0.5, width / 2, height / 2))
      const perimeter = 2 * (width + height) - 8 * radius + 2 * Math.PI * radius
      edge.setAttribute('rx', String(radius))
      edge.setAttribute('pathLength', String(Math.max(8, Math.round(perimeter / PERIOD)) * PERIOD))
    }
    fit()
    // Una zona que se pliega también transiciona su radio, así el borde la sigue en cada cuadro de esa transición.
    let frame = 0
    const follow = () => { fit(); frame = requestAnimationFrame(follow) }
    const onRun = (event: TransitionEvent) => { if (event.target === zone && event.propertyName.includes('radius')) { cancelAnimationFrame(frame); follow() } }
    const onEnd = (event: TransitionEvent) => { if (event.target === zone && event.propertyName.includes('radius')) { cancelAnimationFrame(frame); fit() } }
    zone.addEventListener('transitionrun', onRun)
    zone.addEventListener('transitionend', onEnd)
    zone.addEventListener('transitioncancel', onEnd)
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit)
    observer?.observe(zone)
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); zone.removeEventListener('transitionrun', onRun); zone.removeEventListener('transitionend', onEnd); zone.removeEventListener('transitioncancel', onEnd) }
  }, [])

  const filesOf = (list: FileDropzoneItem[]) => list.flatMap(item => item.file ? [item.file] : [])
  const patch = (id: string, next: (item: FileDropzoneItem) => FileDropzoneItem) => setItems(current => current.map(item => item.id === id ? next(item) : item))

  function startUpload(item: FileDropzoneItem) {
    if (!onUpload) return
    controllers.current.get(item.id)?.abort()
    const controller = new AbortController()
    controllers.current.set(item.id, controller)
    patch(item.id, current => ({ ...current, status: 'uploading', progress: 0, error: undefined }))
    onUpload({ ...item, status: 'uploading', progress: 0, error: undefined }, {
      signal: controller.signal,
      onProgress: percent => { if (!controller.signal.aborted) patch(item.id, current => current.status === 'uploading' ? { ...current, progress: Math.max(current.progress ?? 0, clamp(percent)) } : current) },
    }).then(() => {
      if (controller.signal.aborted) return
      patch(item.id, current => ({ ...current, status: 'uploaded', progress: 100 }))
      setAnnouncement(`${item.name} subido`)
    }, (reason: unknown) => {
      if (controller.signal.aborted) return
      const message = reason instanceof Error && reason.message ? reason.message : 'No se pudo subir'
      patch(item.id, current => ({ ...current, status: 'failed', error: message, retryable: true }))
      setAnnouncement(`${item.name} falló. ${message}`)
    }).finally(() => { if (controllers.current.get(item.id) === controller) controllers.current.delete(item.id) })
  }

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming)
    const accepted = accept?.split(',').map(value => value.trim().toLowerCase()).filter(Boolean) ?? []
    const matching = list.filter(file => accepted.length === 0 || accepted.some(type => type.startsWith('.') ? file.name.toLowerCase().endsWith(type) : type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : file.type === type))
    const kept = multiple ? items : []
    const same = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
    const fresh = matching.filter((file, index) => matching.findIndex(other => same(other, file)) === index && !kept.some(item => item.file && same(item.file, file)))
    const room = multiple ? Math.max(0, maxFiles - kept.length) : 1
    const added = fresh.slice(0, room).map((file): FileDropzoneItem => {
      const tooLarge = maxSize !== undefined && file.size > maxSize
      const id = `${file.name}-${file.size}-${file.lastModified}-${nextId.current++}`
      const preview = file.type.startsWith('image/') && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined
      if (preview) ownedPreviews.current.set(id, preview)
      return { id, name: file.name, size: file.size, file, preview, status: tooLarge ? 'failed' : onUpload ? 'uploading' : undefined, progress: 0, error: tooLarge ? `Pesa más de ${formatFileSize(maxSize)}` : undefined, retryable: !tooLarge }
    })
    const rejected = matching.length !== list.length
    const overflow = fresh.length > added.length
    setError(rejected ? (list.length - matching.length === 1 && list.length === 1 ? `${list[0].name} no es un tipo de archivo aceptado.` : 'Algunos archivos no se agregaron porque su tipo no está aceptado.') : overflow ? `Podés agregar hasta ${plural(maxFiles, 'archivo', 'archivos')}.` : '')
    if (rejected || overflow) shakeZone()
    if (!added.length) return
    if (!multiple) { controllers.current.forEach(controller => controller.abort()); controllers.current.clear() }
    const next = [...kept, ...added]
    setFreshIds(current => new Set([...current, ...added.map(item => item.id)]))
    setBatchStart(kept.length)
    setItems(current => multiple ? [...current, ...added] : added)
    onFilesChange?.(filesOf(next))
    const failed = added.filter(item => item.status === 'failed')
    setAnnouncement(`${added.length === 1 ? '1 archivo agregado' : `${added.length} archivos agregados`}.${failed.length ? ` ${failed.map(item => `${item.name}: ${item.error}`).join('. ')}.` : ''}`)
    added.filter(item => item.status === 'uploading').forEach(startUpload)
  }

  // El foco se queda en la lista: el botón de quitar de la fila siguiente, si no el de la anterior, si no la zona.
  function removeItem(target: FileDropzoneItem) {
    controllers.current.get(target.id)?.abort()
    controllers.current.delete(target.id)
    const index = items.findIndex(item => item.id === target.id)
    const neighbor = items[index + 1] ?? items[index - 1]
    const next = items.filter(item => item.id !== target.id)
    const preview = ownedPreviews.current.get(target.id)
    // La fila conserva su miniatura mientras se cierra; después se libera la URL.
    if (preview) { ownedPreviews.current.delete(target.id); window.setTimeout(() => URL.revokeObjectURL(preview), 600) }
    setItems(current => current.filter(item => item.id !== target.id))
    setError('')
    setAnnouncement(`${target.name} quitado`)
    if (target.file) onFilesChange?.(filesOf(next))
    requestAnimationFrame(() => (neighbor ? removeRefs.current.get(neighbor.id) : dropRef.current)?.focus())
  }

  // El botón de reintentar se va con el fallo, así el foco pasa al botón de quitar de la fila.
  function retryItem(item: FileDropzoneItem) {
    setAnnouncement(`Reintentando ${item.name}`)
    startUpload(item)
    requestAnimationFrame(() => removeRefs.current.get(item.id)?.focus())
  }

  // Arriba y abajo mueven entre filas conservando la misma acción. Suprimir o Retroceso quitan la fila con foco.
  function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-row]')
      const remove = row?.querySelector<HTMLButtonElement>('[data-remove]')
      if (remove) { event.preventDefault(); remove.click() }
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const button = (event.target as HTMLElement).closest('button')
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-row]'))
    const row = button?.closest<HTMLElement>('[data-row]')
    if (!button || !row) return
    const nextRow = rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)]
    if (!nextRow) return
    event.preventDefault()
    ;(nextRow.querySelector<HTMLButtonElement>(button.hasAttribute('data-retry') ? '[data-retry]' : '[data-remove]') ?? nextRow.querySelector<HTMLButtonElement>('[data-remove]'))?.focus()
  }

  // Pegar funciona mientras el puntero está sobre la zona o el foco está adentro: una captura en el portapapeles queda a una tecla.
  const pasteArmed = hovered || focusWithin
  const addRef = useRef(addFiles)
  useLayoutEffect(() => { addRef.current = addFiles })
  useEffect(() => {
    if (!pasteArmed) return
    const onPaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files
      if (!files?.length) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input:not([type=file]), textarea, [contenteditable='true']")) return
      event.preventDefault()
      addRef.current(files)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [pasteArmed])

  const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
  const dropCopy = dropLabel ?? (onUpload ? 'Soltá para subir' : multiple ? 'Soltá para agregar archivos' : 'Soltá para agregar el archivo')
  const noteCopy = note ?? (accept ? `Se acepta: ${accept}` : `Hasta ${plural(maxFiles, 'archivo', 'archivos')}`)
  // Los huecos abren y pliegan su propio alto, así la zona cambia de forma con un resorte en vez de en un cuadro.
  const slot = { initial: reduce ? { opacity: 0 } : { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: reduce ? { opacity: 0, transition: m.fade } : { height: 0, opacity: 0, transition: { height: m.collapse, opacity: m.exitFast } }, transition: reduce ? m.fade : { height: m.smooth, opacity: m.enter } }
  const rowsInside = inside && items.length > 0
  const vars = { '--dz-danger': TONE_DANGER, '--dz-ok': TONE_OK, '--dz-edge': 'color-mix(in oklch, var(--ui-ink-muted) 55%, var(--ui-line))', '--dz-ring': 'color-mix(in oklch, var(--ui-accent) 28%, transparent)' } as CSSProperties
  const sheet = 'absolute inset-0 grid [place-items:end_center] rounded-[7px] border border-ui-line bg-ui-surface pb-[5px] text-ui-ink-muted shadow-[0_1px_2px_color-mix(in_oklch,var(--ui-ink)_5%,transparent),0_3px_8px_color-mix(in_oklch,var(--ui-ink)_4%,transparent)] origin-[50%_100%] [transform:translate(var(--x),var(--y))_rotate(var(--r))] transition-[transform,color,border-color] [transition-duration:calc(var(--ui-dur)*2.3),calc(var(--ui-dur)*1.6),calc(var(--ui-dur)*1.6)] [transition-timing-function:cubic-bezier(.34,1.3,.64,1),var(--ui-ease),var(--ui-ease)] motion-reduce:transition-none before:absolute before:top-2 before:left-[7px] before:h-0.5 before:w-4 before:rounded-sm before:bg-current before:opacity-30 before:content-[\'\'] after:absolute after:top-[13px] after:left-[7px] after:h-0.5 after:w-[11px] after:rounded-sm after:bg-current after:opacity-30 after:content-[\'\'] group-data-[dragging]:border-(--dz-edge) group-data-[dragging]:text-ui-ink-soft'

  // El relleno propio de la lista se abre con la primera fila, así el hueco debajo de la zona nunca aparece en un cuadro.
  const list = <motion.ul className={`@container m-0 grid min-w-0 list-none p-0${inside ? ' px-3' : ''}`} aria-label="Archivos" aria-hidden={items.length ? undefined : true} onKeyDown={moveFocus} initial={false}
    animate={{ paddingTop: items.length && !inside ? 4 : 0, paddingBottom: items.length && inside ? 12 : 0 }} transition={reduce ? m.instant : m.smooth}>
    <AnimatePresence initial={false}>{items.map((item, index) => <FileRow key={item.id} item={item} reduce={reduce} m={m} delay={reduce ? 0 : Math.min(Math.max(0, index - batchStart), 7) * d * 0.4} fresh={freshIds.has(item.id)} canRetry={!!onUpload}
      onRemove={() => removeItem(item)} onRetry={() => retryItem(item)} removeRef={node => { if (node) removeRefs.current.set(item.id, node); else removeRefs.current.delete(item.id) }} />)}</AnimatePresence>
  </motion.ul>

  // Sin gap en la grilla: la fila de error y la lista llevan su propio espacio, así cada una puede abrirse desde un alto cero de verdad.
  return <div className={`relative grid min-w-0 font-ui-text text-ui-ink${className ? ` ${className}` : ''}`} style={vars} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocus={() => setFocusWithin(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false) }}>
    {/* Un archivo encima cierra los guiones en un borde continuo y la zona respira, despacio, mientras espera. El color es la única respuesta al clic: la zona nunca escala. */}
    <motion.div ref={zoneRef} data-dropzone="" data-dragging={dragging ? '' : undefined} data-compact={compact ? '' : undefined}
      className="group relative grid min-w-0 rounded-ui-lg bg-ui-surface transition-[background-color,border-radius] duration-[calc(var(--ui-dur)*1.6)] ease-ui has-[button:hover]:bg-ui-surface-2 has-[button:active]:bg-ui-surface-2 has-[button:focus-visible]:shadow-[0_0_0_3px_var(--dz-ring)] data-[compact]:rounded-ui data-[dragging]:bg-[color-mix(in_oklch,var(--ui-accent)_2.5%,var(--ui-surface))] motion-reduce:transition-none"
      animate={dragging && !reduce ? { scale: [1, 1.012, 1] } : { scale: 1 }} transition={dragging && !reduce ? { duration: d * 12, repeat: Infinity, ease: 'easeInOut' } : m.instant}
      onDragEnter={event => { if (!carriesFiles(event)) return; event.preventDefault(); if (!dragDepth.current) track(event); dragDepth.current += 1; setDragging(true) }}
      onDragOver={event => { if (!carriesFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; track(event) }}
      onDragLeave={event => { if (!carriesFiles(event)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files) }}>
      {/* Luz que sigue al puntero: un lavado adentro y un tramo más brillante del borde, el más cercano al archivo. */}
      <motion.span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-[calc(var(--ui-dur)*1.6)] ease-ui group-data-[dragging]:opacity-100 motion-reduce:transition-none" style={{ backgroundImage: washLight }} aria-hidden="true" />
      <svg className="pointer-events-none absolute top-[0.5px] left-[0.5px] h-[calc(100%-1px)] w-[calc(100%-1px)] overflow-visible" aria-hidden="true">
        <rect ref={edgeRef} className="fill-none stroke-(--dz-edge) [stroke-dasharray:3.5_3.5] [stroke-dashoffset:0] [stroke-width:1] transition-[stroke,stroke-dasharray,stroke-dashoffset] duration-[calc(var(--ui-dur)*1.6)] ease-ui group-has-[button:hover]:stroke-ui-ink-muted group-data-[dragging]:[stroke:color-mix(in_oklch,var(--ui-accent)_40%,var(--ui-line))] group-data-[dragging]:[stroke-dasharray:7_0] group-data-[dragging]:[stroke-dashoffset:1.75] motion-reduce:transition-none" width="100%" height="100%" rx={33.5} pathLength={1358} />
      </svg>
      <motion.span className="pointer-events-none absolute inset-0 rounded-[inherit] p-[1.5px] opacity-0 transition-opacity duration-[calc(var(--ui-dur)*1.6)] ease-ui group-data-[dragging]:opacity-100 motion-reduce:transition-none" style={{ backgroundImage: edgeLight, WebkitMask: 'linear-gradient(currentColor 0 0) content-box, linear-gradient(currentColor 0 0)', WebkitMaskComposite: 'xor', mask: 'linear-gradient(currentColor 0 0) content-box exclude, linear-gradient(currentColor 0 0)' }} aria-hidden="true" />
      {/* Los hijos ignoran el puntero, así toda la zona es un solo blanco para clics y arrastres. */}
      <motion.button ref={dropRef} type="button" className="flex w-full cursor-pointer flex-col items-stretch justify-center rounded-[inherit] border-0 bg-transparent px-5 text-center outline-none [&>*]:pointer-events-none" onClick={() => inputRef.current?.click()} aria-describedby={compact ? descriptionId : `${descriptionId} ${noteId}`}
        initial={false} animate={{ paddingTop: compact ? 16 : 26, paddingBottom: compact ? (rowsInside ? 8 : 16) : rowsInside ? 26 : 34 }} transition={reduce ? m.instant : m.smooth}>
        {/* Tres hojas se abren en abanico al pasar el mouse y se abren más debajo de un archivo; una zona plegada las vuelve a abrir para recibirlo. */}
        <AnimatePresence initial={false}>{(!compact || dragging) && <motion.span key="icon" className="flex flex-col overflow-hidden" {...slot}>
          <span className="relative mt-2.5 mb-3.5 block h-11 w-9 self-center" aria-hidden="true">
            <span className={`${sheet} [--r:-10deg] [--x:-9px] [--y:2px] group-has-[button:hover]:[--r:-15deg] group-has-[button:hover]:[--x:-13px] group-data-[dragging]:[--r:-22deg]! group-data-[dragging]:[--x:-20px]! group-data-[dragging]:[--y:-2px]!`} />
            <span className={`${sheet} [--r:10deg] [--x:9px] [--y:2px] group-has-[button:hover]:[--r:15deg] group-has-[button:hover]:[--x:13px] group-data-[dragging]:[--r:22deg]! group-data-[dragging]:[--x:20px]! group-data-[dragging]:[--y:-2px]!`} />
            <span className={`${sheet} [--r:0deg] [--x:0px] [--y:0px] group-has-[button:hover]:[--y:-2px] group-data-[dragging]:[--y:-8px]!`}>
              <ArrowUp className="transition-transform duration-[calc(var(--ui-dur)*2.3)] ease-[cubic-bezier(.34,1.3,.64,1)] group-data-[dragging]:-translate-y-[3px] motion-reduce:transition-none" size={14} strokeWidth={2} />
            </span>
          </span>
        </motion.span>}</AnimatePresence>
        {/* Ancho completo y texto centrado: la caja del título nunca se mueve, así un título saliente se va exactamente de donde estaba. */}
        <strong className="relative block text-sm leading-snug font-medium"><TextSwap text={dragging ? dropCopy : label} className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-top" reduce={reduce} m={m} /></strong>
        <span id={descriptionId} className="mt-1.5 text-sm leading-snug text-ui-ink-soft">{description}</span>
        <AnimatePresence initial={false}>{!compact && <motion.span key="note" className="flex flex-col overflow-hidden" {...slot}><small id={noteId} className="block pt-1.5 text-xs leading-snug text-ui-ink-muted">{noteCopy}</small></motion.span>}</AnimatePresence>
      </motion.button>
      {inside && list}
    </motion.div>
    <input ref={inputRef} className="sr-only" type="file" accept={accept} multiple={multiple} tabIndex={-1} aria-hidden="true" onChange={event => { if (event.target.files) addFiles(event.target.files); event.target.value = '' }} />
    <AnimatePresence initial={false}>{error ? <ErrorRow key="error" text={error} reduce={reduce} m={m} /> : null}</AnimatePresence>
    {!inside && list}
    <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
  </div>
}

export default FileDropzone
