import { Activity, CloudSun, Radio, TrendingUp } from 'lucide-react';

const signals = [
  {
    label: 'Pulso politico',
    value: 'Alta actividad',
    icon: Activity,
  },
  {
    label: 'Economia RD',
    value: 'Dolar vigilado',
    icon: TrendingUp,
  },
  {
    label: 'Clima RD',
    value: 'Alertas activas',
    icon: CloudSun,
  },
  {
    label: 'Network',
    value: '+5K miembros',
    icon: Radio,
  },
];

export function EditorialSignalStrip() {
  return (
    <section className="border-b border-terminal-gray bg-black/75">
      <div className="hes-container hes-scrollbar-none grid grid-flow-col auto-cols-[210px] gap-3 overflow-x-auto py-3 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
        {signals.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-md border border-terminal-gray bg-surface-container-lowest px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-system-red/12 text-system-red">
              <Icon size={18} strokeWidth={2.3} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-black uppercase text-on-surface-variant">{label}</span>
              <span className="block truncate text-sm font-black text-white">{value}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
