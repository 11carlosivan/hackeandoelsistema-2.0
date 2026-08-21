import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.mp4', 'video/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.pdf', 'application/pdf'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function resolveMediaFilePath(config, rawPath) {
  const uploadRoot = path.resolve(config.MEDIA_UPLOAD_DIR);
  const relativePath = String(rawPath || '').replace(/^[/\\]+/g, '');
  const resolvedPath = path.resolve(uploadRoot, relativePath);

  if (resolvedPath !== uploadRoot && !resolvedPath.startsWith(`${uploadRoot}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

export async function registerMediaFileRoutes(app) {
  app.route({
    method: ['GET', 'HEAD'],
    url: '/uploads/cms/*',
    async handler(request, reply) {
      const filePath = resolveMediaFilePath(app.config, request.params['*']);

      if (!filePath) {
        throw app.httpErrors.notFound('Media file not found');
      }

      let info;

      try {
        info = await stat(filePath);
      } catch {
        throw app.httpErrors.notFound('Media file not found');
      }

      if (!info.isFile()) {
        throw app.httpErrors.notFound('Media file not found');
      }

      const extension = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES.get(extension) || 'application/octet-stream';

      reply
        .type(mimeType)
        .header('Content-Length', String(info.size))
        .header('Cache-Control', 'public, max-age=2592000')
        .header('X-Content-Type-Options', 'nosniff');

      if (request.method === 'HEAD') {
        return reply.send();
      }

      return reply.send(createReadStream(filePath));
    },
  });
}
