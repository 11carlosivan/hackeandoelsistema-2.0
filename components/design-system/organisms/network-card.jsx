import { PrimaryButton } from '@/components/design-system/atoms/primary-button';

const members = ['MS', 'RP', 'JR', 'LA', 'MC'];

export function NetworkCard() {
  return (
    <section className="relative overflow-hidden rounded-md border border-terminal-gray bg-[linear-gradient(145deg,#1f1f1f_0%,#151515_62%,#30070c_100%)] p-5 shadow-[0_18px_38px_rgba(0,0,0,0.24)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-system-red" />
      <div className="absolute right-5 top-5 h-12 w-px bg-system-red/35" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase text-system-red">Comunidad</p>
            <h2 className="mt-1 text-base font-black uppercase text-white">Unete al Network</h2>
          </div>
          <span className="rounded-full border border-system-red/40 px-2.5 py-1 text-[11px] font-black uppercase text-system-red">
            Gratis
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Crea tu cuenta y guarda temas, autores y alertas para seguir el pulso editorial.
        </p>
        <PrimaryButton href="/register/" className="mt-5 w-full">
          Crear cuenta
        </PrimaryButton>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex -space-x-2">
            {members.map((member) => (
              <span
                key={member}
                className="grid h-8 w-8 place-items-center rounded-full border border-black bg-surface-container-high text-[10px] font-black text-white"
              >
                {member}
              </span>
            ))}
          </div>
          <p className="text-xs font-black text-on-surface-variant">+5K miembros</p>
        </div>
      </div>
    </section>
  );
}
