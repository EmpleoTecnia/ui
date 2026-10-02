'use client'
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion, type Transition } from 'motion/react'
import { Check, Download, Eraser, Play, Redo2, Square, Undo2, X } from 'lucide-react'

/** Un punto muestreado: posición en unidades del pad, presión del lápiz entre 0 y 1 (o -1 si el dispositivo no tiene) y ms desde que empezó el trazo. */
export interface InkPoint { x: number; y: number; p: number; t: number }
export type InkColor = 'black' | 'blue' | 'violet'
export type InkWidth = 'fine' | 'medium' | 'bold'
export interface InkStroke {
  id: string
  points: InkPoint[]
  color: InkColor
  width: InkWidth
  /** Cuándo empezó el trazo, en ms. La reproducción respeta el ritmo real entre trazos. */
  at: number
}

export interface OutlineOptions {
  /** Diámetro del trazo a media presión, en unidades del pad. */
  size: number
  /** Cuánto cambia el ancho con la presión, de 0 a 1. */
  thinning?: number
  /** Cuánto se atrasa cada punto respecto del puntero, de 0 a 1. Más alto es más suave pero se retrasa más. */
  streamline?: number
  /** Deducir la presión de la velocidad cuando el dispositivo no la informa: rápido es fino, lento es pleno. */
  simulatePressure?: boolean
  /** Largo en el que se afinan el principio y el final, en unidades del pad. */
  taperStart?: number
  taperEnd?: number
  /** Falso mientras el trazo todavía se está dibujando, así el final no se afina antes de tiempo. */
  last?: boolean
}

/** Coordenadas del pad. Los trazos se guardan en este espacio y escalan con el pad. */
export const PAD_WIDTH = 600, PAD_HEIGHT = 260

/** Cada tinta tiene un color de pantalla (sigue el tema) y uno de impresión (siempre oscuro, para el archivo exportado).
 *  Los tres se derivan de los tokens: negro es la tinta de la app; azul y violeta toman luz y saturación del acento con el matiz fijo. */
const INK: Record<InkColor, { label: string; screen: string; print: string }> = {
  black: { label: 'Tinta negra', screen: 'var(--ui-ink)', print: 'oklch(from var(--ui-ink) min(l, 0.25) c h)' },
  blue: { label: 'Tinta azul', screen: 'oklch(from var(--ui-accent) clamp(0.42, l, 0.76) 0.17 262)', print: 'oklch(from var(--ui-accent) 0.46 0.17 262)' },
  violet: { label: 'Tinta violeta', screen: 'oklch(from var(--ui-accent) clamp(0.45, l, 0.77) 0.2 292)', print: 'oklch(from var(--ui-accent) 0.49 0.2 292)' },
}
const WIDTHS: Record<InkWidth, { label: string; size: number }> = {
  fine: { label: 'Fina', size: 3.4 },
  medium: { label: 'Media', size: 5.6 },
  bold: { label: 'Gruesa', size: 8.4 },
}
const COLORS = Object.keys(INK) as InkColor[]
const SIZES = Object.keys(WIDTHS) as InkWidth[]
/** Verde semántico: luz y saturación del acento, matiz fijo. */
const TONE_OK = 'oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) 150)'

type Vec = [number, number]
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]]
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]]
const mul = (a: Vec, n: number): Vec => [a[0] * n, a[1] * n]
const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1])
const norm = (a: Vec): Vec => { const l = Math.hypot(a[0], a[1]); return l ? [a[0] / l, a[1] / l] : [0, 0] }
const perp = (a: Vec): Vec => [a[1], -a[0]]
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1]
const rotAround = (p: Vec, c: Vec, r: number): Vec => {
  const s = Math.sin(r), co = Math.cos(r), px = p[0] - c[0], py = p[1] - c[1]
  return [px * co - py * s + c[0], px * s + py * co + c[1]]
}
const easeOut = (t: number) => t * (2 - t)

