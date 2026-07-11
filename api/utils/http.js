export function publicCacheHeaders(reply, seconds = 60) {
  reply.header('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);
}

export function noStoreHeaders(reply) {
  reply.header('Cache-Control', 'no-store');
}
