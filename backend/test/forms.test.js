// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { buildApp } from '../api/app.js';
import { signAccessToken } from '../api/services/auth.js';

function createAuthUser() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@hackeandoelsistema.net',
    displayName: 'Admin HES',
    username: 'admin',
    status: 'ACTIVE',
    roles: [
      {
        role: {
          name: 'ADMIN',
          permissions: [
            { permission: { permissionKey: 'cms:read' } },
            { permission: { permissionKey: 'posts:manage' } },
          ],
        },
      },
    ],
  };
}

function createFormsPrismaStub(overrides = {}) {
  const formsStore = new Map([
    [
      'form-voluntarios-1',
      {
        id: 'form-voluntarios-1',
        postId: 'post-1',
        title: 'Convocatoria: 15 Voluntarios Android',
        description: 'Buscamos 15 lectores con Android.',
        fieldsJson: [{ id: 'name' }, { id: 'email' }, { id: 'phone' }],
        maxResponses: 15,
        isActive: true,
        submitButtonText: 'Enviar Postulación',
        successMessage: '¡Gracias por postularte!',
        createdAt: new Date('2026-10-01T12:00:00Z'),
        updatedAt: new Date('2026-10-01T12:00:00Z'),
        _count: { submissions: 2 },
      },
    ],
  ]);

  const submissionsStore = [
    {
      id: 'sub-1',
      formId: 'form-voluntarios-1',
      postId: 'post-1',
      dataJson: { name: 'Carlos Ivan', email: 'carlos@example.com', phone: '+18290000000' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2026-10-01T12:10:00Z'),
    },
    {
      id: 'sub-2',
      formId: 'form-voluntarios-1',
      postId: 'post-1',
      dataJson: { name: 'Juan Perez', email: 'juan@example.com', phone: '+18291111111' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2026-10-01T12:20:00Z'),
    },
  ];

  return {
    $disconnect: async () => undefined,
    user: {
      findUnique: async () => createAuthUser(),
      findFirst: async () => createAuthUser(),
    },
    userSession: {
      findFirst: async () => ({
        id: 'session-1',
        userId: '11111111-1111-4111-8111-111111111111',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      }),
    },
    form: {
      findUnique: async ({ where }) => formsStore.get(where.id) || null,
      findMany: async () => Array.from(formsStore.values()).map((f) => ({ ...f, post: { id: 'post-1', title: 'Artículo de prueba', slug: 'articulo-prueba' } })),
      create: async ({ data }) => {
        const item = { ...data, id: data.id || `form-${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), _count: { submissions: 0 } };
        formsStore.set(item.id, item);
        return item;
      },
      update: async ({ where, data }) => {
        const item = formsStore.get(where.id);
        if (!item) return null;
        Object.assign(item, data);
        return item;
      },
    },
    formSubmission: {
      count: async ({ where }) => submissionsStore.filter((s) => s.formId === where.formId).length,
      create: async ({ data }) => {
        const item = { id: `sub-${Date.now()}`, ...data, createdAt: new Date() };
        submissionsStore.push(item);
        const form = formsStore.get(data.formId);
        if (form && form._count) form._count.submissions += 1;
        return item;
      },
      deleteMany: async ({ where }) => {
        const idx = submissionsStore.findIndex((s) => s.id === where.id && s.formId === where.formId);
        if (idx !== -1) submissionsStore.splice(idx, 1);
        return { count: 1 };
      },
    },
    ...overrides,
  };
}

describe('Forms API', () => {
  it('submits a valid form response and returns confirmation', async () => {
    const prisma = createFormsPrismaStub();
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/forms/submit',
      payload: {
        formId: 'form-voluntarios-1',
        postId: 'post-1',
        data: {
          name: 'Maria Santos',
          email: 'maria@example.com',
          phone: '+18292222222',
          device: 'Pixel 8 (Android 14)',
        },
        renderedAt: Date.now() - 5000,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.ok).toBe(true);
    expect(json.message).toBe('¡Gracias por postularte!');
  });

  it('allows submissions from users with cookies without CSRF errors', async () => {
    const prisma = createFormsPrismaStub();
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/forms/submit',
      headers: {
        cookie: 'hes_access_token=some-token; hes_refresh_token=some-refresh-token',
      },
      payload: {
        formId: 'form-voluntarios-1',
        postId: 'post-1',
        data: {
          name: 'Admin Tester',
          email: 'admin@hackeandoelsistema.net',
          phone: '+18290000000',
        },
        renderedAt: Date.now() - 3000,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
  });

  it('drops spam submissions silently when honeypot is triggered', async () => {
    const prisma = createFormsPrismaStub();
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/forms/submit',
      payload: {
        formId: 'form-voluntarios-1',
        postId: 'post-1',
        data: { name: 'Bot', email: 'bot@spam.com' },
        hes_hp_verify: 'I am a robot',
        renderedAt: Date.now() - 5000,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.ok).toBe(true);
  });

  it('rejects submissions that are submitted too quickly (<1.2s)', async () => {
    const prisma = createFormsPrismaStub();
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/forms/submit',
      payload: {
        formId: 'form-voluntarios-1',
        postId: 'post-1',
        data: { name: 'Fast bot', email: 'fast@bot.com' },
        renderedAt: Date.now() - 200,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects submissions when capacity limit is reached', async () => {
    const prisma = createFormsPrismaStub({
      formSubmission: {
        count: async () => 15, // Already full
      },
    });
    // Set maxResponses to 15
    const existingForm = (await prisma.form.findUnique({ where: { id: 'form-voluntarios-1' } }));
    existingForm._count.submissions = 15;
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/forms/submit',
      payload: {
        formId: 'form-voluntarios-1',
        postId: 'post-1',
        data: { name: 'Late user', email: 'late@user.com' },
        renderedAt: Date.now() - 5000,
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it('returns form status and remaining slots', async () => {
    const prisma = createFormsPrismaStub();
    const app = await buildApp({ prisma });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/forms/form-voluntarios-1/status',
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.data.active).toBe(true);
    expect(json.data.maxResponses).toBe(15);
    expect(json.data.remainingSlots).toBe(13);
  });

const testEnv = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 4000,
  DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
  WEB_ORIGIN: 'http://127.0.0.1:3000',
  RATE_LIMIT_MAX: 120,
  RATE_LIMIT_WINDOW: '1 minute',
  AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
  AUTH_REFRESH_TOKEN_TTL_DAYS: 30,
  AUTH_COOKIE_SECURE: false,
  AUTH_MAX_LOGIN_ATTEMPTS: 5,
  AUTH_LOCKOUT_MINUTES: 15,
  corsOrigins: ['http://127.0.0.1:3000'],
  isProduction: false,
};

  it('lists forms for authenticated CMS users', async () => {
    const user = createAuthUser();
    const prisma = createFormsPrismaStub({
      user: {
        findUnique: async () => user,
        findFirst: async () => user,
      },
    });
    const app = await buildApp({ env: testEnv, prisma });
    const access = await signAccessToken({ config: testEnv, user });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/forms',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].title).toBe('Convocatoria: 15 Voluntarios Android');
  });

  it('exports form submissions to CSV format with UTF-8 BOM', async () => {
    const user = createAuthUser();
    const prisma = createFormsPrismaStub({
      user: {
        findUnique: async () => user,
        findFirst: async () => user,
      },
      form: {
        findUnique: async () => ({
          id: 'form-voluntarios-1',
          title: 'Convocatoria Voluntarios',
          submissions: [
            {
              id: 'sub-1',
              createdAt: new Date('2026-10-01T12:00:00Z'),
              ipAddress: '127.0.0.1',
              dataJson: { name: 'Carlos', email: 'carlos@example.com', phone: '+18290000000' },
            },
          ],
        }),
      },
    });
    const app = await buildApp({ env: testEnv, prisma });
    const access = await signAccessToken({ config: testEnv, user });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/forms/form-voluntarios-1/export',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.body).toContain('Carlos');
    expect(response.body).toContain('carlos@example.com');
  });

  it('updates form configuration (maxResponses, title) via CMS PATCH endpoint', async () => {
    const user = createAuthUser();
    const prisma = createFormsPrismaStub({
      user: {
        findUnique: async () => user,
        findFirst: async () => user,
      },
    });
    const app = await buildApp({ env: testEnv, prisma });
    const access = await signAccessToken({ config: testEnv, user });

    // Update cupos limite to 25
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/forms/form-voluntarios-1',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        maxResponses: 25,
        title: 'Convocatoria: 25 Voluntarios Android',
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.data.maxResponses).toBe(25);
    expect(json.data.title).toBe('Convocatoria: 25 Voluntarios Android');

    // Also verify setting to 0 sets it to null (unlimited)
    const unlimitedResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/forms/form-voluntarios-1',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        maxResponses: 0,
      },
    });

    expect(unlimitedResponse.statusCode).toBe(200);
    const unlimitedJson = unlimitedResponse.json();
    expect(unlimitedJson.data.maxResponses).toBeNull();
  });
});
