'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { getCookieValue } from './client-security';

export default function CmsFormDetailView({ form, error = null }) {
  const [submissions, setSubmissions] = useState(form?.submissions || []);
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [maxResponses, setMaxResponses] = useState(form?.maxResponses ?? null);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState(
    form?.maxResponses !== null && form?.maxResponses !== undefined ? String(form.maxResponses) : ''
  );
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

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
        showFeedback('success', `Convocatoria ${!isActive ? 'reanudada' : 'pausada'} con éxito.`);
      } else {
        showFeedback('error', 'No se pudo cambiar el estado de la convocatoria.');
      }
    } catch {
      showFeedback('error', 'Error de conexión al cambiar el estado del formulario.');
    }
  };

  const handleSaveLimit = async (e) => {
    e.preventDefault();
    setIsSavingLimit(true);
    try {
      const parsed = limitInput.trim() === '' ? 0 : Number(limitInput);
      if (isNaN(parsed) || parsed < 0) {
        showFeedback('error', 'El límite debe ser un número entero mayor o igual a 0.');
        setIsSavingLimit(false);
        return;
      }
      const apiBaseUrl = getClientApiBaseUrl();
      const token = getCookieValue('hes_access_token');
      const res = await fetch(`${apiBaseUrl}/api/v1/cms/forms/${encodeURIComponent(form.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          maxResponses: parsed,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const updatedLimit = json.data?.maxResponses ?? (parsed === 0 ? null : parsed);
        setMaxResponses(updatedLimit);
        setIsEditingLimit(false);
        showFeedback(
          'success',
          `Límite de cupos actualizado a ${updatedLimit !== null ? `${updatedLimit} voluntarios` : 'ilimitado'} con éxito.`
        );
      } else {
        showFeedback('error', 'No se pudo actualizar el cupo límite.');
      }
    } catch {
      showFeedback('error', 'Error de conexión al actualizar el cupo límite.');
    } finally {
      setIsSavingLimit(false);
    }
  };

  const confirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    const subId = submissionToDelete.id;

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
        setSubmissionToDelete(null);
        showFeedback('success', 'La postulación fue eliminada correctamente.');
      } else {
        showFeedback('error', 'No se pudo eliminar la postulación. Intenta nuevamente.');
      }
    } catch {
      showFeedback('error', 'Error de comunicación con el servidor al eliminar.');
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
  const isFull = Boolean(maxResponses && count >= maxResponses);

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

      {/* In-page Feedback Banner */}
      {feedback && (
        <div
          className={`border p-3.5 text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
            feedback.type === 'success'
              ? 'border-green-500/60 bg-green-500/10 text-green-300'
              : 'border-system-red bg-system-red/10 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-base">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-on-surface-variant hover:text-white text-xs px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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

            {isEditingLimit ? (
              <div className="border border-system-red bg-surface-container-low/60 p-3 text-center min-w-[160px] relative">
                <span className="block text-[9px] font-mono text-system-red uppercase font-bold mb-1">EDITAR CUPOS</span>
                <form onSubmit={handleSaveLimit} className="space-y-2">
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder="0 = ∞"
                    className="w-full bg-black border border-terminal-gray text-white text-center font-headline text-lg font-bold outline-none focus:border-system-red py-0.5"
                    autoFocus
                  />
                  <div className="flex gap-1.5 justify-center">
                    <button
                      type="submit"
                      disabled={isSavingLimit}
                      className="bg-system-red text-black font-label-caps text-[9px] font-bold px-2.5 py-1 hover:bg-white transition-colors cursor-pointer"
                    >
                      {isSavingLimit ? '...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLimitInput(maxResponses !== null ? String(maxResponses) : '');
                        setIsEditingLimit(false);
                      }}
                      className="border border-terminal-gray text-white font-label-caps text-[9px] px-2 py-1 hover:border-white transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="border border-terminal-gray bg-surface-container-low/40 p-4 text-center min-w-[120px] group relative">
                <span className="block text-[9px] font-mono text-on-surface-variant uppercase">CUPOS LÍMITE</span>
                <span className="font-headline-md text-2xl text-system-red font-bold block">
                  {maxResponses || '∞'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLimitInput(maxResponses !== null ? String(maxResponses) : '');
                    setIsEditingLimit(true);
                  }}
                  className="mt-1 text-[9px] font-mono text-on-surface-variant hover:text-system-red transition-colors inline-flex items-center gap-0.5 cursor-pointer underline"
                  title="Cambiar límite de cupos"
                >
                  <span className="material-symbols-outlined text-[11px]">edit</span>
                  Cambiar cupo
                </button>
              </div>
            )}

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
                Límite de {maxResponses || 15} voluntarios completado
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
                            onClick={() => setSubmissionToDelete(sub)}
                            disabled={isDeleting === sub.id}
                            className="text-system-red/70 hover:text-system-red hover:underline text-[10px] transition-colors uppercase font-mono tracking-wider cursor-pointer"
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

      {/* Custom Tactical Cyberpunk Confirm Modal */}
      {submissionToDelete && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <div className="border-2 border-system-red bg-[#0c0d10] max-w-md w-full p-6 space-y-5 shadow-[0_0_50px_rgba(255,0,51,0.35)] relative overflow-hidden">
            {/* Top decorative hazard red stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-system-red via-white/50 to-system-red" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-system-red text-2xl animate-pulse">
                  warning
                </span>
                <div>
                  <div className="font-label-caps text-system-red text-[10px] font-bold tracking-widest">
                    [ ACCIÓN DESTRUCTIVA ]
                  </div>
                  <h3 id="confirm-delete-title" className="font-headline text-lg font-bold text-white tracking-wide">
                    ELIMINAR REGISTRO
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setSubmissionToDelete(null)}
                disabled={Boolean(isDeleting)}
                className="text-on-surface-variant hover:text-white transition-colors text-sm p-1 cursor-pointer disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-on-surface-variant font-mono leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente esta postulación? Esta acción purgará los datos de la base de datos y no se puede deshacer.
            </p>

            {/* Target submission preview card */}
            <div className="border border-terminal-gray/80 bg-black/80 p-3.5 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-on-surface-variant border-b border-terminal-gray/40 pb-1.5 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-system-red">
                  Ficha de Postulación
                </span>
                <span className="text-[10px] text-on-surface-variant font-bold">
                  ID #{submissionToDelete.id}
                </span>
              </div>
              {submissionToDelete.data?.name && (
                <div className="flex justify-between gap-2">
                  <span className="text-on-surface-variant text-[11px]">Nombre:</span>
                  <span className="text-white font-bold truncate max-w-[220px] text-[11px]">
                    {submissionToDelete.data.name}
                  </span>
                </div>
              )}
              {submissionToDelete.data?.email && (
                <div className="flex justify-between gap-2">
                  <span className="text-on-surface-variant text-[11px]">Email:</span>
                  <span className="text-white truncate max-w-[220px] text-[11px]">
                    {submissionToDelete.data.email}
                  </span>
                </div>
              )}
              {submissionToDelete.data?.phone && (
                <div className="flex justify-between gap-2">
                  <span className="text-on-surface-variant text-[11px]">Teléfono:</span>
                  <span className="text-white text-[11px] font-mono">
                    {submissionToDelete.data.phone}
                  </span>
                </div>
              )}
              {submissionToDelete.data?.device && (
                <div className="flex justify-between gap-2">
                  <span className="text-on-surface-variant text-[11px]">Dispositivo:</span>
                  <span className="text-white text-[11px]">
                    {submissionToDelete.data.device}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2 text-on-surface-variant text-[10px] pt-1 border-t border-terminal-gray/20">
                <span>Fecha de envío:</span>
                <span>{new Date(submissionToDelete.createdAt).toLocaleString('es-DO')}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmissionToDelete(null)}
                disabled={Boolean(isDeleting)}
                className="border border-terminal-gray bg-black/40 hover:bg-white/10 hover:border-white px-4 py-2 font-label-caps text-[10px] font-bold text-white transition-all cursor-pointer disabled:opacity-50"
              >
                [ CANCELAR ]
              </button>
              <button
                type="button"
                onClick={confirmDeleteSubmission}
                disabled={Boolean(isDeleting)}
                className="bg-system-red hover:bg-white hover:text-black text-black px-5 py-2 font-label-caps text-[10px] font-bold transition-all shadow-[0_0_20px_rgba(255,0,51,0.4)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                    <span>ELIMINANDO...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xs">delete_forever</span>
                    <span>CONFIRMAR ELIMINACIÓN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
