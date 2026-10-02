'use client'
import { useState } from 'react'
import { BillingPrice, BillingToggle, type BillingToggleOption } from './BillingToggle'

export interface DemoPlan {
  name: string
  detail: string
  /** Precio por mes pagando mes a mes. Anual: 20% menos. */
  monthly: number
}

const PLANS: DemoPlan[] = [
  { name: 'Equipo', detail: 'Espacios compartidos para hasta 20 personas', monthly: 15000 },
  { name: 'Empresa', detail: 'SSO, registro de actividad y roles de administración', monthly: 30000 },
]

const format = (n: number) => n.toLocaleString('es-AR')

/** Un cuadro de planes chico: el interruptor arriba y los precios que ruedan al cambiar de período. */
export function DemoPlans({ plans = PLANS, options, size }: { plans?: DemoPlan[]; options?: BillingToggleOption[]; size?: 'md' | 'lg' }) {
  const [period, setPeriod] = useState('monthly')
  const yearly = period === 'yearly'
  return (
    <div className="grid gap-4 font-ui-text">
      <div className="flex items-center justify-between gap-4">
        <span className="font-ui-display text-base font-semibold text-ui-ink">Planes</span>
        <BillingToggle value={period} onValueChange={setPeriod} options={options} size={size} />
      </div>
      <div className="grid gap-3">
        {plans.map(plan => {
          const perMonth = yearly ? Math.round(plan.monthly * 0.8) : plan.monthly
          return (
            <div key={plan.name} className="grid gap-1 rounded-ui-lg border border-ui-line bg-ui-surface p-5">
              <span className="font-ui-display font-semibold text-ui-ink">{plan.name}</span>
              <span className="text-sm text-ui-ink-muted">{plan.detail}</span>
              <BillingPrice className="mt-3" amount={perMonth} was={yearly ? plan.monthly : undefined} period="/ mes" />
              <span className="text-xs text-ui-ink-muted">{yearly ? `$${format(perMonth * 12)} facturados por año` : 'Facturado mes a mes'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
