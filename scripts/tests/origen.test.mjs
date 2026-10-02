import { describe, it, expect } from 'vitest'
import { detectarOrigen, slugDesde, nombreDesdeSlug, tecnologias, dependenciasDe } from '../lib/origen.mjs'

describe('detectarOrigen', () => {
  it('conoce React Bits: registry PascalCase-TS-TW primero, licencia MIT+Commons-Clause', () => {
    const o = detectarOrigen('https://reactbits.dev/micro/status-mark')
    expect(o.sitio).toBe('React Bits')
    expect(o.licencia).toBe('MIT+Commons-Clause')
    expect(o.slugOrigen).toBe('status-mark')
    expect(o.nombre).toBe('Status Mark')
    expect(o.candidatos[0]).toBe('https://reactbits.dev/r/StatusMark-TS-TW.json')
  })

  it('conoce Magic UI con su registry y MIT', () => {
    const o = detectarOrigen('https://magicui.design/docs/components/orbiting-circles')
    expect(o.sitio).toBe('Magic UI')
    expect(o.licencia).toBe('MIT')
    expect(o.candidatos).toContain('https://magicui.design/r/orbiting-circles.json')
  })

  it('para un sitio desconocido prueba /r/ y /registry/ y deja la licencia en desconocida', () => {
    const o = detectarOrigen('https://www.spaceui.one/components/morphing-search-pill')
    expect(o.sitio).toBe('spaceui.one')
    expect(o.licencia).toBe('desconocida')
    expect(o.candidatos).toEqual([
      'https://www.spaceui.one/r/morphing-search-pill.json',
      'https://www.spaceui.one/registry/morphing-search-pill.json',
    ])
  })
})

describe('slugDesde y nombreDesdeSlug', () => {
  it('saca acentos, baja a minúsculas y une con guiones', () => {
    expect(slugDesde('Botón Imán!')).toBe('boton-iman')
    expect(slugDesde('  Marca de estado ')).toBe('marca-de-estado')
  })
  it('arma un nombre legible desde el slug', () => {
    expect(nombreDesdeSlug('status-mark')).toBe('Status Mark')
  })
})

describe('tecnologias y dependenciasDe', () => {
  const codigo = `'use client'
import React from 'react'
import { animate } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './x.module.css'
export const X = () => <div className="flex" />`

  it('detecta las tecnologías por los imports y las clases', () => {
    expect(tecnologias(codigo).sort()).toEqual(['css', 'lucide-react', 'motion', 'tailwind'])
  })
  it('lista los paquetes externos, sin react, next, alias ni rutas relativas', () => {
    expect(dependenciasDe(codigo)).toEqual(['lucide-react', 'motion'])
  })
})
