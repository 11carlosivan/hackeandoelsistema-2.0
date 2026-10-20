'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  createCmsSponsoredPost,
  updateCmsSponsoredPost,
  toggleCmsSponsoredPost,
  deleteCmsSponsoredPost,
} from '@/lib/main-design/api';

export default function CmsSponsoredPostsPanel({ initialAds = [], accessToken }) {
  const [ads, setAds] = useState(initialAds);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    sponsorName: '',
    sponsorHandle: '',
    sponsorLogo: '',
    title: '',
    content: '',
    mediaUrl: '',
    ctaText: 'Conoce más',
    ctaUrl: '',
    placement: 'feed',
    isActive: true,
  });

  const handleOpenCreate = () => {
    setEditingAd(null);
    setFormData({
      sponsorName: '',
      sponsorHandle: '',
      sponsorLogo: '',
      title: '',
      content: '',
      mediaUrl: '',
      ctaText: 'Conoce más',
      ctaUrl: '',
      placement: 'feed',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      sponsorName: ad.sponsorName || '',
      sponsorHandle: ad.sponsorHandle || '',
      sponsorLogo: ad.sponsorLogo || '',
      title: ad.title || '',
      content: ad.content || '',
      mediaUrl: ad.mediaUrl || '',
      ctaText: ad.ctaText || 'Conoce más',
      ctaUrl: ad.ctaUrl || '',
      placement: ad.placement || 'feed',
      isActive: ad.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      if (editingAd) {
        const res = await updateCmsSponsoredPost(accessToken, editingAd.id, formData);
        if (res?.data?.ad) {
          setAds((prev) => prev.map((a) => (a.id === editingAd.id ? res.data.ad : a)));
          setFeedback({ type: 'success', message: 'Anuncio actualizado correctamente.' });
          setModalOpen(false);
        }
      } else {
        const res = await createCmsSponsoredPost(accessToken, formData);
        if (res?.data?.ad) {
          setAds((prev) => [res.data.ad, ...prev]);
          setFeedback({ type: 'success', message: 'Campaña publicitaria creada con éxito.' });
          setModalOpen(false);
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al guardar el anuncio' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleCmsSponsoredPost(accessToken, id);
      if (res?.data?.ad) {
        setAds((prev) => prev.map((a) => (a.id === id ? res.data.ad : a)));
      }
    } catch (err) {
      alert('Error al cambiar estado: ' + err.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`¿Estás seguro de eliminar el anuncio "${title}"?`)) return;
    try {
      await deleteCmsSponsoredPost(accessToken, id);
      setAds((prev) => prev.filter((a) => a.id !== id));
      setFeedback({ type: 'success', message: 'Anuncio eliminado correctamente.' });
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

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
            <span className="text-system-red text-xs font-mono uppercase font-bold">Publicidad</span>
          </div>
          <h1 className="text-2xl font-black text-white font-mono uppercase tracking-wider flex items-center gap-3">
            <span className="material-symbols-outlined text-system-red text-3xl">campaign</span>
            Gestión de Publicidad (App & Web)
          </h1>
          <p className="text-terminal-gray text-xs mt-1">
            Administra las campañas patrocinadas y banners nativos que se muestran en la app móvil y en la web.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/cms"
            className="border border-terminal-gray px-4 py-2.5 text-xs font-mono font-bold text-white hover:border-white transition-colors"
          >
            ← Volver al CMS
          </Link>
          <button
            onClick={handleOpenCreate}
            className="bg-system-red hover:bg-white text-black px-4 py-2.5 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Crear Publicidad
          </button>
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

      {/* Ads Table */}
      <div className="border border-terminal-gray/40 bg-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-terminal-dark border-b border-terminal-gray/40 text-terminal-gray uppercase">
              <tr>
                <th className="p-4">Anunciante</th>
                <th className="p-4">Campaña / Título</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4">Enlace Destino (CTA)</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-gray/20">
              {ads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-terminal-gray">
                    No hay campañas publicitarias registradas aún. Haz clic en "Crear Publicidad" para agregar la primera.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {ad.sponsorLogo ? (
                          <img
                            src={ad.sponsorLogo}
                            alt=""
                            className="w-9 h-9 rounded object-cover border border-terminal-gray/40 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-terminal-dark border border-terminal-gray/40 flex items-center justify-center text-system-red shrink-0 font-bold">
                            {ad.sponsorName?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white">{ad.sponsorName}</div>
                          {ad.sponsorHandle && (
                            <div className="text-terminal-gray text-[10px]">{ad.sponsorHandle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-white line-clamp-1">{ad.title}</div>
                      <div className="text-terminal-gray text-[10px] line-clamp-1 mt-0.5">{ad.content}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-terminal-dark border border-terminal-gray/40 text-[10px] uppercase text-terminal-gray">
                        {ad.placement || 'Feed'}
                      </span>
                    </td>
                    <td className="p-4 max-w-[180px]">
                      <a
                        href={ad.ctaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-system-red hover:underline truncate block text-[11px]"
                      >
                        {ad.ctaText || 'Ver enlace'} ↗
                      </a>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggle(ad.id)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-colors rounded ${
                          ad.isActive
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
                            : 'bg-terminal-gray/20 text-terminal-gray border border-terminal-gray/40 hover:bg-terminal-gray/30'
                        }`}
                      >
                        {ad.isActive ? 'Activo' : 'Pausado'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(ad)}
                          className="px-2.5 py-1 bg-terminal-dark hover:bg-white hover:text-black border border-terminal-gray text-white transition-colors text-[10px] font-bold uppercase"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id, ad.title)}
                          className="px-2.5 py-1 bg-system-red/10 hover:bg-system-red hover:text-black border border-system-red/40 text-system-red transition-colors text-[10px] font-bold uppercase"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-terminal-dark border border-terminal-gray max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-terminal-gray/40 pb-3">
              <h2 className="text-lg font-bold text-white font-mono uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red">
                  {editingAd ? 'edit_note' : 'add_box'}
                </span>
                {editingAd ? 'Editar Campaña Publicitaria' : 'Nueva Campaña Publicitaria'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-terminal-gray hover:text-white font-mono text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Nombre del Anunciante *</label>
                  <input
                    type="text"
                    required
                    value={formData.sponsorName}
                    onChange={(e) => setFormData({ ...formData, sponsorName: e.target.value })}
                    placeholder="Ej: Claro Dominicana"
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Usuario / Redes (Opcional)</label>
                  <input
                    type="text"
                    value={formData.sponsorHandle}
                    onChange={(e) => setFormData({ ...formData, sponsorHandle: e.target.value })}
                    placeholder="@clarord"
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-terminal-gray mb-1 uppercase font-bold">URL del Logo del Anunciante</label>
                <input
                  type="url"
                  value={formData.sponsorLogo}
                  onChange={(e) => setFormData({ ...formData, sponsorLogo: e.target.value })}
                  placeholder="https://.../logo.png"
                  className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                />
              </div>

              <div>
                <label className="block text-terminal-gray mb-1 uppercase font-bold">Título del Anuncio *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Conéctate a la mayor red 5G del país"
                  className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                />
              </div>

              <div>
                <label className="block text-terminal-gray mb-1 uppercase font-bold">Texto / Descripción del Anuncio *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Planes especiales de internet y fibra óptica para negocios..."
                  className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                />
              </div>

              <div>
                <label className="block text-terminal-gray mb-1 uppercase font-bold">URL de la Imagen / Banner (Opcional)</label>
                <input
                  type="url"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  placeholder="https://.../banner.jpg"
                  className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">Texto del Botón CTA *</label>
                  <input
                    type="text"
                    required
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Conoce más"
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-terminal-gray mb-1 uppercase font-bold">URL de Destino (Link de la web) *</label>
                  <input
                    type="url"
                    required
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    placeholder="https://www.anunciante.com"
                    className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="accent-system-red w-4 h-4"
                />
                <label htmlFor="isActiveCheck" className="text-white font-bold cursor-pointer select-none">
                  Activar de inmediato esta campaña
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-terminal-gray/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-terminal-gray text-terminal-gray hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-system-red hover:bg-white text-black px-6 py-2 font-bold uppercase transition-colors"
                >
                  {loading ? 'Guardando...' : editingAd ? 'Guardar Cambios' : 'Publicar Anuncio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
