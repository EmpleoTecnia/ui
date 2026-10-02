// Labels for the site. Same words as the folders, capitalized.
export const TIPOS = { components: 'Components', patterns: 'Patterns' } as const
export type Tipo = keyof typeof TIPOS

export const CATEGORIAS: Record<string, string> = {
  buttons: 'Buttons',
  menus: 'Menus',
  fields: 'Fields',
  pickers: 'Pickers',
  toggles: 'Toggles',
  navigation: 'Navigation',
  cards: 'Cards',
  backgrounds: 'Backgrounds',
  animations: 'Animations',
  sections: 'Sections',
  feedback: 'Feedback',
  landing: 'Landing',
  profile: 'Profile',
  onboarding: 'Onboarding',
  dashboard: 'Dashboard',
  auth: 'Auth',
  pricing: 'Pricing',
}

export const nombreCategoria = (c: string) => CATEGORIAS[c] ?? c

/** The English title of a piece comes from its slug, like the folder: `status-mark` → "Status mark". */
export const tituloDe = (slug: string) => slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())
