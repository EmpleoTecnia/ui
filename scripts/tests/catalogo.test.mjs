import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { construirCatalogo, escribirSalidas, hashCodigo } from '../lib/catalogo.mjs'

const ficha = (extra = {}) => ({
  slug: 'magnet-button', nombre: 'Botón imán', categoria: 'buttons', estado: 'referencia',
  origen: { nombre: 'EmpleoTecnia', url: '', licencia: 'propia' }, publicable: true,
  por_que_entro: 'El botón se corre hacia el cursor y vuelve con un resorte; se siente vivo sin gritar.',
  sirve_para: ['CTA'], etiquetas: ['hover'], tokens: [], agregado_por: 'franco', fecha: '2026-10-02', ...extra,
})

let raiz
function entrada(tipo, categoria, slug, meta, archivos = {}) {
  const dir = join(raiz, tipo, categoria, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'meta.json'), typeof meta === 'string' ? meta : JSON.stringify(meta, null, 2))
  writeFileSync(join(dir, 'README.md'), '# x')
  for (const [nombre, contenido] of Object.entries(archivos)) writeFileSync(join(dir, nombre), contenido)
  return dir
}
const png = Buffer.alloc(100, 1)
const webp = Buffer.alloc(100, 2)

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'ui-'))
  mkdirSync(join(raiz, 'playground'))
  writeFileSync(join(raiz, 'README.md'), '# Librería\n\n<!-- catalogo:inicio -->\nviejo\n<!-- catalogo:fin -->\n')
})

describe('construirCatalogo', () => {
  it('lee una referencia con su png y arma la entrada', async () => {
    entrada('components', 'buttons', 'magnet-button', ficha(), { 'preview.png': png })
    const { entradas, errores } = await construirCatalogo(raiz)
    expect(errores).toEqual([])
    expect(entradas).toHaveLength(1)
    expect(entradas[0]).toMatchObject({
      tipo: 'components', ruta: 'components/buttons/magnet-button',
      url_github: 'https://github.com/EmpleoTecnia/ui/tree/main/components/buttons/magnet-button',
      preview_png: 'components/buttons/magnet-button/preview.png', preview_webp: null,
    })
  })

  it('dice archivo y línea cuando el JSON está roto', async () => {
    entrada('components', 'buttons', 'magnet-button', '{ "slug": "magnet-button", }')
    const { errores } = await construirCatalogo(raiz)
    expect(errores[0]).toMatch(/components\/buttons\/magnet-button\/meta\.json/)
    expect(errores[0]).toMatch(/JSON/)
    expect(errores[0]).toMatch(/línea 1/)
  })

  it('una ficha null o sin nombre da un error con ruta, no un stack trace', async () => {
    entrada('components', 'buttons', 'a-uno', 'null')
    const sinNombre = ficha({ slug: 'b-dos' }); delete sinNombre.nombre
    entrada('components', 'buttons', 'b-dos', sinNombre, { 'preview.png': png })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join('\n')).toMatch(/a-uno: la ficha no es un objeto/)
    expect(errores.join('\n')).toMatch(/b-dos: falta nombre/)
  })

  it('rechaza slugs repetidos entre tipos', async () => {
    entrada('components', 'buttons', 'magnet-button', ficha(), { 'preview.png': png })
    entrada('patterns', 'landing', 'magnet-button', ficha({ categoria: 'landing' }), { 'preview.png': png })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join()).toMatch(/slug "magnet-button" repetido/)
  })

  it('una referencia sin preview.png falla', async () => {
    entrada('components', 'buttons', 'magnet-button', ficha())
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join()).toMatch(/preview\.png/)
  })

  it('un adoptado que usa un token no declarado falla', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent', '--ui-radius'] })
    entrada('components', 'buttons', 'magnet-button', meta, {
      'MagnetButton.tsx': 'export const B = () => <button className="bg-ui-accent rounded-ui text-ui-ink" />',
      'demo.tsx': 'export default []',
      'preview.png': png, 'preview.webp': webp,
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join('\n')).toMatch(/usa --ui-ink y la ficha no lo declara/)
  })

  it('un adoptado con token declarado y no usado falla', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent', '--ui-line'] })
    entrada('components', 'buttons', 'magnet-button', meta, {
      'MagnetButton.tsx': 'export const B = () => <button className="bg-ui-accent" />',
      'demo.tsx': 'export default []', 'preview.png': png, 'preview.webp': webp,
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join('\n')).toMatch(/declara --ui-line y el código no lo usa/)
  })

  it('un adoptado con color crudo falla con archivo y línea', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent'] })
    entrada('components', 'buttons', 'magnet-button', meta, {
      'MagnetButton.tsx': 'const a = 1\nexport const B = () => <button className="bg-ui-accent" style={{ color: "#f00" }} />',
      'demo.tsx': 'export default []', 'preview.png': png, 'preview.webp': webp,
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join('\n')).toMatch(/MagnetButton\.tsx:2.*#f00/)
  })

  it('con sinCapturas no exige png ni webp pero sí todo lo demás', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent'] })
    entrada('components', 'buttons', 'magnet-button', meta, {
      'MagnetButton.tsx': 'export const B = () => <button className="bg-ui-accent" />', 'demo.tsx': 'export default []',
    })
    const { errores } = await construirCatalogo(raiz, { sinCapturas: true })
    expect(errores).toEqual([])
  })

  it('un webp que pasa el tope falla con el tamaño', async () => {
    const meta = ficha({ estado: 'adoptado', tokens: ['--ui-accent'] })
    entrada('components', 'buttons', 'magnet-button', meta, {
      'MagnetButton.tsx': 'export const B = () => <button className="bg-ui-accent" />', 'demo.tsx': 'export default []',
      'preview.png': png, 'preview.webp': Buffer.alloc(401 * 1024),
    })
    const { errores } = await construirCatalogo(raiz)
    expect(errores.join()).toMatch(/preview\.webp pesa 401 KB/)
  })
})