/**
 * Convierte los puntos muestreados en el contorno de un trazo de ancho variable, en el espíritu de perfect-freehand. Los puntos
 * se suavizan hacia el puntero, el ancho sigue la presión del lápiz o, con mouse o dedo, la velocidad; las puntas se afinan, los
 * giros cerrados reciben uniones redondas y los dos extremos, remates redondos. Devuelve el polígono; pasalo a `outlineToPath`.
 */
export function getStrokeOutline(input: InkPoint[], options: OutlineOptions): Vec[] {
  const { size, thinning = 0.62, streamline = 0.42, simulatePressure = true, taperStart = 0, taperEnd = 0, last = true } = options
  if (!input.length) return []
  const usePen = !simulatePressure && input.some(point => point.p > 0)

  // Suavizado: cada punto se acerca al dato crudo, lo que quita el temblor sin una pasada extra.
  const pts: { at: Vec; pressure: number; length: number; vector: Vec }[] = []
  let prev: Vec = [input[0].x, input[0].y], length = 0
  pts.push({ at: prev, pressure: usePen ? input[0].p : 0.5, length: 0, vector: [1, 0] })
  for (let i = 1; i < input.length; i++) {
    const raw: Vec = [input[i].x, input[i].y]
    const at = i === input.length - 1 && last ? raw : lerp(prev, raw, 1 - streamline)
    const d = dist(at, prev)
    if (d < 0.4) continue
    length += d
    pts.push({ at, pressure: usePen ? input[i].p : 0.5, length, vector: norm(sub(prev, at)) })
    prev = at
  }
  if (pts.length > 1) pts[0].vector = pts[1].vector
  const total = length

  // Un punto solo: una marca redonda del tamaño de la primera presión.
  if (pts.length === 1) {
    const r = Math.max(0.6, size * (0.5 - thinning * (0.5 - pts[0].pressure)) * 0.9)
    return Array.from({ length: 18 }, (_, i) => add(pts[0].at, mul([Math.cos(i / 18 * Math.PI * 2), Math.sin(i / 18 * Math.PI * 2)], r)))
  }

  const left: Vec[] = [], right: Vec[] = []
  let pressure = pts[0].pressure, prevVector = pts[0].vector
  for (let i = 0; i < pts.length; i++) {
    const point = pts[i]
    if (!usePen) {
      // La velocidad afina la línea: un paso largo entre muestras se lee como un trazo rápido.
      const step = i === 0 ? 0 : dist(point.at, pts[i - 1].at)
      const speed = Math.min(1, step / size)
      const target = Math.min(1, 1 - speed)
      pressure = Math.min(1, pressure + (target - pressure) * speed * 0.3)
    } else {
      pressure = point.pressure
    }
    let radius = Math.max(0.25, size * (0.5 - thinning * (0.5 - pressure)))
    const ts = taperStart ? easeOut(Math.min(1, point.length / taperStart)) : 1
    const te = taperEnd && last ? easeOut(Math.min(1, (total - point.length) / taperEnd)) : 1
    radius = Math.max(0.12 * size, radius * Math.min(ts, te))

    const next = pts[i + 1]?.vector ?? point.vector
    const offset = mul(perp(lerp(next, point.vector, 0.5)), radius)
    // Un giro cerrado: se barre la esquina para que el contorno no se pellizque.
    if (i > 0 && i < pts.length - 1 && dot(point.vector, next) < -0.2) {
      const corner = mul(perp(prevVector), radius)
      for (let t = 0; t <= 1; t += 1 / 12) {
        left.push(rotAround(sub(point.at, corner), point.at, Math.PI * t))
        right.push(rotAround(add(point.at, corner), point.at, -Math.PI * t))
      }
    } else {
      left.push(sub(point.at, offset))
      right.push(add(point.at, offset))
    }
    prevVector = point.vector
  }

  // Remates redondos: medios círculos alrededor del primer y el último punto, del lado que mira hacia afuera del trazo.
  const cap = (center: Vec, from: Vec, to: Vec, away: Vec) => {
    const out: Vec[] = []
    const r = dist(center, from), start = Math.atan2(from[1] - center[1], from[0] - center[0])
    const mid = start + Math.PI / 2
    const sign = dot([Math.cos(mid), Math.sin(mid)], away) >= 0 ? 1 : -1
    for (let k = 1; k < 12; k++) {
      const a = start + sign * Math.PI * k / 12
      out.push([center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r])
    }
    out.push(to)
    return out
  }
  const first = pts[0], end = pts[pts.length - 1]
  const endCap = cap(end.at, left[left.length - 1], right[right.length - 1], mul(end.vector, -1))
  const startCap = cap(first.at, right[0], left[0], first.vector)
  return [...left, ...endCap, ...right.reverse(), ...startCap]
}

