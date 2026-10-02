import { describe, it, expect } from 'vitest'
import { renderCategoria, renderRegistro } from '../lib/readme.mjs'

const entrada = (extra = {}) => ({
  slug: 'status-mark', nombre: 'Marca de estado', tipo: 'components', categoria: 'feedback', estado: 'adoptado',
  origen: { nombre: 'React Bits', url: 'https://reactbits.dev/micro/status-mark', licencia: 'MIT+Commons-Clause' },
  por_que_entro: 'El mismo círculo se transforma de punteado a tilde.', fecha: '2026-10-02',
  ruta: 'components/feedback/status-mark', url_github: 'https://github.com/EmpleoTecnia/ui/tree/main/components/feedback/status-mark',
  preview_png: 'components/feedback/status-mark/preview.png', preview_webp: 'components/feedback/status-mark/preview.webp',
  ...extra,
})

describe('grilla de README', () => {
  it('enlaza al original para verlo en vivo', () => {
    const html = renderCategoria('components', 'feedback', [entrada()])
    expect(html).toContain('<a href="https://reactbits.dev/micro/status-mark">Ver original en React Bits ↗</a>')
  })
  it('sin url de origen no muestra el enlace', () => {
    const html = renderCategoria('components', 'feedback', [entrada({ origen: { nombre: 'EmpleoTecnia', url: '', licencia: 'propia' } })])
    expect(html).not.toContain('Ver original')
  })
})

describe('registro del playground', () => {
  it('lleva la url y el nombre del origen', () => {
    const ts = renderRegistro([entrada()])
    expect(ts).toContain('origen_url: "https://reactbits.dev/micro/status-mark"')
    expect(ts).toContain('origen_nombre: "React Bits"')
    expect(ts).toMatch(/origen_url: string/)
  })
})
