'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';

const WORKPLACE_LABELS = {
  REMOTE: { label: 'Remoto', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  HYBRID: { label: 'Híbrido', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  ONSITE: { label: 'Presencial', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
};

const EMPLOYMENT_LABELS = {
  FULL_TIME: 'Tiempo Completo',
  PART_TIME: 'Medio Tiempo',
  CONTRACT: 'Por Contrato',
  TEMPORARY: 'Temporal',
  INTERNSHIP: 'Pasantía',
};

export default function JobDetailView({ job }) {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  if (!job) return null;

  const badgeInfo = WORKPLACE_LABELS[job.workplaceType] || WORKPLACE_LABELS.ONSITE;

  const formatSalary = () => {
    if (job.salaryMin && job.salaryMax) {
      return `RD$ ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      return `Desde RD$ ${job.salaryMin.toLocaleString()}`;
    }
    if (job.isSalaryNegotiable) {
      return 'Salario a convenir / Negociable';
    }
    return 'Salario confidencial';
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Debes adjuntar tu currículum vitae en formato PDF o Word.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const apiBase = getClientApiBaseUrl();

      // 1. Subir archivo de CV
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch(`${apiBase}/api/v1/jobs/upload-resume`, {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson?.data?.resumeUrl) {
        throw new Error(uploadJson?.message || 'Error al subir el currículum');
      }

      const { resumeUrl, resumeFileName } = uploadJson.data;

      // 2. Enviar postulación
      const applyPayload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        resumeUrl,
        resumeFileName,
        coverLetter: coverLetter.trim() || undefined,
      };

      const token = localStorage.getItem('hes_access_token') || localStorage.getItem('token');

      const applyRes = await fetch(`${apiBase}/api/v1/public/jobs/${encodeURIComponent(job.id)}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(applyPayload),
      });

      const applyJson = await applyRes.json();
      if (!applyRes.ok) {
        throw new Error(applyJson?.message || 'No se pudo registrar la postulación');
      }

      setAppliedSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Error al enviar postulación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8">
      {/* Navegación de retorno */}
      <div className="mb-6">
        <Link
          href="/empleos"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-white text-xs font-mono tracking-wider uppercase transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Volver a la Bolsa de Empleos
        </Link>
      </div>

      {/* Cabecera Principal de la Vacante */}
      <div className="border border-terminal-gray bg-surface-container-low p-6 md:p-8 mb-8 relative">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-mono text-xs text-system-red font-bold uppercase tracking-wider">
                {job.category || 'EMPLEO'}
              </span>
              <span className="text-neutral-600">•</span>
              <span className={`px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase rounded border ${badgeInfo.color}`}>
                {badgeInfo.label}
              </span>
              <span className="text-neutral-600">•</span>
              <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase rounded border border-neutral-700 bg-neutral-900 text-neutral-300">
                {EMPLOYMENT_LABELS[job.employmentType] || 'Tiempo Completo'}
              </span>
            </div>

            <h1 className="font-headline-md text-2xl md:text-4xl font-black text-white tracking-tight uppercase leading-tight mb-3">
              {job.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-on-surface-variant text-sm">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-system-red text-[18px]">domain</span>
                <span className="text-white font-bold">{job.companyName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>Publicado {new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 min-w-[200px]">
            <div className="text-left md:text-right">
              <span className="block text-[10px] font-mono uppercase text-on-surface-variant/70">
                Compensación Salarial
              </span>
              <span className="text-lg font-bold text-white font-mono">{formatSalary()}</span>
            </div>

            <button
              onClick={() => setShowApplyModal(true)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-system-red hover:bg-red-700 text-white font-label-caps text-xs font-bold tracking-wider uppercase transition-all shadow-lg hover:shadow-red-900/30"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Postularme a esta Vacante
            </button>
          </div>
        </div>
      </div>

      {/* Contenido: Descripción, Requisitos y Beneficios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Descripción */}
          <div className="border border-terminal-gray bg-surface-container-low p-6 md:p-8">
            <h2 className="text-base font-bold font-label-caps text-white uppercase tracking-wider mb-4 border-b border-terminal-gray pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-system-red text-[20px]">description</span>
              Descripción del Cargo
            </h2>
            <div className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line font-light">
              {job.description}
            </div>
          </div>

          {/* Requisitos */}
          {job.requirements && (
            <div className="border border-terminal-gray bg-surface-container-low p-6 md:p-8">
              <h2 className="text-base font-bold font-label-caps text-white uppercase tracking-wider mb-4 border-b border-terminal-gray pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red text-[20px]">checklist</span>
                Requisitos y Competencias
              </h2>
              <div className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line font-light">
                {job.requirements}
              </div>
            </div>
          )}

          {/* Beneficios */}
          {job.benefits && (
            <div className="border border-terminal-gray bg-surface-container-low p-6 md:p-8">
              <h2 className="text-base font-bold font-label-caps text-white uppercase tracking-wider mb-4 border-b border-terminal-gray pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red text-[20px]">card_giftcard</span>
                Beneficios Ofrecidos
              </h2>
              <div className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line font-light">
                {job.benefits}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Informativo */}
        <div className="space-y-6">
          <div className="border border-terminal-gray bg-surface-container-low p-6">
            <h3 className="font-label-caps text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-terminal-gray pb-2">
              Resumen de la Oferta
            </h3>
            <ul className="space-y-3 text-xs font-mono">
              <li className="flex justify-between py-1 border-b border-terminal-gray/40">
                <span className="text-on-surface-variant">Empresa:</span>
                <span className="text-white font-bold">{job.companyName}</span>
              </li>
              <li className="flex justify-between py-1 border-b border-terminal-gray/40">
                <span className="text-on-surface-variant">Ubicación:</span>
                <span className="text-white">{job.location}</span>
              </li>
              <li className="flex justify-between py-1 border-b border-terminal-gray/40">
                <span className="text-on-surface-variant">Modalidad:</span>
                <span className="text-white">{badgeInfo.label}</span>
              </li>
              <li className="flex justify-between py-1 border-b border-terminal-gray/40">
                <span className="text-on-surface-variant">Jornada:</span>
                <span className="text-white">{EMPLOYMENT_LABELS[job.employmentType] || 'Completo'}</span>
              </li>
              {job.applicantCount !== undefined && (
                <li className="flex justify-between py-1">
                  <span className="text-on-surface-variant">Postulaciones:</span>
                  <span className="text-system-red font-bold">{job.applicantCount} candidatos</span>
                </li>
              )}
            </ul>

            {job.companyWebsite && (
              <a
                href={job.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center gap-2 w-full py-2.5 bg-black border border-terminal-gray hover:border-neutral-500 text-white text-xs font-label-caps uppercase transition-colors"
              >
                Sitio Web Oficial
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            )}
          </div>

          <div className="border border-terminal-gray bg-surface-container-low p-6">
            <h3 className="font-label-caps text-xs font-bold text-white uppercase tracking-wider mb-2">
              Garantía HES Empleo
            </h3>
            <p className="text-on-surface-variant text-xs font-light leading-relaxed">
              Todas las vacantes publicadas son verificadas para evitar ofertas engañosas. Tu currículum solo será compartido con el equipo de selección de la empresa correspondiente.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Postulación con Currículum */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="border border-terminal-gray bg-surface-container-low max-w-lg w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowApplyModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white p-2"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>

            <div className="mb-6">
              <span className="font-label-caps text-xs text-system-red font-mono">POSTULACIÓN RÁPIDA</span>
              <h2 className="text-xl font-bold text-white uppercase mt-1">Enviar Curriculum</h2>
              <p className="text-on-surface-variant text-xs mt-1">
                Postulando para: <span className="text-white font-bold">{job.title}</span> en {job.companyName}
              </p>
            </div>

            {appliedSuccess ? (
              <div className="p-8 text-center bg-emerald-500/10 border border-emerald-500/40 rounded">
                <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2 block">
                  check_circle
                </span>
                <h3 className="text-lg font-bold text-emerald-400">¡Postulación Enviada con Éxito!</h3>
                <p className="text-on-surface-variant text-xs mt-2">
                  La empresa ha recibido tus datos y tu currículum vitae. Se comunicarán contigo a través de tu correo o teléfono.
                </p>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="mt-6 px-6 py-2.5 bg-surface-container-high hover:bg-surface-container text-white text-xs font-label-caps uppercase border border-terminal-gray"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 text-xs rounded">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre y apellido"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Número de Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 809-000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Currículum Vitae (PDF o Word) *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-xs file:mr-3 file:py-1 file:px-3 file:border-0 file:text-xs file:font-mono file:bg-surface-container-high file:text-white hover:file:bg-system-red cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Mensaje o Carta de Presentación (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Cuéntanos brevemente sobre tu experiencia relevante..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-terminal-gray">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-5 py-2.5 bg-black border border-terminal-gray text-white text-xs font-label-caps uppercase hover:bg-neutral-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-system-red hover:bg-red-700 text-white text-xs font-label-caps uppercase font-bold transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Subiendo y Enviando...' : 'Confirmar Postulación'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
