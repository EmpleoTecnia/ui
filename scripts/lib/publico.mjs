// El repo es público. Esto busca lo que no puede entrar: claves, tokens, URLs de
// proyectos propios y correos reales (los de ejemplo van en example.com).

const PATRONES = [
  [/sk_(live|test)_[A-Za-z0-9]{10,}/, 'clave de Stripe'],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
  [/service_role/i, 'service role de Supabase'],
  [/[a-z0-9-]{10,}\.supabase\.(co|in)\b/i, 'URL de un proyecto Supabase'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'clave de AWS'],
  [/\b(ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}/, 'token de GitHub'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clave privada'],
  [/\b(password|passwd|pwd|contraseña|secret|api[_-]?key)\s*[:=]\s*["'`][^"'`]{6,}["'`]/i, 'contraseña o clave escrita a mano'],
]

const CORREO = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g
// Dominios que no son de nadie (o que no identifican a una persona).
const DOMINIOS_PERMITIDOS = /(^|\.)(example\.(com|org|net)|ejemplo\.test|anthropic\.com|noreply\.github\.com)$/i

/** Revisa un texto línea por línea. Devuelve [{ ruta, linea, motivo }]. */
export function hallazgosSensibles(texto, ruta) {
  const hallazgos = []
  const lineas = String(texto).split('\n')
  lineas.forEach((l, i) => {
    for (const [re, motivo] of PATRONES) if (re.test(l)) hallazgos.push({ ruta, linea: i + 1, motivo })
    for (const m of l.matchAll(CORREO)) {
      const dominio = m[0].slice(m[0].indexOf('@') + 1)
      if (!DOMINIOS_PERMITIDOS.test(dominio)) hallazgos.push({ ruta, linea: i + 1, motivo: `correo con dominio real (${m[0]}); usá @example.com` })
    }
  })
  return hallazgos
}
