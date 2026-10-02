import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { statSync, unlinkSync, existsSync } from 'node:fs'

const run = promisify(execFile)

/** De más fiel a más liviano. El tope de 400 KB se persigue en este orden. */
export function escalonesDeCompresion() {
  return [
    { fps: 12, segundos: 3, calidad: 75 },
    { fps: 12, segundos: 3, calidad: 60 },
    { fps: 12, segundos: 3, calidad: 45 },
    { fps: 10, segundos: 3, calidad: 45 },
    { fps: 8, segundos: 3, calidad: 45 },
    { fps: 8, segundos: 2.5, calidad: 45 },
    { fps: 8, segundos: 2, calidad: 40 },
  ]
}

/** Convierte un video a WebP animado de 600 px de ancho. Devuelve el peso en bytes. */
export async function aWebp({ entrada, salida, fps, segundos, calidad, desde = 0.2 }) {
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-ss', String(desde), '-t', String(segundos),
    '-i', entrada,
    '-vf', `fps=${fps},scale=600:-2:flags=lanczos`,
    '-loop', '0', '-quality', String(calidad), '-compression_level', '6', '-an',
    salida,
  ])
  return statSync(salida).size
}

/** Prueba los escalones hasta que el archivo entre en el tope. Si ninguno entra, borra la salida y tira. */
export async function comprimirHastaEntrar({ entrada, salida, tope }) {
  let bytes = Infinity
  const escalones = escalonesDeCompresion()
  for (let i = 0; i < escalones.length; i++) {
    bytes = await aWebp({ entrada, salida, ...escalones[i] })
    if (bytes <= tope) return { bytes, intento: i + 1 }
  }
  if (existsSync(salida)) unlinkSync(salida)
  throw new Error(`no entra en ${Math.round(tope / 1024)} KB ni con el escalón más liviano (quedó en ${Math.ceil(bytes / 1024)} KB)`)
}
