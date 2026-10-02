'use client'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, type TargetAndTransition } from 'motion/react'

/** Curvas y resortes derivados de --ui-dur (d, en segundos). */
const enter: [number, number, number, number] = [0.22, 1, 0.36, 1]
const standard: [number, number, number, number] = [0.2, 0, 0, 1]
const BLUR_SOFT = 8
const BLUR_SUBTLE = 4
const morphSpring = (d: number) => ({ type: 'spring' as const, duration: d * 1.8, bounce: 0.15 })

const rest: TargetAndTransition = { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
const glyphIn: TargetAndTransition = { opacity: 0, y: 5, filter: `blur(${BLUR_SOFT}px)` }
const fadeIn: TargetAndTransition = { ...rest, opacity: 0 }

/** El ancho del texto sigue al contenido con un resorte cuando cambia la etiqueta, así el botón nunca pega un salto.
 *  Otros cambios de medida (una fuente que llega tarde, un reflow del padre) saltan directo al ancho nuevo. */
function useMorphWidth(content: RefObject<HTMLElement | null>, key: string, reduced: boolean, d: number) {
  const width = useMotionValue<number | 'auto'>('auto')
  const lastKey = useRef(key)
  const armedUntil = useRef(0)
  useLayoutEffect(() => {
    if (lastKey.current === key) return
    lastKey.current = key
    armedUntil.current = performance.now() + 700
  }, [key])
  useEffect(() => {
    const node = content.current
    const slot = node?.parentElement
    if (!node || !slot || typeof ResizeObserver === 'undefined') return
    let measured = false
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width
      if (!next || !measured || reduced || performance.now() > armedUntil.current) {
        measured = next > 0
        width.jump(next || 'auto')
        delete slot.dataset.morphing
        return
      }
      slot.dataset.morphing = ''
      animate(width, next, { ...morphSpring(d), onComplete: () => { delete slot.dataset.morphing } })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [content, reduced, width, d])
  return width
}

type Glyph = { id: string; char: string; order: number }
const toGlyphs = (chars: string[], seq: number): Glyph[] => chars.map((char, order) => ({ id: `${seq}:${order}`, char, order }))

/** Las letras que comparten el principio y el final conservan su identidad: sólo se reemplaza el tramo que cambió. */
function useGlyphs(text: string) {
  const [state, setState] = useState(() => ({ text, seq: 0, glyphs: toGlyphs([...text], 0) }))
  if (state.text === text) return state.glyphs
  const prev = [...state.text]
  const next = [...text]
  let start = 0
  let end = 0
  while (start < prev.length && start < next.length && prev[start] === next[start]) start++
  while (end < prev.length - start && end < next.length - start && prev[prev.length - 1 - end] === next[next.length - 1 - end]) end++
  if (start < 2) start = 0
  if (end < 2) end = 0
  const seq = state.seq + 1
  const glyphs = [...state.glyphs.slice(0, start), ...toGlyphs(next.slice(start, next.length - end), seq), ...state.glyphs.slice(state.glyphs.length - end)]
  setState({ text, seq, glyphs })
  return glyphs
}

export interface TextMorphProps {
  text: string
  /** Sin animación: las letras cambian con un fundido seco. */
  reduced: boolean
  /** --ui-dur en segundos. */
  d: number
  className?: string
}

/**
 * Transforma una etiqueta en la siguiente en el lugar: las letras que se quedan se deslizan a su sitio, las nuevas
 * suben desde un desenfoque suave y el ancho sigue con un resorte. Es decorativo (aria-hidden): quien lo use tiene
 * que dar el texto plano por otro lado.
 */
export function TextMorph({ text, reduced, d, className }: TextMorphProps) {
  const glyphs = useGlyphs(text)
  const rowRef = useRef<HTMLSpanElement>(null)
  const width = useMorphWidth(rowRef, text, reduced, d)
  const glyphOut: TargetAndTransition = { opacity: 0, y: -4, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d, ease: standard } }
  const fadeOut: TargetAndTransition = { opacity: 0, transition: { duration: d * 0.5 } }
  return (
    <motion.span className={`inline-flex min-w-0 data-[morphing]:[clip-path:inset(-0.6em_0_-0.6em_-0.3em)]${className ? ` ${className}` : ''}`} style={{ width }} aria-hidden="true">
      <span ref={rowRef} className="relative inline-flex flex-none whitespace-pre">
        <AnimatePresence mode="popLayout" initial={false}>
          {glyphs.map(glyph => (
            <motion.span
              key={glyph.id}
              className="inline-block"
              layout={reduced ? false : 'position'}
              layoutDependency={text}
              initial={reduced ? fadeIn : glyphIn}
              animate={rest}
              exit={reduced ? fadeOut : glyphOut}
              transition={reduced ? { duration: d * 0.5 } : { duration: d * 1.6, ease: enter, delay: Math.min(glyph.order * d * 0.1, 0.1), layout: morphSpring(d) }}
            >
              {glyph.char}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </motion.span>
  )
}

export default TextMorph
