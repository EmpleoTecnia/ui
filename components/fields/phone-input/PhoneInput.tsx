'use client'
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type ClipboardEvent as ReactClipboardEvent, type CSSProperties, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type Transition, type Variants } from 'motion/react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

/* ------------------------------------------------------------------------------------------------
 * Tabla de países. Los patrones dan forma al número nacional (sin prefijo troncal); `#` es un dígito.
 * Los largos válidos son la capacidad de cada patrón. Los ejemplos son celulares verosímiles y
 * sirven de placeholder. Compacta a propósito: sin metadatos que bajar, sin dependencias.
 * ---------------------------------------------------------------------------------------------- */

export interface PhoneCountry {
  /** Código ISO 3166-1 alfa-2, como "AR". */
  iso: string
  /** Nombre en español, como se muestra en la lista. */
  name: string
  /** Código de país sin el más, como "54". */
  dial: string
  /** Formatos nacionales del más corto al más largo. `#` es un dígito; lo demás, separador. */
  patterns: string[]
  /** Prefijo troncal que la gente puede tipear antes del número, como el "0" de "011 4321-5678". */
  trunk: string
  /** Un número nacional verosímil: placeholder y guía mientras se escribe. */
  example: string
  /** Códigos de área que eligen este país cuando varios comparten el código, como Canadá dentro de +1. */
  areaCodes?: string[]
}

const country = (iso: string, name: string, dial: string, patterns: string | string[], example: string, trunk = '0', areaCodes?: string[]): PhoneCountry =>
  ({ iso, name, dial, patterns: Array.isArray(patterns) ? patterns : [patterns], example, trunk, areaCodes })

const CA_AREA_CODES = '204 226 236 249 250 263 289 306 343 354 365 367 368 382 387 403 416 418 428 431 437 438 450 468 474 506 514 519 548 579 581 584 587 604 613 639 647 672 683 705 709 742 753 778 780 782 807 819 825 867 873 879 902 905'.split(' ')

export const PHONE_COUNTRIES: PhoneCountry[] = [
  // Diez dígitos para un fijo (11 2345-6789) y once para un celular en E.164 (9 11 2345-6789).
  country('AR', 'Argentina', '54', ['## ####-####', '# ## ####-####'], '1123456789'),
  country('UY', 'Uruguay', '598', '## ### ###', '94123456'),
  country('PY', 'Paraguay', '595', '### ######', '961456789'),
  country('BO', 'Bolivia', '591', '# ### ####', '71234567', ''),
  country('CL', 'Chile', '56', '# #### ####', '221234567', ''),
  country('BR', 'Brasil', '55', ['(##) ####-####', '(##) #####-####'], '11961234567'),
  country('PE', 'Perú', '51', '### ### ###', '912345678'),
  country('EC', 'Ecuador', '593', '## ### ####', '991234567'),
  country('CO', 'Colombia', '57', '### ### ####', '3211234567', ''),
  country('VE', 'Venezuela', '58', '###-#######', '4121234567'),
  country('MX', 'México', '52', '## #### ####', '2221234567', ''),
  country('US', 'Estados Unidos', '1', '(###) ###-####', '2015550123', '1'),
  country('CA', 'Canadá', '1', '(###) ###-####', '5065550123', '1', CA_AREA_CODES),
  country('ES', 'España', '34', '### ## ## ##', '612345678', ''),
  country('PT', 'Portugal', '351', '### ### ###', '912345678', ''),
  country('IT', 'Italia', '39', ['### ### ###', '### ### ####'], '3123456789', ''),
  country('FR', 'Francia', '33', '# ## ## ## ##', '612345678'),
  country('DE', 'Alemania', '49', ['### #######', '### ########'], '15123456789'),
  country('GB', 'Reino Unido', '44', '#### ######', '7400123456'),
  country('IE', 'Irlanda', '353', '## ### ####', '850123456'),
  country('NL', 'Países Bajos', '31', '# ########', '612345678'),
  country('BE', 'Bélgica', '32', '### ## ## ##', '470123456'),
  country('CH', 'Suiza', '41', '## ### ## ##', '781234567'),
  country('AT', 'Austria', '43', ['### #######', '### ########'], '6641234567'),
  country('SE', 'Suecia', '46', '## ### ## ##', '701234567'),
  country('NO', 'Noruega', '47', '### ## ###', '40612345', ''),
  country('DK', 'Dinamarca', '45', '## ## ## ##', '32123456', ''),
  country('FI', 'Finlandia', '358', ['## ### ####', '## ### #####'], '412345678'),
  country('PL', 'Polonia', '48', '### ### ###', '512345678', ''),
  country('CZ', 'Chequia', '420', '### ### ###', '601123456', ''),
  country('GR', 'Grecia', '30', '### ### ####', '6912345678', ''),
  country('UA', 'Ucrania', '380', '## ### ## ##', '501234567'),
  country('TR', 'Turquía', '90', '### ### ## ##', '5012345678'),
  country('IL', 'Israel', '972', '##-###-####', '502345678'),
  country('AE', 'Emiratos Árabes Unidos', '971', '## ### ####', '501234567'),
  country('SA', 'Arabia Saudita', '966', '## ### ####', '512345678'),
  country('EG', 'Egipto', '20', '### ### ####', '1001234567'),
  country('NG', 'Nigeria', '234', '### ### ####', '8021234567'),
  country('KE', 'Kenia', '254', '### ######', '712123456'),
  country('ZA', 'Sudáfrica', '27', '## ### ####', '711234567'),
  country('IN', 'India', '91', '#####-#####', '8123456789'),
  country('PK', 'Pakistán', '92', '### #######', '3012345678'),
  country('CN', 'China', '86', '### #### ####', '13123456789'),
  country('JP', 'Japón', '81', '##-####-####', '9012345678'),
  country('KR', 'Corea del Sur', '82', ['##-###-####', '##-####-####'], '1020000000'),
  country('TW', 'Taiwán', '886', '### ### ###', '912345678'),
  country('HK', 'Hong Kong', '852', '#### ####', '51234567', ''),
  country('SG', 'Singapur', '65', '#### ####', '81234567', ''),
  country('PH', 'Filipinas', '63', '### ### ####', '9051234567'),
  country('ID', 'Indonesia', '62', ['###-###-####', '###-####-####', '###-####-#####'], '81234567890'),
  country('TH', 'Tailandia', '66', '## ### ####', '812345678'),
  country('VN', 'Vietnam', '84', '## ### ## ##', '912345678'),
  country('AU', 'Australia', '61', '### ### ###', '412345678'),
  country('NZ', 'Nueva Zelanda', '64', ['# ### ####', '## ### ####', '## #### ####'], '211234567'),
]

