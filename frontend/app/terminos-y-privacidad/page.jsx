import PublicLayout from '@/components/main-design/public-layout';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Términos y Condiciones y Política de Privacidad',
  description: 'Términos y condiciones de uso y política de privacidad de Hackeandoelsistema.net',
  path: '/terminos-y-privacidad',
});

export default function Page() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 text-on-surface">
        <div className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-10 space-y-8">
          <div className="border-b border-terminal-gray pb-6">
            <span className="font-label-caps text-system-red text-xs font-bold tracking-wider">
              DOCUMENTO LEGAL Y PRIVACIDAD
            </span>
            <h1 className="font-headline-xl text-3xl md:text-5xl text-white uppercase mt-2 font-bold tracking-tight">
              Términos y Condiciones de Uso y Política de Privacidad
            </h1>
            <p className="text-on-surface-variant text-sm mt-3">
              Última actualización: Agosto 2026
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-on-surface-variant text-base leading-relaxed">
            <p>
              Bienvenido a <strong className="text-white">Hackeandoelsistema.net</strong> (en adelante, "el Ecosistema"). Al registrarse, crear un perfil o utilizar nuestros servicios, usted acepta y se obliga a cumplir con los presentes Términos, Condiciones y Políticas de Privacidad. Si no está de acuerdo con estos términos, deberá abstenerse de registrarse y utilizar la plataforma.
            </p>

            <section className="space-y-3">
              <h2 className="font-headline-md text-xl md:text-2xl text-white uppercase border-l-2 border-system-red pl-3">
                1. REGLAS Y CONDICIONES PARA ESTABLECER UN PERFIL
              </h2>
              <p>
                Para formar parte del Ecosistema y habilitar un perfil de usuario, autor o creador de contenido, usted debe cumplir obligatoriamente con las siguientes reglas:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Veracidad de la Información:</strong> El usuario se obliga a proporcionar datos personales exactos, actuales y verídicos (nombre real, correo electrónico válido, etc.). Queda terminantemente prohibida la suplantación de identidad o la creación de perfiles falsos.
                </li>
                <li>
                  <strong className="text-white">Edad Mínima:</strong> Para registrar un perfil autónomo, el usuario declara ser mayor de 18 años o contar con la capacidad legal suficiente en el territorio de la República Dominicana.
                </li>
                <li>
                  <strong className="text-white">Uso Adecuado del Ecosistema:</strong> El perfil es personal e intransferible. El titular es el único responsable de la seguridad de sus credenciales de acceso y de cualquier actividad, comentario o publicación realizada desde su cuenta.
                </li>
                <li>
                  <strong className="text-white">Código de Conducta:</strong> Queda prohibido el uso del perfil para difundir discursos de odio, difamación, propiedad intelectual no autorizada, spam o virus informáticos. El incumplimiento de estas normas dará lugar a la suspensión o eliminación del perfil sin previo aviso.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-headline-md text-xl md:text-2xl text-white uppercase border-l-2 border-system-red pl-3">
                2. POLÍTICA DE DATOS: RECOLECCIÓN Y FINALIDADES ADVANCED
              </h2>
              <p>
                A diferencia de los portales de noticias convencionales, el Ecosistema procesa datos y métricas inspiradas en plataformas de redes sociales avanzadas (como Medium, Meta, X y TikTok) para optimizar la experiencia de usuario:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Datos de Registro:</strong> Nombre, apellido, nombre de usuario, dirección de correo electrónico y contraseña encriptada.
                </li>
                <li>
                  <strong className="text-white">Métricas de Interacción y Lectura (Inspirado en Medium):</strong> Monitoreamos el tiempo de permanencia en las lecturas, artículos guardados, historial de clics, recomendaciones y el nivel de interacción (comentarios y reacciones) para personalizar su menú de inicio.
                </li>
                <li>
                  <strong className="text-white">Píxeles y Rastreo de Terceros (Inspirado en Meta, X, TikTok):</strong> El Ecosistema puede integrar herramientas de analítica y SDKs de terceros para medir conversiones, segmentar contenido editorial o publicitario de alto interés y conectar las funciones de compartir de forma directa con redes sociales externas.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-headline-md text-xl md:text-2xl text-white uppercase border-l-2 border-system-red pl-3">
                3. POLÍTICA DE CONSERVACIÓN Y ELIMINACIÓN DE DATOS (DERECHO DE SUPRESIÓN)
              </h2>
              <p>
                En cumplimiento con los derechos ARCO de la Ley No. 172-13, el Ecosistema garantiza el control total del usuario sobre su huella digital:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Eliminación Definitiva:</strong> En el momento exacto en que el usuario decide presionar el botón de "Eliminar Cuenta" desde la configuración de su perfil, se inicia un proceso automático e irreversible de eliminación total de sus datos personales de nuestras bases de datos activas.
                </li>
                <li>
                  <strong className="text-white">Alcance del Borrado:</strong> Esto incluye la supresión de su nombre, correo, historial de lectura personalizado, datos de segmentación y metadatos del perfil.
                </li>
                <li>
                  <strong className="text-white">Excepción de Seguridad:</strong> Únicamente se conservarán registros anonimizados para estadísticas internas (sin vinculación a su identidad) o aquellos datos indispensables que la legislación dominicana exija retener temporalmente para fines de investigación de delitos de alta tecnología (Ley 53-07), tras lo cual se destruirán.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
