'use client'
import { ActionButton } from './ActionButton'

const esperar = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/** Un guardado simulado: tarda un rato y sale bien o falla, según `falla`. */
function guardar(ms: number, falla = false) {
  return async () => {
    await esperar(ms)
    if (falla) throw new Error('simulado')
  }
}

/** Una fila de formulario con cambios sin guardar y el botón a la derecha. */
export function DemoGuardar() {
  return (
    <div className="flex w-[360px] items-center justify-between gap-4 rounded-ui-lg border border-ui-line bg-ui-surface p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ui-ink">Datos de contacto</p>
        <p className="mt-0.5 text-xs text-ui-ink-muted">Cambios sin guardar</p>
      </div>
      <ActionButton label="Guardar" onAction={guardar(900)} resetAfterMs={1400} />
    </div>
  )
}

/** Dos botones con otra acción: uno que sale bien y otro que falla. */
export function DemoPublicar() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton label="Publicar oferta" pendingLabel="Publicando…" successLabel="Publicada" errorLabel="No se publicó" onAction={guardar(1000)} />
      <ActionButton label="Enviar" pendingLabel="Enviando…" successLabel="Enviado" errorLabel="No se envió" onAction={guardar(1000, true)} />
    </div>
  )
}

/** Sin volver solo al reposo: queda en "Guardado" hasta que lo vuelvan a tocar. */
export function DemoFijo() {
  return <ActionButton label="Guardar" onAction={guardar(700)} resetAfterMs={0} />
}
