/** Lo que pasa mientras se graba preview.webp: se toca "Eliminar" en la primera fila, la píldora se transforma en la
 *  pregunta, se confirma, pasa por "Eliminando…" y llega a "Eliminado" con Deshacer; se deshace y vuelve al reposo. */
export default async function guion(page) {
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Eliminar' }).first().click()
  await page.waitForTimeout(700)
  await page.locator('[data-face="confirming"]').getByRole('button', { name: 'Eliminar' }).click()
  await page.waitForTimeout(1400)
  await page.locator('[data-face="done"]').getByRole('button', { name: 'Deshacer' }).click()
  await page.waitForTimeout(600)
}
