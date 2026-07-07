import { PrimaryButton } from '@/components/design-system/atoms/primary-button';

export function NetworkCard() {
  return (
    <section className="rounded-md border border-terminal-gray bg-surface-container p-5">
      <h2 className="text-sm font-black uppercase text-white">Unete al Network</h2>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">
        Crea tu cuenta gratuita y forma parte de nuestra comunidad editorial.
      </p>
      <PrimaryButton href="/register/" className="mt-5 w-full">
        Crear cuenta
      </PrimaryButton>
      <p className="mt-4 text-xs font-bold text-on-surface-variant">+5K miembros</p>
    </section>
  );
}
