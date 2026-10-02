/** Lo que pasa mientras se graba preview.webp: se abre el desplegable (crece desde el botón, el chevron
 *  gira), se elige una opción de más abajo (el valor sube), se vuelve a abrir y se elige una de más
 *  arriba (el valor baja). */
export default async function guion(page) {
  const boton = page.getByRole('combobox')
  await page.waitForTimeout(300)
  await boton.click()
  await page.waitForTimeout(650)
  await page.getByRole('option', { name: 'Marketing' }).hover()
  await page.waitForTimeout(250)
  await page.getByRole('option', { name: 'Marketing' }).click()
  await page.waitForTimeout(750)
  await boton.click()
  await page.waitForTimeout(600)
  await page.getByRole('option', { name: 'Diseño' }).click()
  await page.waitForTimeout(700)
}
