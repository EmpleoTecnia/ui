/** Lo que pasa mientras se graba preview.webp: se pasa a anual (el pulgar se desliza, la nota se pone verde,
 *  el precio rueda y aparece el tachado) y se vuelve a mensual. */
export default async function guion(page) {
  await page.waitForTimeout(400)
  await page.getByRole('radio', { name: /Anual/ }).click()
  await page.waitForTimeout(1300)
  await page.getByRole('radio', { name: 'Mensual' }).click()
  await page.waitForTimeout(1300)
}
