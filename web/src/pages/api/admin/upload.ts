import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAuthed } from '../../../lib/admin';
import { processImage } from '../../../lib/image-process';

// On-demand: resize an uploaded image (in the Worker, via WASM) into WebP + JPEG
// variants at several widths, store them in R2, and return a responsive manifest.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const MAX_BYTES = 8 * 1024 * 1024; // cap input so the Worker resize stays within budget
const WIDTHS = [480, 768, 1024, 1536];

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!media) return json({ ok: false, error: 'Image storage is not set up yet.' }, 500);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Bad upload.' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return json({ ok: false, error: 'No file received.' }, 400);
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return json({ ok: false, error: 'Please upload a JPEG or PNG image.' }, 415);
  }
  if (file.size > MAX_BYTES) return json({ ok: false, error: 'Image is too large (max 8 MB).' }, 400);

  let processed;
  try {
    processed = await processImage(await file.arrayBuffer(), file.type, WIDTHS);
  } catch {
    return json({ ok: false, error: 'Could not process that image. Please try a JPEG or PNG.' }, 422);
  }

  const id = crypto.randomUUID();
  const webpParts: string[] = [];
  const jpgParts: string[] = [];
  let fallbackJpg = '';
  try {
    for (const v of processed.variants) {
      const wk = `uploads/${id}-${v.width}.webp`;
      const jk = `uploads/${id}-${v.width}.jpg`;
      await media.put(wk, v.webp, { httpMetadata: { contentType: 'image/webp' } });
      await media.put(jk, v.jpg, { httpMetadata: { contentType: 'image/jpeg' } });
      webpParts.push(`/media/${wk} ${v.width}w`);
      jpgParts.push(`/media/${jk} ${v.width}w`);
      fallbackJpg = `/media/${jk}`; // last = largest
    }
  } catch (err) {
    console.error('admin/upload: store failed', err);
    return json({ ok: false, error: 'Could not save the image. Please try again.' }, 500);
  }

  const img = {
    w: processed.w,
    h: processed.h,
    jpg: fallbackJpg,
    webpset: webpParts.join(', '),
    jpgset: jpgParts.join(', '),
  };
  return json({ ok: true, img });
};
