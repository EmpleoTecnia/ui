import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { statSync, unlinkSync, existsSync } from 'node:fs'

const run = promisify(execFile)

/** De más fiel a más liviano. El tope de 400 KB se persigue en este orden. */
export function escalonesDeCompresion() {
  return [
    { fps: 12, segundos: 3, calidad: 82 },
    { fps: 12, segundos: 3, calidad: 70 },
    { fps: 12, segundos: 3, calidad: 58 },
    { fps: 10, segundos: 3, calidad: 58 },
    { fps: 8, segundos: 3, calidad: 58 },
    { fps: 8, segundos: 2.5, calidad: 55 },
    { fps: 8, segundos: 2, calidad: 50 },
  ]
}

/** Convierte una secuencia de PNG (patrón tipo `f%04d.png`, grabada a `fpsOrigen`)
 *  a WebP animado de 600 px de ancho. Devuelve el peso en bytes.
 *  Los PNG vienen a 2x: al bajarlos a 600 con lanczos quedan nítidos. */
export async function aWebp({ entrada, salida, fps, segundos, calidad, fpsOrigen = 12 }) {
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(fpsOrigen), '-i', entrada,
    '-t', String(segundos),
    '-vf', `fps=${fps},scale=600:-2:flags=lanczos`,
    '-c:v', 'libwebp', '-loop', '0', '-quality', String(calidad), '-compression_level', '6', '-an',
    salida,
  ])
  return statSync(salida).size
}

/** Prueba los escalones hasta que el archivo entre en el tope. Si ninguno entra, borra la salida y tira. */
export async function comprimirHastaEntrar({ entrada, salida, tope, fpsOrigen = 12 }) {
  let bytes = Infinity
  const escalones = escalonesDeCompresion()
  for (let i = 0; i < escalones.length; i++) {
    bytes = await aWebp({ entrada, salida, fpsOrigen, ...escalones[i] })
    if (bytes <= tope) return { bytes, intento: i + 1 }
  }
  if (existsSync(salida)) unlinkSync(salida)
  throw new Error(`no entra en ${Math.round(tope / 1024)} KB ni con el escalón más liviano (quedó en ${Math.ceil(bytes / 1024)} KB)`)
}
