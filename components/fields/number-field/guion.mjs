/** Lo que pasa mientras se graba preview.webp: se aprieta + varias veces hasta llegar al máximo,
 *  así se ven los dígitos girando, el total sumando y, al final, la nota "Máx." con el número que se tensa. */
export default async function guion(page) {
  const mas = page.getByRole('button', { name: 'Aumentar Licencias' })
  await page.waitForTimeout(200)
  for (let i = 0; i < 9; i++) {
    // Al tope el botón queda deshabilitado: un clic ahí esperaría para siempre.
    if ((await mas.getAttribute('aria-disabled')) === 'true' || (await mas.isDisabled())) break
    await mas.click({ timeout: 3000 })
    await page.waitForTimeout(i < 7 ? 210 : 320)
  }
  await page.waitForTimeout(700)
}
