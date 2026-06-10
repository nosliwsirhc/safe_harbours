import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Serves uploaded images out of R2. Existing site images stay static under
// /assets; only editor uploads come through here.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  const key = params.path;
  if (!media || !key) return new Response('Not found', { status: 404 });

  const obj = await media.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(obj.body, { headers });
};
