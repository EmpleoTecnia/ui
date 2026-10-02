'use client'
import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { PasswordStrength, estimateStrength, type PasswordRule, defaultPasswordRules } from './PasswordStrength'

/** Palabras cortas y fáciles de tipear en un teléfono. Dos al azar más un número dan 12+ caracteres, mayúscula, número y símbolo. */
const PALABRAS = [
  'Abeto', 'Brisa', 'Cumbre', 'Delta', 'Faro', 'Garza', 'Huerta', 'Isla', 'Jade', 'Lirio', 'Marea', 'Nube',
  'Oliva', 'Puma', 'Quena', 'Roble', 'Selva', 'Trigo', 'Umbral', 'Valle', 'Yunque', 'Zafiro', 'Cobre', 'Dique',
  'Fresno', 'Lluvia', 'Menta', 'Nácar', 'Pampa', 'Río', 'Sauce', 'Tigre', 'Viento', 'Ámbar', 'Cedro', 'Luna',
]

/** Una contraseña sugerida, legible y fuerte: `Palabra-Palabra-NN`. Generada en el dispositivo. */
export function suggestPassword(): string {
  const n = new Uint32Array(3)
  crypto.getRandomValues(n)
  const a = PALABRAS[n[0] % PALABRAS.length]
  let b = PALABRAS[n[1] % PALABRAS.length]
  if (b === a) b = PALABRAS[(n[1] + 1) % PALABRAS.length]
  return `${a}-${b}-${10 + (n[2] % 90)}`
}

export interface NewPasswordFormProps {
  /** Título del formulario. */
  title?: string
  /** Lo que se muestra debajo del título, normalmente el correo de la cuenta. */
  subtitle?: string
  rules?: PasswordRule[]
  /** Nivel mínimo para habilitar "Guardar" (0 a 4). Por defecto 3, "Buena". */
  minLevel?: 1 | 2 | 3 | 4
  error?: string
  pending?: boolean
  onSubmit?: (password: string) => void | Promise<void>
}

/** Pantalla de elegir contraseña nueva: el campo con su medidor, "Sugerir una" y "Guardar". */
export function NewPasswordForm({ title = 'Elegí una contraseña nueva', subtitle, rules = defaultPasswordRules, minLevel = 3, error, pending = false, onSubmit }: NewPasswordFormProps) {
  const [value, setValue] = useState('')
  const [revealed, setRevealed] = useState(false)
  const lista = estimateStrength(value, rules).level >= minLevel

  function sugerir() {
    setValue(suggestPassword())
    setRevealed(true)
  }
  function enviar(e: FormEvent) {
    e.preventDefault()
    if (lista && !pending) void onSubmit?.(value)
  }

  return (
    <form onSubmit={enviar} className="grid gap-5 rounded-ui-lg border border-ui-line bg-ui-surface p-6 font-ui-text">
      <header>
        <h2 className="font-ui-display text-lg font-semibold text-ui-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ui-ink-muted">{subtitle}</p>}
      </header>
      <PasswordStrength label="Nueva contraseña" value={value} onValueChange={setValue} revealed={revealed} onRevealedChange={setRevealed} rules={rules} error={error} />
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={sugerir} className="rounded-ui border border-ui-line bg-ui-surface px-4 py-2.5 text-sm font-medium text-ui-ink transition-colors duration-(--ui-dur) ease-ui hover:bg-ui-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent">
          Sugerir una
        </button>
        <button type="submit" disabled={!lista || pending} className="inline-flex items-center gap-2 rounded-ui bg-ui-accent px-5 py-2.5 text-sm font-semibold text-ui-accent-ink transition-[opacity,filter] duration-(--ui-dur) ease-ui hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent">
          {pending ? 'Guardando…' : 'Guardar'} <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </form>
  )
}
