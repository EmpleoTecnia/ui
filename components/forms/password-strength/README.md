# Fuerza de contraseña

Un campo de contraseña nueva que te va diciendo qué tan fuerte es mientras la escribís:
cuatro barras que se llenan y cambian de tono, la palabra (Débil, Aceptable, Buena,
Fuerte) que sube o baja según mejore o empeore, la lista de requisitos que se van
tildando con un tilde dibujado y un contador de cuántos caracteres faltan, y un ojo al
que una barra le pasa por encima para mostrar u ocultar. Si llega un error, el campo se
sacude una vez. Todo se calcula en el dispositivo.

## Por qué entró

Me gustó todo como está armado: las cuatro barras que se llenan, los requisitos que se van tildando con cuántos caracteres faltan, y el ojo que se tacha para mostrar la contraseña.

## Sirve para

- Elegir o cambiar la contraseña en la pantalla /clave
- alta de cuenta en ET Conecta, miET y el campus

## No sirve para

- Iniciar sesión: ahí va un campo común

Origen: [Arc UI](https://uiarc.dev/components/password-strength), porteado a nuestro stack
y traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se
publica.

## Cómo se usa

Dos piezas en la misma carpeta: el **formulario completo** (título, el campo, "Sugerir
una" y "Guardar") y el **campo solo**, por si lo querés dentro de otro formulario.

```tsx
import { NewPasswordForm } from '@/components/ui/password-strength/NewPasswordForm'

<NewPasswordForm subtitle={correo} error={error} pending={guardando} onSubmit={guardarContrasena} />
```

- "Sugerir una" genera `Palabra-Palabra-NN` con palabras cortas en español, la pone en
  el campo y la muestra. Sale de `suggestPassword()`, exportada por si la querés en
  otro lado.
- "Guardar" se habilita cuando la fuerza llega a `minLevel` (por defecto 3, "Buena").
- `title` por defecto "Elegí una contraseña nueva"; `subtitle` suele ser el correo.

```tsx
import { PasswordStrength } from '@/components/ui/password-strength/PasswordStrength'

<PasswordStrength label="Nueva contraseña" onValueChange={(valor, fuerza) => setLista(fuerza.level >= 3)} />
<PasswordStrength label="Nueva contraseña" error="Esa contraseña ya la usaste antes." />
```

- `rules`: las reglas a comprobar; por defecto 12 caracteres, mayúsculas y minúsculas, un
  número y un símbolo. Cada una con `id`, `label`, `test` y, si querés el contador,
  `remaining`.
- `onValueChange(valor, { level, label, met })`: `level` va de 0 a 4. Menos de ocho
  caracteres es siempre 1 ("Muy corta").
- `error`: el texto del error; el campo se sacude cada vez que aparece uno nuevo.
- `revealed` / `onRevealedChange` si querés controlar el ojo desde afuera.
- Acepta todo lo que acepta un `<input>`. Para iniciar sesión usá un campo común: esto
  es para crear o cambiar la contraseña.
- Con `prefers-reduced-motion` todo cambia sin animación.

## Qué toma de tu app

Fondo, bordes, textos y foco salen de los tokens `--ui-*`. Los colores de las barras y
los tildes son semánticos y no cambian de app: rojo (Débil), naranja (Aceptable),
amarillo (Buena), verde (Fuerte); tildes verdes y, mientras una regla falta, el círculo
en rojo. Del acento de la app toman sólo la luz y la saturación, para no desentonar.
Las duraciones salen de `--ui-dur`. Necesita `motion`.
