'use client';

import { useState, useEffect } from 'react';

const DEFAULT_AVAILABLE_FIELDS = [
  { id: 'name', label: 'Nombre completo', type: 'text', enabled: true, required: true },
  { id: 'email', label: 'Correo electrónico', type: 'email', enabled: true, required: true },
  { id: 'phone', label: 'Teléfono / WhatsApp', type: 'tel', enabled: true, required: true },
  { id: 'device', label: 'Dispositivo / Versión de Android', type: 'text', enabled: true, required: true },
  { id: 'city', label: 'Ciudad / Ubicación', type: 'text', enabled: false, required: false },
  { id: 'message', label: 'Comentarios o mensaje', type: 'textarea', enabled: false, required: false },
  { id: 'custom_question', label: 'Pregunta personalizada', customLabel: '¿Por qué te gustaría ser voluntario?', type: 'text', enabled: false, required: false },
  { id: 'terms', label: 'Acepto participar como voluntario y probar la aplicación', type: 'checkbox', enabled: true, required: true },
];

export default function CmsFormModal({ isOpen, onClose, initialData = null, onSave }) {
  const [title, setTitle] = useState('Convocatoria de Voluntarios');
  const [description, setDescription] = useState('');
  const [maxResponses, setMaxResponses] = useState('');
  const [submitButtonText, setSubmitButtonText] = useState('Enviar Postulación');
  const [successMessage, setSuccessMessage] = useState('¡Gracias por postularte! Nos pondremos en contacto contigo.');
  const [fields, setFields] = useState(DEFAULT_AVAILABLE_FIELDS);

  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title || 'Convocatoria de Voluntarios');
      setDescription(initialData.description || '');
      setMaxResponses(
        initialData.maxResponses !== undefined && initialData.maxResponses !== null
          ? String(initialData.maxResponses)
          : ''
      );
      setSubmitButtonText(initialData.submitButtonText || 'Enviar Postulación');
      setSuccessMessage(initialData.successMessage || '¡Gracias por postularte! Nos pondremos en contacto contigo.');
      
      if (Array.isArray(initialData.fields) && initialData.fields.length > 0) {
        // Merge initial fields with defaults
        const merged = DEFAULT_AVAILABLE_FIELDS.map((def) => {
          const found = initialData.fields.find((f) => f.id === def.id);
          return found ? { ...def, ...found } : def;
        });
        setFields(merged);
      } else {
        setFields(DEFAULT_AVAILABLE_FIELDS);
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleToggleField = (fieldId) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleToggleRequired = (fieldId) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, required: !f.required } : f))
    );
  };

  const handleCustomLabelChange = (fieldId, newLabel) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, customLabel: newLabel } : f))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor introduce un título para el formulario.');
      return;
    }
    const enabledFields = fields.filter((f) => f.enabled);
    if (enabledFields.length === 0) {
      alert('Debes activar al menos un campo en el formulario.');
      return;
    }

    const parsedLimit =
      maxResponses !== '' && !isNaN(Number(maxResponses)) && Number(maxResponses) > 0
        ? Number(maxResponses)
        : null;

    onSave({
      formId: initialData?.formId || `form-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      maxResponses: parsedLimit,
      submitButtonText: submitButtonText.trim() || 'Enviar Postulación',
      successMessage: successMessage.trim() || '¡Información enviada con éxito!',
      fields,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-black border border-terminal-gray p-6 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-terminal-gray pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-system-red text-xl">assignment</span>
            <span className="font-label-caps text-xs text-white font-bold tracking-wider">CONFIGURAR BLOQUE DE FORMULARIO</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-system-red transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs font-mono">
          {/* Título y Descripción */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-system-red font-bold uppercase mb-1">
                Título del Formulario *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Convocatoria: 15 Voluntarios Android"
                className="w-full bg-surface-container-low/40 border border-terminal-gray/60 px-3 py-2 text-white focus:border-system-red outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-on-surface-variant uppercase mb-1">
                Instrucciones / Subtítulo
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explicación para los lectores sobre qué llenarán..."
                rows={2}
                className="w-full bg-surface-container-low/40 border border-terminal-gray/60 px-3 py-2 text-white focus:border-system-red outline-none resize-none"
              />
            </div>
          </div>

          {/* Límite de cupos y Botón */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-terminal-gray/30 pt-4">
            <div>
              <label className="block text-[10px] text-on-surface-variant uppercase mb-1">
                Límite de Cupos (Opcional)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={maxResponses}
                onChange={(e) => setMaxResponses(e.target.value)}
                placeholder="Ej: 15 (Dejar vacío para ilimitado)"
                className="w-full bg-surface-container-low/40 border border-terminal-gray/60 px-3 py-2 text-white focus:border-system-red outline-none"
              />
              <span className="text-[9px] text-on-surface-variant/70">
                Al llegar a esta cantidad de registros, el formulario se cierra automáticamente.
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-on-surface-variant uppercase mb-1">
                Texto del Botón de Envío
              </label>
              <input
                type="text"
                value={submitButtonText}
                onChange={(e) => setSubmitButtonText(e.target.value)}
                placeholder="Enviar Postulación"
                className="w-full bg-surface-container-low/40 border border-terminal-gray/60 px-3 py-2 text-white focus:border-system-red outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-on-surface-variant uppercase mb-1">
              Mensaje tras enviar con éxito
            </label>
            <input
              type="text"
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              placeholder="¡Gracias por postularte! Nos pondremos en contacto contigo."
              className="w-full bg-surface-container-low/40 border border-terminal-gray/60 px-3 py-2 text-white focus:border-system-red outline-none"
            />
          </div>

          {/* Selector de Campos */}
          <div className="border-t border-terminal-gray/30 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-system-red font-bold uppercase">
                Campos Activos del Formulario
              </span>
              <span className="text-[9px] text-on-surface-variant">
                Activa los campos que necesitas y marca si son obligatorios
              </span>
            </div>

            <div className="border border-terminal-gray/40 divide-y divide-terminal-gray/20 bg-surface-container-low/20 max-h-56 overflow-y-auto">
              {fields.map((field) => (
                <div key={field.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2.5 flex-grow">
                    <input
                      type="checkbox"
                      id={`chk-${field.id}`}
                      checked={field.enabled}
                      onChange={() => handleToggleField(field.id)}
                      className="accent-system-red h-4 w-4 cursor-pointer"
                    />
                    <label
                      htmlFor={`chk-${field.id}`}
                      className={`cursor-pointer select-none text-[11px] ${field.enabled ? 'text-white font-medium' : 'text-on-surface-variant line-through opacity-50'}`}
                    >
                      {field.label}
                    </label>

                    {field.id === 'custom_question' && field.enabled && (
                      <input
                        type="text"
                        value={field.customLabel || ''}
                        onChange={(e) => handleCustomLabelChange(field.id, e.target.value)}
                        placeholder="Escribe la pregunta personalizada..."
                        className="bg-black/60 border border-terminal-gray/60 px-2 py-0.5 text-[10px] text-white outline-none flex-grow ml-2"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {field.enabled && (
                      <label className="flex items-center gap-1.5 text-[9px] text-on-surface-variant cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={() => handleToggleRequired(field.id)}
                          className="accent-system-red"
                        />
                        Obligatorio
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 border-t border-terminal-gray pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-terminal-gray/60 px-4 py-2 text-on-surface-variant hover:text-white hover:border-white transition-colors uppercase text-[10px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-system-red text-black font-bold px-5 py-2 hover:bg-white transition-colors uppercase text-[10px] shadow-[0_0_10px_rgba(255,0,51,0.2)]"
            >
              Guardar Formulario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
