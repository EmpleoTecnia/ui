/** Lo que pasa mientras se graba preview.webp: se escribe una contraseña floja, después se pide una sugerida. */
export default async function guion(page) {
  const input = page.locator('input').first()
  await input.click()
  await page.waitForTimeout(200)
  await input.pressSequentially('hola12', { delay: 70 })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Sugerir una' }).click()
  await page.waitForTimeout(1400)
}
