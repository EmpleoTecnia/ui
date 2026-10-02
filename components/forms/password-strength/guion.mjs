/** Lo que pasa mientras se graba preview.webp: se escribe una contraseña de a pedazos y se muestra. */
export default async function guion(page) {
  const input = page.locator('input').first()
  await input.click()
  await input.fill('')
  await page.waitForTimeout(250)
  await input.pressSequentially('Emple0', { delay: 70 })
  await page.waitForTimeout(350)
  await input.pressSequentially('tecnia', { delay: 70 })
  await page.waitForTimeout(350)
  await input.pressSequentially('!', { delay: 70 })
  await page.waitForTimeout(450)
  await page.locator('button[aria-pressed]').first().click()
  await page.waitForTimeout(600)
}
