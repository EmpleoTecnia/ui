/** El anillo "en curso" gira solo: la grabación sólo tiene que dejarlo correr. */
export default async function guion(page) {
  await page.waitForTimeout(3000)
}
