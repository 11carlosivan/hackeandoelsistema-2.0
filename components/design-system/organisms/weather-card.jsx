import { CloudSun } from 'lucide-react';

export function WeatherCard() {
  return (
    <section className="rounded-md border border-terminal-gray bg-[linear-gradient(135deg,#202020_0%,#111_58%,#29070b_100%)] p-5 shadow-[0_18px_35px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Clima en Rep. Dom.</h2>
          <p className="mt-4 text-5xl font-black text-white">29&deg;C</p>
          <p className="mt-2 text-sm text-on-surface-variant">Parcialmente nublado</p>
        </div>
        <CloudSun className="text-system-red" size={52} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
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