const BY_ISO = new Map(PHONE_COUNTRIES.map(entry => [entry.iso, entry]))
const capacity = (pattern: string) => pattern.split('#').length - 1
const lengthsOf = (entry: PhoneCountry) => entry.patterns.map(capacity)
/** Un prefijo troncal tipeado se gana su lugar; sin él, el largo válido más grande es el tope. */
const capDigits = (entry: PhoneCountry, digits: string) => digits.slice(0, splitTrunk(entry, digits)[0].length + Math.max(...lengthsOf(entry)))
const onlyDigits = (text: string) => text.replace(/\D/g, '')
/** Sin acentos ni mayúsculas: "peru" encuentra "Perú". */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const byName = (a: PhoneCountry, b: PhoneCountry) => a.name.localeCompare(b.name, 'es')

/** Letras indicadoras regionales. Donde no hay banderas se ven las dos letras, que igual se leen. */
export const flagOf = (iso: string) => String.fromCodePoint(...[...iso.toUpperCase()].map(char => 0x1f1e6 + char.charCodeAt(0) - 65))

function splitTrunk(entry: PhoneCountry, digits: string): [string, string] {
  return entry.trunk && digits.startsWith(entry.trunk) ? [entry.trunk, digits.slice(entry.trunk.length)] : ['', digits]
}

/** Los separadores sólo se imprimen si sigue un dígito: un número a medias nunca termina en ") " o "-". */
function applyPattern(digits: string, pattern: string) {
  let out = '', index = 0
  for (const char of pattern) {
    if (index >= digits.length) break
    out += char === '#' ? digits[index++] : char
  }
  return out + digits.slice(index)
}

function patternFor(entry: PhoneCountry, length: number) {
  return entry.patterns.find(pattern => capacity(pattern) >= length) ?? entry.patterns[entry.patterns.length - 1]
}