const round = (value: number) => Math.round(value * 100) / 100
/** Dibuja un contorno como un solo camino cerrado y suave, con curvas cuadráticas por los puntos medios de sus lados. */
export function outlineToPath(points: Vec[]) {
  if (points.length < 3) return ''
  let d = `M${round(points[0][0])} ${round(points[0][1])} Q`
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length]
    d += `${round(x0)} ${round(y0)} ${round((x0 + x1) / 2)} ${round((y0 + y1) / 2)} `
  }
  return `${d}Z`
}

function strokeOptions(stroke: Pick<InkStroke, 'width' | 'points'>, last: boolean): OutlineOptions {
  const size = WIDTHS[stroke.width].size
  const pen = stroke.points.some(point => point.p > 0)
  return { size, simulatePressure: !pen, taperStart: size * 1.5, taperEnd: pen ? 0 : size * 5, last }
}
/** El camino SVG de un trazo, o de sus primeros `upTo` ms mientras se reproduce. */
export function strokePath(stroke: Pick<InkStroke, 'width' | 'points'>, upTo = Infinity) {
  const all = stroke.points
  const done = upTo >= all[all.length - 1].t
  const points = done ? all : all.filter(point => point.t <= upTo)
  return outlineToPath(getStrokeOutline(points, strokeOptions(stroke, done)))
}

/** Límites ajustados de la tinta, con margen, para exportar. */
function inkBounds(strokes: InkStroke[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const stroke of strokes) for (const point of stroke.points) {
    minX = Math.min(minX, point.x); minY = Math.min(minY, point.y); maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y)
  }
  const pad = 16
  return { x: Math.floor(minX - pad), y: Math.floor(minY - pad), width: Math.ceil(maxX - minX + pad * 2), height: Math.ceil(maxY - minY + pad * 2) }
}

/** Colores de impresión por tinta, ya resueltos a un valor absoluto que entienden el SVG y el canvas. */
export type InkPalette = Record<InkColor, string>
const PRINT_PALETTE: InkPalette = { black: INK.black.print, blue: INK.blue.print, violet: INK.violet.print }

/** Resuelve un color escrito con tokens al valor concreto que tiene dentro de `host`, en hexadecimal. Es dato del archivo exportado. */
function resolveColor(host: HTMLElement, css: string): string {
  const probe = document.createElement('span')
  probe.style.color = css
  host.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return computed
  ctx.fillStyle = computed
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('') // color-ok: es el color de tinta resuelto, dato del archivo
}
/** La paleta de impresión resuelta dentro de un nodo de la app (toma sus tokens). */
export function resolveInkPalette(host: HTMLElement): InkPalette {
  return { black: resolveColor(host, INK.black.print), blue: resolveColor(host, INK.blue.print), violet: resolveColor(host, INK.violet.print) }
}

