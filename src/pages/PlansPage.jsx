import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PlansPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "PLANES DE PUBLICACIÓN | Hackeando el Sistema";
    
    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/planes');

    // Set robots meta
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'INDEX, FOLLOW');

    return () => {
      if (robots) {
        robots.setAttribute('content', 'INDEX, FOLLOW');
      }
    };
  }, []);

  const publicationPlans = [
    {
      id: 'plan-basic',
      name: 'AGENTE INICIADO',
      price: '49',
      currency: 'USD',
      quota: '1 Publicación',
      duration: '30 Días',
      popular: false,
      features: [
        'Publicación en categoría estándar',
        'Hasta 2 enlaces externos (no-follow)',
        'Soporte editorial básico',
        'Revisión en menos de 48 horas',
        'Estadísticas de visualizaciones básicas'
      ]
    },
    {
      id: 'plan-popular',
      name: 'INFLUENCER DIGITAL',
      price: '129',
      currency: 'USD',
      quota: '3 Publicaciones',
      duration: '60 Días',
      popular: true,
      features: [
        'Publicación en categorías premium',
        'Hasta 4 enlaces externos (do-follow)',
        'Optimización SEO por el equipo HES',
        'Revisión prioritaria (menos de 12 horas)',
        'Destacado en Home por 24 horas',
        'Estadísticas de visualización avanzadas'
      ]
    },
    {
      id: 'plan-corporativo',
      name: 'CIBER-AGENCIA',
      price: '299',
      currency: 'USD',
      quota: '8 Publicaciones',
      duration: '90 Días',
      popular: false,
      features: [
        'Publicación sin restricciones de categoría',
        'Enlaces do-follow ilimitados',
        'Asesoría y redacción de copys incluida',
        'Soporte técnico y editorial prioritario 24/7',
        'Publicaciones programadas automáticas',
        'Panel analítico forense de impacto'
      ]
    }
  ];

  const handleSelectPlan = (plan) => {
    // Navigate to checkout passing plan state
    navigate('/checkout', { state: { selectedPlan: plan } });
  };

  return (
    <div className="w-full bg-background text-on-surface">
      {/* Header section */}
      <section className="py-stack-md border-b border-terminal-gray mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none select-none">
          <span className="font-headline-xl text-[120px] leading-none uppercase">PLANES</span>
        </div>
        <div className="relative z-10">
          <div className="inline-block border border-system-red px-3 py-1 mb-4">
            <span className="font-label-caps text-label-caps text-system-red">
              [ PORTAL DE MEMBRESÍAS Y PLANES ]
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl md:text-headline-xl text-white uppercase mb-2">
            Planes de Publicación Editorial
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl font-body-md leading-relaxed">
            Consiga mayor relevancia inyectando su información en nuestra red. Elija la cuota de publicaciones y los privilegios de enlaces que mejor se adapten a sus requerimientos de impacto.
          </p>
        </div>
      </section>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {publicationPlans.map((plan) => (
          <div
            key={plan.id}
            className={`border flex flex-col justify-between p-6 bg-surface-container-lowest relative ${
              plan.popular
                ? 'border-system-red shadow-[0_0_15px_rgba(230,57,70,0.15)] md:-translate-y-2'
                : 'border-terminal-gray'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-system-red text-black font-label-caps text-[9px] px-3 py-0.5 font-bold uppercase tracking-widest">
                MÁS POPULAR
              </div>
            )}

            <div>
              {/* Header card */}
              <div className="text-center border-b border-terminal-gray pb-4 mb-6">
                <h3 className="font-headline-md text-[18px] text-white uppercase tracking-wider mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-[14px] text-system-red font-mono font-bold">{plan.currency}</span>
                  <span className="font-headline-xl text-4xl text-white font-black">{plan.price}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono uppercase">/ PLAN</span>
                </div>
                <p className="text-[11px] text-system-red font-mono font-bold mt-2">
                  CUOTA: {plan.quota}
                </p>
                <p className="text-[9px] text-on-surface-variant font-mono">
                  VIGENCIA: {plan.duration}
                </p>
              </div>

              {/* Feature list */}
              <ul className="space-y-3 mb-8 font-mono text-[10px] text-on-surface-variant">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span className="text-system-red font-bold">»</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action */}
            <button
              onClick={() => handleSelectPlan(plan)}
              className={`w-full font-headline-md font-bold py-3 transition-all active:scale-95 text-center ${
                plan.popular
                  ? 'bg-system-red text-black hover:bg-white hover:text-black'
                  : 'border border-terminal-gray hover:border-system-red text-on-surface hover:text-system-red'
              }`}
            >
              ADQUIRIR PLAN
            </button>
          </div>
        ))}
      </div>

      {/* Corporate custom request */}
      <section className="mt-16 bg-surface-container p-8 border border-terminal-gray flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2">
          <h3 className="font-headline-md text-[20px] text-white uppercase font-bold">
            ¿Requiere un plan personalizado de alta frecuencia?
          </h3>
          <p className="text-body-md text-on-surface-variant text-sm font-mono leading-relaxed max-w-xl">
            Si representa a una agencia de noticias o requiere inyecciones constantes automatizadas vía API, póngase en contacto con nuestro equipo técnico a través de nuestros canales seguros.
          </p>
        </div>
        <button
          onClick={() => navigate('/contacto-seguro')}
          className="bg-black border border-system-red text-system-red hover:bg-system-red hover:text-black font-label-caps text-label-caps font-bold px-8 py-3.5 transition-all shrink-0 active:scale-95"
        >
          CONTACTAR AGENCIA
        </button>
      </section>
    </div>
  );
}
