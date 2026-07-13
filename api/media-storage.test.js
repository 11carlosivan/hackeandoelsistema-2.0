import { describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn(function PutObjectCommand(input) {
    return { input };
  }),
  S3Client: vi.fn(function S3Client() {
    return { send: sendMock };
  }),
}));

const { storeMediaUpload } = await import('./services/media-storage.js');

function pngBuffer() {
  const buffer = Buffer.alloc(32);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.write('PNG', 1, 'ascii');
  buffer.writeUInt32BE(640, 16);
  buffer.writeUInt32BE(360, 20);
  return buffer;
}

describe('media storage', () => {
  it('stores CMS uploads in Cloudflare R2 when the r2 driver is enabled', async () => {
    sendMock.mockResolvedValueOnce({});

    const stored = await storeMediaUpload({
      config: {
        MEDIA_STORAGE_DRIVER: 'r2',
        MEDIA_MAX_FILE_SIZE_BYTES: 1024 * 1024,
        R2_ACCOUNT_ID: 'account-id',
        R2_BUCKET_NAME: 'hes-media-staging',
        R2_ACCESS_KEY_ID: 'access-key',
        R2_SECRET_ACCESS_KEY: 'secret-key',
        R2_PUBLIC_BASE_URL: 'https://media.hackeandoelsistema.net',
        R2_OBJECT_CACHE_CONTROL: 'public, max-age=31536000, immutable',
      },
      file: {
        filename: 'Prueba CMS.png',
        mimetype: 'image/png',
        buffer: pngBuffer(),
      },
    });

    expect(stored.disk).toBe('r2');
    expect(stored.url).toMatch(/^https:\/\/media\.hackeandoelsistema\.net\/\d{4}\/\d{2}\/prueba-cms-[a-f0-9-]+\.png$/);
    expect(stored.path).toMatch(/^\d{4}\/\d{2}\/prueba-cms-[a-f0-9-]+\.png$/);
    expect(stored.width).toBe(640);
    expect(stored.height).toBe(360);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input).toMatchObject({
      Bucket: 'hes-media-staging',
      Body: expect.any(Buffer),
      CacheControl: 'public, max-age=31536000, immutable',
      ContentType: 'image/png',
    });
  });
});
