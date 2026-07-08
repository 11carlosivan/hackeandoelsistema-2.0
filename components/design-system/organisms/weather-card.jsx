import { CloudSun } from 'lucide-react';

export function WeatherCard() {
  return (
    <section className="relative overflow-hidden rounded-md border border-terminal-gray bg-[linear-gradient(135deg,#202020_0%,#111_58%,#29070b_100%)] p-5 shadow-[0_18px_35px_rgba(0,0,0,0.22)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-system-red" />
      <div className="absolute bottom-0 right-0 h-16 w-16 border-l border-t border-system-red/25" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black uppercase text-white">Clima en Rep. Dom.</h2>
            <span className="rounded-full bg-system-red/15 px-2 py-0.5 text-[10px] font-black uppercase text-system-red">
              Santo Domingo
            </span>
          </div>
          <p className="mt-4 text-5xl font-black text-white">29&deg;C</p>
          <p className="mt-2 text-sm text-on-surface-variant">Parcialmente nublado</p>
        </div>
        <CloudSun className="text-system-red" size={52} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-on-surface-variant">Humedad</p>
          <p className="mt-1 font-black text-white">74%</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Viento</p>
          <p className="mt-1 font-black text-white">18 km/h</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Sensacion</p>
          <p className="mt-1 font-black text-white">32&deg;C</p>
        </div>
      </div>
    </section>
  );
}
