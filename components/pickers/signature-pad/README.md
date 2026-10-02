# Firma

Un campo para firmar dibujando, con tinta de verdad: el trazo se afina cuando vas rápido
y se engrosa cuando frenás (o sigue la presión del lápiz, si lo hay), y las puntas se
adelgazan como una pluma que se levanta. Tiene una línea punteada con una cruz y el
nombre de quien firma, y la pista "Firmá acá" descansa sobre la línea hasta el primer
trazo. Abajo: tres tintas y tres grosores con un resalte que se desliza, deshacer,
rehacer, reproducir la firma con su ritmo original y borrar con un barrido que cruza el
pad. Exporta un PNG transparente o un SVG recortados a la tinta.

## Por qué entró

Si en algún momento hay que firmar algo, esto está genial: se dibuja la firma ahí mismo.

## Sirve para

- firmar certificados, acuerdos o asistencia
- conformidad de entrega o consentimiento donde hace falta una firma dibujada

## No sirve para

- Un nombre tipeado cuando no hace falta firma dibujada: ahí va un campo común
- Cuando la persona ya tiene la firma escaneada: ahí va la zona de carga
- Confirmar algo delicado sin dejar una firma: ahí va mantener apretado

Origen: [Arc UI](https://uiarc.dev/components/signature-pad), porteado a nuestro stack y
traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se
publica.

## Cómo se usa

```tsx
import { SignaturePad } from '@/components/ui/signature-pad/SignaturePad'

<SignaturePad signer="Lucía Benítez" hint="Firmá acá" fileName="firma-lucia-benitez" onChange={setTrazos} />
<SignaturePad defaultColor="blue" defaultWidth="bold" />
```

- `signer`: el nombre que se imprime debajo de la línea.
- `hint`: la pista sobre la línea antes del primer trazo. Por defecto "Firmá acá".
- `defaultColor`: `black` · `blue` · `violet`. `defaultWidth`: `fine` · `medium` · `bold`.
- `onChange(trazos)`: recibe los trazos después de cada cambio. Cada trazo trae sus
  puntos (`x`, `y`, presión y tiempo), color y grosor: se pueden guardar y volver a
  dibujar con `strokePath`.
- `fileName`: nombre del archivo exportado, sin extensión. Por defecto "firma".
- `label`: nombre accesible de la superficie. Por defecto "Firma".
- Teclado: Ctrl/Cmd+Z deshace, Shift+Ctrl/Cmd+Z o Ctrl/Cmd+Y rehace, Suprimir borra,
  Escape detiene la reproducción. Las flechas cambian tinta y grosor.
- Para exportar desde afuera: `signatureToSvg(trazos, paleta)` y
  `signatureToPng(trazos, paleta)`, con la paleta resuelta por
  `resolveInkPalette(nodo)` para que tome los tokens de tu app.
- Con `prefers-reduced-motion` todo cambia sin animación.

## Qué toma de tu app

Fondo, bordes, textos, radio y foco salen de los tokens `--ui-*`. La tinta negra es el
color de texto de la app; la azul y la violeta toman la luz y la saturación del acento
con el matiz fijo, así en modo oscuro se aclaran solas. Al exportar, las tres se
resuelven a un color oscuro de impresión, para que la firma se vea sobre cualquier
documento. El "Guardado" va en verde semántico. Las duraciones salen de `--ui-dur` y
`--ui-ease`. Necesita `motion` y `lucide-react`.
