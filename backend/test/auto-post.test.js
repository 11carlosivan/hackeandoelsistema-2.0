// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { buildApp } from '../api/app.js';
import { signAccessToken } from '../api/services/auth.js';
import {
  checkAndRunAutoPost,
  getAutoPostConfig,
  isLikelyLogoOrWatermarked,
  saveAutoPostConfig,
  toggleAutoPostEnabled,
} from '../api/services/auto-post.js';

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

function createAutoPostPrismaStub(initialConfig = null) {
  const settingsStore = new Map();
  if (initialConfig) {
    settingsStore.set('auto_post_config', {
      settingKey: 'auto_post_config',
      value: initialConfig,
      updatedAt: new Date(),
    });
  }

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
    siteSetting: {
      findUnique: async ({ where }) => settingsStore.get(where.settingKey) || null,
      upsert: async ({ where, create, update }) => {
        const existing = settingsStore.get(where.settingKey);
        const record = {
          settingKey: where.settingKey,
          value: existing ? update.value : create.value,
          updatedAt: new Date(),
        };
        settingsStore.set(where.settingKey, record);
        return record;
      },
    },
  };
}

describe('Auto-Post IA - Anti-Logo, Búsqueda Limpia y Switch ON/OFF', () => {
  describe('Filtro de Logotipos y Marcas de Agua (isLikelyLogoOrWatermarked)', () => {
    it('detecta logotipos comunes y marcas de agua en URLs de imágenes', () => {
      expect(isLikelyLogoOrWatermarked('https://sitio.com/wp-content/uploads/logo.png')).toBe(true);
      expect(isLikelyLogoOrWatermarked('https://sitio.com/assets/logotipo-sitio.webp')).toBe(true);
      expect(isLikelyLogoOrWatermarked('https://sitio.com/img/watermark-banner.jpg')).toBe(true);
      expect(isLikelyLogoOrWatermarked('https://sitio.com/marca-de-agua-preview.jpg')).toBe(true);
      expect(isLikelyLogoOrWatermarked('https://sitio.com/header-brand.png')).toBe(true);
      expect(isLikelyLogoOrWatermarked('https://sitio.com/favicon.ico')).toBe(true);
      expect(isLikelyLogoOrWatermarked('https://sitio.com/default-image.jpg')).toBe(true);
      expect(isLikelyLogoOrWatermarked('https://sitio.com/placeholder-thumb.png')).toBe(true);
    });

    it('detecta imágenes cuyo nombre contiene la marca o dominio de la fuente', () => {
      expect(
        isLikelyLogoOrWatermarked(
          'https://remolacha.net/wp-content/uploads/remolacha-main.jpg',
          'https://remolacha.net/noticia-hoy'
        )
      ).toBe(true);
      expect(
        isLikelyLogoOrWatermarked(
          'https://listindiario.com/cdn/listindiario-logo.png',
          'https://listindiario.com/economia/2026/04'
        )
      ).toBe(true);
    });

    it('acepta fotografías editoriales limpias y descriptivas', () => {
      expect(
        isLikelyLogoOrWatermarked(
          'https://cdn.example.com/uploads/2026/04/reunion-ministerio-educacion-palacio.jpg',
          'https://periodico-noticias.com/articulo'
        )
      ).toBe(false);
      expect(
        isLikelyLogoOrWatermarked(
          'https://upload.wikimedia.org/wikipedia/commons/a/a1/Palacio_Nacional_Santo_Domingo.jpg'
        )
      ).toBe(false);
    });
  });

  describe('Configuración y Switch ON/OFF', () => {
    it('devuelve valores por defecto con isEnabled: false e intervalMinutes: 30', async () => {
      const prisma = createAutoPostPrismaStub();
      const app = {
        config: { AUTH_JWT_SECRET: 'test-secret-long-enough-32-chars-ok!' },
        prisma,
      };

      const config = await getAutoPostConfig(app);
      expect(config.isEnabled).toBe(false);
      expect(config.intervalMinutes).toBe(30);
    });

    it('guarda y actualiza isEnabled e intervalMinutes', async () => {
      const prisma = createAutoPostPrismaStub();
      const app = {
        config: { AUTH_JWT_SECRET: 'test-secret-long-enough-32-chars-ok!' },
        prisma,
      };

      const saved = await saveAutoPostConfig(app, {
        isEnabled: true,
        intervalMinutes: 15,
        sources: 'https://ejemplo.com/rss',
      });

      expect(saved.isEnabled).toBe(true);
      expect(saved.intervalMinutes).toBe(15);
      expect(saved.sources).toBe('https://ejemplo.com/rss');

      const reloaded = await getAutoPostConfig(app);
      expect(reloaded.isEnabled).toBe(true);
      expect(reloaded.intervalMinutes).toBe(15);
    });

    it('conmuta el switch mediante toggleAutoPostEnabled', async () => {
      const prisma = createAutoPostPrismaStub({ isEnabled: false, intervalMinutes: 30 });
      const app = {
        config: { AUTH_JWT_SECRET: 'test-secret-long-enough-32-chars-ok!' },
        prisma,
        log: { warn: () => {} },
      };

      // Toggle ON
      const toggledOn = await toggleAutoPostEnabled(app);
      expect(toggledOn.isEnabled).toBe(true);

      // Toggle OFF
      const toggledOff = await toggleAutoPostEnabled(app);
      expect(toggledOff.isEnabled).toBe(false);

      // Force explicit state
      const forcedOn = await toggleAutoPostEnabled(app, true);
      expect(forcedOn.isEnabled).toBe(true);
    });

    it('checkAndRunAutoPost no ejecuta cuando isEnabled es false', async () => {
      const prisma = createAutoPostPrismaStub({ isEnabled: false });
      const app = {
        config: { AUTH_JWT_SECRET: 'test-secret-long-enough-32-chars-ok!' },
        prisma,
        log: { warn: () => {} },
      };

      const result = await checkAndRunAutoPost(app);
      expect(result).toBeNull();
    });
  });

  describe('Endpoints HTTP CMS (/api/v1/cms/auto-post)', () => {
    it('requiere autenticación para conmutar el switch', async () => {
      const prisma = createAutoPostPrismaStub();
      const app = await buildApp({ prisma });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/cms/auto-post/toggle',
        payload: { isEnabled: true },
      });

      expect(response.statusCode).toBe(401);
      await app.close();
    });

    it('permite encender y apagar el switch mediante POST /toggle cuando está autenticado', async () => {
      const user = createAuthUser();
      const prisma = createAutoPostPrismaStub({ isEnabled: false, intervalMinutes: 30 });
      const app = await buildApp({ prisma });

      const { token } = await signAccessToken({
        config: app.config,
        user,
      });

      // Encender el switch
      const turnOnRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cms/auto-post/toggle',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: { isEnabled: true },
      });

      expect(turnOnRes.statusCode).toBe(200);
      const turnOnBody = JSON.parse(turnOnRes.body);
      expect(turnOnBody.data.settings.isEnabled).toBe(true);
      expect(turnOnBody.data.message).toContain('Auto-Post encendido');

      // Apagar el switch
      const turnOffRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cms/auto-post/toggle',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: { isEnabled: false },
      });

      expect(turnOffRes.statusCode).toBe(200);
      const turnOffBody = JSON.parse(turnOffRes.body);
      expect(turnOffBody.data.settings.isEnabled).toBe(false);
      expect(turnOffBody.data.message).toContain('Auto-Post apagado');

      await app.close();
    });

    it('guarda configuración completa incluyendo isEnabled e intervalMinutes', async () => {
      const user = createAuthUser();
      const prisma = createAutoPostPrismaStub();
      const app = await buildApp({ prisma });

      const { token } = await signAccessToken({
        config: app.config,
        user,
      });

      const saveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cms/auto-post/settings',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: {
          isEnabled: true,
          intervalMinutes: 60,
          sources: 'https://sitio1.com/feed\nhttps://sitio2.com/feed',
          aiProvider: 'gemini',
          postStatus: 'PUBLISHED',
        },
      });

      expect(saveRes.statusCode).toBe(200);
      const body = JSON.parse(saveRes.body);
      expect(body.data.settings.isEnabled).toBe(true);
      expect(body.data.settings.intervalMinutes).toBe(60);
      expect(body.data.settings.postStatus).toBe('PUBLISHED');

      await app.close();
    });
  });
});
