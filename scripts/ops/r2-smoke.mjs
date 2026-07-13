#!/usr/bin/env node
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadEnv } from '../../api/config/env.js';
import { storeMediaUpload } from '../../api/services/media-storage.js';

const REPORT_PATH = path.resolve('docs/operations/r2-smoke.report.json');

function tinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );
}

async function checkPublicUrl(url) {
  const head = await fetch(url, { method: 'HEAD' }).catch((error) => ({ ok: false, status: 0, error }));

  if (head.ok || head.status > 0) {
    return {
      ok: head.ok,
      status: head.status,
      cacheControl: head.headers?.get?.('cache-control') || null,
      cfCacheStatus: head.headers?.get?.('cf-cache-status') || null,
    };
  }

  const get = await fetch(url, { method: 'GET' });

  return {
    ok: get.ok,
    status: get.status,
    cacheControl: get.headers.get('cache-control'),
    cfCacheStatus: get.headers.get('cf-cache-status'),
  };
}

async function main() {
  const env = loadEnv();

  if (env.MEDIA_STORAGE_DRIVER !== 'r2') {
    throw new Error('Set MEDIA_STORAGE_DRIVER=r2 before running the R2 smoke test');
  }

  const stored = await storeMediaUpload({
    config: env,
    file: {
      filename: 'r2-smoke.png',
      mimetype: 'image/png',
      buffer: tinyPngBuffer(),
    },
  });
  const publicCheck = await checkPublicUrl(stored.url);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'r2-smoke',
    status: publicCheck.ok ? 'PASS' : 'FAIL',
    stored,
    publicCheck,
  };

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`R2 smoke generado en ${REPORT_PATH}`);
  console.log(`Estado: ${report.status}`);
  console.log(`URL: ${stored.url}`);

  if (!publicCheck.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
