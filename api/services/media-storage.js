import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', ['jpg', 'jpeg']],
  ['image/png', ['png']],
  ['image/webp', ['webp']],
  ['image/gif', ['gif']],
  ['video/mp4', ['mp4']],
  ['audio/mpeg', ['mp3']],
  ['audio/wav', ['wav']],
  ['application/pdf', ['pdf']],
  ['text/plain', ['txt']],
]);

function normalizeBasePath(value) {
  return `/${String(value || '/uploads/cms').replace(/^\/+|\/+$/g, '')}`;
}

function resolveUploadRoot(config) {
  const uploadDir = config.MEDIA_UPLOAD_DIR || 'public/uploads/cms';

  return path.isAbsolute(uploadDir) ? uploadDir : path.resolve(process.cwd(), uploadDir);
}

function sanitizeFileStem(value) {
  return String(value || 'archivo')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo';
}

function extensionFromFilename(filename) {
  return path.extname(String(filename || '')).replace('.', '').toLowerCase();
}

function matchesExpectedSignature(buffer, mimeType) {
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.toString('hex', 0, 8) === '89504e470d0a1a0a';
  }

  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/gif') {
    return buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
  }

  if (mimeType === 'image/webp') {
    return buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }

  if (mimeType === 'application/pdf') {
    return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF';
  }

  if (mimeType === 'video/mp4') {
    return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
  }

  if (mimeType === 'audio/wav') {
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
  }

  if (mimeType === 'audio/mpeg') {
    return buffer.length >= 3 && (buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0));
  }

  if (mimeType === 'text/plain') {
    return !buffer.includes(0);
  }

  return false;
}

function dimensionsFromImage(buffer, mimeType) {
  if (mimeType === 'image/png' && buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (mimeType === 'image/gif' && buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  if (mimeType === 'image/webp' && buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const chunk = buffer.toString('ascii', 12, 16);

    if (chunk === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
  }

  if (mimeType === 'image/jpeg') {
    let offset = 2;

    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);

      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }

      offset += 2 + length;
    }
  }

  return { width: null, height: null };
}

export function validateMediaUpload({ filename, mimetype, size, maxSize }) {
  const extensions = ALLOWED_MIME_TYPES.get(mimetype);
  const extension = extensionFromFilename(filename);

  if (!extensions || !extensions.includes(extension)) {
    return {
      ok: false,
      message: 'Unsupported media type',
    };
  }

  if (!size || size > maxSize) {
    return {
      ok: false,
      message: 'Media file is empty or exceeds the maximum size',
    };
  }

  return { ok: true, extension };
}

function validateMediaBuffer({ config, file, buffer }) {
  const validation = validateMediaUpload({
    filename: file.filename,
    mimetype: file.mimetype,
    size: buffer.length,
    maxSize: config.MEDIA_MAX_FILE_SIZE_BYTES || 8 * 1024 * 1024,
  });

  if (!validation.ok) {
    const error = new Error(validation.message);
    error.statusCode = 415;
    throw error;
  }

  if (!matchesExpectedSignature(buffer, file.mimetype)) {
    const error = new Error('Media file signature does not match its declared type');
    error.statusCode = 415;
    throw error;
  }

  return validation;
}

function buildLocalMediaObjectName(file, extension) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const stem = sanitizeFileStem(path.basename(file.filename, path.extname(file.filename)));
  const fileName = `${stem}-${randomUUID().slice(0, 12)}.${extension}`;

  return {
    year,
    month,
    fileName,
  };
}

export async function storeLocalMediaUpload({ config, file }) {
  const buffer = file.buffer ?? (await file.toBuffer());
  const validation = validateMediaBuffer({ config, file, buffer });
  const { year, month, fileName } = buildLocalMediaObjectName(file, validation.extension);
  const uploadRoot = resolveUploadRoot(config);
  const targetDir = path.join(uploadRoot, year, month);
  const targetPath = path.join(targetDir, fileName);
  const publicPath = `${normalizeBasePath(config.MEDIA_PUBLIC_BASE_PATH)}/${year}/${month}/${fileName}`;
  const dimensions = dimensionsFromImage(buffer, file.mimetype);

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, buffer, { flag: 'wx' });

  return {
    disk: 'local',
    url: publicPath,
    path: publicPath,
    mimeType: file.mimetype,
    fileName,
    fileSize: buffer.length,
    width: dimensions.width,
    height: dimensions.height,
  };
}