describe('hashCodigo', () => {
  it('cambia si cambia el código y no si cambian las capturas', async () => {
    const dir = entrada('components', 'buttons', 'magnet-button', ficha(), { 'A.tsx': 'a', 'preview.png': png })
    const h1 = hashCodigo(dir)
    writeFileSync(join(dir, 'preview.png'), Buffer.alloc(5))
    expect(hashCodigo(dir)).toBe(h1)
    writeFileSync(join(dir, 'A.tsx'), 'b')
    expect(hashCodigo(dir)).not.toBe(h1)
    expect(h1).toMatch(/^[0-9a-f]{12}$/)
  })
})

describe('escribirSalidas', () => {
  it('escribe catalog.json, READMEs generados, el bloque del raíz y el registro', async () => {
    entrada('components', 'buttons', 'magnet-button', ficha({ estado: 'adoptado', tokens: ['--ui-accent'] }), {
      'MagnetButton.tsx': 'export const B = () => <button className="bg-ui-accent" />', 'demo.tsx': 'export default []',
      'preview.png': png, 'preview.webp': webp,
    })
    entrada('components', 'cards', 'glass-card', ficha({ slug: 'glass-card', nombre: 'Tarjeta vidrio', categoria: 'cards', estado: 'retirado', por_que_salio: 'Pesada.' }), { 'preview.png': png })
    const { entradas, errores } = await construirCatalogo(raiz)
    expect(errores).toEqual([])
    escribirSalidas(raiz, entradas)

    const catalogo = JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8'))
    expect(catalogo.entradas).toHaveLength(2)
    expect(catalogo.generado).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const cat = readFileSync(join(raiz, 'components/buttons/README.md'), 'utf8')
    expect(cat).toMatch(/<img src="magnet-button\/preview\.webp"/)
    expect(cat).toMatch(/Botón imán/)

    const tipo = readFileSync(join(raiz, 'components/README.md'), 'utf8')
    expect(tipo).toMatch(/\[buttons\]\(buttons\/\)/)
    expect(tipo).toMatch(/<img src="buttons\/magnet-button\/preview\.webp"/)
    expect(tipo).not.toMatch(/<img src="cards\/glass-card/)
    expect(tipo).toMatch(/Retirados[\s\S]*cards\/glass-card/)

    const raizMd = readFileSync(join(raiz, 'README.md'), 'utf8')
    expect(raizMd).not.toMatch(/viejo/)
    expect(raizMd).toMatch(/<!-- catalogo:inicio -->[\s\S]*components\/buttons\/magnet-button[\s\S]*<!-- catalogo:fin -->/)

    const registro = readFileSync(join(raiz, 'playground/registro.generado.tsx'), 'utf8')
    expect(registro).toMatch(/import d0 from '\.\.\/components\/buttons\/magnet-button\/demo'/)
    expect(registro).toMatch(/slug: "magnet-button"/)
    expect(registro).not.toMatch(/glass-card/)
  })

  it('no reescribe catalog.json si las entradas no cambiaron', async () => {
    entrada('components', 'buttons', 'magnet-button', ficha(), { 'preview.png': png })
    const { entradas } = await construirCatalogo(raiz)
    escribirSalidas(raiz, entradas)
    const generado1 = JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8')).generado
    await new Promise(r => setTimeout(r, 5))
    escribirSalidas(raiz, entradas)
    expect(JSON.parse(readFileSync(join(raiz, 'catalog.json'), 'utf8')).generado).toBe(generado1)
  })
})
