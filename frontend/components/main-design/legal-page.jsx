import { SystemPageHeader } from './content-primitives';

const documents = {
  privacy: {
    title: 'Politica de Privacidad',
    description: 'Informacion clara sobre el uso de cuentas, comentarios, seguridad y preferencias dentro del sitio.',
    updatedAt: '04 AGO 2026',
    sections: [
      {
        title: 'Alcance',
        body: [
          'Esta politica aplica al uso del sitio, las cuentas de usuario, comentarios, boletines, contacto y servicios editoriales disponibles en Hackeando el Sistema.',
          'El sitio puede tratar informacion necesaria para operar sus funciones, mantener seguridad, moderar contenido y responder solicitudes enviadas por usuarios.',
        ],
      },
      {
        title: 'Informacion de cuenta y actividad',
        body: [
          'Cuando una persona crea o usa una cuenta, el sistema puede guardar datos de identificacion de cuenta, historial de sesiones, preferencias y acciones realizadas dentro del sitio.',
          'Los comentarios, articulos guardados, likes y compartidos pueden asociarse a la cuenta o a identificadores tecnicos necesarios para evitar abuso y mantener integridad del servicio.',
        ],
      },
      {
        title: 'Comunicaciones',
        body: [
          'Las comunicaciones solicitadas por el usuario pueden usarse para enviar actualizaciones, responder mensajes o gestionar participacion dentro de la comunidad.',
          'El usuario puede solicitar dejar de recibir comunicaciones cuando el canal utilizado lo permita.',
        ],
      },
      {
        title: 'Seguridad y conservacion',
        body: [
          'El sistema mantiene controles de acceso, registros de auditoria, moderacion y medidas tecnicas orientadas a proteger cuentas, contenido y operacion editorial.',
          'La informacion se conserva durante el tiempo necesario para operar el servicio, atender solicitudes, cumplir obligaciones internas y proteger la integridad de la plataforma.',
        ],
      },
      {
        title: 'Responsabilidad sobre imagenes, contenidos y registros',
        body: [
          'Cada usuario, colaborador o anunciante es unica y exclusivamente responsable de las imagenes, fotografias, textos, enlaces y registros de informacion que cargue, transmita o publique en el sistema o a traves de la aplicacion movil.',
          'Hackeando el Sistema no asume responsabilidad civil, penal ni administrativa por los materiales graficos o de informacion provistos por terceros o usuarios de la comunidad, reservandose el derecho de moderar, suspender o retirar inmediatamente cualquier contenido que infrinja derechos de autor, privacidad o la legislacion aplicable.',
        ],
      },
      {
        title: 'Baja y eliminacion de cuenta (Darse de baja)',
        body: [
          'Todo usuario registrado tiene derecho a darse de baja y solicitar la eliminacion definitiva de su cuenta y sus datos personales asociados en cualquier momento.',
          'La baja puede gestionarse directamente desde la seccion de edicion de perfil en la plataforma web o desde la pantalla de perfil en la aplicacion movil, asi como mediante comunicacion a nuestros canales oficiales.',
        ],
      },
      {
        title: 'Solicitudes y contacto',
        body: [
          'Las personas pueden comunicarse con el equipo para solicitar revision, actualizacion o eliminacion de informacion vinculada a su cuenta, segun corresponda al funcionamiento del servicio.',
          'Las solicitudes se atienden desde los canales oficiales publicados en el sitio.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terminos de Uso',
    description: 'Condiciones generales para usar el sitio, publicar comentarios y acceder a funciones de cuenta.',
    updatedAt: '17 OCT 2026',
    sections: [
      {
        title: 'Uso del sitio',
        body: [
          'Hackeando el Sistema ofrece contenido editorial, opinion, archivo publico, comentarios moderados y funciones asociadas a cuentas de usuario.',
          'El usuario se compromete a usar el sitio de forma licita, respetuosa y sin afectar la seguridad, disponibilidad o integridad de la plataforma.',
        ],
      },
      {
        title: 'Cuentas y mayoria de edad',
        body: [
          'Para crear una cuenta en el sitio o la aplicacion, el usuario debe tener al menos 14 anos cumplidos (o contar con autorizacion legal de sus tutores en caso de menores de edad segun la jurisdiccion aplicable).',
          'El usuario es responsable de mantener sus credenciales seguras y de toda actividad realizada desde su cuenta.',
          'El equipo puede limitar, suspender o cerrar accesos cuando detecte abuso, spam, suplantacion, ataques o incumplimiento de estas condiciones.',
        ],
      },
      {
        title: 'Responsabilidad del usuario sobre imagenes y registros aportados',
        body: [
          'Al registrarse, comentar, enviar postulaciones o publicar ofertas de empleo, el usuario declara bajo juramento ser titular legitimo o poseer autorizacion expresa para el uso de cualquier imagen, archivo, curriculum o texto que adjunte.',
          'Las imagenes y registros cargados por usuarios son de exclusiva y total responsabilidad del usuario emisor. Hackeando el Sistema queda exento de cualquier reclamo de terceros derivado del uso no autorizado de contenidos aportados por los usuarios.',
        ],
      },
      {
        title: 'Comentarios y participacion',
        body: [
          'Los comentarios pueden ser revisados antes o despues de publicarse. El sitio puede rechazar o retirar contenido ofensivo, falso, ilegal, automatizado o ajeno al tema tratado.',
          'La participacion del usuario no representa necesariamente la posicion editorial del medio.',
        ],
      },
      {
        title: 'Contenido editorial',
        body: [
          'Los textos, marcas, imagenes, diseno y recursos del sitio pertenecen a sus respectivos titulares o se usan conforme a las autorizaciones aplicables.',
          'No se permite copiar, automatizar extracciones masivas, explotar comercialmente o alterar contenido sin autorizacion previa cuando corresponda.',
        ],
      },
      {
        title: 'Cancelacion y baja de la cuenta',
        body: [
          'El usuario puede solicitar o ejecutar la baja de su registro en cualquier momento a traves de las herramientas de autoservicio de su perfil en la web y en la app movil.',
        ],
      },
      {
        title: 'Cambios',
        body: [
          'El sitio puede actualizar estas condiciones para reflejar cambios operativos, editoriales o tecnicos.',
          'La version publicada en esta pagina sera la referencia vigente para el uso del servicio.',
        ],
      },
    ],
  },
};

export function getLegalDocument(kind) {
  return documents[kind] || documents.privacy;
}

export default function LegalPage({ kind }) {
  const document = getLegalDocument(kind);

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="LEGAL"
        title={document.title}
        description={document.description}
        stats={[
          { label: 'VERSION', value: document.updatedAt, icon: 'event' },
          { label: 'ESTADO', value: 'Vigente', icon: 'verified' },
        ]}
      />

      <article className="border border-terminal-gray bg-surface-container-low/20 p-6 md:p-8">
        <div className="mx-auto grid max-w-4xl gap-8">
          {document.sections.map((section) => (
            <section key={section.title} className="border-l-2 border-system-red pl-5">
              <h2 className="font-headline-md text-2xl uppercase text-white">{section.title}</h2>
              <div className="mt-4 grid gap-4 text-sm leading-7 text-on-surface-variant md:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
