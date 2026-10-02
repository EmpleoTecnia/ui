# Librería UI de EmpleoTecnia

Componentes y patrones de interfaz que al equipo le gustaron, porteados a nuestro stack
(Next.js, React, Tailwind v4, `motion`, Lucide) y pintados con los tokens de cada app.
Las apps son ciudades de un mismo país: comparten el carácter de cada pieza —forma,
movimiento, interacción— y cada una pone su color, su radio y su tipografía.

## Cómo se usa

Desde Claude Code, parado en cualquier carpeta de `Plataformas`:

- `/ui-buscar navbar sutil para el perfil` — muestra hasta cinco candidatos con captura.
- `/ui-usar <slug>` — parado en una app: copia el componente a `src/components/ui/` y
  propone el mapeo de tokens si la app no lo tiene.
- `/ui-agregar <url | descripción | captura>` — guarda algo que te gustó. Te pregunta
  qué te gustó y para qué lo usarías. Nada más.

Para verlo vivo: `npm install && npm run dev` y abrí `http://localhost:3000`. El
selector de arriba pinta cada componente con los tokens de `mi`, `etconecta`, `campus`
o `proyectos`.

## El contrato de tokens

Un componente adoptado usa sólo las 15 variables `--ui-*` de [`tokens.css`](tokens.css).
Tu app las mapea una vez a sus propios tokens, y listo.

## Catálogo

<!-- catalogo:inicio -->
1 entradas, 1 adoptadas.

- **[Componentes](components/)** (1): [botones](components/botones/)

### Últimas que entraron

<table>
<tr>
<td width="33%" valign="top">
<b><a href="components/botones/boton-iman/">Botón imán</a></b> · adoptado<br>
<sub>Se corre hacia el cursor y vuelve con un resorte: se siente vivo sin gritar, y en el celular es un botón común.</sub>
</td>
</tr>
</table>

<!-- catalogo:fin -->
