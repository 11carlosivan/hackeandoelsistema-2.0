import { z } from 'zod';
import { noStoreHeaders } from '../utils/http.js';
import { storeMediaUpload } from '../services/media-storage.js';

const publicJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  workplaceType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP']).optional(),
});

const applyJobSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().email().max(255),
  phone: z.string().trim().min(5).max(50),
  resumeUrl: z.string().trim().min(1).max(768),
  resumeFileName: z.string().trim().min(1).max(255),
  coverLetter: z.string().trim().max(4000).optional(),
});

const createJobSchema = z.object({
  title: z.string().trim().min(3).max(255),
  companyName: z.string().trim().min(2).max(200),
  companyLogoUrl: z.string().trim().max(768).optional().nullable(),
  companyWebsite: z.string().trim().max(768).optional().nullable(),
  location: z.string().trim().min(2).max(200),
  workplaceType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']).default('ONSITE'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP']).default('FULL_TIME'),
  category: z.string().trim().max(120).optional().nullable(),
  salaryMin: z.coerce.number().int().positive().optional().nullable(),
  salaryMax: z.coerce.number().int().positive().optional().nullable(),
  salaryCurrency: z.string().trim().max(10).default('DOP'),
  salaryPeriod: z.string().trim().max(20).default('MONTHLY'),
  isSalaryNegotiable: z.boolean().default(false),
  description: z.string().trim().min(10),
  requirements: z.string().trim().optional().nullable(),
  benefits: z.string().trim().optional().nullable(),
  applicationDeadline: z.string().datetime().optional().nullable(),
});

