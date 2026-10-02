# Librería UI de EmpleoTecnia — reglas del bibliotecario

Este repo es la colección curada de componentes y patrones de interfaz del equipo.
Diseño completo en `docs/superpowers/specs/2026-10-02-ui-library-design.md`. Leelo
antes de agregar o cambiar algo.

## Qué es cada cosa

- `components/<categoria>/<slug>/` y `patterns/<categoria>/<slug>/`: una entrada por
  carpeta. `meta.json` es la ficha, `README.md` lo escribe quien agrega, `preview.png`
  y `preview.webp` las saca `npm run capturar`, y los `.tsx` existen sólo si está adoptado.
- `catalog.json`, `components/README.md`, `patterns/README.md`, los README de cada
  categoría, el bloque entre `<!-- catalogo:inicio -->` y `<!-- catalogo:fin -->` del
  README raíz y `playground/registro.generado.tsx` los **genera** `npm run catalogar`.
  No se editan a mano.
- `tokens.css`: el contrato de 15 tokens `--ui-*`. Un adoptado usa sólo eso.
- `temas/`: espejos de los tokens de cada app, mapeados a `--ui-*`. Si una app cambió,
  se copian; no se inventan.
- `playground/`: Next.js mínimo que renderiza los adoptados. `npm run dev` local; publicado en
  <https://empleotecnia.github.io/ui/> (GitHub Pages, se redeploya solo en cada push a main).
  Las grillas de los README enlazan ahí con "Probarlo" y al sitio de origen con "Ver original".

## Reglas

1. **Buscar antes de crear.** `catalog.json` primero. Si existe algo parecido, se
   actualiza o se declina; nunca se duplica.
2. **Nada entra sin `por_que_entro` con un detalle concreto**, en palabras de quien lo
   agregó. "Me gusta" no es una razón. Y sin licencia y `publicable` decididos.
3. **`adoptado` sólo si `npm run verificar` pasa.** No se marca a mano.
4. **Colores: sólo el contrato.** Nada de hex, `rgb()`, `hsl()`, `oklch()` absoluto ni
   `bg-blue-500`. Lo que falte se deriva del acento con `color-mix()` o
   `oklch(from var(--ui-accent) ...)`. Si no se puede derivar, queda como referencia.
5. **Movimiento desde `--ui-dur` y `--ui-ease`.** Se multiplican, no se fijan ms. Todo
   respeta `prefers-reduced-motion`.
   **Los colores semánticos no se negocian** (Franco, 2/10): error es rojo, aviso
   naranja/amarillo, éxito verde, en todas las apps. Se escriben derivados del acento
   para tomar su luz y saturación, con el matiz fijo:
   `oklch(from var(--ui-accent) clamp(0.48, l, 0.66) clamp(0.13, c, 0.2) 25)` para rojo,
   `55` naranja, `88` amarillo, `150` verde. Nunca el acento para decir "bien" o "mal".
6. **El carácter lo inferís vos**, nunca se lo preguntás a la persona. Es opcional y
   sólo ordena la búsqueda.
7. **Carpetas, slugs, archivos, componentes y props en inglés** (`forms/password-strength`,
   `PasswordStrength.tsx`). **Textos de interfaz, `nombre` de la ficha, README y
   `por_que_entro` en español**: las apps son en español. Código en TypeScript.
8. **Un commit por componente.** `agrega(categoria): nombre (estado)`,
   `usa(slug): app`, `actualiza(slug): qué`, `retira(slug): por qué`.
9. **Retirar es `estado: "retirado"` + `por_que_salio`**, no borrar la carpeta: alguien
   lo puede estar usando.
10. **El repo es público** (desde el 2/10, para publicar el playground en GitHub Pages).
    Nunca entran claves, tokens, `.env`, URLs de proyectos Supabase, datos de personas
    reales ni capturas con datos reales. Los datos de ejemplo usan `@example.com` y
    nombres inventados. Nada de lo interno de las apps (lógica de negocio, tablas,
    permisos): acá sólo viven piezas de interfaz. `node scripts/comprobar-publico.mjs`
    lo revisa y corre en CI.

## Cómo se agrega algo (barato en tokens)

Los scripts hacen lo mecánico; vos sólo decidís categoría y slug, hacés tres preguntas
y corrés dos comandos. No leas páginas enteras ni `codigo-origen/` salvo que vayas a
portear.

1. `node scripts/agregar.mjs <url> --categoria <cat> --slug <slug> --nombre "<Nombre>"`
   baja el código del registry (o rescata la página con Chromium), detecta licencia y
   dependencias, saca la captura, avisa duplicados y deja la carpeta a medio llenar.
   Leé sólo el resumen que imprime. Categorías de components: buttons, cards,
   navigation, forms, backgrounds, animations, sections, feedback; de patterns
   (`--tipo patterns`): landing, profile, onboarding, dashboard, auth, pricing. Slug en
   inglés, `--nombre` en español.
2. Tres preguntas, de a una: ¿qué te gustó? (frase concreta, ≥20 caracteres) · ¿para
   qué lo usarías? · ¿lo guardo como idea o lo armo ahora? Nada más.
3. `node scripts/guardar.mjs <slug> --razon "..." --usos "a; b" --etiquetas "a,b,c"
   --caracter movimiento=…,tono=…,densidad=…` cataloga, commitea y pushea. Con
   `--adoptar` si ya porteaste el código a la carpeta (captura y pasa a adoptado).

Si alguien dice "agregá este" con una URL, es esto, sin slash.

## Comandos del equipo

`/ui-agregar`, `/ui-buscar`, `/ui-usar` viven en `base/claude/commands/` y se reparten
con `node base/scripts/armar-plataformas.mjs`. Si los cambiás, commiteá en `base`.
`/ui-agregar` es el circuito de arriba, escrito para quien está parado en otra carpeta.
