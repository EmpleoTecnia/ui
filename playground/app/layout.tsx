import type { ReactNode } from 'react'
import './globals.css'

export const metadata = { title: 'UI Library · EmpleoTecnia', description: 'The interface pieces EmpleoTecnia liked, ported to our stack and painted with the colors of each app.' }

// El tema se aplica antes de pintar para que no parpadee.
const restaurar = `try{var t=localStorage.getItem('ui-tema'),m=localStorage.getItem('ui-modo');if(t)document.documentElement.dataset.tema=t;if(m)document.documentElement.dataset.modo=m}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-tema="muestra" data-modo="claro" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: restaurar }} /></head>
      <body className="min-h-dvh font-ui-text antialiased">{children}</body>
    </html>
  )
}
