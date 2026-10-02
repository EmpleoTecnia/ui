/** Lo que pasa mientras se graba preview.webp: se dibuja una firma en dos trazos con el mouse y después se la reproduce. */

// Puntos en proporción del pad (0 a 1). La línea de firma está al 72 % de alto.
const NOMBRE = [
  [0.14, 0.62], [0.16, 0.40], [0.20, 0.30], [0.23, 0.38], [0.20, 0.55], [0.16, 0.66], [0.22, 0.68], [0.30, 0.60],
  [0.34, 0.52], [0.33, 0.64], [0.38, 0.66], [0.42, 0.56], [0.44, 0.48], [0.43, 0.62], [0.48, 0.66], [0.53, 0.55],
  [0.56, 0.46], [0.55, 0.60], [0.60, 0.66], [0.66, 0.58], [0.70, 0.50], [0.69, 0.64], [0.74, 0.66], [0.80, 0.58],
]
const RUBRICA = [[0.30, 0.77], [0.45, 0.74], [0.60, 0.76], [0.74, 0.72]]

export default async function guion(page) {
  const pad = page.locator('[aria-roledescription="superficie de firma"]').first()
  const box = await pad.boundingBox()
  if (!box) return
  const at = ([fx, fy]) => [box.x + box.width * fx, box.y + box.height * fy]

  async function trazo(puntos, pausa) {
    const [x0, y0] = at(puntos[0])
    await page.mouse.move(x0, y0)
    await page.mouse.down()
    for (const punto of puntos.slice(1)) {
      const [x, y] = at(punto)
      await page.mouse.move(x, y, { steps: 5 })
      await page.waitForTimeout(pausa)
    }
    await page.mouse.up()
  }

  await page.waitForTimeout(250)
  await trazo(NOMBRE, 28)
  await page.waitForTimeout(180)
  await trazo(RUBRICA, 45)
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Reproducir la firma' }).click()
  await page.waitForTimeout(1400)
}
