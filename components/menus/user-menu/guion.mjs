/** Lo que pasa mientras se graba preview.webp: el menú arranca abierto; se cierra, se vuelve a abrir
 *  (el panel crece desde el avatar y las filas entran en ola), el resaltado recorre las opciones,
 *  el tema pasa a oscuro y a sistema (el pulgar se desliza) y termina sobre "Cerrar sesión" en rojo. */
export default async function guion(page) {
  const boton = page.getByRole('button', { name: /Menú de la cuenta/ })
  await page.waitForTimeout(300)
  await boton.click()
  await page.waitForTimeout(450)
  await boton.click()
  await page.waitForTimeout(650)
  for (const nombre of ['Perfil', 'Configuración', 'Facturación']) {
    await page.getByRole('menuitem', { name: nombre }).hover()
    await page.waitForTimeout(320)
  }
  await page.getByRole('menuitemradio', { name: 'Oscuro' }).click()
  await page.waitForTimeout(380)
  await page.getByRole('menuitemradio', { name: 'Sistema' }).click()
  await page.waitForTimeout(380)
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).hover()
  await page.waitForTimeout(700)
}
