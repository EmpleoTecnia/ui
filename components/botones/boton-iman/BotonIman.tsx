'use client'
import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion, type HTMLMotionProps } from 'motion/react'

type Props = HTMLMotionProps<'button'> & {
  /** Cuánto se corre hacia el cursor: 0 = nada, 1 = lo sigue entero. */
  alcance?: number
}

/** Botón que se inclina hacia el cursor y vuelve con un resorte al soltarlo.
 *  Con `prefers-reduced-motion` se queda quieto y sigue siendo un botón normal. */
export function BotonIman({ alcance = 0.35, className = '', children, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const quieto = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 320, damping: 22, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 320, damping: 22, mass: 0.6 })

  function mover(e: React.PointerEvent<HTMLButtonElement>) {
    if (quieto || !ref.current || e.pointerType === 'touch') return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * alcance)
    y.set((e.clientY - (r.top + r.height / 2)) * alcance)
  }
  function soltar() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onPointerMove={mover}
      onPointerLeave={soltar}
      className={`inline-flex items-center gap-2 rounded-ui bg-ui-accent px-5 py-3 font-ui-display text-sm font-semibold text-ui-accent-ink transition-[filter] duration-(--ui-dur) ease-ui hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