/** Da forma a los dígitos nacionales mientras se escriben, conservando el troncal tipeado: "01123456789" se lee "011 2345-6789". */
export function formatNational(entry: PhoneCountry, digits: string) {
  const [trunk, rest] = splitTrunk(entry, digits)
  const pattern = patternFor(entry, rest.length)
  const body = applyPattern(rest, pattern)
  if (!trunk) return body
  if (!rest) return trunk
  return trunk + (/^#/.test(pattern) ? '' : ' ') + body
}

export type PhoneStatus = 'empty' | 'incomplete' | 'valid' | 'too-long'

function statusOf(entry: PhoneCountry, digits: string): PhoneStatus {
  const length = splitTrunk(entry, digits)[1].length
  const lengths = lengthsOf(entry)
  if (!length) return 'empty'
  if (lengths.includes(length)) return 'valid'
  return length > Math.max(...lengths) ? 'too-long' : 'incomplete'
}

const toE164 = (entry: PhoneCountry, digits: string) => { const rest = splitTrunk(entry, digits)[1]; return rest ? `+${entry.dial}${rest}` : '' }

/** Lee "+54 (0)11 2345-6789", "0054 11…" o "+14165550123" y devuelve país y dígitos nacionales. Gana el código más largo. */
export function parsePhoneNumber(input: string, pool: PhoneCountry[] = PHONE_COUNTRIES): { country: PhoneCountry; national: string } | null {
  const trimmed = input.trim()
  let digits = onlyDigits(trimmed)
  if (!trimmed.startsWith('+')) { if (!trimmed.startsWith('00')) return null; digits = digits.slice(2) }
  for (const size of [3, 2, 1]) {
    const dial = digits.slice(0, size)
    const matches = pool.filter(entry => entry.dial === dial)
    if (!matches.length) continue
    let rest = digits.slice(size)
    const entry = matches.find(item => item.areaCodes?.some(code => rest.startsWith(code))) ?? matches.find(item => !item.areaCodes) ?? matches[0]
    // "+54 (0)11…" trae un cero troncal que no corresponde: se saca si lo que queda sigue siendo un número entero sin él.
    if (entry.trunk && rest.startsWith(entry.trunk) && rest.length - entry.trunk.length >= Math.min(...lengthsOf(entry))) rest = rest.slice(entry.trunk.length)
    return { country: entry, national: capDigits(entry, rest) }
  }
  return null
}

/** Formatea un E.164 para mostrarlo, como "+54 11 2345-6789". Devuelve la entrada tal cual si no la puede leer. */
export function formatPhoneNumber(e164: string) {
  const parsed = parsePhoneNumber(e164)
  return parsed ? `+${parsed.country.dial} ${formatNational(parsed.country, parsed.national)}` : e164
}

/* ------------------------------------------------------------------------------------------------ */

export interface PhoneInputDetails {
  country: PhoneCountry
  /** El número como se ve en el campo, sin el código de país. */
  formatted: string
  status: PhoneStatus
  valid: boolean
}

/**
 * Campo de teléfono con selector de país. El botón del país crece hasta ser una lista con buscador,
 * el número toma forma mientras se escribe con una guía tenue de lo que falta, un número internacional
 * pegado o autocompletado elige solo su país, y el valor sale en E.164. Tipear "+" en el número abre
 * la lista buscando por código.
 */
export interface PhoneInputProps {
  label: string
  hideLabel?: boolean
  /** El número en E.164, como "+5491123456789". Un texto vacío limpia el campo. */
  value?: string
  defaultValue?: string
  /** En cada edición: el E.164 (vacío si no hay dígitos) y el detalle leído. */
  onValueChange?: (value: string, details: PhoneInputDetails) => void
  /** Código ISO del país elegido. */
  country?: string
  /** Código ISO que se usa hasta que alguien elige un país o escribe un número internacional. Por defecto, Argentina. */
  defaultCountry?: string
  onCountryChange?: (iso: string) => void
  /** Limita la lista a estos códigos ISO. */
  countries?: string[]
  /** Fijados arriba de la lista, bajo "Sugeridos". */
  preferredCountries?: string[]
  description?: string
  /** Reemplaza el mensaje de validación propio. */
  error?: string
  /** Avisa al salir del campo si el número está incompleto. Activo por defecto. */
  validate?: boolean
  disabled?: boolean
  required?: boolean
  /** Agrega un input oculto con el E.164 para enviar el formulario de forma nativa. */
  name?: string
  id?: string
  className?: string
  onBlur?: (event: ReactFocusEvent<HTMLInputElement>) => void
}

type Bezier = [number, number, number, number]
const enterEase: Bezier = [0.22, 1, 0.36, 1]
const standardEase: Bezier = [0.2, 0, 0, 1]
const BLUR_SUBTLE = 4
const BLUR_SOFT = 8
const PANEL_MAX = 340, PAGE = 8
const EMOJI_FONT: CSSProperties = { fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", var(--ui-font-text)' }
/** Colores semánticos de verdad: del acento de la app toman sólo la luz y la saturación. El matiz no se negocia. */
const semantico = (hue: number) => `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) ${hue})`
const TONE_DANGER = semantico(25)
const TONE_OK = semantico(150)

/** Lee --ui-dur de la app (en segundos). Antes de montar, 0.18. */
function useDur() {
  const [dur, setDur] = useState(0.18)
  useEffect(() => {
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-dur'))
    if (ms) setDur(ms / 1000)
  }, [])
  return dur
}
const subscribe = () => () => {}
/** Falso en el servidor y durante la hidratación: el modo reducido nunca cambia el primer render. */
function useReducedFlag() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  return !!useReducedMotion() && hydrated
}

/** Resortes por duración reescritos como rigidez y amortiguación: si cambian de destino en pleno vuelo, conservan la velocidad que traen. */
const physical = (visualDuration: number, bounce: number): Transition => {
  const root = (2 * Math.PI) / (visualDuration * 1.2)
  return { type: 'spring', stiffness: root * root, damping: 2 * (1 - bounce) * root, mass: 1 }
}
type Springs = ReturnType<typeof springsFor>
/** Todo el movimiento sale de --ui-dur: cada resorte es un múltiplo de `d`. */
function springsFor(d: number) {
  return {
    grow: physical(d * 2.2, 0.12),
    shrink: physical(d * 1.8, 0),
    glide: physical(d * 1.55, 0.08),
    width: physical(d * 2.3, 0.16),
    snappy: { type: 'spring', duration: d * 1.4, bounce: 0.1 } as Transition,
    smooth: { type: 'spring', duration: d * 2.2, bounce: 0 } as Transition,
  }
}

/** La bandera y el código giran en la dirección de la lista: un país más abajo sube desde abajo. */
const layerVariants = (d: number): Variants => ({
  enter: (dir: number) => ({ opacity: 0, y: `${dir * 0.6}em`, filter: `blur(${BLUR_SOFT}px)` }),
  rest: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
  exit: (dir: number) => ({ opacity: 0, y: `${dir * -0.5}em`, filter: `blur(${BLUR_SUBTLE}px)`, transition: { duration: d * 0.65, ease: standardEase } }),
})
const layerFade = (d: number): Variants => ({ enter: { opacity: 0 }, rest: { opacity: 1, y: 0, filter: 'none' }, exit: { opacity: 0, transition: { duration: d * 0.45 } } })

function matchesQuery(entry: PhoneCountry, needle: string) {
  if (!needle) return true
  const digits = onlyDigits(needle)
  if (digits && /^[+\d\s()-]+$/.test(needle)) return entry.dial.startsWith(digits) || digits.startsWith(entry.dial)
  if (needle.replace('+', '') === '') return true
  return fold(entry.name).includes(fold(needle)) || entry.iso.toLowerCase() === needle
}

/** Posición en el texto formateado justo después del enésimo dígito. */
function caretAfterDigits(text: string, count: number) {
  if (count <= 0) { const first = text.search(/\d/); return first < 0 ? text.length : Math.min(first, text.length) }
  let seen = 0
  for (let index = 0; index < text.length; index++) if (/\d/.test(text[index]) && ++seen === count) return index + 1
  return text.length
}

/** La fila abre su alto con un resorte y después entran las palabras. El espacio es padding dentro del recorte, así el alto parte de cero de verdad. */
function MessageRow({ id, text, tone, d, reduced, springs }: { id: string; text: string; tone: 'hint' | 'error'; d: number; reduced: boolean; springs: Springs }) {
  return (
    <motion.span className="relative block overflow-hidden" initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0, transition: reduced ? { duration: 0 } : { height: springs.smooth, opacity: { duration: d * 0.5 } } }}
      transition={reduced ? { duration: 0 } : { height: springs.smooth, opacity: { duration: d } }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={text} id={id} className={`block pt-2 text-xs leading-normal ${tone === 'error' ? 'text-(--tone-danger)' : 'text-ui-ink-muted'}`} role={tone === 'error' ? 'alert' : undefined}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: '0.35em', filter: `blur(${BLUR_SOFT}px)` }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, transition: { duration: d * 0.55 } }} transition={{ duration: reduced ? d * 0.65 : d * 1.6, ease: enterEase }}>{text}</motion.span>
      </AnimatePresence>
    </motion.span>
  )
}

