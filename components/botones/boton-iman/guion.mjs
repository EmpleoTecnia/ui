/** Lo que hace el cursor mientras se graba preview.webp (3 segundos). */
export default async function guion(page) {
  const boton = page.locator('button').first()
  const caja = await boton.boundingBox()
  const cx = caja.x + caja.width / 2
  const cy = caja.y + caja.height / 2
  await page.mouse.move(cx - 140, cy - 70)
  await page.waitForTimeout(300)
  await page.mouse.move(cx - 24, cy - 8, { steps: 18 })
  await page.waitForTimeout(500)
  await page.mouse.move(cx + 28, cy + 10, { steps: 18 })
  await page.waitForTimeout(500)
  await page.mouse.move(cx + 220, cy + 130, { steps: 14 })
  await page.waitForTimeout(900)
}
