'use client';

import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';

export default function CmsFormsList({ forms = [], error = null }) {
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissionsCount || 0), 0);

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="TERMINAL CMS"
        title="Formularios y Respuestas"
        description="Gestión centralizada de formularios interactivos, convocatorias y registros de usuarios en artículos."
        stats={[
          { label: 'FORMULARIOS', value: forms.length.toString(), icon: 'assignment' },
          { label: 'TOTAL RESPUESTAS', value: totalSubmissions.toString(), icon: 'group' },
          { label: 'PROTECCIÓN', value: 'Anti-Bot Activo', icon: 'security' },
        ]}
      />

      {error && (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudieron cargar los formularios: {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/cms"
            className="border border-terminal-gray px-3 py-2 font-label-caps text-[10px] text-white hover:border-system-red transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Volver al Dashboard
          </Link>
          <Link
            href="/cms/publicaciones/nueva"
            className="bg-system-red text-black px-4 py-2 font-label-caps text-[10px] font-bold hover:bg-white transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">add_circle</span>
            Crear Publicación con Formulario
          </Link>
        </div>

        <div className="text-[10px] font-mono text-on-surface-variant">
          Tip: Puedes insertar un bloque de formulario en cualquier artículo desde el editor Gutenberg.
        </div>
      </div>

      <div className="border border-terminal-gray bg-black/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-terminal-gray bg-surface-container-low/50 text-[10px] text-on-surface-variant font-label-caps">
                <th className="py-3 px-4">TÍTULO DEL FORMULARIO</th>
                <th className="py-3 px-4">ARTÍCULO VINCULADO</th>
                <th className="py-3 px-4 text-center">RESPUESTAS</th>
                <th className="py-3 px-4 text-center">ESTADO</th>
                <th className="py-3 px-4">FECHA</th>
                <th className="py-3 px-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-gray/20">
              {forms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant text-xs">
                    No hay formularios creados todavía. Inserta un bloque <span className="text-system-red font-bold">+ Formulario</span> al redactar un artículo en el editor Gutenberg.
                  </td>
                </tr>
              ) : (
                forms.map((form) => {
                  const count = form.submissionsCount || 0;
                  const isFull = Boolean(form.maxResponses && count >= form.maxResponses);

                  return (
                    <tr key={form.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <Link href={`/cms/formularios/${encodeURIComponent(form.id)}`} className="hover:text-system-red transition-colors flex items-center gap-2">
                          <span className="material-symbols-outlined text-system-red text-base">ballot</span>
                          <span>{form.title}</span>
                        </Link>
                        {form.description && (
                          <span className="block text-[10px] text-on-surface-variant font-normal truncate max-w-xs mt-0.5">
                            {form.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant text-[11px]">
                        {form.post ? (
                          <Link
                            href={`/articulo/${form.post.slug}/`}
                            target="_blank"
                            className="text-white hover:text-system-red transition-colors underline truncate block max-w-xs"
                          >
                            {form.post.title}
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant/60">No asociado directamente</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block font-bold px-2 py-0.5 text-[10px] border ${isFull ? 'bg-system-red/20 text-system-red border-system-red/50' : 'bg-surface-container-low text-white border-terminal-gray/40'}`}>
                          {count} {form.maxResponses ? `/ ${form.maxResponses}` : 'recibidas'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!form.isActive ? (
                          <span className="text-[9px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 border border-terminal-gray/30 uppercase">
                            Pausado
                          </span>
                        ) : isFull ? (
                          <span className="text-[9px] text-system-red bg-system-red/10 px-2 py-0.5 border border-system-red/30 uppercase font-bold">
                            Lleno
                          </span>
                        ) : (
                          <span className="text-[9px] text-green-400 bg-green-500/10 px-2 py-0.5 border border-green-500/30 uppercase">
                            Abierto
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant text-[10px]">
                        {new Date(form.createdAt).toLocaleDateString('es-DO')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/cms/formularios/${encodeURIComponent(form.id)}`}
                          className="border border-system-red/60 text-white hover:bg-system-red hover:text-black px-3 py-1 font-label-caps text-[9px] font-bold uppercase transition-colors inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          Ver Respuestas ({count})
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