type Row = { key: string; entry: PhoneCountry }
type Section = { key: string; label?: string; rows: Row[] }

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput({
  label, hideLabel = false, value, defaultValue, onValueChange, country: countryProp, defaultCountry = 'AR', onCountryChange, countries,
  preferredCountries = ['AR', 'UY', 'PY', 'BR', 'CL'], description, error, validate = true, disabled = false, required, name, id, className, onBlur,
}, forwardedRef) {
  const reduced = useReducedFlag()
  const d = useDur()
  const springs = useMemo(() => springsFor(d), [d])
  const springsRef = useRef(springs)
  springsRef.current = springs
  const uid = useId()
  const inputId = id ?? `${uid}-number`
  const listId = `${uid}-list`
  const hintId = `${inputId}-hint`, errorId = `${inputId}-error`
  const optionId = (key: string) => `${uid}-opt-${key}`

  const pool = useMemo(() => countries?.length ? PHONE_COUNTRIES.filter(entry => countries.includes(entry.iso)) : PHONE_COUNTRIES, [countries])
  const fallback = BY_ISO.get(defaultCountry) ?? PHONE_COUNTRIES[0]

  const [state, setState] = useState(() => {
    const parsed = parsePhoneNumber(value ?? defaultValue ?? '', pool)
    return parsed ? { iso: parsed.country.iso, digits: parsed.national } : { iso: fallback.iso, digits: '' }
  })
  const iso = countryProp ?? state.iso
  const current = BY_ISO.get(iso) ?? fallback
  const digits = state.digits
  const e164 = toE164(current, digits)

  // Un valor controlado distinto del último que produjo el campo se vuelve a leer.
  const [seenValue, setSeenValue] = useState(value)
  if (value !== seenValue) {
    setSeenValue(value)
    if (value !== undefined && value !== e164) {
      const parsed = parsePhoneNumber(value, pool)
      setState(parsed ? { iso: parsed.country.iso, digits: parsed.national } : { iso, digits: '' })
    }
  }

  const formatted = formatNational(current, digits)
  const status = statusOf(current, digits)
  const [touched, setTouched] = useState(false)
  const [numberFocused, setNumberFocused] = useState(false)
  const lengths = lengthsOf(current)
  const lengthCopy = lengths.length === 1 ? `${lengths[0]}` : `${lengths.slice(0, -1).join(', ')} o ${lengths[lengths.length - 1]}`
  const builtIn = validate && touched && (status === 'incomplete' || status === 'too-long') ? `Los números de ${current.name} tienen ${lengthCopy} dígitos` : undefined
  const message = error ?? builtIn

  /* La guía: el resto del número de ejemplo, con la forma que espera este país, dibujado tenue después de lo tipeado. */
  const guide = useMemo(() => {
    const [trunk, rest] = splitTrunk(current, digits)
    if (rest.length >= current.example.length) return ''
    const full = formatNational(current, trunk + rest + current.example.slice(rest.length))
    return full.startsWith(formatted) ? full.slice(formatted.length) : ''
  }, [current, digits, formatted])

  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement)
  const pendingCaret = useRef<number | null>(null)
  const [, rerender] = useReducer((count: number) => count + 1, 0)

  const emit = useCallback((entry: PhoneCountry, nextDigits: string) => {
    const nextStatus = statusOf(entry, nextDigits)
    onValueChange?.(toE164(entry, nextDigits), { country: entry, formatted: formatNational(entry, nextDigits), status: nextStatus, valid: nextStatus === 'valid' })
  }, [onValueChange])

  const setNumber = (nextDigits: string, caretDigits: number | null, entry = current) => {
    const capped = capDigits(entry, nextDigits)
    pendingCaret.current = caretDigits === null ? null : Math.min(caretDigits, capped.length)
    if (entry.iso !== current.iso) onCountryChange?.(entry.iso)
    // Nada cambió (un dígito rechazado): React repone el texto viejo después de este handler, así que el cursor se ubica en el próximo render.
    if (capped === digits && entry.iso === current.iso) { rerender(); return }
    setState({ iso: entry.iso, digits: capped })
    emit(entry, capped)
  }

  function placeCaret() {
    const input = inputRef.current, count = pendingCaret.current
    pendingCaret.current = null
    if (!input || count === null || document.activeElement !== input) return
    const position = caretAfterDigits(input.value, count)
    input.setSelectionRange(position, position)
  }
  useLayoutEffect(placeCaret)

  const [announcement, setAnnouncement] = useState('')

  /* ---------------------------------------------- El número ---------------------------------------------- */

  function onNumberChange(input: HTMLInputElement) {
    const raw = input.value
    // El autocompletado y el texto arrastrado llegan como un cambio: un número internacional elige solo su país.
    if (raw.includes('+') || (/^\s*00/.test(raw) && onlyDigits(raw).length > 6)) {
      const parsed = parsePhoneNumber(raw.slice(Math.max(0, raw.indexOf('+'))), pool)
      if (parsed && parsed.national) {
        if (parsed.country.iso !== current.iso) setAnnouncement(`País cambiado a ${parsed.country.name}`)
        setNumber(parsed.national, parsed.national.length, parsed.country)
        return
      }
    }
    const caret = input.selectionStart ?? raw.length
    setNumber(onlyDigits(raw), onlyDigits(raw.slice(0, caret)).length)
  }

  function onNumberKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget
    if (event.key === '+' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); openList('+'); return }
    const start = input.selectionStart ?? 0, end = input.selectionEnd ?? 0
    if (start !== end || event.metaKey || event.ctrlKey || event.altKey) return
    // Borrar un separador borra el dígito de al lado en vez de no hacer nada.
    if (event.key === 'Backspace' && start > 0 && !/\d/.test(input.value[start - 1])) {
      event.preventDefault()
      const index = onlyDigits(input.value.slice(0, start)).length
      if (index > 0) setNumber(digits.slice(0, index - 1) + digits.slice(index), index - 1)
    }
    if (event.key === 'Delete' && start < input.value.length && !/\d/.test(input.value[start])) {
      event.preventDefault()
      const index = onlyDigits(input.value.slice(0, start)).length
      setNumber(digits.slice(0, index) + digits.slice(index + 1), index)
    }
  }

  function onPaste(event: ReactClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text')
    if (!text) return
    event.preventDefault()
    const input = event.currentTarget
    const parsed = /^\s*(\+|00)/.test(text) ? parsePhoneNumber(text, pool) : null
    if (parsed) {
      if (parsed.country.iso !== current.iso) setAnnouncement(`País cambiado a ${parsed.country.name}`)
      setNumber(parsed.national, parsed.national.length, parsed.country)
      return
    }
    let pasted = onlyDigits(text)
    // "54 11 2345 6789" pegado en un campo argentino: el código de país se descarta si el número no entraría con él.
    if (pasted.startsWith(current.dial) && pasted.length > capDigits(current, pasted).length) pasted = pasted.slice(current.dial.length)
    // Un número entero reemplaza lo que había; un fragmento entra donde está el cursor.
    if (pasted.length >= Math.min(...lengthsOf(current))) { setNumber(pasted, pasted.length); return }
    const a = onlyDigits(input.value.slice(0, input.selectionStart ?? 0)).length
    const b = onlyDigits(input.value.slice(0, input.selectionEnd ?? 0)).length
    setNumber(digits.slice(0, a) + pasted + digits.slice(b), a + pasted.length)
  }

  /* ---------------------------------------------- El selector de país ---------------------------------------------- */

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [roll, setRoll] = useState(1)
  const needle = query.trim().toLowerCase()

  const sections = useMemo<Section[]>(() => {
    const sorted = [...pool].sort(byName)
    if (needle && needle !== '+') {
      const hits = sorted.filter(entry => matchesQuery(entry, needle))
      const digitsOnly = onlyDigits(needle)
      if (digitsOnly) hits.sort((a, b) => Number(b.dial === digitsOnly) - Number(a.dial === digitsOnly) || a.dial.length - b.dial.length)
      return [{ key: 'results', rows: hits.map(entry => ({ key: `r-${entry.iso}`, entry })) }]
    }
    const preferred = preferredCountries.map(code => pool.find(entry => entry.iso === code)).filter((entry): entry is PhoneCountry => !!entry)
    const all = { key: 'all', label: preferred.length ? 'Todos los países' : undefined, rows: sorted.map(entry => ({ key: `a-${entry.iso}`, entry })) }
    return preferred.length ? [{ key: 'preferred', label: 'Sugeridos', rows: preferred.map(entry => ({ key: `p-${entry.iso}`, entry })) }, all] : [all]
  }, [needle, pool, preferredCountries])
  const rows = useMemo(() => sections.flatMap(section => section.rows), [sections])
  const activeKey = active !== null && rows.some(row => row.key === active) ? active : rows[0]?.key ?? null
  const orderOf = useMemo(() => new Map([...pool].sort(byName).map((entry, index) => [entry.iso, index])), [pool])

  const rootRef = useRef<HTMLDivElement>(null)
  const controlRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const listFaceRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<string, HTMLElement>())

  /* Una sola superficie cuyo ancho, alto y esquinas van a resorte entre el botón del país y la lista abierta.
     Las esquinas siguen a --ui-radius: cerrada, un pelo menos que el marco; abierta, un poco más. */
  const anchorW = useMotionValue<number | string>('auto')
  const shapeW = useMotionValue<number | string>('100%'), shapeH = useMotionValue<number | string>('100%'), radius = useMotionValue(11)
  const sizes = useRef({ trigger: 0, lid: 0, panel: 0, list: 0 })
  const radii = useRef({ closed: 11, open: 16 })
  const live = useRef({ open: false, reduced: false, measured: false })
  useLayoutEffect(() => { live.current.reduced = reduced }, [reduced])

  const place = useCallback((animated: boolean) => {
    const { trigger, lid, panel, list } = sizes.current
    if (!trigger || !lid) return
    const isOpen = live.current.open
    const next = isOpen ? { w: Math.max(trigger, panel), h: lid + 2 + list, r: radii.current.open } : { w: trigger, h: lid, r: radii.current.closed }
    if (!animated || live.current.reduced || !live.current.measured) {
      anchorW.jump(trigger); shapeW.jump(next.w); shapeH.jump(next.h); radius.jump(next.r)
      live.current.measured = true
      return
    }
    const s = springsRef.current
    const growing = isOpen
    animate(anchorW, trigger, s.width)
    animate(shapeW, next.w, growing ? s.grow : s.shrink)
    animate(shapeH, next.h, growing ? s.grow : s.shrink)
    animate(radius, next.r, growing ? s.grow : s.shrink)
  }, [anchorW, radius, shapeH, shapeW])

  const read = useCallback(() => {
    const measure = measureRef.current, control = controlRef.current, face = listFaceRef.current, root = rootRef.current
    if (!measure || !control || !face || !root) return false
    const panel = Math.min(PANEL_MAX, control.offsetWidth)
    root.style.setProperty('--pi-panel-w', `${panel}px`)
    const r = parseFloat(getComputedStyle(control).borderTopLeftRadius)
    if (Number.isFinite(r)) radii.current = { closed: Math.max(0, r - 1), open: r + 4 }
    const previous = sizes.current
    const next = { trigger: measure.offsetWidth, lid: control.clientHeight, panel, list: face.offsetHeight }
    sizes.current = next
    return next.trigger !== previous.trigger || next.lid !== previous.lid || next.panel !== previous.panel || (live.current.open && next.list !== previous.list)
  }, [])

  useLayoutEffect(() => {
    const measure = measureRef.current, control = controlRef.current, face = listFaceRef.current
    if (read()) place(live.current.measured)
    if (!measure || !control || !face || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => { if (read()) place(live.current.measured) })
    observer.observe(measure); observer.observe(control); observer.observe(face)
    return () => observer.disconnect()
  }, [place, read])

  const pendingFocus = useRef<'trigger' | 'search' | 'number' | null>(null)
  useLayoutEffect(() => {
    if (live.current.open !== open) { live.current.open = open; read(); place(true) }
    const target = pendingFocus.current
    pendingFocus.current = null
    if (target === 'search') searchRef.current?.focus({ preventScroll: true })
    if (target === 'trigger') triggerRef.current?.focus({ preventScroll: true })
    if (target === 'number') { const input = inputRef.current; input?.focus({ preventScroll: true }); input?.setSelectionRange(input.value.length, input.value.length) }
  }, [open, place, read])

  /* El resaltado se desliza entre filas con su propio resorte. */
  const hy = useMotionValue(0), hh = useMotionValue(0), ho = useMotionValue(0)
  const scrollIntent = useRef(false)
  useLayoutEffect(() => {
    const node = open && activeKey ? rowRefs.current.get(activeKey) : undefined
    if (!node) { animate(ho, 0, { duration: reduced || !open ? 0 : d * 0.65, ease: standardEase }); return }
    const top = node.offsetTop, height = node.offsetHeight
    if (ho.get() < 0.05 || reduced) { hy.jump(top); hh.jump(height) } else { animate(hy, top, springs.glide); animate(hh, height, springs.glide) }
    animate(ho, 1, { duration: reduced ? 0 : d * 0.65, ease: enterEase })
    const scroller = scrollRef.current
    if (scroller && scrollIntent.current) {
      scrollIntent.current = false
      const pad = 6
      if (top < scroller.scrollTop + pad) scroller.scrollTop = top - pad
      else if (top + height > scroller.scrollTop + scroller.clientHeight - pad) scroller.scrollTop = top + height - scroller.clientHeight + pad
    }
  }, [activeKey, hh, ho, hy, open, reduced, sections, d, springs])

  function openList(seed = '') {
    if (disabled || open) return
    setQuery(seed)
    const selectedRow = seed ? null : sections.flatMap(section => section.rows).find(row => row.entry.iso === current.iso && !row.key.startsWith('p-')) ?? null
    setActive(selectedRow?.key ?? null)
    scrollIntent.current = true
    pendingFocus.current = 'search'
    setAnnouncement('')
    setOpen(true)
  }
  const close = useCallback((focus: 'trigger' | 'number' | null) => {
    pendingFocus.current = focus
    setOpen(false)
  }, [setOpen])

  function pick(entry: PhoneCountry | undefined) {
    if (!entry) return
    if (entry.iso !== current.iso) {
      setRoll(Math.sign((orderOf.get(entry.iso) ?? 0) - (orderOf.get(current.iso) ?? 0)) || 1)
      const nextDigits = capDigits(entry, digits)
      if (countryProp === undefined) setState({ iso: entry.iso, digits: nextDigits })
      else setState(last => ({ ...last, digits: nextDigits }))
      onCountryChange?.(entry.iso)
      emit(entry, nextDigits)
      setAnnouncement(`${entry.name}, +${entry.dial}`)
    }
    close('number')
  }

  function move(key: string | null | undefined) {
    if (!key) return
    scrollIntent.current = true
    setActive(key)
  }

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    const at = rows.findIndex(row => row.key === activeKey)
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); move(rows[Math.min(rows.length - 1, at + 1)]?.key); return
      case 'ArrowUp': event.preventDefault(); move(rows[Math.max(0, at - 1)]?.key); return
      case 'PageDown': event.preventDefault(); move(rows[Math.min(rows.length - 1, at + PAGE)]?.key); return
      case 'PageUp': event.preventDefault(); move(rows[Math.max(0, at - PAGE)]?.key); return
      case 'Home': if (query) return; event.preventDefault(); move(rows[0]?.key); return
      case 'End': if (query) return; event.preventDefault(); move(rows[rows.length - 1]?.key); return
      case 'Enter': event.preventDefault(); pick(rows[at]?.entry); return
      case 'Escape': event.preventDefault(); event.stopPropagation(); close('trigger'); return
      case 'Tab': close(null); return
    }
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openList(); return }
    if (event.key.length === 1 && event.key !== ' ' && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); openList(event.key) }
  }

  function onQuery(next: string) {
    setQuery(next)
    setActive(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    const text = next.trim().toLowerCase()
    const count = text && text !== '+' ? pool.filter(entry => matchesQuery(entry, text)).length : pool.length
    setAnnouncement(text ? count ? `${count} ${count === 1 ? 'país' : 'países'}` : 'Sin coincidencias' : '')
  }

  useEffect(() => {
    if (!open) return
    const down = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) close(null) }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [close, open])

  const onRootBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null
    if (open && next && !event.currentTarget.contains(next)) close(null)
  }

  const showCheck = status === 'valid'
  const invalid = !!message
  const describedBy = [description ? hintId : null, message ? errorId : null].filter(Boolean).join(' ') || undefined
  const rootStyle = { '--pi-h': '44px', '--tone-danger': TONE_DANGER, '--tone-ok': TONE_OK } as CSSProperties
  const borderTone = invalid ? 'border-(--tone-danger)' : numberFocused ? 'border-ui-ink' : 'border-ui-line hover:border-ui-ink-muted'

  const face = (entry: PhoneCountry) => <>
    <span className="inline-grid w-5 flex-none place-items-center text-[17px] leading-none font-normal" style={EMOJI_FONT} aria-hidden="true">{flagOf(entry.iso)}</span>
    <span className="tabular-nums">+{entry.dial}</span>
  </>

  return (
    <div ref={rootRef} className={['group relative grid min-w-0 font-ui-text data-[open]:z-30', className].filter(Boolean).join(' ')} style={rootStyle} data-open={open || undefined} data-disabled={disabled || undefined} onBlur={onRootBlur}>
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'mb-2 justify-self-start text-sm leading-normal font-medium text-ui-ink'}>{label}</label>

      {/* El marco es el de un campo común: un borde, un radio y un cambio tranquilo de borde al pasar y al enfocar. */}
      <div ref={controlRef} className={`relative flex h-(--pi-h) min-w-0 rounded-ui border bg-ui-surface transition-[border-color] duration-(--ui-dur) ease-ui group-data-[disabled]:bg-ui-surface-2 group-data-[disabled]:opacity-50 ${borderTone}`} data-invalid={invalid || undefined}>
        {/* El ancla guarda el lugar del botón cerrado y va a resorte a un ancho nuevo cuando el código cambia de largo. */}
        <motion.div className="relative h-full flex-none after:absolute after:top-2.5 after:right-0 after:bottom-2.5 after:w-px after:bg-ui-line after:transition-opacity after:duration-(--ui-dur) after:ease-ui after:content-[''] group-data-[open]:after:opacity-0" style={{ width: anchorW }}>
          {/* Dimensiona el botón cerrado: mismo padding y contenido, así el resorte del ancho tiene destino antes de que algo se mueva. */}
          <span ref={measureRef} className="pointer-events-none invisible flex h-[calc(var(--pi-h)-2px)] w-max items-center pr-8 pl-3 text-sm font-medium whitespace-nowrap" aria-hidden="true">{face(current)}</span>

          {/* Un solo material para los dos estados. Abierto, se asoma por encima del borde del marco para que las dos líneas nunca se dupliquen. */}
          <motion.div
            className="absolute top-0 left-0 z-[2] overflow-clip bg-ui-surface transition-[box-shadow,background-color] duration-[calc(var(--ui-dur)*2.4)] ease-ui after:pointer-events-none after:absolute after:inset-0 after:z-[3] after:rounded-[inherit] after:border after:border-ui-line after:opacity-0 after:transition-opacity after:duration-(--ui-dur) after:ease-ui after:content-[''] group-data-[open]:-translate-px group-data-[open]:shadow-[0_18px_40px_-14px_color-mix(in_oklch,var(--ui-ink)_30%,transparent),0_2px_8px_color-mix(in_oklch,var(--ui-ink)_8%,transparent)] group-data-[open]:after:opacity-100 group-data-[disabled]:bg-transparent"
            style={{ width: shapeW, height: shapeH, borderRadius: radius }}
          >
            <div className="absolute inset-x-0 top-0 z-[1] h-[calc(var(--pi-h)-2px)]">
              <button ref={triggerRef} type="button" disabled={disabled} inert={open || undefined} tabIndex={open ? -1 : 0}
                className="absolute inset-[3px_auto_3px_3px] flex w-[calc(100%-6px)] cursor-pointer touch-manipulation items-center rounded-[calc(var(--ui-radius)-4px)] border-0 bg-transparent pr-[29px] pl-[9px] text-left text-sm font-medium whitespace-nowrap text-ui-ink transition-[background-color] duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] hover:bg-ui-surface-2 focus-visible:bg-ui-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-ink active:bg-ui-surface-2 disabled:cursor-not-allowed"
                aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={`País, ${current.name} +${current.dial}`}
                onClick={() => (open ? close('trigger') : openList())} onKeyDown={onTriggerKeyDown}>
                <span className="relative block h-full min-w-0 flex-1 data-[hidden]:opacity-0 data-[hidden]:transition-opacity data-[hidden]:duration-[calc(var(--ui-dur)*0.5)]" data-hidden={open || undefined}>
                  <AnimatePresence initial={false} custom={roll}>
                    <motion.span key={current.iso} className="absolute inset-0 flex items-center gap-1.5" custom={roll} variants={reduced ? layerFade(d) : layerVariants(d)} initial="enter" animate="rest" exit="exit"
                      transition={reduced ? { duration: d * 0.65 } : { y: springs.glide, opacity: { duration: d * 1.1, ease: enterEase }, filter: { duration: d * 1.2, ease: enterEase } }}>
                      {face(current)}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </button>

              {/* El buscador ocupa el lugar del botón mientras la lista está abierta. */}
              <motion.div className="absolute inset-0 flex items-center gap-2 pr-0.5 pl-[13px] [&[inert]]:pointer-events-none" inert={!open || undefined} initial={false}
                animate={open ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: reduced ? 'blur(0px)' : `blur(${BLUR_SUBTLE}px)` }}
                transition={open ? { duration: d, ease: enterEase, delay: reduced ? 0 : d * 0.3 } : { duration: d * 0.55, ease: standardEase }}>
                <Search className="flex-none text-ui-ink-muted" size={16} strokeWidth={1.75} aria-hidden="true" />
                <input ref={searchRef} className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-ui-ink outline-none placeholder:text-ui-ink-muted" type="text" role="combobox" aria-label="Buscar país o código" aria-expanded={open} aria-controls={listId}
                  aria-autocomplete="list" aria-activedescendant={open && activeKey ? optionId(activeKey) : undefined} placeholder="País o código" value={query}
                  autoComplete="off" spellCheck={false} onChange={event => onQuery(event.target.value)} onKeyDown={onSearchKeyDown} />
                <AnimatePresence initial={false}>
                  {query && <motion.button key="clear" type="button" className="grid size-6 flex-none cursor-pointer place-items-center rounded-full border-0 bg-[color-mix(in_oklch,var(--ui-ink)_8%,transparent)] p-0 text-ui-ink-soft [-webkit-tap-highlight-color:transparent] hover:text-ui-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ui-ink" aria-label="Borrar la búsqueda" onPointerDown={event => event.preventDefault()}
                    onClick={() => { onQuery(''); searchRef.current?.focus() }}
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6, transition: { duration: d * 0.55 } }} transition={reduced ? { duration: 0 } : springs.glide}>
                    <X size={14} strokeWidth={1.75} aria-hidden="true" />
                  </motion.button>}
                </AnimatePresence>
                {/* Va sobre la flecha compartida, así la flecha también cierra la lista. */}
                <button type="button" className="size-9 flex-none cursor-pointer rounded-full border-0 bg-transparent p-0 transition-[background-color] duration-(--ui-dur) ease-ui [-webkit-tap-highlight-color:transparent] hover:bg-[color-mix(in_oklch,var(--ui-ink)_8%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ui-ink" aria-label="Cerrar la lista de países" onClick={() => close('trigger')} />
              </motion.div>

              <motion.span className="pointer-events-none absolute top-1/2 right-3 -mt-2 grid size-4 place-items-center text-ui-ink-muted" aria-hidden="true" initial={false} animate={{ rotate: open ? 180 : 0 }} transition={reduced ? { duration: 0 } : springs.glide}>
                <ChevronDown size={16} strokeWidth={1.75} />
              </motion.span>
            </div>

            {/* La lista cuelga bajo la tapa con su ancho final, así las filas nunca se reacomodan mientras la superficie se abre. */}
            <motion.div ref={listFaceRef} className="absolute top-[calc(var(--pi-h)-2px)] left-0 px-1.5 pb-1.5 before:absolute before:top-0 before:right-3.5 before:left-3.5 before:h-px before:bg-ui-line before:content-[''] [&[inert]]:pointer-events-none" inert={!open || undefined} aria-hidden={!open || undefined} initial={false}
              style={{ width: 'var(--pi-panel-w, 320px)' }}
              animate={open ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: reduced ? 0 : -6, filter: reduced ? 'blur(0px)' : `blur(${BLUR_SUBTLE}px)` }}
              transition={open ? { y: springs.grow, opacity: { duration: d * 1.1, ease: enterEase, delay: reduced ? 0 : d * 0.2 }, filter: { duration: d * 1.2, ease: enterEase, delay: d * 0.2 } } : { duration: d * 0.55, ease: standardEase }}>
              <div ref={scrollRef} className="max-h-[280px] overflow-y-auto overscroll-contain pt-1.5 [scrollbar-width:thin]">
                <div id={listId} className="relative grid gap-0.5" role="listbox" aria-label="Países">
                  <motion.span className="pointer-events-none absolute inset-x-0 top-0 rounded-[14px] bg-[color-mix(in_oklch,var(--ui-ink)_6.5%,transparent)]" style={{ y: hy, height: hh, opacity: ho }} aria-hidden="true" />
                  {sections.map((section, index) => {
                    const body = section.rows.map(row => {
                      const selected = row.entry.iso === current.iso
                      return <div key={row.key} id={optionId(row.key)} role="option" aria-selected={selected} data-active={row.key === activeKey || undefined}
                        className="relative flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[14px] px-2.5 text-sm text-ui-ink-soft transition-colors duration-(--ui-dur) ease-ui select-none aria-selected:text-ui-ink data-[active]:text-ui-ink"
                        ref={node => { if (node) rowRefs.current.set(row.key, node); else rowRefs.current.delete(row.key) }}
                        onPointerMove={event => { if (event.pointerType === 'mouse' && row.key !== activeKey) setActive(row.key) }}
                        onPointerDown={event => event.preventDefault()} onClick={() => pick(row.entry)}>
                        <span className="inline-grid w-5 flex-none place-items-center text-[17px] leading-none font-normal" style={EMOJI_FONT} aria-hidden="true">{flagOf(row.entry.iso)}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{row.entry.name}</span>
                        <span className="flex-none text-xs text-ui-ink-muted tabular-nums">+{row.entry.dial}</span>
                        <span className="grid size-4 flex-none scale-[.6] place-items-center text-ui-ink opacity-0 transition-[opacity,transform] duration-(--ui-dur) ease-ui data-[on]:scale-100 data-[on]:opacity-100" data-on={selected || undefined} aria-hidden="true"><Check size={16} strokeWidth={1.75} /></span>
                      </div>
                    })
                    const groupClass = `grid gap-0.5${index > 0 ? ' mt-1' : ''}`
                    return section.label
                      ? <div key={section.key} role="group" aria-labelledby={`${uid}-${section.key}`} className={groupClass}>
                        <div id={`${uid}-${section.key}`} className="px-2.5 pt-2 pb-1 text-xs text-ui-ink-muted" role="presentation">{section.label}</div>{body}
                      </div>
                      : <div key={section.key} role="presentation" className={groupClass}>{body}</div>
                  })}
                  {rows.length === 0 && <p className="m-0 px-2.5 pt-3 pb-3.5 text-sm text-ui-ink-muted">Ningún país coincide con “{query.trim()}”</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* El número y su guía comparten una caja. La guía pinta invisible lo tipeado y después, tenue, el resto del ejemplo. */}
        <div className="relative flex min-w-0 flex-1 items-center">
          <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden pr-9 pl-3 text-sm leading-normal whitespace-pre text-[color-mix(in_oklch,var(--ui-ink-muted)_72%,transparent)] tabular-nums" aria-hidden="true"><span className="invisible">{formatted}</span>{guide}</span>
          <input ref={inputRef} id={inputId} className="relative z-[1] h-full w-full min-w-0 rounded-r-ui border-0 bg-transparent pr-9 pl-3 text-sm leading-normal text-ui-ink tabular-nums outline-none disabled:cursor-not-allowed" type="tel" inputMode="tel" autoComplete="tel" value={formatted} disabled={disabled} required={required}
            aria-invalid={invalid || undefined} aria-describedby={describedBy} aria-label={hideLabel ? label : undefined}
            onChange={event => onNumberChange(event.currentTarget)} onKeyDown={onNumberKeyDown} onPaste={onPaste}
            onFocus={() => setNumberFocused(true)}
            onBlur={event => { setNumberFocused(false); setTouched(digits.length > 0); onBlur?.(event) }} />
          <AnimatePresence initial={false}>
            {showCheck && <motion.span key="ok" className="pointer-events-none absolute top-1/2 right-3 z-[1] -mt-[9px] grid size-[18px] place-items-center text-(--tone-ok)" aria-hidden="true"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: `blur(${BLUR_SUBTLE}px)` }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.8, transition: { duration: d * 0.55 } }} transition={reduced ? { duration: d * 0.65 } : springs.snappy}>
              <Check size={16} strokeWidth={2} />
            </motion.span>}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>{description && !message && <MessageRow key="hint" id={hintId} text={description} tone="hint" d={d} reduced={reduced} springs={springs} />}</AnimatePresence>
      <AnimatePresence initial={false}>{message && <MessageRow key="error" id={errorId} text={message} tone="error" d={d} reduced={reduced} springs={springs} />}</AnimatePresence>
      {name && <input type="hidden" name={name} value={e164} />}
      <span className="sr-only" role="status" aria-live="polite">{announcement || (showCheck ? `Número válido de ${current.name}` : '')}</span>
    </div>
  )
})

PhoneInput.displayName = 'PhoneInput'
export default PhoneInput
