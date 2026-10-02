import { describe, it, expect } from 'vitest'
import { hallazgosSensibles } from '../lib/publico.mjs'

describe('hallazgosSensibles: el repo es público', () => {
  it('detecta claves y tokens típicos', () => {
    expect(hallazgosSensibles('const k = "sk_live_51Habcdefghijklmnop"', 'x.ts')).toHaveLength(1)
    expect(hallazgosSensibles('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc', 'x.ts')).toHaveLength(1)
    expect(hallazgosSensibles('SUPABASE_SERVICE_ROLE_KEY=abc', 'x.ts')).toHaveLength(1)
    expect(hallazgosSensibles('url: https://abcdefghij.supabase.co', 'x.ts')).toHaveLength(1)
  })
  it('detecta correos con dominio real y acepta los de ejemplo', () => {
    expect(hallazgosSensibles('maria@empleotecnia.com', 'demo.tsx')).toHaveLength(1)
    expect(hallazgosSensibles('juan@gmail.com', 'demo.tsx')).toHaveLength(1)
    expect(hallazgosSensibles('maria@example.com', 'demo.tsx')).toEqual([])
    expect(hallazgosSensibles('noreply@anthropic.com', 'demo.tsx')).toEqual([])
  })
  it('cada hallazgo dice archivo, línea y qué encontró', () => {
    const [h] = hallazgosSensibles('a\nb\npassword: "hunter22x"\n', 'components/x/y.tsx')
    expect(h).toMatchObject({ ruta: 'components/x/y.tsx', linea: 3 })
    expect(h.motivo).toMatch(/contraseña/i)
  })
  it('no se asusta con código normal', () => {
    const src = `const token = useToken()\nconst password = value\nexport const TOKENS = ['--ui-accent']\nerror="Esa contraseña ya la usaste antes."`
    expect(hallazgosSensibles(src, 'x.tsx')).toEqual([])
  })
})