/** Un SVG independiente de la firma, recortado a la tinta, con los colores de impresión. */
export function signatureToSvg(strokes: InkStroke[], palette: InkPalette = PRINT_PALETTE) {
  if (!strokes.length) return ''
  const box = inkBounds(strokes)
  const paths = strokes.map(stroke => `<path d="${strokePath(stroke)}" fill="${palette[stroke.color]}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${box.width}" height="${box.height}">${paths}</svg>`
}

/** Un PNG transparente de la firma, recortado a la tinta, a `scale` veces la resolución del pad. */
export function signatureToPng(strokes: InkStroke[], palette: InkPalette = PRINT_PALETTE, scale = 3): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!strokes.length) return reject(new Error('No hay nada para exportar'))
    const box = inkBounds(strokes)
    const canvas = document.createElement('canvas')
    canvas.width = box.width * scale; canvas.height = box.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return reject(new Error('El canvas no está disponible'))
    ctx.scale(scale, scale)
    ctx.translate(-box.x, -box.y)
    for (const stroke of strokes) { ctx.fillStyle = palette[stroke.color]; ctx.fill(new Path2D(strokePath(stroke))) }
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo exportar')), 'image/png')
  })
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = name
  document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface SignaturePadProps {
  /** Se imprime debajo de la línea, por ejemplo el nombre de quien firma. */
  signer?: string
  /** Pista que descansa sobre la línea antes del primer trazo. */
  hint?: string
  defaultColor?: InkColor
  defaultWidth?: InkWidth
  /** Recibe los trazos después de cada cambio. */
  onChange?: (strokes: InkStroke[]) => void
  /** Nombre del archivo exportado, sin extensión. */
  fileName?: string
  /** Nombre accesible de la superficie de dibujo. */
  label?: string
  className?: string
}

/** `fresh` es el trazo recién dibujado: ya está en pantalla por el camino en vivo, así que aparece sin fundido. */
interface History { past: InkStroke[][]; present: InkStroke[]; future: InkStroke[][]; fresh: string | null }
type Saved = null | 'png' | 'svg' | 'failed'

// ── movimiento: todo sale de --ui-dur ──
const enter: [number, number, number, number] = [0.22, 1, 0.36, 1]
const standard: [number, number, number, number] = [0.2, 0, 0, 1]
const inOut: [number, number, number, number] = [0.65, 0, 0.35, 1]
const BLUR_SOFT = 8

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

/**
 * Un campo de firma con tinta de verdad. El ancho sigue la presión del lápiz, o la velocidad con mouse o dedo, y las puntas se
 * afinan como una pluma que se levanta. Tiene deshacer y rehacer, borra con un barrido por el pad, reproduce la firma con su
 * ritmo original y exporta un PNG o un SVG recortados. La pista "Firmá acá" descansa sobre la línea hasta el primer trazo.
 * Teclado: Ctrl/Cmd+Z deshace, Shift+Ctrl/Cmd+Z o Ctrl/Cmd+Y rehace, Suprimir borra.
 */
