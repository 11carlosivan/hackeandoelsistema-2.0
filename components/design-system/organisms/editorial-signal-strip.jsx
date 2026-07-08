import { Banknote, Fuel, ShieldCheck } from 'lucide-react';

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

export function EditorialSignalStrip() {
  const todayParts = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).formatToParts(new Date());
  const weekday = todayParts.find((part) => part.type === 'weekday')?.value ?? '';
  const day = todayParts.find((part) => part.type === 'day')?.value ?? '';
  const month = todayParts.find((part) => part.type === 'month')?.value ?? '';

  return (
    <section className="border-b border-terminal-gray bg-black/75">
      <div className="hes-container grid gap-3 py-3 lg:grid-cols-[430px_minmax(0,1fr)_220px] lg:items-stretch">
        <div className="rounded-md border border-terminal-gray bg-surface-container-lowest px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <div className="flex h-full items-center justify-between gap-4">
            <div className="min-w-0 flex-1 translate-y-1">
              <div className="flex items-center gap-2">
                <Banknote className="text-system-red" size={16} strokeWidth={2.4} aria-hidden="true" />
                <p className="text-[11px] font-black uppercase text-on-surface-variant">Divisas BCRD</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {exchangeRates.map((rate) => (
                  <div
                    key={rate.label}
                    className="min-w-0 rounded-sm bg-black/35 px-3 py-2"
                  >
                    <p className="text-[11px] font-black uppercase text-system-red">{rate.label}</p>
                    <div className="mt-1 grid grid-cols-2 gap-5">
                      <div>
                        <p className="text-[9px] font-black uppercase text-on-surface-variant">Compra</p>
                        <p className="text-lg font-black leading-none text-white">{rate.buy}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-on-surface-variant">Venta</p>
                        <p className="text-lg font-black leading-none text-white">{rate.sell}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex h-full min-w-20 shrink-0 flex-col justify-center border-l border-terminal-gray pl-4 text-right">
              <p className="text-[10px] font-black uppercase text-system-red">Hoy</p>
              <p className="mt-1 text-xs font-black capitalize leading-tight text-white">{weekday}</p>
              <p className="text-xs font-black uppercase leading-tight text-white">{day} {month}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-terminal-gray bg-surface-container-lowest px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase text-on-surface-variant">Combustibles</p>
            <Fuel className="text-system-red" size={18} strokeWidth={2.3} aria-hidden="true" />
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {fuelPrices.map((fuel) => (
              <div key={fuel.label} className="rounded-sm bg-black/45 px-3 py-2">
                <p className="text-[10px] font-black uppercase text-system-red">{fuel.label}</p>
                <p className="mt-1 whitespace-nowrap text-sm font-black text-white">{fuel.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-terminal-gray bg-surface-container-lowest px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-system-red/12 text-system-red">
            <ShieldCheck size={17} strokeWidth={2.3} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase text-on-surface-variant">Fuentes</p>
            <p className="text-sm font-black text-white">BCRD / MICM</p>
            <p className="mt-1 text-[10px] font-bold uppercase text-system-red">Datos verificables</p>
          </div>
        </div>
      </div>
    </section>
  );
}
