# Teléfono con país

Un campo de teléfono con el país adelante: el botón de la bandera y el código crece con un
resorte hasta ser una lista con buscador, el número toma forma mientras lo escribís (la guía
tenue muestra lo que falta), y un tilde verde aparece cuando el número está completo. Si
pegás un número internacional (`+54 9 11…`) elige solo el país; si tipeás `+` en el número
se abre la lista buscando por código. Al salir del campo con un número incompleto avisa en
rojo cuántos dígitos tiene que tener. El valor sale en E.164, listo para SMS o WhatsApp.

## Por qué entró

Elegir el código de país y escribir el número en un solo campo. El botón de probar no me gusta, lo quitaría.

## Sirve para

- formularios donde hay que elegir el código de país
- enviar SMS o WhatsApp eligiendo país y número
- alta de cuenta o verificación por código en ET Conecta, miET y el campus

## No sirve para

- con el botón de probar tal como viene: se quita al portear
- teléfonos internos o extensiones: ahí va un campo común

Origen: [Arc UI](https://uiarc.dev/components/phone-input), porteado a nuestro stack
y traducido. La licencia del sitio no está declarada: se usa en nuestras apps, no se
publica.

## Cómo se usa

```tsx
import { PhoneInput } from '@/components/ui/phone-input/PhoneInput'

<PhoneInput label="Celular" description="Te mandamos un código de 6 dígitos por SMS." onValueChange={(e164, { valid }) => setTelefono(valid ? e164 : '')} />
<PhoneInput label="WhatsApp" name="telefono" required />
<PhoneInput label="Celular" value={telefono} onValueChange={setTelefono} error={error} />
```

- `value` / `defaultValue`: el número en E.164 (`"+5491123456789"`). Un texto vacío limpia
  el campo. Si lo controlás, cada valor nuevo que no salió del campo se vuelve a leer.
- `onValueChange(e164, { country, formatted, status, valid })`: en cada edición. `status`
  es `empty`, `incomplete`, `valid` o `too-long`.
- `country` / `defaultCountry` / `onCountryChange`: el país por código ISO. Por defecto
  arranca en Argentina.
- `countries`: limita la lista a esos códigos ISO. `preferredCountries`: los fijados arriba
  bajo "Sugeridos"; por defecto Argentina, Uruguay, Paraguay, Brasil y Chile.
- `description`: ayuda bajo el campo. `error`: reemplaza el mensaje propio. `validate`
  (activo) muestra el aviso de largo al salir del campo con un número a medias.
- `name`: agrega un input oculto con el E.164 para enviar el formulario de forma nativa.
- `hideLabel`, `disabled`, `required`, `id`, `className`, `onBlur` como en un `<input>`.
- Celulares argentinos: el campo acepta `9 11 2345-6789` (11 dígitos) además de los 10 del
  fijo. Para WhatsApp hace falta el 9 adelante; pedilo en la `description`.
- Teclado: en el botón del país, flecha abajo abre la lista y una letra abre buscando;
  en la lista, flechas, Inicio/Fin, Enter elige, Escape cierra. Borrar sobre un separador
  borra el dígito de al lado.
- También exporta `PHONE_COUNTRIES`, `parsePhoneNumber`, `formatPhoneNumber`,
  `formatNational` y `flagOf` por si querés mostrar un número guardado.
- Con `prefers-reduced-motion` todo cambia sin animación.

## Qué toma de tu app

Fondo, bordes, textos, el radio del campo y el foco salen de los tokens `--ui-*`; las
esquinas del botón del país siguen a `--ui-radius`. El tilde de número válido es verde y
el mensaje de error rojo: semánticos, no cambian de app, del acento toman sólo la luz y la
saturación. Las banderas son emoji del sistema. Las duraciones salen de `--ui-dur` y
`--ui-ease`. Necesita `motion` y `lucide-react`.
