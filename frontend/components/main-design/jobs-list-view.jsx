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
  CONTRACT: 'Contrato',
  TEMPORARY: 'Temporal',
  INTERNSHIP: 'Pasantía',
};

export default function JobsListView({ initialJobs = [], totalJobs = 0 }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [total, setTotal] = useState(totalJobs);
  const [search, setSearch] = useState('');
  const [selectedWorkplace, setSelectedWorkplace] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal para publicar empleo desde la web
  const [showPostModal, setShowPostModal] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    companyName: '',
    companyWebsite: '',
    location: '',
    workplaceType: 'ONSITE',
    employmentType: 'FULL_TIME',
    category: 'Tecnología',
    salaryMin: '',
    salaryMax: '',
    isSalaryNegotiable: false,
    description: '',
    requirements: '',
    benefits: '',
  });

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const apiBase = getClientApiBaseUrl();
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (selectedWorkplace) params.set('workplaceType', selectedWorkplace);

      const res = await fetch(`${apiBase}/api/v1/public/jobs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setJobs(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (type) => {
    const newFilter = selectedWorkplace === type ? '' : type;
    setSelectedWorkplace(newFilter);
    setLoading(true);

    try {
      const apiBase = getClientApiBaseUrl();
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (newFilter) params.set('workplaceType', newFilter);

      const res = await fetch(`${apiBase}/api/v1/public/jobs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setJobs(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setPostSubmitting(true);
    setPostError('');

    try {
      const apiBase = getClientApiBaseUrl();
      // Verificamos token si el usuario está autenticado en la web
      const token = localStorage.getItem('hes_access_token') || localStorage.getItem('token');

      const payload = {
        title: formData.title.trim(),
        companyName: formData.companyName.trim(),
        companyWebsite: formData.companyWebsite.trim() || null,
        location: formData.location.trim(),
        workplaceType: formData.workplaceType,
        employmentType: formData.employmentType,
        category: formData.category.trim() || null,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin, 10) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax, 10) : null,
        salaryCurrency: 'DOP',
        salaryPeriod: 'MONTHLY',
        isSalaryNegotiable: Boolean(formData.isSalaryNegotiable),
        description: formData.description.trim(),
        requirements: formData.requirements.trim() || null,
        benefits: formData.benefits.trim() || null,
      };

      const res = await fetch(`${apiBase}/api/v1/company/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Error al publicar la vacante. Asegúrate de tener sesión iniciada como empresa.');
      }

      setPostSuccess(true);
      setTimeout(() => {
        setShowPostModal(false);
        setPostSuccess(false);
        handleSearch();
      }, 1500);
    } catch (err) {
      setPostError(err.message || 'Error de conexión');
    } finally {
      setPostSubmitting(false);
    }
  };

  const formatSalary = (job) => {
    if (job.salaryMin && job.salaryMax) {
      return `RD$ ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      return `Desde RD$ ${job.salaryMin.toLocaleString()}`;
    }
    if (job.isSalaryNegotiable) {
      return 'A convenir';
    }
    return 'Salario confidencial';
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* Top Header Banner */}
      <div className="border border-terminal-gray bg-surface-container-low p-6 md:p-10 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-system-red/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-2.5 h-2.5 bg-system-red rounded-full animate-pulse" />
              <span className="font-label-caps text-xs tracking-widest text-system-red font-mono">
                PLATAFORMA DE EMPLEOS DIGITALES HES
              </span>
            </div>
            <h1 className="font-headline-md text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
              Bolsa de Empleos
            </h1>
            <p className="text-on-surface-variant text-sm md:text-base mt-2 max-w-2xl font-light">
              Conectamos empresas líderes con los mejores talentos en periodismo, tecnología, legal y medios digitales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPostModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-system-red hover:bg-red-700 text-white font-label-caps text-xs font-bold tracking-wider uppercase transition-all shadow-lg hover:shadow-red-900/30"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Publicar Vacante
            </button>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="mt-8 pt-6 border-t border-terminal-gray/60">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por cargo, empresa, tecnologías o palabra clave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-black/60 border border-terminal-gray text-white text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-system-red transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-surface-container-high hover:bg-surface-container text-white text-xs font-label-caps font-bold tracking-wider uppercase border border-terminal-gray transition-colors"
            >
              Buscar
            </button>
          </form>

          {/* Filtros de Modalidad */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="font-label-caps text-[11px] text-on-surface-variant/70 mr-2 uppercase">Modalidad:</span>
            {['', 'REMOTE', 'HYBRID', 'ONSITE'].map((type) => {
              const active = selectedWorkplace === type;
              const label = type === '' ? 'Todos' : type === 'REMOTE' ? 'Remoto' : type === 'HYBRID' ? 'Híbrido' : 'Presencial';
              return (
                <button
                  key={type}
                  onClick={() => handleFilterChange(type)}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${
                    active
                      ? 'bg-system-red border-system-red text-white font-bold'
                      : 'bg-black/40 border-terminal-gray text-on-surface-variant hover:border-neutral-500'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contador de vacantes */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-on-surface-variant font-bold uppercase tracking-wider">
          {total} {total === 1 ? 'Vacante Disponible' : 'Vacantes Disponibles'}
        </span>
      </div>

      {/* Listado de Vacantes */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-2 border-system-red border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-mono text-sm text-on-surface-variant">Cargando vacantes activas...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="border border-terminal-gray bg-surface-container-low p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">
            work_off
          </span>
          <h3 className="text-lg font-bold text-white mb-2">No se encontraron vacantes</h3>
          <p className="text-on-surface-variant text-sm max-w-md mx-auto mb-6">
            No hay ofertas laborales activas que coincidan con tus criterios de búsqueda. Prueba ajustando los filtros.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedWorkplace('');
              handleSearch();
            }}
            className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container text-white text-xs font-label-caps uppercase border border-terminal-gray transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const badgeInfo = WORKPLACE_LABELS[job.workplaceType] || WORKPLACE_LABELS.ONSITE;
            return (
              <div
                key={job.id}
                className="border border-terminal-gray bg-surface-container-low hover:border-system-red/60 transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-mono text-[11px] text-system-red font-bold uppercase tracking-wider">
                      {job.category || 'EMPLEO'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${badgeInfo.color}`}>
                        {badgeInfo.label}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded border border-neutral-700 bg-neutral-900 text-neutral-300">
                        {EMPLOYMENT_LABELS[job.employmentType] || 'Tiempo Completo'}
                      </span>
                    </div>
                  </div>

                  <Link href={`/empleos/${job.slug}`}>
                    <h2 className="text-lg font-bold text-white group-hover:text-system-red transition-colors line-clamp-2 leading-tight">
                      {job.title}
                    </h2>
                  </Link>

                  <div className="flex items-center gap-2 mt-2 text-on-surface-variant text-xs font-medium">
                    <span className="material-symbols-outlined text-[16px] text-system-red">domain</span>
                    <span className="text-white font-semibold">{job.companyName}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>{job.location}</span>
                  </div>

                  <p className="text-on-surface-variant text-xs mt-3 line-clamp-3 leading-relaxed font-light">
                    {job.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-terminal-gray/60 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-on-surface-variant/70">Compensación</span>
                    <span className="text-xs font-bold text-white font-mono">{formatSalary(job)}</span>
                  </div>

                  <Link
                    href={`/empleos/${job.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-high hover:bg-system-red text-white text-xs font-label-caps font-bold uppercase transition-colors"
                  >
                    Ver Vacante
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Publicar Empleo */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="border border-terminal-gray bg-surface-container-low max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPostModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white p-2"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>

            <div className="mb-6">
              <span className="font-label-caps text-xs text-system-red font-mono">PORTAL EMPRESARIAL</span>
              <h2 className="text-2xl font-bold text-white uppercase mt-1">Publicar Vacante Laboral</h2>
              <p className="text-on-surface-variant text-xs mt-1">
                Completa los datos de la vacante para recibir candidatos calificados y sus currículums.
              </p>
            </div>

            {postSuccess ? (
              <div className="p-8 text-center bg-emerald-500/10 border border-emerald-500/40 rounded">
                <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2 block">
                  check_circle
                </span>
                <h3 className="text-lg font-bold text-emerald-400">¡Vacante Publicada Exitosamente!</h3>
                <p className="text-on-surface-variant text-xs mt-1">Tu oferta ya se encuentra activa en el portal.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateJob} className="space-y-4">
                {postError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 text-xs rounded">
                    {postError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Título de la Vacante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Redactor Digital Senior o Desarrollador Frontend"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                      Nombre de la Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 11Ci Digital"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                      Sitio Web de la Empresa
                    </label>
                    <input
                      type="url"
                      placeholder="https://empresa.com"
                      value={formData.companyWebsite}
                      onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                      Ubicación *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Santo Domingo, DN"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                      Modalidad
                    </label>
                    <select
                      value={formData.workplaceType}
                      onChange={(e) => setFormData({ ...formData, workplaceType: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                    >
                      <option value="ONSITE">Presencial</option>
                      <option value="HYBRID">Híbrido</option>
                      <option value="REMOTE">Remoto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                      Jornada
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                    >
                      <option value="FULL_TIME">Tiempo Completo</option>
                      <option value="PART_TIME">Medio Tiempo</option>
                      <option value="CONTRACT">Por Contrato</option>
                      <option value="INTERNSHIP">Pasantía</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                      Salario Mínimo (DOP)
                    </label>
                    <input
                      type="number"
                      placeholder="RD$ Mínimo"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                      Salario Máximo (DOP)
                    </label>
                    <input
                      type="number"
                      placeholder="RD$ Máximo"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Descripción del Puesto *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Misión del cargo, responsabilidades diarias..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Requisitos y Habilidades
                  </label>
                  <textarea
                    rows={3}
                    placeholder="- Experiencia requerida&#10;- Tecnologías o competencias clave"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1">
                    Beneficios Ofrecidos
                  </label>
                  <textarea
                    rows={2}
                    placeholder="- Seguro médico complementario&#10;- Días de trabajo remoto"
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-terminal-gray text-white text-sm focus:border-system-red focus:outline-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-terminal-gray">
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    className="px-5 py-2.5 bg-black border border-terminal-gray text-white text-xs font-label-caps uppercase hover:bg-neutral-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={postSubmitting}
                    className="px-6 py-2.5 bg-system-red hover:bg-red-700 text-white text-xs font-label-caps uppercase font-bold transition-all disabled:opacity-50"
                  >
                    {postSubmitting ? 'Publicando...' : 'Publicar Vacante'}
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
