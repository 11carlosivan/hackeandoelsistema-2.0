import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';

const pageCopy = {
  cms: {
    eyebrow: 'TERMINAL CMS',
    title: 'Dashboard',
    description: 'Centro editorial preparado para conectarse al backend Fastify y Prisma.',
    action: 'Crear publicacion',
    href: '/crear-publicacion',
    stats: [
      { label: 'MODULOS', value: 'Editorial / SEO / Usuarios', icon: 'dashboard' },
      { label: 'ESTADO', value: 'Pendiente API', icon: 'lan' },
    ],
  },
  login: {
    eyebrow: 'ACCESO',
    title: 'Iniciar sesion',
    description: 'Entrada de agentes, editores y usuarios del network.',
    action: 'Entrar al CMS',
    href: '/cms',
    stats: [
      { label: 'SEGURIDAD', value: 'Noindex', icon: 'lock' },
      { label: 'AUTH', value: 'Pendiente API', icon: 'passkey' },
    ],
  },
  register: {
    eyebrow: 'NETWORK',
    title: 'Registro',
    description: 'Alta de miembros y colaboradores del ecosistema.',
    action: 'Ver planes',
    href: '/planes',
    stats: [
      { label: 'CUENTAS', value: 'Usuarios', icon: 'group_add' },
      { label: 'ESTADO', value: 'Pendiente API', icon: 'pending' },
    ],
  },
  recover: {
    eyebrow: 'RECUPERACION',
    title: 'Password',
    description: 'Flujo para restaurar acceso sin exponer credenciales.',
    action: 'Volver al login',
    href: '/iniciar-sesion',
    stats: [
      { label: 'TOKEN', value: 'Temporal', icon: 'vpn_key' },
      { label: 'ESTADO', value: 'Pendiente API', icon: 'pending' },
    ],
  },
  submit: {
    eyebrow: 'PUBLICACION',
    title: 'Nuevo informe',
    description: 'Pantalla base para redactar, programar y optimizar articulos.',
    action: 'Ir al CMS',
    href: '/cms',
    stats: [
      { label: 'SEO', value: 'Slug / Canonical', icon: 'travel_explore' },
      { label: 'WORKFLOW', value: 'Borrador', icon: 'edit_note' },
    ],
  },
  plans: {
    eyebrow: 'NETWORK',
    title: 'Planes',
    description: 'Membresias, beneficios y acceso editorial para la comunidad.',
    action: 'Continuar',
    href: '/checkout',
    stats: [
      { label: 'PLANES', value: '3 niveles', icon: 'workspace_premium' },
      { label: 'PAGO', value: 'Pendiente', icon: 'payments' },
    ],
  },
  checkout: {
    eyebrow: 'CHECKOUT',
    title: 'Orden',
    description: 'Flujo de pago preparado para integracion futura.',
    action: 'Contacto seguro',
    href: '/contacto-seguro',
    stats: [
      { label: 'METODO', value: 'Por definir', icon: 'credit_card' },
      { label: 'ESTADO', value: 'Sandbox', icon: 'science' },
    ],
  },
  contact: {
    eyebrow: 'CONTACTO',
    title: 'Seguro',
    description: 'Canal de comunicacion para fuentes, lectores y alianzas.',
    action: 'Volver al inicio',
    href: '/',
    stats: [
      { label: 'CANAL', value: 'Cifrado', icon: 'shield_lock' },
      { label: 'RESPUESTA', value: '24-48h', icon: 'schedule' },
    ],
  },
};

export default function TerminalPage({ variant, slug }) {
  const copy = pageCopy[variant] || {
    eyebrow: 'PAGINA',
    title: slug || 'Archivo',
    description: 'Pagina estatica preparada para continuidad editorial y SEO.',
    action: 'Inicio',
    href: '/',
    stats: [
      { label: 'SEO', value: 'Indexable', icon: 'travel_explore' },
      { label: 'ESTADO', value: 'Activa', icon: 'verified' },
    ],
  };

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        stats={copy.stats}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8">
          <div className="font-label-caps text-system-red text-[10px] font-bold mb-4">
            MODULO EN PREPARACION
          </div>
          <p className="text-on-surface-variant leading-relaxed">
            Esta pantalla ya vive dentro de Next y conserva el mismo sistema visual.
            En la siguiente fase se conecta a datos reales del backend sin cambiar la
            estructura de rutas.
          </p>
          <Link
            href={copy.href}
            className="inline-flex mt-8 bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors"
          >
            {copy.action}
          </Link>
        </div>

        <aside className="lg:col-span-4 border border-terminal-gray bg-black/20 p-6 self-start">
          <h2 className="font-headline-md text-xl text-white uppercase mb-4">Checklist</h2>
          <ul className="space-y-3 text-sm text-on-surface-variant">
            <li className="flex gap-2"><span className="text-system-red">/</span> Ruta App Router activa</li>
            <li className="flex gap-2"><span className="text-system-red">/</span> Layout actual preservado</li>
            <li className="flex gap-2"><span className="text-system-red">/</span> Lista para API futura</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
