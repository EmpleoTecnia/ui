/** Lo que pasa mientras se graba preview.webp: se toca "Guardar" y se deja correr el ciclo entero:
 *  Guardando… con spinner, Guardado en verde con el tilde dibujado, y la vuelta al reposo con la flecha. */
export default async function guion(page) {
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.waitForTimeout(2750)
}