export function SignaturePad({ signer, hint = 'Firmá acá', defaultColor = 'black', defaultWidth = 'medium', onChange, fileName = 'firma', label = 'Firma', className }: SignaturePadProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const reduced = useReducedFlag()
  const d = useDur()
  const [history, setHistory] = useState<History>({ past: [], present: [], future: [], fresh: null })
  const [color, setColor] = useState<InkColor>(defaultColor)
  const [width, setWidth] = useState<InkWidth>(defaultWidth)
  const [drawing, setDrawing] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [replay, setReplay] = useState<{ at: number; offsets: number[] } | null>(null)
  const [saved, setSaved] = useState<Saved>(null)
  const [status, setStatus] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const inkRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<SVGPathElement>(null)
  const live = useRef<{ id: number; stroke: InkStroke; stamp: number } | null>(null)
  const replayFrame = useRef(0)
  const savedTimer = useRef(0)
  const wipeAnimation = useRef<{ stop: () => void; complete: () => void } | null>(null)
  const counter = useRef(0)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange })

  const strokes = history.present
  const empty = strokes.length === 0
  const replaying = replay !== null

  useEffect(() => { onChangeRef.current?.(strokes) }, [strokes])
  useEffect(() => () => { cancelAnimationFrame(replayFrame.current); window.clearTimeout(savedTimer.current) }, [])

  const commit = useCallback((next: InkStroke[], fresh: string | null = null) => {
    setHistory(current => ({ past: [...current.past, current.present].slice(-60), present: next, future: [], fresh }))
  }, [])

  const stopReplay = useCallback(() => { cancelAnimationFrame(replayFrame.current); setReplay(null) }, [])
  /** Un barrido en curso se completa de golpe, así lo que venga arranca de un pad limpio. */
  const settleWipe = useCallback(() => { wipeAnimation.current?.complete() }, [])

  function toPad(event: { clientX: number; clientY: number }) {
    const box = padRef.current!.getBoundingClientRect()
    return { x: (event.clientX - box.left) / box.width * PAD_WIDTH, y: (event.clientY - box.top) / box.height * PAD_HEIGHT }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (live.current || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    settleWipe()
    if (replaying) stopReplay()
    padRef.current?.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const { x, y } = toPad(event)
    const now = event.nativeEvent.timeStamp
    counter.current += 1
    const pen = event.pointerType === 'pen' && event.pressure > 0
    live.current = { id: event.pointerId, stamp: event.nativeEvent.timeStamp, stroke: { id: `${uid}-${counter.current}`, color, width, at: now, points: [{ x, y, p: pen ? event.pressure : -1, t: 0 }] } }
    setDrawing(true)
    paintLive()
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = live.current
    if (!current || current.id !== event.pointerId) return
    const samples = typeof event.nativeEvent.getCoalescedEvents === 'function' ? event.nativeEvent.getCoalescedEvents() : []
    const list = samples.length ? samples : [event.nativeEvent]
    for (const sample of list) {
      const { x, y } = toPad(sample)
      const pen = sample.pointerType === 'pen' && sample.pressure > 0
      current.stroke.points.push({ x, y, p: pen ? sample.pressure : -1, t: Math.max(current.stroke.points[current.stroke.points.length - 1].t, sample.timeStamp - current.stamp) })
    }
    paintLive()
  }
  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = live.current
    if (!current || current.id !== event.pointerId) return
    live.current = null
    commit([...strokes, current.stroke], current.stroke.id)
    liveRef.current?.setAttribute('d', '')
    setDrawing(false)
    const n = strokes.length + 1
    setStatus(`Trazo agregado. ${n} ${n === 1 ? 'trazo' : 'trazos'} en la firma.`)
  }
  function paintLive() {
    const current = live.current
    if (!current || !liveRef.current) return
    liveRef.current.setAttribute('d', outlineToPath(getStrokeOutline(current.stroke.points, strokeOptions(current.stroke, false))))
  }

  function undo() {
    if (!history.past.length || live.current) return
    settleWipe(); stopReplay()
    setHistory(current => current.past.length ? { past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future], fresh: null } : current)
    setStatus('Deshecho')
  }
  function redo() {
    if (!history.future.length || live.current) return
    settleWipe(); stopReplay()
    setHistory(current => current.future.length ? { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1), fresh: null } : current)
    setStatus('Rehecho')
  }

  function clear() {
    if (empty || wiping || live.current) return
    stopReplay()
    const node = inkRef.current
    const finish = () => {
      wipeAnimation.current = null
      commit([]); setWiping(false); setStatus('Firma borrada. Deshacer la trae de vuelta.')
      // El recorte se levanta recién cuando los trazos barridos ya se fueron, así nunca vuelven a asomar un cuadro.
      if (node) requestAnimationFrame(() => requestAnimationFrame(() => { node.style.clipPath = '' }))
    }
    if (!node || reduced) { finish(); return }
    setWiping(true)
    // La tinta se recorta detrás de un borde que barre el pad; el borde lo dibuja el elemento de barrido.
    const controls = animate(node, { clipPath: ['inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 100%)'] }, { duration: d * 3.1, ease: inOut })
    wipeAnimation.current = { stop: () => controls.stop(), complete: () => { controls.complete() } }
    controls.then(finish)
  }

  function toggleReplay() {
    if (replaying) { stopReplay(); setStatus('Reproducción detenida'); return }
    if (empty || live.current) return
    settleWipe()
    // Una línea de tiempo: cada trazo conserva su ritmo y las pausas entre trazos se acotan para que la reproducción no se frene.
    const offsets: number[] = []
    let cursor = 0
    strokes.forEach((stroke, index) => {
      if (index > 0) {
        const previous = strokes[index - 1]
        const gap = stroke.at - (previous.at + previous.points[previous.points.length - 1].t)
        cursor += Math.min(260, Math.max(90, gap))
      }
      offsets.push(cursor)
      cursor += stroke.points[stroke.points.length - 1].t
    })
    const speed = Math.max(1, cursor / 3200)
    const total = cursor + 120
    const begin = performance.now()
    const tick = (now: number) => {
      const at = (now - begin) * speed
      if (at >= total) { setReplay(null); setStatus('Reproducción terminada'); return }
      setReplay({ at, offsets })
      replayFrame.current = requestAnimationFrame(tick)
    }
    setReplay({ at: 0, offsets })
    setStatus('Reproduciendo la firma')
    replayFrame.current = requestAnimationFrame(tick)
  }
  async function save(kind: 'png' | 'svg') {
    if (empty) return
    window.clearTimeout(savedTimer.current)
    try {
      const palette = rootRef.current ? resolveInkPalette(rootRef.current) : PRINT_PALETTE
      const blob = kind === 'svg' ? new Blob([signatureToSvg(strokes, palette)], { type: 'image/svg+xml' }) : await signatureToPng(strokes, palette)
      download(blob, `${fileName}.${kind}`)
      setSaved(kind)
      setStatus(`Guardado ${fileName}.${kind}`)
    } catch {
      setSaved('failed')
      setStatus('No se pudo exportar. Probá de nuevo.')
    }
    savedTimer.current = window.setTimeout(() => setSaved(null), d * 10000)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const mod = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()
    if (mod && key === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo() }
    else if (mod && key === 'y') { event.preventDefault(); redo() }
    else if (!mod && (event.key === 'Delete' || event.key === 'Backspace') && event.currentTarget === event.target) { event.preventDefault(); clear() }
    else if (event.key === 'Escape' && replaying) { stopReplay() }
  }

  // Durante la reproducción cada trazo muestra sólo lo dibujado hasta ahora, y la pluma va sobre su punto más nuevo.
  let nib: InkPoint | null = null, nibColor: InkColor = color
  const visible: { stroke: InkStroke; d: string | null }[] = []
  for (let index = 0; index < strokes.length; index++) {
    const stroke = strokes[index]
    if (replay === null) { visible.push({ stroke, d: null }); continue }
    const local = replay.at - (replay.offsets[index] ?? 0)
    const lastT = stroke.points[stroke.points.length - 1].t
    if (local < 0) { visible.push({ stroke, d: '' }); continue }
    if (local >= lastT) { visible.push({ stroke, d: null }); continue }
    nib = stroke.points.findLast(point => point.t <= local) ?? stroke.points[0]
    nibColor = stroke.color
    visible.push({ stroke, d: strokePath(stroke, local) })
  }
  const showHint = empty && !drawing && !wiping
  const hintHidden = reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97, filter: `blur(${BLUR_SOFT}px)` }
  const snappy: Transition = { type: 'spring', duration: d * 1.4, bounce: 0.1 }
  const morph: Transition = { type: 'spring', duration: d * 1.8, bounce: 0.15 }
  const t: Transition = reduced ? { duration: d * 0.7 } : snappy
  const fadeStandard: Transition = { duration: d * 1.6, ease: standard }
  const vars = {
    '--sp-ink-black': INK.black.screen, '--sp-ink-blue': INK.blue.screen, '--sp-ink-violet': INK.violet.screen,
    '--sp-strong': 'color-mix(in oklch, var(--ui-ink-muted) 55%, var(--ui-line))', '--sp-ok': TONE_OK,
  } as CSSProperties
  const count = strokes.length

  return <div ref={rootRef} className={`grid w-full min-w-0 gap-2.5 font-ui-text text-ui-ink${className ? ` ${className}` : ''}`} data-ink={color} style={vars}>
    {/* El pad conserva la proporción 600 por 260 de su espacio de coordenadas, así los trazos escalan con él a cualquier ancho. */}
    <div ref={padRef} className="relative isolate aspect-[600/260] touch-none select-none overflow-hidden rounded-ui border border-ui-line bg-ui-surface cursor-crosshair transition-[border-color] duration-(--ui-dur) ease-ui data-[drawing]:border-ui-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent"
      tabIndex={0} role="img" aria-roledescription="superficie de firma"
      aria-label={`${label}. ${empty ? 'Vacía.' : `${count} ${count === 1 ? 'trazo' : 'trazos'}.`} Dibujá con el mouse, el lápiz o el dedo.`}
      aria-describedby={`${uid}-keys`} data-drawing={drawing ? '' : undefined}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <X className="absolute top-[72%] left-[7%] text-ui-ink-muted [translate:0_calc(-100%-6px)]" size={14} strokeWidth={1.75} />
        <span className="absolute top-[72%] right-[7%] left-[7%] border-t-[1.5px] border-dashed border-(--sp-strong)" />
        {signer && <span className="absolute top-[calc(72%+8px)] left-[7%] text-xs leading-snug text-ui-ink-muted">{signer}</span>}
        <AnimatePresence initial={false}>
          {showHint && <motion.span key="hint" className="absolute top-[72%] left-1/2 text-lg leading-snug whitespace-nowrap text-ui-ink-muted [translate:-50%_calc(-100%-8px)]" initial={hintHidden} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ ...hintHidden, transition: { duration: d, ease: standard } }}
            transition={reduced ? { duration: d * 0.7 } : { duration: d * 1.6, ease: enter }}>{hint}</motion.span>}
        </AnimatePresence>
      </div>
      <div ref={inkRef} className="pointer-events-none absolute inset-0">
        <svg className="block size-full overflow-visible" viewBox={`0 0 ${PAD_WIDTH} ${PAD_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          <AnimatePresence initial={false}>
            {visible.map(({ stroke, d: partial }) => <motion.path key={stroke.id} style={{ fill: `var(--sp-ink-${stroke.color})` }}
              d={partial ?? strokePath(stroke)} initial={history.fresh === stroke.id ? false : { opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: wiping ? 0 : d * 1.6, ease: standard } }}
              transition={fadeStandard} />)}
          </AnimatePresence>
          <path ref={liveRef} style={{ fill: `var(--sp-ink-${color})` }} />
          {nib && <circle className="opacity-35" style={{ fill: `var(--sp-ink-${nibColor})` }} cx={nib.x} cy={nib.y} r={WIDTHS[width].size * 0.9} />}
        </svg>
      </div>
      {/* El borde que limpia la tinta a medida que cruza el pad. */}
      {wiping && <motion.span className="pointer-events-none absolute inset-0 before:absolute before:top-[8%] before:bottom-[8%] before:-left-px before:w-0.5 before:rounded-xs before:bg-ui-ink before:opacity-50 before:content-[''] after:absolute after:inset-y-0 after:-left-7 after:w-7 after:bg-[linear-gradient(to_right,transparent,color-mix(in_oklch,var(--ui-ink)_5%,transparent))] after:content-['']" aria-hidden="true" initial={{ x: '0%', opacity: 0 }} animate={{ x: '100%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: d * 3.1, ease: inOut, opacity: { duration: d * 3.1, times: [0, 0.12, 0.85, 1] } }} />}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-0.5">
        <Choice label="Color de la tinta" options={COLORS} value={color} onChange={next => { setColor(next); setStatus(`${INK[next].label} elegida`) }} layoutId={`${uid}-color`} transition={reduced ? { duration: 0 } : morph}
          render={option => <span className="relative size-4 rounded-full" style={{ background: `var(--sp-ink-${option})` }} />} name={option => INK[option].label} />
        <span className="mx-1.5 h-5 w-px bg-ui-line" aria-hidden="true" />
        <Choice label="Grosor del trazo" options={SIZES} value={width} onChange={next => { setWidth(next); setStatus(`Punta ${WIDTHS[next].label.toLowerCase()} elegida`) }} layoutId={`${uid}-width`} transition={reduced ? { duration: 0 } : morph}
          render={option => <span className="relative rounded-full bg-ui-ink" style={{ width: WIDTHS[option].size + 2, height: WIDTHS[option].size + 2 }} />} name={option => WIDTHS[option].label} />
      </div>
      <div className="flex items-center gap-0.5">
        <IconButton label="Deshacer" onClick={undo} disabled={!history.past.length || wiping}><Undo2 size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton>
        <IconButton label="Rehacer" onClick={redo} disabled={!history.future.length || wiping}><Redo2 size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton>
        <IconButton label={replaying ? 'Detener la reproducción' : 'Reproducir la firma'} onClick={toggleReplay} disabled={empty || wiping} pressed={replaying}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={replaying ? 'stop' : 'play'} className="grid place-items-center" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={t}>
              {replaying ? <Square size={15} strokeWidth={1.75} aria-hidden="true" /> : <Play size={17} strokeWidth={1.75} aria-hidden="true" />}
            </motion.span>
          </AnimatePresence>
        </IconButton>
        <IconButton label="Borrar la firma" onClick={clear} disabled={empty || wiping}><Eraser size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton>
      </div>
    </div>

    <div className="flex items-center justify-end gap-1.5">
      <span className="mr-1 text-xs text-ui-ink-muted">Guardar como</span>
      {(['png', 'svg'] as const).map(kind => <button key={kind} type="button" className="grid h-8 min-w-[76px] cursor-pointer rounded-ui border border-ui-line bg-ui-surface px-3 text-sm text-ui-ink transition-[background-color,transform] duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] hover:enabled:bg-ui-surface-2 active:enabled:scale-[.97] disabled:cursor-default disabled:text-ui-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent" onClick={() => save(kind)} disabled={empty}
        aria-label={`Descargar ${kind.toUpperCase()}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={saved === kind ? 'done' : saved === 'failed' ? 'failed' : 'idle'} className="inline-flex items-center justify-center gap-1.5 [grid-area:1/1]"
            initial={{ opacity: 0, y: reduced ? 0 : 4, filter: reduced ? 'blur(0px)' : 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: reduced ? 0 : -4, transition: { duration: d * 0.5 } }} transition={reduced ? { duration: d * 0.7 } : { duration: d * 1.1, ease: enter }}>
            {saved === kind ? <><Check className="text-(--sp-ok)" size={15} strokeWidth={1.75} aria-hidden="true" />Guardado</> : <><Download size={15} strokeWidth={1.75} aria-hidden="true" />{kind.toUpperCase()}</>}
          </motion.span>
        </AnimatePresence>
      </button>)}
    </div>
    <p id={`${uid}-keys`} className="sr-only">Control o Comando Z deshace, con Shift rehace, y Suprimir borra.</p>
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
  </div>
}

