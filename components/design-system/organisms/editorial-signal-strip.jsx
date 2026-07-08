import { Banknote, CalendarDays, Fuel } from 'lucide-react';

const fuelPrices = [
  { label: 'Premium', value: 'RD$338.10' },
  { label: 'Regular', value: 'RD$305.50' },
  { label: 'Gasoil', value: 'RD$257.80' },
  { label: 'GLP', value: 'RD$137.20' },
];

const exchangeRates = [
  { label: 'Dolar', buy: '58.61', sell: '59.20' },
  { label: 'Euro', buy: '68.15', sell: '70.25' },
];

export function EditorialSignalStrip({ contained = true }) {
  const todayParts = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).formatToParts(new Date());
  const weekday = todayParts.find((part) => part.type === 'weekday')?.value ?? '';
  const day = todayParts.find((part) => part.type === 'day')?.value ?? '';
  const month = todayParts.find((part) => part.type === 'month')?.value ?? '';

  return (
    <section className={contained ? 'border-b border-terminal-gray bg-black/75' : 'bg-transparent'}>
      <div className={`${contained ? 'hes-container' : ''} grid gap-3 py-3 lg:grid-cols-[430px_minmax(0,1fr)] lg:items-stretch`}>
        <div className="flex flex-col rounded-md border border-terminal-gray bg-surface-container-lowest px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1 sm:translate-y-1">
              <div className="flex items-center gap-2">
                <Banknote className="text-system-red" size={16} strokeWidth={2.4} aria-hidden="true" />
                <p className="text-[11px] font-black uppercase text-on-surface-variant">Divisas</p>
              </div>
              <div className="mt-2 grid overflow-hidden rounded-md border border-terminal-gray/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,49,65,0.035))] grid-cols-2 divide-x divide-terminal-gray/80">
                {exchangeRates.map((rate) => (
                  <div
                    key={rate.label}
                    className="relative min-w-0 px-3 py-2 before:absolute before:left-0 before:top-2 before:h-5 before:w-0.5 before:bg-system-red/80"
                  >
                    <p className="text-[11px] font-black uppercase text-system-red">{rate.label}</p>
                    <div className="mt-1 grid gap-1 sm:grid-cols-2 sm:gap-2">
                      <div className="flex min-w-0 items-end justify-between gap-2 sm:block">
                        <p className="text-[9px] font-black uppercase text-on-surface-variant">Compra</p>
                        <p className="text-base font-black leading-none text-white sm:text-lg">{rate.buy}</p>
                      </div>
                      <div className="flex min-w-0 items-end justify-between gap-2 sm:block">
                        <p className="text-[9px] font-black uppercase text-on-surface-variant">Venta</p>
                        <p className="text-base font-black leading-none text-white sm:text-lg">{rate.sell}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 shrink-0 items-center justify-center border-t border-terminal-gray pt-3 sm:h-full sm:min-w-[92px] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <div className="w-[76px] overflow-hidden rounded-md border border-system-red/45 bg-black/45 text-center shadow-[0_12px_24px_rgba(0,0,0,0.28)]">
                <div className="flex items-center justify-center gap-1 bg-system-red px-2 py-1 text-[9px] font-black uppercase text-black">
                  <CalendarDays size={12} strokeWidth={3} aria-hidden="true" />
                  <span>Hoy</span>
                </div>
                <div className="px-2 pb-2 pt-1.5">
                  <p className="text-[30px] font-black leading-none text-white">{day}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase leading-none text-system-red">{month}</p>
                  <p className="mt-1 truncate text-[10px] font-black capitalize leading-none text-on-surface-variant">{weekday}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-md border border-terminal-gray bg-surface-container-lowest px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <div className="mb-3 flex items-center gap-2">
            <Fuel className="text-system-red" size={16} strokeWidth={2.4} aria-hidden="true" />
            <p className="text-[11px] font-black uppercase text-on-surface-variant">Combustibles</p>
          </div>
          <div className="grid flex-1 overflow-hidden rounded-md border border-terminal-gray/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,49,65,0.025))] divide-y divide-terminal-gray/80 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {fuelPrices.map((fuel) => (
              <div key={fuel.label} className="relative flex flex-col justify-center px-3 py-2 before:absolute before:left-3 before:top-0 before:h-0.5 before:w-8 before:bg-system-red/85">
                <p className="text-[10px] font-black uppercase text-system-red">{fuel.label}</p>
                <p className="mt-1 whitespace-nowrap text-sm font-black text-white">{fuel.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
