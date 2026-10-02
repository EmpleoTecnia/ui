import { registro, type Entrada } from '../registro.generado'
export { registro, type Entrada }
export const porSlug = (slug: string): Entrada | undefined => registro.find(e => e.slug === slug)
export const TEMAS = ['muestra', 'mi', 'etconecta', 'campus', 'proyectos'] as const
export type Tema = (typeof TEMAS)[number]
export type Modo = 'claro' | 'oscuro'
