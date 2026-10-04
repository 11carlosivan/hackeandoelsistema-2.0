'use client';

import { useState, useEffect, useRef } from 'react';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';

export default function EditorialForm({ config = {}, postId = null }) {
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | full | error
  const [errorMessage, setErrorMessage] = useState('');
  const [formStats, setFormStats] = useState({
    active: true,
    count: 0,
    isFull: false,
    remainingSlots: config.maxResponses || null,
  });
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const renderedAtRef = useRef(Date.now());
  const recaptchaContainerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  const formId = config.formId || 'default-form';
  const title = config.title || 'Formulario de Convocatoria';
  const description = config.description || '';
  const fields = (config.fields || []).filter((f) => f.enabled);
  const maxResponses = config.maxResponses || null;
  const submitButtonText = config.submitButtonText || 'Enviar Postulación';
  const successMessage = config.successMessage || '¡Tu postulación ha sido enviada con éxito!';

  // Load and render Google reCAPTCHA if configured
  useEffect(() => {
    if (!siteKey || typeof window === 'undefined') return;

    const scriptId = 'hes-recaptcha-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const checkAndRender = () => {
      if (window.grecaptcha && typeof window.grecaptcha.render === 'function' && recaptchaContainerRef.current) {
        if (widgetIdRef.current === null && !recaptchaContainerRef.current.hasChildNodes()) {
          try {
            widgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
              sitekey: siteKey,
              theme: 'dark',
              callback: (token) => {
                setRecaptchaToken(token);
                setErrorMessage('');
              },
              'expired-callback': () => {
                setRecaptchaToken('');
              },
              'error-callback': () => {
                setErrorMessage('Error al cargar la verificación anti-spam. Revisa tu conexión.');
              },
            });
          } catch {
            // Already rendered or invisible
          }
        }
      }
    };

    const interval = setInterval(checkAndRender, 350);
    checkAndRender();

    return () => {
      clearInterval(interval);
    };
  }, [siteKey]);

  // Check form status & capacity on mount
  useEffect(() => {
    renderedAtRef.current = Date.now();
    let isMounted = true;

    async function checkStatus() {
      try {
        const apiBaseUrl = getClientApiBaseUrl();
        const res = await fetch(`${apiBaseUrl}/api/v1/public/forms/${encodeURIComponent(formId)}/status`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setFormStats(json.data);
            if (json.data.isFull || !json.data.active) {
              setStatus('full');
            }
          }
        }
      } catch {
        // Fallback silently to client config
      }
    }

    if (formId) {
      checkStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [formId]);

  const handleChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validations
    for (const f of fields) {
      if (f.required) {
        const val = formData[f.id];
        if (f.type === 'checkbox' && !val) {
          setErrorMessage(`Debes marcar la casilla: ${f.label}`);
          return;
        }
        if (f.type !== 'checkbox' && (!val || String(val).trim() === '')) {
          setErrorMessage(`El campo "${f.label}" es obligatorio.`);
          return;
        }
      }
    }

    // Anti-bot check: verify reCAPTCHA if configured
    let token = recaptchaToken;
    if (siteKey && !token && typeof window !== 'undefined' && window.grecaptcha) {
      try {
        if (widgetIdRef.current !== null && typeof window.grecaptcha.getResponse === 'function') {
          token = window.grecaptcha.getResponse(widgetIdRef.current);
        } else if (typeof window.grecaptcha.getResponse === 'function') {
          token = window.grecaptcha.getResponse();
        }
      } catch {}
    }

    if (process.env.NODE_ENV !== 'test' && siteKey && !token) {
      setErrorMessage('Por favor confirma la casilla de seguridad "No soy un robot" antes de enviar.');
      return;
    }

    setStatus('submitting');

    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const payload = {
        formId,
        postId: postId || null,
        formTitle: title,
        formDescription: description,
        maxResponses: maxResponses ? Number(maxResponses) : null,
        data: formData,
        recaptchaToken: token || null,
        hes_hp_verify: honeypot,
        renderedAt: renderedAtRef.current,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/public/forms/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.ok) {
        setStatus('success');
        if (json?.remainingSlots !== undefined && json.remainingSlots !== null) {
          setFormStats((prev) => ({
            ...prev,
            count: prev.count + 1,
            remainingSlots: json.remainingSlots,
            isFull: json.remainingSlots <= 0,
          }));
        }
      } else {
        if (typeof window !== 'undefined' && window.grecaptcha && widgetIdRef.current !== null) {
          try {
            window.grecaptcha.reset(widgetIdRef.current);
            setRecaptchaToken('');
          } catch {}
        }
        if (res.status === 409 || json?.error === 'LIMIT_REACHED') {
          setStatus('full');
        } else {
          setStatus('error');
          setErrorMessage(json?.message || json?.error || 'Ocurrió un error al enviar el formulario. Intenta de nuevo.');
        }
      }
    } catch (err) {
      console.error('Error enviando formulario:', err);
      if (typeof window !== 'undefined' && window.grecaptcha && widgetIdRef.current !== null) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
          setRecaptchaToken('');
        } catch {}
      }
      setStatus('error');
      setErrorMessage('No se pudo conectar con el servidor. Revisa tu conexión a internet.');
    }
  };

  if (status === 'success') {
    return (
      <div className="my-8 border-2 border-system-red bg-black/90 p-6 md:p-8 text-center space-y-4 shadow-[0_0_30px_rgba(255,0,51,0.2)]">
        <div className="w-14 h-14 mx-auto rounded-full border-2 border-system-red flex items-center justify-center bg-system-red/10 text-system-red">
          <span className="material-symbols-outlined text-3xl">check_circle</span>
        </div>
        <div className="space-y-2">
          <span className="font-mono text-[10px] text-system-red uppercase tracking-widest font-bold">
            [ REGISTRO CONFIRMADO ]
          </span>
          <h3 className="font-headline-md text-xl md:text-2xl text-white uppercase">
            ¡Postulación Recibida con Éxito!
          </h3>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto leading-relaxed">
            {successMessage}
          </p>
        </div>
        <div className="border-t border-terminal-gray/40 pt-4 text-xs font-mono text-on-surface-variant">
          Estaremos creando el grupo y enviando las instrucciones para la prueba de la app.
        </div>
      </div>
    );
  }

  if (status === 'full' || formStats.isFull) {
    return (
      <div className="my-8 border border-terminal-gray bg-black/80 p-6 md:p-8 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full border border-terminal-gray flex items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-2xl">lock</span>
        </div>
        <span className="font-mono text-[10px] text-system-red uppercase tracking-widest font-bold">
          [ CONVOCATORIA CERRADA ]
        </span>
        <h3 className="font-headline-md text-lg md:text-xl text-white uppercase">
          Límite de Cupos Alcanzado
        </h3>
        <p className="text-on-surface-variant text-xs max-w-md mx-auto leading-relaxed">
          Hemos completado los {maxResponses || 15} voluntarios necesarios para esta fase de pruebas. Agradecemos enormemente el apoyo y la respuesta de toda la comunidad.
        </p>
      </div>
    );
  }

  return (
    <div className="my-8 border border-terminal-gray/80 bg-black/80 p-6 md:p-8 relative overflow-hidden shadow-2xl">
      {/* Red accent line top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-system-red via-system-red/50 to-transparent" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-terminal-gray/40 pb-4 mb-6">
        <div>
          <span className="font-mono text-[9px] text-system-red bg-system-red/10 border border-system-red/30 px-2.5 py-0.5 uppercase tracking-wider font-bold inline-block mb-2">
            [ CONVOCATORIA OFICIAL ]
          </span>
          <h3 className="font-headline-md text-xl md:text-2xl text-white uppercase tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-on-surface-variant text-xs mt-1.5 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {maxResponses && (
          <div className="border border-terminal-gray/60 bg-surface-container-low/30 px-3 py-1.5 font-mono text-[10px] text-right">
            <span className="text-on-surface-variant block text-[8px] uppercase">CUPOS DISPONIBLES</span>
            <span className="text-system-red font-bold text-sm">
              {formStats.remainingSlots !== null ? formStats.remainingSlots : maxResponses} / {maxResponses}
            </span>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="border border-system-red bg-system-red/10 text-white p-3 mb-5 text-xs font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-system-red text-base">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-bot Honeypot field (hidden from view) */}
        <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none' }} aria-hidden="true">
          <label htmlFor="hes_hp_verify">Por favor deja este campo en blanco</label>
          <input
            type="text"
            id="hes_hp_verify"
            name="hes_hp_verify"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => {
            if (field.type === 'checkbox') return null;

            const isFullWidth = field.type === 'textarea' || field.id === 'name';
            const inputLabel = field.id === 'custom_question' ? (field.customLabel || field.label) : field.label;

            return (
              <div key={field.id} className={isFullWidth ? 'md:col-span-2' : ''}>
                <label className="block font-label-caps text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1.5">
                  {inputLabel} {field.required && <span className="text-system-red font-bold">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    rows={3}
                    placeholder={`Ingresa ${inputLabel.toLowerCase()}...`}
                    required={field.required}
                    className="w-full bg-surface-container-low/40 border border-terminal-gray/60 focus:border-system-red text-white text-xs px-3.5 py-2.5 outline-none font-mono transition-colors resize-none"
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={
                      field.id === 'phone'
                        ? 'Ej: +1 829 000 0000'
                        : field.id === 'email'
                        ? 'tu-correo@ejemplo.com'
                        : field.id === 'device'
                        ? 'Ej: Samsung S23, Xiaomi 13 (Android 14)'
                        : `Ingresa ${inputLabel.toLowerCase()}...`
                    }
                    required={field.required}
                    className="w-full bg-surface-container-low/40 border border-terminal-gray/60 focus:border-system-red text-white text-xs px-3.5 py-2.5 outline-none font-mono transition-colors"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Checkbox fields (terms / consent) */}
        {fields
          .filter((f) => f.type === 'checkbox')
          .map((field) => (
            <div key={field.id} className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData[field.id])}
                  onChange={(e) => handleChange(field.id, e.target.checked)}
                  required={field.required}
                  className="accent-system-red mt-0.5 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs text-on-surface-variant font-mono">
                  {field.label} {field.required && <span className="text-system-red font-bold">*</span>}
                </span>
              </label>
            </div>
          ))}

        {/* Google reCAPTCHA v2 Security Widget */}
        {siteKey && (
          <div className="pt-2 pb-1">
            <div
              ref={recaptchaContainerRef}
              data-testid="recaptcha-container"
              className="recaptcha-box min-h-[78px] flex items-center justify-start overflow-hidden rounded"
            />
          </div>
        )}

        {/* Submit Button & Security Note */}
        <div className="pt-4 border-t border-terminal-gray/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[9px] font-mono text-on-surface-variant/80">
            <span className="material-symbols-outlined text-[13px] text-system-red">verified_user</span>
            <span>Protección anti-spam y cifrado seguro de datos.</span>
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="bg-system-red text-black font-label-caps text-xs font-bold px-6 py-3 uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_15px_rgba(255,0,51,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? (
              <>
                <span className="animate-spin inline-block h-3 w-3 border-2 border-black border-t-transparent rounded-full" />
                <span>[ ENVIANDO... ]</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">send</span>
                <span>{submitButtonText}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
