import { describe, it, expect } from 'vitest'
import { validarFicha } from '../lib/ficha.mjs'

const buena = () => ({
  slug: 'boton-iman',
  nombre: 'Botón imán',
  categoria: 'botones',
  estado: 'adoptado',
  origen: { nombre: 'EmpleoTecnia', url: '', licencia: 'propia' },
  publicable: true,
  por_que_entro: 'El botón se corre hacia el cursor y vuelve con un resorte; se siente vivo sin gritar.',
  sirve_para: ['CTA de landing'],
  no_sirve_para: ['listas largas'],
  etiquetas: ['hover', 'cursor', 'cta'],
  caracter: { movimiento: 'sutil', tono: 'premium', densidad: 'aire' },
  tokens: ['--ui-accent', '--ui-accent-ink', '--ui-radius'],
  dependencias: ['motion'],
  usado_en: [],
  agregado_por: 'franco',
  fecha: '2026-10-02',
})

const ctx = { carpeta: 'boton-iman', tipo: 'components' }

describe('validarFicha', () => {
  it('acepta una ficha completa', () => {
    expect(validarFicha(buena(), ctx)).toEqual([])
  })

  it('exige que la carpeta se llame como el slug', () => {
    const errores = validarFicha(buena(), { carpeta: 'Boton-Iman', tipo: 'components' })
    expect(errores.join('\n')).toMatch(/carpeta "Boton-Iman".*slug "boton-iman"/)
  })

  it('rechaza slugs con mayúsculas, acentos o guiones dobles', () => {
    for (const slug of ['Boton', 'botón', 'boton--iman', '-boton']) {
      expect(validarFicha({ ...buena(), slug }, { carpeta: slug, tipo: 'components' }).join()).toMatch(/slug/)
    }
  })

  it('rechaza una categoría que no existe para ese tipo', () => {
    expect(validarFicha({ ...buena(), categoria: 'landing' }, ctx).join()).toMatch(/categor/)
  })

  it('rechaza un estado desconocido y exige por_que_salio en retirado', () => {
    expect(validarFicha({ ...buena(), estado: 'probado' }, ctx).join()).toMatch(/estado/)
    expect(validarFicha({ ...buena(), estado: 'retirado' }, ctx).join()).toMatch(/por_que_salio/)
    expect(validarFicha({ ...buena(), estado: 'retirado', por_que_salio: 'Lo reemplazó boton-halo.' }, ctx)).toEqual([])
  })

  it('no deja publicable=true con licencia desconocida', () => {
    const f = buena(); f.origen.licencia = 'desconocida'
    expect(validarFicha(f, ctx).join()).toMatch(/publicable/)
  })

  it('acepta MIT+Commons-Clause (React Bits) pero no la deja publicable', () => {
    const f = buena(); f.origen.licencia = 'MIT+Commons-Clause'; f.publicable = false
    expect(validarFicha(f, ctx)).toEqual([])
    f.publicable = true
    expect(validarFicha(f, ctx).join()).toMatch(/publicable/)
  })

  it('rechaza una razón vacía o corta', () => {
    expect(validarFicha({ ...buena(), por_que_entro: 'me gusta' }, ctx).join()).toMatch(/por_que_entro/)
    expect(validarFicha({ ...buena(), por_que_entro: 'Está bueno.' }, ctx).join()).toMatch(/por_que_entro/)
    expect(validarFicha({ ...buena(), por_que_entro: '' }, ctx).join()).toMatch(/por_que_entro/)
    expect(validarFicha({ ...buena(), por_que_entro: 123 }, ctx).join()).toMatch(/por_que_entro/)
  })

  it('el carácter es opcional pero, si viene, con valores cerrados', () => {
    const sin = buena(); delete sin.caracter
    expect(validarFicha(sin, ctx)).toEqual([])
    expect(validarFicha({ ...buena(), caracter: { movimiento: 'sutil' } }, ctx)).toEqual([])
    expect(validarFicha({ ...buena(), caracter: { movimiento: 'rapido' } }, ctx).join()).toMatch(/caracter\.movimiento/)
    expect(validarFicha({ ...buena(), caracter: { peso: 'liviano' } }, ctx).join()).toMatch(/caracter\.peso/)
  })

  it('en adoptado exige tokens del contrato', () => {
    expect(validarFicha({ ...buena(), tokens: [] }, ctx).join()).toMatch(/tokens/)
    expect(validarFicha({ ...buena(), tokens: ['--ui-rojo'] }, ctx).join()).toMatch(/--ui-rojo/)
    const ref = { ...buena(), estado: 'referencia', tokens: [] }
    expect(validarFicha(ref, ctx)).toEqual([])
  })

  it('exige fecha AAAA-MM-DD y listas donde van listas', () => {
    expect(validarFicha({ ...buena(), fecha: '2/10/2026' }, ctx).join()).toMatch(/fecha/)
    expect(validarFicha({ ...buena(), sirve_para: 'landing' }, ctx).join()).toMatch(/sirve_para/)
    expect(validarFicha({ ...buena(), etiquetas: [] }, ctx).join()).toMatch(/etiquetas/)
  })

  it('rechaza campos que no existen en la ficha', () => {
    expect(validarFicha({ ...buena(), color: 'rojo' }, ctx).join()).toMatch(/"color"/)
  })
})
