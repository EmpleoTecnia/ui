// Nombres en español para las categorías (las carpetas van en inglés).
export const TIPOS = { components: 'Componentes', patterns: 'Patrones' } as const
export type Tipo = keyof typeof TIPOS

export const CATEGORIAS: Record<string, string> = {
  buttons: 'Botones',
  cards: 'Tarjetas',
  navigation: 'Navegación',
  forms: 'Formularios',
  backgrounds: 'Fondos',
  animations: 'Animaciones',
  sections: 'Secciones',
  feedback: 'Avisos y estado',
  landing: 'Landing',
  profile: 'Perfil',
  onboarding: 'Onboarding',
  dashboard: 'Tablero',
  auth: 'Acceso',
  pricing: 'Precios',
}

export const nombreCategoria = (c: string) => CATEGORIAS[c] ?? c
