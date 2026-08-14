import { describe, expect, it } from 'vitest';
import {
  __mediaStorageTestUtils,
  storeRemotePhpMediaUpload,
} from '../api/services/media-storage.js';

const { signRemoteMediaUpload } = __mediaStorageTestUtils;

const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex',
);

const remoteConfig = {
  MEDIA_REMOTE_UPLOAD_URL: 'https://media.hackeandoelsistema.net/api/upload.php',
  MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://media.hackeandoelsistema.net',
  MEDIA_REMOTE_SECRET: 'remote-secret-with-more-than-32-characters',
  MEDIA_REMOTE_TIMEOUT_MS: 5000,
  MEDIA_MAX_FILE_SIZE_BYTES: 1024 * 1024,
};

describe('remote PHP media storage', () => {
  it('sends validated media with signed server-to-server headers', async () => {
    const file = {
      filename: 'Prueba CMS.png',
      mimetype: 'image/png',
      buffer: PNG_1X1,
    };

    const stored = await storeRemotePhpMediaUpload({
      config: remoteConfig,
      file,
      fetchImpl: async (url, options) => {
        expect(url).toBe(remoteConfig.MEDIA_REMOTE_UPLOAD_URL);
        expect(options.method).toBe('POST');
        expect(options.headers.Authorization).toBe(`Bearer ${remoteConfig.MEDIA_REMOTE_SECRET}`);

        const timestamp = options.headers['X-HES-Media-Timestamp'];
        const expectedSignature = signRemoteMediaUpload({
          secret: remoteConfig.MEDIA_REMOTE_SECRET,
          timestamp,
          filename: file.filename,
          mimetype: file.mimetype,
          buffer: PNG_1X1,
        });

        expect(options.headers['X-HES-Media-Signature']).toBe(expectedSignature);

        return {
          ok: true,
          json: async () => ({
            data: {
              media: {
                url: 'https://media.hackeandoelsistema.net/uploads/cms/2026/07/prueba-cms.png',
                path: '/uploads/cms/2026/07/prueba-cms.png',
                mimeType: 'image/png',
                fileName: 'prueba-cms.png',
                fileSize: PNG_1X1.length,
                width: 1,
                height: 1,
              },
            },
          }),
        };
      },
    });

    expect(stored).toMatchObject({
      disk: 'remote_php',
      url: 'https://media.hackeandoelsistema.net/uploads/cms/2026/07/prueba-cms.png',
      path: '/uploads/cms/2026/07/prueba-cms.png',
      mimeType: 'image/png',
      width: 1,
      height: 1,
    });
  });

  it('supports Banahost-style uploads with image field, Bearer auth and a simple URL response', async () => {
    const file = {
      filename: 'Prueba CMS.png',
      mimetype: 'image/png',
      buffer: PNG_1X1,
    };

    const stored = await storeRemotePhpMediaUpload({
      config: {
        ...remoteConfig,
        MEDIA_REMOTE_UPLOAD_URL: 'https://image.hackeandoelsistema.net/subir.php',
        MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://image.hackeandoelsistema.net',
        MEDIA_REMOTE_AUTH_MODE: 'bearer',
        MEDIA_REMOTE_FILE_FIELD: 'image',
        MEDIA_REMOTE_RESPONSE_MODE: 'simple_url',
      },
      file,
      fetchImpl: async (url, options) => {
        expect(url).toBe('https://image.hackeandoelsistema.net/subir.php');
        expect(options.method).toBe('POST');
        expect(options.headers).toEqual({
          Authorization: `Bearer ${remoteConfig.MEDIA_REMOTE_SECRET}`,
        });

        const uploadedFile = options.body.get('image');
        expect(uploadedFile).toBeTruthy();
        expect(options.body.get('file')).toBeNull();
        expect(options.body.get('filename')).toBeNull();
        expect(options.body.get('mimetype')).toBeNull();

        return {
          ok: true,
          json: async () => ({
            url: 'https://image.hackeandoelsistema.net/img_prueba-cms.png',
          }),
        };
      },
    });

    expect(stored).toMatchObject({
      disk: 'remote_php',
      url: 'https://image.hackeandoelsistema.net/img_prueba-cms.png',
      path: '/img_prueba-cms.png',
      mimeType: 'image/png',
      fileName: 'img_prueba-cms.png',
      fileSize: PNG_1X1.length,
      width: 1,
      height: 1,
    });
  });

  it('normalizes remote PHP responses that send an absolute URL in the path field', async () => {
    const stored = await storeRemotePhpMediaUpload({
      config: {
        ...remoteConfig,
        MEDIA_REMOTE_UPLOAD_URL: 'https://image.hackeandoelsistema.net/subir.php',
        MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://image.hackeandoelsistema.net',
      },
      file: {
        filename: 'Prueba CMS.png',
        mimetype: 'image/png',
        buffer: PNG_1X1,
      },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          media: {
            url: 'https://image.hackeandoelsistema.net/uploads/2026/07/prueba-cms.png',
            path: 'https://image.hackeandoelsistema.net/uploads/2026/07/prueba-cms.png',
            mimeType: 'image/png',
            fileName: 'prueba-cms.png',
            fileSize: PNG_1X1.length,
            width: 1,
            height: 1,
          },
        }),
      }),
    });

    expect(stored.path).toBe('/uploads/2026/07/prueba-cms.png');
  });

  it('rejects remote responses from a different public origin', async () => {
    await expect(
      storeRemotePhpMediaUpload({
        config: remoteConfig,
        file: {
          filename: 'Prueba CMS.png',
          mimetype: 'image/png',
          buffer: PNG_1X1,
        },
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({
            data: {
              media: {
                url: 'https://evil.example/uploads/cms/prueba.png',
                path: '/uploads/cms/prueba.png',
                mimeType: 'image/png',
                fileName: 'prueba.png',
                fileSize: PNG_1X1.length,
              },
            },
          }),
        }),
      }),
    ).rejects.toThrow('Remote media URL origin is not allowed');
  });

  it('requires a public media base URL for remote storage', async () => {
    await expect(
      storeRemotePhpMediaUpload({
        config: {
          ...remoteConfig,
          MEDIA_REMOTE_PUBLIC_BASE_URL: '',
        },
        file: {
          filename: 'Prueba CMS.png',
          mimetype: 'image/png',
          buffer: PNG_1X1,
        },
        fetchImpl: async () => {
          throw new Error('fetch should not run');
        },
      }),
    ).rejects.toThrow('Remote media storage is not configured');
  });

  it('rejects incomplete numeric metadata from the remote PHP service', async () => {
    await expect(
      storeRemotePhpMediaUpload({
        config: remoteConfig,
        file: {
          filename: 'Prueba CMS.png',
          mimetype: 'image/png',
          buffer: PNG_1X1,
        },
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({
            media: {
              url: 'https://media.hackeandoelsistema.net/uploads/cms/prueba.png',
              path: '/uploads/cms/prueba.png',
              mimeType: 'image/png',
              fileName: 'prueba.png',
              fileSize: 'not-a-number',
              width: 'wide',
              height: 1,
            },
          }),
        }),
      }),
    ).rejects.toThrow('Incomplete remote media response');
  });

  it('returns a service error when the remote media upload times out', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    await expect(
      storeRemotePhpMediaUpload({
        config: remoteConfig,
        file: {
          filename: 'Prueba CMS.png',
          mimetype: 'image/png',
          buffer: PNG_1X1,
        },
        fetchImpl: async () => {
          throw abortError;
        },
      }),
    ).rejects.toMatchObject({
      message: 'Remote media upload timed out',
      statusCode: 503,
    });
  });
});
