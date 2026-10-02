/** Lo que pasa mientras se graba preview.webp: se selecciona una palabra con doble clic, aparece la
 *  barra flotante, se le pone negrita y se abre el campo del enlace. Cada paso es tolerante: si la
 *  barra no aparece a tiempo, sigue igual y la captura muestra el editor con el texto. */
export default async function guion(page) {
  const editor = page.getByRole('textbox').first()
  await editor.waitFor()
  const box = await editor.boundingBox()
  // Doble clic sobre la segunda línea de texto: selecciona una palabra.
  await page.mouse.dblclick(box.x + 120, box.y + 70)
  await page.waitForTimeout(700)
  const negrita = page.getByRole('button', { name: 'Negrita' })
  if (await negrita.isVisible().catch(() => false)) {
    await negrita.click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(600)
  }
  const enlace = page.getByRole('button', { name: 'Enlace', exact: true })
  if (await enlace.isVisible().catch(() => false)) {
    await enlace.click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(350)
    await page.keyboard.type('example.com', { delay: 45 })
  }
  await page.waitForTimeout(500)
}
