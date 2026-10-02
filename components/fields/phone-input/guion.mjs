/** Lo que pasa mientras se graba preview.webp: se escribe un celular y el número toma forma sobre la guía;
 *  después se abre la lista de países para ver cómo el botón crece hasta ser el buscador. */
export default async function guion(page) {
  const input = page.locator('input[type="tel"]').first()
  await input.click()
  await page.waitForTimeout(150)
  await input.pressSequentially('1123456789', { delay: 85 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^País,/ }).click()
  await page.waitForTimeout(400)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(250)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(800)
}
