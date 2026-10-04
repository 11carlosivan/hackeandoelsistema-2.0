'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { getCookieValue } from './client-security';

export default function CmsFormDetailView({ form, error = null }) {
  const [submissions, setSubmissions] = useState(form?.submissions || []);
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [filterQuery, setFilterQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  if (error || !form) {
    return (
      <div className="w-full bg-background text-on-surface p-6">
        <div className="border border-system-red bg-system-red/10 p-4 text-white font-mono text-sm mb-4">
          Error: {error || 'Formulario no encontrado'}
        </div>
        <Link href="/cms/formularios" className="text-system-red font-mono text-xs hover:underline">
          ← Volver al listado de formularios
        </Link>
      </div>
    );
  }

  const handleToggleActive = async () => {
    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const token = getCookieValue('hes_access_token');
      const res = await fetch(`${apiBaseUrl}/api/v1/cms/forms/${encodeURIComponent(form.id)}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        setIsActive(!isActive);
      }
    } catch {
      alert('Error cambiando estado del formulario');
    }
  };

  const handleDeleteSubmission = async (subId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta respuesta?')) return;

    setIsDeleting(subId);
    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const token = getCookieValue('hes_access_token');
      const res = await fetch(
        `${apiBaseUrl}/api/v1/cms/forms/${encodeURIComponent(form.id)}/submissions/${encodeURIComponent(subId)}`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      }
    } catch {
      alert('Error eliminando respuesta');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportCsv = () => {
    const apiBaseUrl = getClientApiBaseUrl();
    const token = getCookieValue('hes_access_token');
    // Open CSV export endpoint directly or trigger download
    window.open(`${apiBaseUrl}/api/v1/cms/forms/${encodeURIComponent(form.id)}/export?token=${encodeURIComponent(token || '')}`, '_blank');
  };

  // Extract all distinct field keys from submissions
  const allFieldKeys = new Set();
  submissions.forEach((sub) => {
    Object.keys(sub.data || {}).forEach((k) => allFieldKeys.add(k));
  });
  const fieldKeys = Array.from(allFieldKeys);

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const dataStr = JSON.stringify(sub.data || {}).toLowerCase();
    return dataStr.includes(q) || (sub.ipAddress || '').includes(q);
  });

  const count = submissions.length;
  const isFull = Boolean(form.maxResponses && count >= form.maxResponses);

  return (
    <div className="w-full bg-background text-on-surface space-y-6">
      {/* Navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-terminal-gray pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/cms/formularios"
            className="border border-terminal-gray px-3 py-1.5 font-label-caps text-[10px] text-white hover:border-system-red transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Todos los Formularios
          </Link>
          <span className="font-mono text-xs text-on-surface-variant">/</span>
          <span className="font-mono text-xs text-white font-bold">{form.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-white text-black font-label-caps text-[10px] font-bold px-4 py-2 hover:bg-system-red transition-colors inline-flex items-center gap-1.5 uppercase cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            Descargar CSV / Excel
          </button>

          <button
            type="button"
            onClick={handleToggleActive}
            className={`border px-3 py-2 font-label-caps text-[10px] uppercase font-bold transition-colors cursor-pointer ${
              isActive
                ? 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20'
                : 'border-green-500/50 text-green-400 hover:bg-green-500/20'
            }`}
          >
            {isActive ? 'Pausar Convocatoria' : 'Activar Convocatoria'}
          </button>
        </div>
      </div>

      {/* Header Info Card */}
      <div className="border border-terminal-gray bg-black/60 p-6 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-system-red" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[9px] bg-system-red/20 text-system-red px-2 py-0.5 border border-system-red/40 font-bold uppercase">
                FORMULARIO CMS
              </span>
              <span className="font-mono text-[9px] text-on-surface-variant uppercase">
                ID: {form.id}
              </span>
            </div>
            <h2 className="font-headline-md text-2xl text-white uppercase">{form.title}</h2>
            {form.description && (
              <p className="text-on-surface-variant text-xs mt-1 max-w-2xl leading-relaxed">
                {form.description}
              </p>
            )}
            {form.post && (
              <div className="mt-3 text-xs font-mono">
                <span className="text-on-surface-variant">Publicado en el artículo: </span>
                <Link
                  href={`/articulo/${form.post.slug}/`}
                  target="_blank"
                  className="text-system-red hover:underline inline-flex items-center gap-1"
                >
                  {form.post.title}
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </Link>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div className="border border-terminal-gray bg-surface-container-low/40 p-4 text-center min-w-[120px]">
              <span className="block text-[9px] font-mono text-on-surface-variant uppercase">RESPUESTAS</span>
              <span className="font-headline-md text-2xl text-white font-bold">{count}</span>
            </div>

            <div className="border border-terminal-gray bg-surface-container-low/40 p-4 text-center min-w-[120px]">
              <span className="block text-[9px] font-mono text-on-surface-variant uppercase">CUPOS LÍMITE</span>
              <span className="font-headline-md text-2xl text-system-red font-bold">
                {form.maxResponses || '∞'}
              </span>
            </div>

            <div className="border border-terminal-gray bg-surface-container-low/40 p-4 text-center min-w-[120px]">
              <span className="block text-[9px] font-mono text-on-surface-variant uppercase">ESTADO</span>
              <span className={`font-mono text-xs font-bold uppercase block mt-1 ${isFull ? 'text-system-red' : isActive ? 'text-green-400' : 'text-yellow-400'}`}>
                {isFull ? 'COMPLETADO' : isActive ? 'ABIERTO' : 'PAUSADO'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table of Submissions */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-headline-md text-lg text-white uppercase">
              Registros Recibidos ({filteredSubmissions.length})
            </h3>
            {isFull && (
              <span className="text-[9px] font-mono bg-system-red/10 text-system-red border border-system-red/30 px-2 py-0.5 uppercase font-bold">
                Límite de 15 voluntarios completado
              </span>
            )}
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o teléfono..."
              className="w-full bg-black border border-terminal-gray/60 px-3 py-1.5 text-xs text-white outline-none font-mono focus:border-system-red"
            />
          </div>
        </div>

        <div className="border border-terminal-gray bg-black/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-terminal-gray bg-surface-container-low/50 text-[10px] text-on-surface-variant font-label-caps">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">FECHA Y HORA</th>
                  {fieldKeys.map((key) => (
                    <th key={key} className="py-3 px-4 uppercase">
                      {key}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-gray/20">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={fieldKeys.length + 3} className="py-12 text-center text-on-surface-variant text-xs">
                      {submissions.length === 0
                        ? 'Aún no hay respuestas registradas para este formulario.'
                        : 'No se encontraron respuestas con el criterio de búsqueda.'}
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub, idx) => {
                    const data = sub.data || {};

                    return (
                      <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-center text-on-surface-variant font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap text-[11px]">
                          {new Date(sub.createdAt).toLocaleString('es-DO')}
                        </td>
                        {fieldKeys.map((key) => {
                          const val = data[key];
                          const displayVal =
                            typeof val === 'boolean'
                              ? val
                                ? '✓ Sí'
                                : '✕ No'
                              : val === undefined || val === null || val === ''
                              ? '-'
                              : String(val);

                          return (
                            <td key={key} className="py-3 px-4 text-white text-[11px] max-w-xs truncate">
                              {displayVal}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteSubmission(sub.id)}
                            disabled={isDeleting === sub.id}
                            className="text-system-red/60 hover:text-system-red hover:underline text-[10px] transition-colors uppercase"
                            title="Eliminar respuesta"
                          >
                            {isDeleting === sub.id ? 'Borrando...' : 'Eliminar'}
                          </button>
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
    </div>
  );
}
