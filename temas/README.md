# Temas espejo

Cada archivo copia los tokens de una app y los mapea a los `--ui-*` del contrato, para
que el playground muestre un componente "como se vería en esa app". Son **espejos**: si
una app cambia sus tokens, se copian de nuevo desde su `globals.css`; nunca se inventan
acá. Las fuentes son las del sistema: el playground no carga las de las apps.

| Tema | Fuente | Oscuro |
|---|---|---|
| `mi` | `mi/src/styles/globals.css` (`--c-*`) | propio de la app |
| `etconecta` | `etconecta/src/styles/globals.css` (`--l-*` / `--d-*`) | propio de la app |
| `campus` | `campus/app/globals.css` (hex) | derivado: el campus no tiene oscuro |
| `proyectos` | `proyectos/app/globals.css` (`--papel`, `--tinta`, `--acento`…) | propio de la app |
