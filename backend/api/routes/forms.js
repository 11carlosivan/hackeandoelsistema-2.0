import { z } from 'zod';
import { noStoreHeaders } from '../utils/http.js';

const submitFormSchema = z.object({
  formId: z.string().trim().min(1).max(120),
  postId: z.string().trim().max(36).optional().nullable(),
  formTitle: z.string().trim().max(255).optional().nullable(),
  formDescription: z.string().trim().max(1000).optional().nullable(),
  maxResponses: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  data: z.record(z.any()).refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debes completar los campos del formulario',
  }),
  hes_hp_verify: z.string().optional().nullable(),
  renderedAt: z.coerce.number().optional().nullable(),
  recaptchaToken: z.string().optional().nullable(),
});

const formIdParamSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

const submissionParamSchema = z.object({
  formId: z.string().trim().min(1).max(120),
  submissionId: z.string().trim().min(1).max(120),
});

export async function registerFormRoutes(app) {
  // 1. PUBLIC: Submit form response with anti-bot protection
  app.post('/api/v1/public/forms/submit', async (request, reply) => {
    noStoreHeaders(reply);

    const parsed = submitFormSchema.safeParse(request.body);
    if (!parsed.success) {
      throw app.httpErrors.badRequest(parsed.error.errors[0]?.message || 'Datos de formulario inválidos');
    }

    const {
      formId,
      postId,
      formTitle,
      formDescription,
      maxResponses,
      data,
      hes_hp_verify,
      renderedAt,
      recaptchaToken,
    } = parsed.data;

    // Anti-bot check 1: Honeypot field (hidden from humans)
    if (hes_hp_verify && hes_hp_verify.trim().length > 0) {
      request.log.warn({ formId, ip: request.ip }, 'Spam bot blocked by honeypot');
      // Silent success for bots
      return { ok: true, message: '¡Tu postulación ha sido enviada con éxito!' };
    }

    // Anti-bot check 2: Time check (form filled impossibly fast in under 1.2s)
    if (renderedAt && Number.isFinite(renderedAt)) {
      const elapsedMs = Date.now() - renderedAt;
      if (elapsedMs > 0 && elapsedMs < 1200) {
        throw app.httpErrors.badRequest('Envío demasiado rápido. Por favor verifica los campos e intenta de nuevo.');
      }
    }

    // Anti-bot check 3: Google reCAPTCHA verification if secret key is configured
    const recaptchaSecret = app.config?.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      if (!recaptchaToken && process.env.NODE_ENV !== 'test') {
        throw app.httpErrors.badRequest('Por favor completa la verificación de seguridad reCAPTCHA.');
      }

      if (recaptchaToken) {
        try {
          const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: recaptchaSecret,
              response: recaptchaToken,
              remoteip: request.ip,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            throw app.httpErrors.badRequest('Verificación de seguridad reCAPTCHA fallida. Intenta nuevamente.');
          }
        } catch (err) {
          if (err.statusCode) throw err;
          request.log.error({ err }, 'Error validando reCAPTCHA');
          throw app.httpErrors.internalServerError('Error de comunicación con el servicio anti-spam');
        }
      }
    }

    if (typeof app.prisma?.form?.findUnique !== 'function') {
      return { ok: true, message: '¡Tu información ha sido recibida con éxito!' };
    }

    // Find or auto-register Form definition
    let form = await app.prisma.form.findUnique({
      where: { id: formId },
      include: { _count: { select: { submissions: true } } },
    });

    if (!form) {
      // Create Form record
      form = await app.prisma.form.create({
        data: {
          id: formId,
          postId: postId || null,
          title: formTitle || 'Formulario de Convocatoria',
          description: formDescription || null,
          fieldsJson: Object.keys(data).map((k) => ({ id: k, label: k })),
          maxResponses: maxResponses || 15,
          isActive: true,
        },
        include: { _count: { select: { submissions: true } } },
      });
    }

    if (!form.isActive) {
      throw app.httpErrors.badRequest('Esta convocatoria ya no está activa.');
    }

    // Check capacity limit
    const currentSubmissionsCount = form._count?.submissions ?? (await app.prisma.formSubmission.count({ where: { formId } }));
    if (form.maxResponses && currentSubmissionsCount >= form.maxResponses) {
      throw app.httpErrors.conflict('Se ha completado el límite máximo de voluntarios para esta convocatoria. ¡Gracias!');
    }

    // Record submission
    const submission = await app.prisma.formSubmission.create({
      data: {
        formId: form.id,
        postId: form.postId || postId || null,
        dataJson: data,
        ipAddress: request.ip || null,
        userAgent: (request.headers['user-agent'] || '').slice(0, 500) || null,
      },
    });

    return {
      ok: true,
      message: form.successMessage || '¡Tu postulación ha sido enviada con éxito!',
      id: submission.id,
      remainingSlots: form.maxResponses ? Math.max(0, form.maxResponses - (currentSubmissionsCount + 1)) : null,
    };
  });

  // 2. PUBLIC: Get form status and remaining slots
  app.get('/api/v1/public/forms/:id/status', async (request, reply) => {
    noStoreHeaders(reply);

    const { id } = formIdParamSchema.parse(request.params);

    if (typeof app.prisma?.form?.findUnique !== 'function') {
      return { data: { exists: false, active: true, count: 0, isFull: false, maxResponses: 15 } };
    }

    const form = await app.prisma.form.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });

    if (!form) {
      return { data: { exists: false, active: true, count: 0, isFull: false, maxResponses: 15 } };
    }

    const count = form._count?.submissions || 0;
    const isFull = Boolean(form.maxResponses && count >= form.maxResponses);

    return {
      data: {
        id: form.id,
        title: form.title,
        active: form.isActive && !isFull,
        isClosed: !form.isActive,
        isFull,
        count,
        maxResponses: form.maxResponses,
        remainingSlots: form.maxResponses ? Math.max(0, form.maxResponses - count) : null,
      },
    };
  });

  // 3. CMS: List all forms with statistics
  app.get('/api/v1/cms/forms', { preHandler: app.requirePermission('cms:read') }, async (_request, reply) => {
    noStoreHeaders(reply);

    if (typeof app.prisma?.form?.findMany !== 'function') {
      return { data: [] };
    }

    const forms = await app.prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    return {
      data: forms.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        fieldsJson: f.fieldsJson,
        maxResponses: f.maxResponses,
        isActive: f.isActive,
        submitButtonText: f.submitButtonText,
        submissionsCount: f._count.submissions,
        isFull: Boolean(f.maxResponses && f._count.submissions >= f.maxResponses),
        post: f.post,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    };
  });

  // 4. CMS: Get single form details with submissions list
  app.get('/api/v1/cms/forms/:id', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    noStoreHeaders(reply);

    const { id } = formIdParamSchema.parse(request.params);

    if (typeof app.prisma?.form?.findUnique !== 'function') {
      throw app.httpErrors.notFound('Formulario no encontrado');
    }

    const form = await app.prisma.form.findUnique({
      where: { id },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 500,
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) {
      throw app.httpErrors.notFound('Formulario no encontrado');
    }

    return {
      data: {
        id: form.id,
        title: form.title,
        description: form.description,
        fieldsJson: form.fieldsJson,
        maxResponses: form.maxResponses,
        isActive: form.isActive,
        submitButtonText: form.submitButtonText,
        successMessage: form.successMessage,
        submissionsCount: form._count.submissions,
        isFull: Boolean(form.maxResponses && form._count.submissions >= form.maxResponses),
        post: form.post,
        submissions: form.submissions.map((sub) => ({
          id: sub.id,
          data: sub.dataJson,
          ipAddress: sub.ipAddress,
          createdAt: sub.createdAt,
        })),
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      },
    };
  });

  // 5. CMS: Export submissions to CSV
  app.get('/api/v1/cms/forms/:id/export', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    noStoreHeaders(reply);

    const { id } = formIdParamSchema.parse(request.params);

    if (typeof app.prisma?.form?.findUnique !== 'function') {
      throw app.httpErrors.notFound('Formulario no encontrado');
    }

    const form = await app.prisma.form.findUnique({
      where: { id },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!form) {
      throw app.httpErrors.notFound('Formulario no encontrado');
    }

    // Determine all unique column keys from submissions
    const allKeys = new Set(['Fecha', 'IP']);
    for (const sub of form.submissions) {
      const data = sub.dataJson || {};
      for (const k of Object.keys(data)) {
        allKeys.add(k);
      }
    }

    const columns = Array.from(allKeys);

    function escapeCsvCell(val) {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }

    const rows = [
      columns.map(escapeCsvCell).join(','),
      ...form.submissions.map((sub) => {
        const data = sub.dataJson || {};
        return columns
          .map((col) => {
            if (col === 'Fecha') return escapeCsvCell(new Date(sub.createdAt).toLocaleString('es-DO'));
            if (col === 'IP') return escapeCsvCell(sub.ipAddress || '');
            return escapeCsvCell(data[col] ?? '');
          })
          .join(',');
      }),
    ];

    const csvContent = `\uFEFF${rows.join('\r\n')}`; // Include UTF-8 BOM for Excel
    const safeTitle = (form.title || 'formulario').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${safeTitle}-respuestas.csv"`);
    return reply.send(csvContent);
  });

  // 6. CMS: Delete a submission
  app.delete(
    '/api/v1/cms/forms/:formId/submissions/:submissionId',
    { preHandler: app.requirePermission('posts:manage') },
    async (request) => {
      const { formId, submissionId } = submissionParamSchema.parse(request.params);

      if (typeof app.prisma?.formSubmission?.deleteMany !== 'function') {
        return { ok: true };
      }

      await app.prisma.formSubmission.deleteMany({
        where: {
          id: submissionId,
          formId,
        },
      });

      return { ok: true, message: 'Respuesta eliminada' };
    },
  );

  // 7. CMS: Toggle form active state
  app.patch(
    '/api/v1/cms/forms/:id/toggle',
    { preHandler: app.requirePermission('posts:manage') },
    async (request) => {
      const { id } = formIdParamSchema.parse(request.params);

      if (typeof app.prisma?.form?.findUnique !== 'function') {
        return { ok: true };
      }

      const form = await app.prisma.form.findUnique({ where: { id } });
      if (!form) {
        throw app.httpErrors.notFound('Formulario no encontrado');
      }

      const updated = await app.prisma.form.update({
        where: { id },
        data: { isActive: !form.isActive },
        select: { id: true, isActive: true },
      });

      return { ok: true, data: updated };
    },
  );
}