function IconButton({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode }) {
  return <button type="button" className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ui-ink-soft transition-[background-color,color,transform] duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] hover:enabled:bg-ui-surface-2 hover:enabled:text-ui-ink active:enabled:scale-[.94] disabled:cursor-default disabled:text-ui-ink-muted disabled:opacity-45 aria-pressed:bg-ui-surface-2 aria-pressed:text-ui-ink focus-visible:outline-2 focus-visible:outline-ui-accent" aria-label={label} title={label} onClick={onClick} disabled={disabled} aria-pressed={pressed}>{children}</button>
}

/** Un grupo de radio compacto con un resalte que se desliza hasta la opción elegida. Las flechas mueven la elección. */
function Choice<T extends string>({ label, options, value, onChange, render, name, layoutId, transition }: {
  label: string; options: T[]; value: T; onChange: (value: T) => void; render: (option: T) => ReactNode; name: (option: T) => string; layoutId: string; transition: Transition
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const index = (options.indexOf(value) + step + options.length) % options.length
    onChange(options[index])
    refs.current[index]?.focus()
  }
  return <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
    {options.map((option, index) => <button key={option} ref={node => { refs.current[index] = node }} type="button" role="radio" aria-checked={option === value}
      aria-label={name(option)} title={name(option)} tabIndex={option === value ? 0 : -1} className="relative grid size-[34px] cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ui-ink [-webkit-tap-highlight-color:transparent] hover:bg-ui-surface-2 focus-visible:outline-2 focus-visible:outline-ui-accent" onClick={() => onChange(option)}>
      {option === value && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-[inherit] bg-ui-surface-2 shadow-[inset_0_0_0_1px_var(--ui-line)]" transition={transition} />}
      {render(option)}
    </button>)}
  </div>
}

export default SignaturePad
