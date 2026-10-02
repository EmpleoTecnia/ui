// Labels for the site. Same words as the folders, capitalized.
export const TIPOS = { components: 'Components', patterns: 'Patterns' } as const
export type Tipo = keyof typeof TIPOS

export const CATEGORIAS: Record<string, string> = {
  buttons: 'Buttons',
  cards: 'Cards',
  navigation: 'Navigation',
  forms: 'Forms',
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
