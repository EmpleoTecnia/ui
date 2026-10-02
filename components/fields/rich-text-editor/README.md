# Editor de texto

Un editor liviano sobre `contentEditable`, sin librerías de edición: escribís y el formato
aparece donde lo necesitás. Al seleccionar texto se despliega una barra flotante encima de
la selección (negrita, cursiva, tachado, código, enlace, y títulos y cita si hay ancho) que
se desliza con la selección; al tocar "Enlace", la misma barra se transforma en un campo
para pegar la dirección. En una línea vacía, `/` abre un menú de bloques (títulos, listas,
cita, código, separador) con el resaltado deslizándose entre filas. Entiende atajos de
Markdown mientras escribís (`# `, `- `, `1. `, `> `, `**negrita**`, `_cursiva_`,
`` `código` ``, `---`, ` ``` `), tiene su propio historial de deshacer y rehacer, limpia lo
que se pega desde Word o la web, y devuelve el contenido en HTML, Markdown y texto plano.

## Por qué entró

No tiene las opciones fijas arriba: se van mostrando a medida que seleccionás una parte del texto.

## Sirve para

- descripciones de cursos, eventos y ofertas
- mensajes con formato
- notas y comentarios donde se espera Markdown y una barra al seleccionar
- formularios que necesitan HTML limpio o Markdown sin traer un framework de edición

## No sirve para

- Documentos largos con tablas, imágenes o colaboración en tiempo real: para eso va un editor completo
- Campos de una línea: ahí va un `<input>`

Origen: [Arc UI](https://uiarc.dev/components/rich-text-editor), porteado a nuestro stack y
traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se publica.

## Cómo se usa

```tsx
import { RichTextEditor } from '@/components/ui/rich-text-editor/RichTextEditor'

<RichTextEditor
  aria-label="Descripción del curso"
  defaultMarkdown={descripcion}
  placeholder="Contá de qué se trata el curso"
  onChange={({ html, markdown, text, empty }) => setDescripcion(markdown)}
/>
```

Con un `ref` podés leer o reemplazar el contenido desde afuera:

```tsx
const editor = useRef<RichTextEditorHandle>(null)
<RichTextEditor ref={editor} />
editor.current?.getMarkdown()   // también getHTML(), getText(), setHTML(), setMarkdown(), clear(), undo(), redo(), focus()
```

- `value`: HTML controlado; sólo reescribe cuando difiere de lo último que emitió.
- `defaultValue`: HTML inicial. `defaultMarkdown`: lo mismo pero en Markdown (si no hay HTML).
- `onChange({ html, markdown, text, empty })`: en cada cambio, con las tres salidas ya limpias.
- `onHistoryChange({ canUndo, canRedo })`: por si armás tu propia barra de deshacer.
- `placeholder`: el texto cuando está vacío; por defecto "Empezá a escribir".
- `blockHint`: la pista en una línea vacía mientras se escribe; por defecto "Escribí / para bloques".
- `readOnly`, `autoFocus`, `aria-label` (por defecto "Editor"), `className`, `style`.
- Atajos: Ctrl/⌘+B negrita, +I cursiva, +Shift+X tachado, +E código, +K enlace, +Z / +Shift+Z
  deshacer y rehacer, Tab y Shift+Tab para anidar ítems, Alt+F10 lleva el foco a la barra,
  Escape la cierra. Flechas y Enter recorren el menú de bloques.
- Lo que se pega se limpia: quedan sólo párrafos, títulos, listas, citas, código, separadores,
  las marcas en línea y los enlaces con `http(s):`, `mailto:` o `tel:`.
- Exporta también `markdownToHtml`, `htmlToMarkdown`, `sanitizeHtml` y `normalizeUrl`.
- Con `prefers-reduced-motion` la barra y el menú aparecen y cambian sin animación.

## Qué toma de tu app

Texto, fondos, bordes, el color del cursor, de la selección y de los enlaces salen de los
tokens `--ui-*`: `--ui-ink`, `--ui-ink-soft`, `--ui-ink-muted` para el texto y los botones,
`--ui-surface` y `--ui-surface-2` para la barra, el menú y el código, `--ui-line` para
bordes y separadores, `--ui-accent` y `--ui-accent-ink` para el cursor, los enlaces, el
botón activo y el "Aplicar". Los títulos usan `--ui-font-display`, el resto
`--ui-font-text`; el código, monoespaciada del sistema. Los bloques de código redondean con
`--ui-radius`. Las duraciones salen de `--ui-dur` y `--ui-ease`. Necesita `motion` y
`lucide-react`.
