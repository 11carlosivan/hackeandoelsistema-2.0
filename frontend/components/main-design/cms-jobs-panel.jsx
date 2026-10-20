'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  updateCmsJobStatus,
  updateCmsJob,
  deleteCmsJob,
  getCmsJobApplications,
} from '@/lib/main-design/api';

const STATUS_LABELS = {
  PUBLISHED: { text: 'Publicada / Activa', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
  CLOSED: { text: 'Completada / Cerrada', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  ARCHIVED: { text: 'Caducada / Archivada', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  DRAFT: { text: 'Borrador', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
};

export default function CmsJobsPanel({ initialJobs = [], totalJobs = 0, accessToken }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Applications modal
  const [viewingApplicantsJob, setViewingApplicantsJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Form for editing job
  const [editForm, setEditForm] = useState({
    title: '',
    companyName: '',
    location: '',
    workplaceType: 'ONSITE',
    employmentType: 'FULL_TIME',
    salaryMin: '',
    salaryMax: '',
    description: '',
    requirements: '',
    benefits: '',
    status: 'PUBLISHED',
  });

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await updateCmsJobStatus(accessToken, id, newStatus);
      if (res?.data?.job) {
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)));
        setFeedback({ type: 'success', message: `Estado de la vacante actualizado a: ${newStatus}` });
      }
    } catch (err) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`¿Estás seguro de eliminar la vacante "${title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteCmsJob(accessToken, id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setFeedback({ type: 'success', message: 'Vacante eliminada correctamente.' });
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleOpenEdit = (job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title || '',
      companyName: job.companyName || '',
      location: job.location || '',
      workplaceType: job.workplaceType || 'ONSITE',
      employmentType: job.employmentType || 'FULL_TIME',
      salaryMin: job.salaryMin !== null && job.salaryMin !== undefined ? String(job.salaryMin) : '',
      salaryMax: job.salaryMax !== null && job.salaryMax !== undefined ? String(job.salaryMax) : '',
      description: job.description || '',
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      status: job.status || 'PUBLISHED',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingJob) return;
    setLoadingEdit(true);

    try {
      const payload = {
        title: editForm.title,
        companyName: editForm.companyName,
        location: editForm.location,
        workplaceType: editForm.workplaceType,
        employmentType: editForm.employmentType,
        salaryMin: editForm.salaryMin ? Number(editForm.salaryMin) : null,
        salaryMax: editForm.salaryMax ? Number(editForm.salaryMax) : null,
        description: editForm.description,
        requirements: editForm.requirements || null,
        benefits: editForm.benefits || null,
        status: editForm.status,
      };

      const res = await updateCmsJob(accessToken, editingJob.id, payload);
      if (res?.data?.job) {
        setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? { ...j, ...res.data.job } : j)));
        setFeedback({ type: 'success', message: 'Vacante actualizada correctamente.' });
        setEditingJob(null);
      }
    } catch (err) {
      alert('Error al guardar cambios: ' + err.message);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleViewApplicants = async (job) => {
    setViewingApplicantsJob(job);
    setLoadingApplicants(true);
    try {
      const res = await getCmsJobApplications(accessToken, job.id);
      setApplicants(res);
    } catch (err) {
      alert('Error al cargar postulantes: ' + err.message);
    } finally {
      setLoadingApplicants(false);
    }
  };

  // Filtered jobs
  const filteredJobs = jobs.filter((job) => {
    if (filterStatus !== 'ALL' && job.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title?.toLowerCase().includes(q);
      const matchComp = job.companyName?.toLowerCase().includes(q);
      const matchLoc = job.location?.toLowerCase().includes(q);
      if (!matchTitle && !matchComp && !matchLoc) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-terminal-gray/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/cms" className="text-terminal-gray hover:text-white text-xs font-mono">
              CMS
            </Link>
            <span className="text-terminal-gray text-xs">/</span>
            <span className="text-system-red text-xs font-mono uppercase font-bold">Vacantes</span>
          </div>
          <h1 className="text-2xl font-black text-white font-mono uppercase tracking-wider flex items-center gap-3">
            <span className="material-symbols-outlined text-system-red text-3xl">work</span>
            Gestión de Vacantes y Empleos (App & Web)
          </h1>
          <p className="text-terminal-gray text-xs mt-1">
            Modifica, elimina y actualiza el estado de las ofertas de empleo (publicadas, completadas o caducadas).
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/cms"
            className="border border-terminal-gray px-4 py-2.5 text-xs font-mono font-bold text-white hover:border-white transition-colors"
          >
            ← Volver al CMS
          </Link>
          <Link
            href="/empleos"
            target="_blank"
            className="border border-system-red text-system-red hover:bg-system-red hover:text-black px-4 py-2.5 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Ver Portal Público
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 mb-6 border text-xs font-mono ${
            feedback.type === 'success'
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-system-red/40 bg-system-red/10 text-system-red'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 bg-terminal-dark p-3 border border-terminal-gray/40 font-mono text-xs">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PUBLISHED', 'CLOSED', 'ARCHIVED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                filterStatus === st
                  ? 'bg-system-red text-black'
                  : 'bg-black/60 text-terminal-gray hover:text-white border border-terminal-gray/30'
              }`}
            >
              {st === 'ALL'
                ? `Todas (${jobs.length})`
                : st === 'PUBLISHED'
                ? 'Publicadas'
                : st === 'CLOSED'
                ? 'Completadas'
                : st === 'ARCHIVED'
                ? 'Caducadas'
                : 'Borradores'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cargo, empresa o ciudad..."
            className="bg-black border border-terminal-gray px-3 py-1.5 text-white placeholder-terminal-gray outline-none focus:border-system-red w-64 text-xs"
          />
        </div>
      </div>

      {/* Jobs Table */}
      <div className="border border-terminal-gray/40 bg-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-terminal-dark border-b border-terminal-gray/40 text-terminal-gray uppercase">
              <tr>
                <th className="p-4">Vacante / Empresa</th>
                <th className="p-4">Ubicación / Modalidad</th>
                <th className="p-4">Salario</th>
                <th className="p-4">Postulaciones</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones de Estado y Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-gray/20">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-terminal-gray">
                    No se encontraron vacantes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const statusInfo = STATUS_LABELS[job.status] || STATUS_LABELS.DRAFT;
                  return (
                    <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm line-clamp-1">{job.title}</div>
                        <div className="text-terminal-gray text-[11px] mt-0.5 flex items-center gap-2">
                          <span className="text-system-red font-semibold">{job.companyName}</span>
                          <span>•</span>
                          <span>{job.employmentType}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white">{job.location}</div>
                        <div className="text-terminal-gray text-[10px] mt-0.5 uppercase">{job.workplaceType}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white">
                          {job.salaryMin
                            ? `${job.salaryCurrency} ${Number(job.salaryMin).toLocaleString()}`
                            : 'A convenir'}
                        </div>
                        {job.salaryMax && (
                          <div className="text-terminal-gray text-[10px]">
                            Hasta {job.salaryCurrency} {Number(job.salaryMax).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleViewApplicants(job)}
                          className="px-2 py-1 bg-terminal-dark border border-terminal-gray/60 hover:border-white text-white rounded text-[11px] flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px] text-system-red">group</span>
                          <span>{job._count?.applications ?? job.applicantCount ?? 0} CVs</span>
                        </button>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Cambiar a Completada */}
                          {job.status !== 'CLOSED' && (
                            <button
                              onClick={() => handleStatusChange(job.id, 'CLOSED')}
                              title="Marcar como vacante completada / cerrada"
                              className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500 hover:text-black border border-blue-500/40 text-blue-400 transition-colors text-[10px] font-bold uppercase"
                            >
                              Completar
                            </button>
                          )}

                          {/* Cambiar a Caducada */}
                          {job.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleStatusChange(job.id, 'ARCHIVED')}
                              title="Marcar como oferta caducada / archivada"
                              className="px-2 py-1 bg-orange-500/10 hover:bg-orange-500 hover:text-black border border-orange-500/40 text-orange-400 transition-colors text-[10px] font-bold uppercase"
                            >
                              Caducar
                            </button>
                          )}

                          {/* Republicar si no está publicada */}
                          {job.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => handleStatusChange(job.id, 'PUBLISHED')}
                              title="Reabrir y publicar vacante"
                              className="px-2 py-1 bg-green-500/10 hover:bg-green-500 hover:text-black border border-green-500/40 text-green-400 transition-colors text-[10px] font-bold uppercase"
                            >
                              Activar
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(job)}
                            className="px-2 py-1 bg-terminal-dark hover:bg-white hover:text-black border border-terminal-gray text-white transition-colors text-[10px] font-bold uppercase"
                          >
                            Editar
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDelete(job.id, job.title)}
                            className="px-2 py-1 bg-system-red/10 hover:bg-system-red hover:text-black border border-system-red/40 text-system-red transition-colors text-[10px] font-bold uppercase"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Vacante */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-terminal-dark border border-terminal-gray max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-terminal-gray/40 pb-3">
              <h2 className="text-lg font-bold text-white font-mono uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red">edit_note</span>
                Editar Oferta de Empleo
              </h2>
              <button
                onClick={() => setEditingJob(null)}
                className="text-terminal-gray hover:text-white font-mono text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Título de la Vacante *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Nombre de la Empresa *</label>
                  <input
                    type="text"
                    required
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Ubicación (Ciudad/País) *</label>
                  <input
                    type="text"
                    required
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Modalidad</label>
                  <select
                    value={editForm.workplaceType}
                    onChange={(e) => setEditForm({ ...editForm, workplaceType: e.target.value })}
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  >
                    <option value="ONSITE">Presencial</option>
                    <option value="REMOTE">Remoto</option>
                    <option value="HYBRID">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Tipo de Empleo</label>
                  <select
                    value={editForm.employmentType}
                    onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  >
                    <option value="FULL_TIME">Tiempo Completo</option>
                    <option value="PART_TIME">Medio Tiempo</option>
                    <option value="CONTRACT">Contrato</option>
                    <option value="INTERNSHIP">Pasantía</option>
                    <option value="TEMPORARY">Temporal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Salario Mínimo</label>
                  <input
                    type="number"
                    value={editForm.salaryMin}
                    onChange={(e) => setEditForm({ ...editForm, salaryMin: e.target.value })}
                    placeholder="Ej: 45000"
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Salario Máximo</label>
                  <input
                    type="number"
                    value={editForm.salaryMax}
                    onChange={(e) => setEditForm({ ...editForm, salaryMax: e.target.value })}
                    placeholder="Ej: 75000"
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Estado Actual</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none font-bold text-system-red"
                  >
                    <option value="PUBLISHED">Publicada (Activa)</option>
                    <option value="CLOSED">Completada (Cerrada)</option>
                    <option value="ARCHIVED">Caducada (Archivada)</option>
                    <option value="DRAFT">Borrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-terminal-gray mb-1 uppercase font-bold">Descripción del Cargo *</label>
                <textarea
                  required
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                />
              </div>

              <div>
                <label className="block text-terminal-gray mb-1 uppercase font-bold">Requisitos</label>
                <textarea
                  rows={3}
                  value={editForm.requirements}
                  onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                  placeholder="Habilidades requeridas, experiencia previa..."
                  className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-terminal-gray/40">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 border border-terminal-gray text-terminal-gray hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingEdit}
                  className="bg-system-red hover:bg-white text-black px-6 py-2 font-bold uppercase transition-colors"
                >
                  {loadingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Postulantes / CVs */}
      {viewingApplicantsJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-terminal-dark border border-terminal-gray max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-terminal-gray/40 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white font-mono uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-system-red">group</span>
                  Postulantes Recibidos ({applicants.length})
                </h2>
                <div className="text-terminal-gray text-xs font-mono mt-0.5">
                  Vacante: <span className="text-white font-bold">{viewingApplicantsJob.title}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingApplicantsJob(null)}
                className="text-terminal-gray hover:text-white font-mono text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            {loadingApplicants ? (
              <div className="p-8 text-center text-terminal-gray font-mono text-xs">
                Cargando postulaciones y currículums...
              </div>
            ) : applicants.length === 0 ? (
              <div className="p-8 text-center text-terminal-gray font-mono text-xs">
                Aún no hay postulaciones registradas para esta vacante.
              </div>
            ) : (
              <div className="space-y-4 font-mono text-xs">
                {applicants.map((app) => (
                  <div key={app.id} className="p-4 bg-black border border-terminal-gray/40">
                    <div className="flex flex-col md:flex-row justify-between gap-3 mb-2">
                      <div>
                        <div className="font-bold text-white text-sm">{app.fullName}</div>
                        <div className="text-terminal-gray text-[11px] mt-0.5">
                          Email: <a href={`mailto:${app.email}`} className="text-system-red hover:underline">{app.email}</a> • Tel: {app.phone}
                        </div>
                      </div>
                      <div>
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-system-red/20 border border-system-red text-white hover:bg-system-red hover:text-black font-bold uppercase transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          Descargar CV ({app.resumeFileName || 'PDF'})
                        </a>
                      </div>
                    </div>

                    {app.coverLetter && (
                      <div className="mt-2 p-2.5 bg-terminal-dark border border-terminal-gray/30 text-terminal-gray text-[11px]">
                        <span className="font-bold text-white block mb-1">Carta de presentación:</span>
                        {app.coverLetter}
                      </div>
                    )}
                    <div className="text-[10px] text-terminal-gray/80 mt-2">
                      Postulado el: {new Date(app.createdAt).toLocaleString('es-DO')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
