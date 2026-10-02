import { describe, it, expect } from 'vitest'
import { escalonesDeCompresion } from '../lib/webp.mjs'

describe('escalonesDeCompresion', () => {
  it('baja primero calidad, después fps, después largo, y nunca pasa de 3 s ni de 12 fps', () => {
    const e = escalonesDeCompresion()
    expect(e[0]).toEqual({ fps: 12, segundos: 3, calidad: 82 })
    expect(e.map(x => x.calidad)).toEqual(expect.arrayContaining([82, 70, 58]))
    const ultimo = e[e.length - 1]
    expect(ultimo.segundos).toBeLessThanOrEqual(3)
    expect(ultimo.fps).toBeLessThan(12)
    expect(ultimo.segundos).toBeLessThan(3)
    for (let i = 1; i < e.length; i++) {
      const a = e[i - 1], b = e[i]
      expect(b.calidad <= a.calidad || b.fps < a.fps || b.segundos < a.segundos).toBe(true)
    }
  })
})
