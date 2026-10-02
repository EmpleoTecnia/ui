# Marca de estado

Un círculo de 20 px que cuenta en qué está una tarea: punteado mientras espera, un arco
que gira (o se llena, si le pasás el progreso) mientras corre, un tilde que se dibuja al
terminar, una cruz si falló. Es siempre el mismo círculo transformándose, nunca un
cambio de ícono. Si tiene etiqueta, al terminar la tacha.

## Por qué entró

Me gustó todo: el mismo círculo que se transforma de punteado a girando a tilde o cruz, y que tacha la etiqueta al terminar.

## Sirve para

- Pasos de un proceso de creación o cambio de contraseña
- estado de tareas en Proyectos
- cola de envíos en el admin

## No sirve para

- Como ícono decorativo sin estado detrás

Origen: [React Bits](https://reactbits.dev/micro/status-mark), porteado y traducido.
Licencia MIT + Commons Clause: libre para nuestras apps, no para publicar.

## Cómo se usa

```tsx
import { StatusMark } from '@/components/ui/status-mark/StatusMark'

<StatusMark status="running" label="Guardar la contraseña nueva" />
<StatusMark status="running" progress={0.62} label="Subiendo el CV" />
<StatusMark status="done" label="Verificar la contraseña actual" />
<StatusMark status="failed" />
```

- `status`: `pending` · `running` · `done` · `failed` · `cancelled`. Los textos para
  lectores de pantalla ya están en español (Pendiente, En curso, Listo, Falló, Cancelado).
- `progress` (0 a 1): con `running`, muestra progreso en vez de girar.
- `label`: la etiqueta al lado; con `strike` (por defecto) se tacha al terminar.
- `size`, `strokeWidth`, `fontSize`, `spinDuration` para ajustar.
- Con `prefers-reduced-motion` cambia de estado sin animar.

## Qué toma de tu app

El color base es el del texto donde esté. Listo y falló se derivan del acento de la app
(misma luz y saturación, cambia el matiz); se pueden pisar con `doneColor` y
`errorColor`. Las duraciones salen de `--ui-dur` y `--ui-ease`. Necesita `motion`.
