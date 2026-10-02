import { describe, it, expect } from 'vitest'
import { coloresCrudos, tokensUsados } from '../lib/codigo.mjs'

describe('coloresCrudos', () => {
  it('no se queja de un componente limpio', () => {
    const src = `className="bg-ui-accent text-ui-accent-ink rounded-ui hover:bg-ui-surface-2 ring-ui-line/40"
      style={{ boxShadow: '0 0 0 1px color-mix(in oklch, var(--ui-accent) 30%, transparent)' }}
      const brillo = 'oklch(from var(--ui-accent) calc(l + 0.1) c h)'`
    expect(coloresCrudos(src)).toEqual([])
  })

  it('atrapa hex, rgb, hsl y oklch absoluto con línea', () => {
    const src = ['const a = "#ff0000"', 'color: rgb(1,2,3)', 'x: hsla(1,2%,3%,.5)', 'y: oklch(0.5 0.2 300)'].join('\n')
    const h = coloresCrudos(src)
    expect(h.map(x => x.linea)).toEqual([1, 2, 3, 4])
    expect(h[0].texto).toBe('#ff0000')
    expect(h[3].motivo).toMatch(/oklch/)
  })

  it('atrapa clases crudas de Tailwind con y sin variante, con opacidad', () => {
    const src = 'className="bg-blue-500 hover:text-slate-400 dark:border-zinc-800 from-red-500/20 md:hover:bg-white"'
    expect(coloresCrudos(src).map(x => x.texto)).toEqual([
      'bg-blue-500', 'hover:text-slate-400', 'dark:border-zinc-800', 'from-red-500/20', 'md:hover:bg-white',
    ])
  })

  it('no confunde clases que no son de color', () => {
    expect(coloresCrudos('className="text-sm bg-cover border-2 ring-offset-2 shadow-lg to-50%"')).toEqual([])
  })

  it('respeta la marca color-ok en la línea', () => {
    expect(coloresCrudos('const transparente = "#0000" // color-ok: es transparente')).toEqual([])
  })
})

describe('tokensUsados', () => {
  it('junta var(--ui-*), clases puente y arbitrarias', () => {
    const src = `className="bg-ui-accent text-ui-ink/70 rounded-ui-lg font-ui-display ease-ui duration-(--ui-dur) hover:bg-ui-surface-2"
      style={{ borderColor: 'var(--ui-line)' }}`
    const { tokens, desconocidas } = tokensUsados(src)
    expect([...tokens].sort()).toEqual([
      '--ui-accent', '--ui-dur', '--ui-ease', '--ui-font-display', '--ui-ink', '--ui-line', '--ui-radius-lg', '--ui-surface-2',
    ])
    expect(desconocidas).toEqual([])
  })

  it('mapea rounded-ui a --ui-radius y font-ui-text a --ui-font-text', () => {
    const { tokens } = tokensUsados('className="rounded-ui rounded-t-ui font-ui-text"')
    expect([...tokens].sort()).toEqual(['--ui-font-text', '--ui-radius'])
  })

  it('reporta clases ui-* que no existen', () => {
    const { desconocidas } = tokensUsados('className="bg-ui-rojo text-ui-ink"')
    expect(desconocidas).toEqual(['bg-ui-rojo'])
  })
})