function generateSlug(title) {
  const clean = String(title || 'vacante')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${clean}-${suffix}`;
}

export async function registerJobRoutes(app) {
  // 1. Listado público de empleos con filtros y paginación
  app.get('/api/v1/public/jobs', async (request, reply) => {
    const query = publicJobsQuerySchema.parse(request.query || {});
    noStoreHeaders(reply);

    const where = {
      status: 'PUBLISHED',
      ...(query.workplaceType ? { workplaceType: query.workplaceType } : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.location ? { location: { contains: query.location } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q } },
              { companyName: { contains: query.q } },
              { description: { contains: query.q } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [total, jobs] = await Promise.all([
      app.prisma.job.count({ where }),
      app.prisma.job.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          companyName: true,
          companyLogoUrl: true,
          location: true,
          workplaceType: true,
          employmentType: true,
          category: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          salaryPeriod: true,
          isSalaryNegotiable: true,
          createdAt: true,
          applicantCount: true,
        },
      }),
    ]);

    return {
      data: jobs,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  });

  // 2. Detalle público de empleo por slug
  app.get('/api/v1/public/jobs/:slug', async (request, reply) => {
    const { slug } = request.params;
    noStoreHeaders(reply);

    const job = await app.prisma.job.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      include: {
        company: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      throw app.httpErrors.notFound('Vacante de empleo no encontrada');
    }

    return { data: job };
  });

  // 3. Postulación a empleo (con subida de CV)
  app.post('/api/v1/public/jobs/:id/apply', async (request, reply) => {
    const { id } = request.params;
    const body = applyJobSchema.safeParse(request.body);

    if (!body.success) {
      throw app.httpErrors.badRequest('Datos de postulación incompletos o inválidos');
    }

    noStoreHeaders(reply);

    const job = await app.prisma.job.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!job || job.status !== 'PUBLISHED') {
      throw app.httpErrors.notFound('La vacante no está disponible para postulaciones');
    }

    // Optional user authentication
    let applicantUserId = null;
    const authHeader = request.headers.authorization;
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = await app.verifyAccessToken?.(app.config, token);
        if (payload?.sub) applicantUserId = payload.sub;
      } catch {
        // Ignored for guest applications
      }
    }

    const application = await app.prisma.$transaction(async (tx) => {
      const created = await tx.jobApplication.create({
        data: {
          jobId: id,
          applicantUserId,
          fullName: body.data.fullName,
          email: body.data.email.toLowerCase(),
          phone: body.data.phone,
          resumeUrl: body.data.resumeUrl,
          resumeFileName: body.data.resumeFileName,
          coverLetter: body.data.coverLetter || null,
          status: 'PENDING',
        },
      });

      await tx.job.update({
        where: { id },
        data: { applicantCount: { increment: 1 } },
      });

      return created;
    });

    reply.code(201);
    return {
      data: {
        id: application.id,
        message: '¡Tu postulación ha sido enviada con éxito!',
        status: application.status,
      },
    };
  });

  // 4. Subida de archivo de currículum (PDF/Documento)
  app.post('/api/v1/jobs/upload-resume', async (request, reply) => {
    noStoreHeaders(reply);

    if (!request.isMultipart()) {
      throw app.httpErrors.badRequest('Petición debe ser multipart/form-data');
    }

    const file = await request.file();
    if (!file) {
      throw app.httpErrors.badRequest('No se adjuntó ningún archivo');
    }

    const extension = file.filename?.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'doc', 'docx', 'txt'];

    if (!allowed.includes(extension)) {
      throw app.httpErrors.badRequest('Formato no permitido. Solo se aceptan archivos PDF, DOC, DOCX o TXT.');
    }

    try {
      const stored = await storeMediaUpload({ config: app.config, file });
      return {
        data: {
          resumeUrl: stored.url,
          resumeFileName: file.filename,
        },
      };
    } catch (err) {
      request.log.error(err, 'Error storing resume upload');
      throw app.httpErrors.internalServerError('Error al guardar el currículum');
    }
  });

  // 5. Empresa: Publicar nueva vacante (autenticado)
  app.post('/api/v1/company/jobs', { preHandler: app.authenticate }, async (request, reply) => {
    const body = createJobSchema.safeParse(request.body);
    if (!body.success) {
      throw app.httpErrors.badRequest('Datos de empleo inválidos: ' + JSON.stringify(body.error.flatten().fieldErrors));
    }

    noStoreHeaders(reply);
    const slug = generateSlug(body.data.title);

    const job = await app.prisma.job.create({
      data: {
        companyId: request.auth.user.id,
        title: body.data.title,
        slug,
        companyName: body.data.companyName,
        companyLogoUrl: body.data.companyLogoUrl || null,
        companyWebsite: body.data.companyWebsite || null,
        location: body.data.location,
        workplaceType: body.data.workplaceType,
        employmentType: body.data.employmentType,
        category: body.data.category || null,
        salaryMin: body.data.salaryMin || null,
        salaryMax: body.data.salaryMax || null,
        salaryCurrency: body.data.salaryCurrency,
        salaryPeriod: body.data.salaryPeriod,
        isSalaryNegotiable: body.data.isSalaryNegotiable,
        description: body.data.description,
        requirements: body.data.requirements || null,
        benefits: body.data.benefits || null,
        applicationDeadline: body.data.applicationDeadline ? new Date(body.data.applicationDeadline) : null,
        status: 'PUBLISHED',
      },
    });

    reply.code(201);
    return { data: job };
  });

  // 6. Empresa: Listar sus propias vacantes publicadas (autenticado)
  app.get('/api/v1/company/jobs', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);

    const jobs = await app.prisma.job.findMany({
      where: { companyId: request.auth.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return { data: jobs };
  });

  // 7. Empresa: Ver candidatos que aplicaron a una vacante (autenticado)
  app.get('/api/v1/company/jobs/:id/applications', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params;
    noStoreHeaders(reply);

    const job = await app.prisma.job.findUnique({
      where: { id },
      select: { id: true, companyId: true, title: true },
    });

    if (!job) {
      throw app.httpErrors.notFound('Vacante no encontrada');
    }

    const isAdmin = request.auth.roles?.includes('ADMIN');
    if (job.companyId !== request.auth.user.id && !isAdmin) {
      throw app.httpErrors.forbidden('No tienes permiso para ver los candidatos de esta vacante');
    }

    const applications = await app.prisma.jobApplication.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: {
        jobTitle: job.title,
        applications,
      },
    };
  });

  // 8. Empresa: Actualizar estado de una postulación (autenticado)
  app.patch('/api/v1/company/applications/:id/status', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params;
    const body = z.object({
      status: z.enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED']),
      notes: z.string().trim().max(2000).optional(),
    }).safeParse(request.body);

    if (!body.success) {
      throw app.httpErrors.badRequest('Estado no válido');
    }

    noStoreHeaders(reply);

    const application = await app.prisma.jobApplication.findUnique({
      where: { id },
      include: { job: { select: { companyId: true } } },
    });

    if (!application) {
      throw app.httpErrors.notFound('Postulación no encontrada');
    }

    const isAdmin = request.auth.roles?.includes('ADMIN');
    if (application.job.companyId !== request.auth.user.id && !isAdmin) {
      throw app.httpErrors.forbidden('No tienes permiso para modificar esta postulación');
    }

    const updated = await app.prisma.jobApplication.update({
      where: { id },
      data: {
        status: body.data.status,
        ...(body.data.notes !== undefined ? { notes: body.data.notes } : {}),
      },
    });

    return { data: updated };
  });
}
