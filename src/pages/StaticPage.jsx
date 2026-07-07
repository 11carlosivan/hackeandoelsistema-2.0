import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function StaticPage() {
  const { slug } = useParams();

  // Mock database of static pages
  const staticPagesDb = {
    'privacy-policy': {
      title: 'Política de Privacidad y Tratamiento de Datos',
      publishedAt: '01 ENERO 2024',
      status: 'PUBLICADO',
      indexable: true,
      content: `
        <p class="mb-4">En Hackeando el Sistema, accesible desde https://hackeandoelsistema.net, una de nuestras principales prioridades es la privacidad de nuestros visitantes y colaboradores. Este documento describe qué tipos de información recopilamos y cómo la utilizamos.</p>
        
        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">1. Recopilación de Logs e Información Técnica</h3>
        <p class="mb-4">Al igual que la mayoría de los servidores web, recopilamos archivos de registro estándar (logs). Esta información incluye direcciones de protocolo de Internet (IP), tipo de navegador, proveedor de servicios de Internet (ISP), marca de fecha y hora, páginas de referencia/salida y el número de clics. Estos datos no están vinculados a ninguna información que sea personalmente identificable y se utilizan únicamente para analizar tendencias y administrar el sitio.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">2. Buzón de Denuncias Seguro</h3>
        <p class="mb-4">Las comunicaciones cursadas a través de nuestro portal de denuncias encriptadas no registran IPs de origen de manera permanente. Ofuscamos las trazas de comunicación de red para garantizar el anonimato de los informantes y la confidencialidad de las fuentes periodísticas, de acuerdo con las leyes internacionales de protección del secreto periodístico.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">3. Cookies y Web Beacons</h3>
        <p class="mb-4">Utilizamos cookies de sesión para mantener el estado de autenticación de los agentes registrados. Adicionalmente, nuestros socios publicitarios externos (como slots de banners o redes de anuncios) pueden utilizar cookies para medir la efectividad de sus campañas.</p>
      `
    },
    'politicas-de-publicacion': {
      title: 'Políticas de Publicación y Lineamientos Editoriales',
      publishedAt: '15 MARZO 2024',
      status: 'PUBLICADO',
      indexable: true,
      content: `
        <p class="mb-4">Este documento establece las directrices que deben seguir todos los redactores y colaboradores externos para publicar comunicados y artículos patrocinados en Hackeando el Sistema Network.</p>
        
        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">1. Veracidad y Contrastación</h3>
        <p class="mb-4">No publicamos información sin un análisis previo de su procedencia. Toda filtración de documentos debe estar respaldada por metadatos válidos o firmas criptográficas que demuestren su autenticidad. Nos reservamos el derecho de contrastar de forma independiente los datos provistos antes de autorizar el pase en línea.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">2. Derechos y Responsabilidad Legal</h3>
        <p class="mb-4">Los colaboradores externos y compradores de planes de comunicados patrocinados asumen la responsabilidad legal exclusiva del contenido publicado en sus espacios contratados. Hackeando el Sistema no asume responsabilidad sobre disputas corporativas ni declaraciones de terceros.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">3. Restricciones de Enlaces Externos</h3>
        <p class="mb-4">De acuerdo con nuestro plan de migración SEO, los enlaces provistos dentro del cuerpo del artículo no deben redirigir a sitios fraudulentos, de descargas ilegales o spam. Los enlaces do-follow se reservan exclusivamente para planes corporativos calificados.</p>
      `
    },
    'suscripcion': {
      title: 'Canal de Suscripción y Alertas Tempranas',
      publishedAt: '10 JUNIO 2024',
      status: 'PUBLICADO',
      indexable: true,
      content: `
        <p class="mb-4">Únase a nuestra red de distribución segura para recibir notificaciones directas en su terminal antes de que los reportes editoriales sean bloqueados o censurados en redes sociales corporativas.</p>
        
        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">1. Boletín Diario por Email Encriptado</h3>
        <p class="mb-4">Reciba todas las mañanas un resumen forense de las principales noticias políticas, nacionales y tecnológicas de la República Dominicana directamente en su correo. Opcionalmente puede configurar su llave pública PGP para recibir los correos encriptados.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">2. Canal RSS de Baja Latencia</h3>
        <p class="mb-4">Proveemos un feed RSS puro sin scripts que puede vincular a su lector personal de noticias. Es compatible con terminales basadas en Unix y clientes ligeros.</p>
      `
    },
    'terms-of-service': {
      title: 'Términos de Servicio y Condiciones Generales',
      publishedAt: '01 ENERO 2024',
      status: 'PUBLICADO',
      indexable: true,
      content: `
        <p class="mb-4">Bienvenido a Hackeando el Sistema. Al acceder a esta terminal y sus contenidos, usted acepta cumplir y estar sujeto a las siguientes condiciones generales de uso.</p>
        
        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">1. Naturaleza Editorial y Exención de Responsabilidad</h3>
        <p class="mb-4">Hackeando el Sistema Network es un portal de periodismo de investigación independiente y de análisis geopolítico y tecnológico. El material publicado se basa en filtraciones, metadatos verificados y fuentes confidenciales protegidas. La información provista en este nodo se presenta 'tal cual' sin garantías explícitas de adecuación a un fin particular.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">2. Uso de la Información</h3>
        <p class="mb-4">Se permite la redistribución y cita de nuestros informes de investigación, siempre y cuando se asocie un enlace de atribución directa a la URL canónica del artículo original en Hackeando el Sistema.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">3. Acceso Remoto y Seguridad</h3>
        <p class="mb-4">Queda estrictamente prohibido cualquier intento de denegación de servicio (DDoS), escaneo de puertos o vulneración de los firewalls de este nodo. Cualquier ataque registrado será filtrado automáticamente y las trazas de comunicación serán registradas por la Unidad de Ciberdefensa.</p>
      `
    },
    'advertising': {
      title: 'Publicidad y Tarifas de Impacto',
      publishedAt: '20 ABRIL 2024',
      status: 'PUBLICADO',
      indexable: true,
      content: `
        <p class="mb-4">Potencie el alcance y el impacto de su marca o comunicado inyectando sus datos publicitarios en nuestra red. Contamos con slots publicitarios premium de alto rendimiento y cuotas flexibles.</p>
        
        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">1. Banners y Espacios Publicitarios</h3>
        <p class="mb-4">Disponemos de slots fijos y dinámicos con reserva de altura estable para evitar CLS en:</p>
        <ul class="list-disc pl-5 space-y-2 mb-4 font-mono text-[12px] text-on-surface-variant">
          <li><strong>Slot Cabecera (Leaderboard)</strong>: 728x90 px en Desktop; 320x50 px en Mobile.</li>
          <li><strong>Slot Lateral (Sidebar)</strong>: 300x250 px o 300x600 px en barra lateral de artículos.</li>
          <li><strong>Slot In-Content</strong>: Banner dentro del cuerpo del artículo (intercalado).</li>
        </ul>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">2. Artículos Patrocinados (PR & Leaks)</h3>
        <p class="mb-4">Adquiera planes editoriales desde nuestra sección de Planes de Publicación. Ofrecemos indexación SEO estable, enlaces do-follow y difusión prioritaria en canales del network.</p>

        <h3 class="text-white font-bold text-[16px] mt-6 mb-3 uppercase">3. Estadísticas de Impacto</h3>
        <p class="mb-4">Nuestra red acumula más de 1.2 millones de páginas vistas mensuales con audiencias altamente perfiladas en tecnología, ciberseguridad, política y finanzas de la región del Caribe.</p>
      `
    }
  };

  // Find page or default
  const page = staticPagesDb[slug] || {
    title: 'DOCUMENTO DEL SISTEMA',
    publishedAt: 'FECHA DESCONOCIDA',
    status: 'NO_PUBLICADO',
    indexable: false,
    content: '<p class="text-system-red">ERROR 404: ARCHIVO DE DATOS ESTÁTICO EXPIRADO O NO DISPONIBLE EN EL NODO ACTUAL.</p>'
  };

  useEffect(() => {
    document.title = `${page.title.toUpperCase()} | Hackeando el Sistema`;
    
    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + `/pagina/${slug}`);

    // Set robots meta
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', page.indexable ? 'INDEX, FOLLOW' : 'NOINDEX, NOFOLLOW');

    return () => {
      if (robots) {
        robots.setAttribute('content', 'INDEX, FOLLOW');
      }
    };
  }, [slug, page]);

  return (
    <div className="w-full bg-background text-on-surface">
      
      {/* Top Header Card */}
      <section className="py-stack-md border-b border-terminal-gray mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none select-none">
          <span className="font-headline-xl text-[120px] leading-none uppercase">PÁGINA</span>
        </div>
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="border border-system-red px-3 py-0.5">
              <span className="font-label-caps text-label-caps text-system-red">
                [ ESTÁTICA / DOCUMENTAL ]
              </span>
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant uppercase">
              ESTADO: {page.status}
            </span>
          </div>

          <h1 className="font-headline-xl text-3xl md:text-[40px] text-white uppercase leading-none max-w-4xl font-bold">
            {page.title}
          </h1>

          <p className="font-mono text-[10px] text-on-surface-variant">
            REGISTRO_PUBLICACIÓN: {page.publishedAt} | CANONICAL: /pagina/{slug}
          </p>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Left Side: Body Content */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-terminal-gray p-8">
          <div 
            className="font-body-md text-on-surface-variant leading-relaxed text-sm space-y-4 font-sans"
            dangerouslySetInnerHTML={{ __html: page.content }}
          ></div>
        </div>

        {/* Right Side: Index/Quick Nav */}
        <div className="lg:col-span-4 space-y-gutter w-full">
          
          {/* Related System Documents */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-4">
            <h3 className="font-label-caps text-xs text-white border-b border-terminal-gray pb-2 uppercase font-bold">
              DOCUMENTACIÓN DEL NODO
            </h3>

            <nav className="flex flex-col gap-3 font-mono text-[10.5px]">
              <Link 
                to="/pagina/privacy-policy" 
                className={`hover:text-system-red transition-colors flex items-center gap-2 ${slug === 'privacy-policy' ? 'text-system-red font-bold' : 'text-on-surface-variant'}`}
              >
                <span>»</span> Política de Privacidad
              </Link>
              <Link 
                to="/pagina/politicas-de-publicacion" 
                className={`hover:text-system-red transition-colors flex items-center gap-2 ${slug === 'politicas-de-publicacion' ? 'text-system-red font-bold' : 'text-on-surface-variant'}`}
              >
                <span>»</span> Políticas de Publicación
              </Link>
              <Link 
                to="/pagina/terms-of-service" 
                className={`hover:text-system-red transition-colors flex items-center gap-2 ${slug === 'terms-of-service' ? 'text-system-red font-bold' : 'text-on-surface-variant'}`}
              >
                <span>»</span> Términos de Servicio
              </Link>
              <Link 
                to="/pagina/advertising" 
                className={`hover:text-system-red transition-colors flex items-center gap-2 ${slug === 'advertising' ? 'text-system-red font-bold' : 'text-on-surface-variant'}`}
              >
                <span>»</span> Publicidad y Tarifas
              </Link>
              <Link 
                to="/pagina/suscripcion" 
                className={`hover:text-system-red transition-colors flex items-center gap-2 ${slug === 'suscripcion' ? 'text-system-red font-bold' : 'text-on-surface-variant'}`}
              >
                <span>»</span> Suscripción al Canal
              </Link>
              <Link 
                to="/contacto-seguro" 
                className="text-on-surface-variant hover:text-system-red transition-colors flex items-center gap-2"
              >
                <span>»</span> Formulario Denuncia Seguro
              </Link>
            </nav>
          </div>

          {/* Verification Box */}
          <div className="border border-terminal-gray/60 p-4 bg-matrix-dim font-mono text-[9px] text-on-surface-variant space-y-2 leading-relaxed">
            <div className="text-white font-bold uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-system-red text-[15px]">check_circle</span>
              COMPROBACIÓN DE INTEGRIDAD
            </div>
            <p>
              Este archivo estático ha sido migrado exitosamente de la base de datos de WordPress y compilado estáticamente para mejorar los tiempos de carga (FCP/LCP) y prevenir fallas por inyección de código PHP.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
