// Server-side image resizing in the Worker via jSquash (WASM — no native sharp,
// no paid edge service). Decodes an uploaded JPEG/PNG, resizes to a set of widths
// (never upscaling), and re-encodes each as WebP + JPEG. Variants are stored in R2
// by the upload route. WebP+JPEG only: AVIF is far heavier to encode and risks the
// Worker CPU budget; it can be added later as a drop-in (@jsquash/avif).
import decodeJpeg, { init as initJpegDec } from '@jsquash/jpeg/decode';
import decodePng, { init as initPngDec } from '@jsquash/png/decode';
import encodeJpeg, { init as initJpegEnc } from '@jsquash/jpeg/encode';
import encodeWebp, { init as initWebpEnc } from '@jsquash/webp/encode';
import resize, { initResize } from '@jsquash/resize';

import JPEG_DEC_WASM from '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm?module';
import PNG_DEC_WASM from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm?module';
import JPEG_ENC_WASM from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?module';
import WEBP_ENC_WASM from '@jsquash/webp/codec/enc/webp_enc.wasm?module';
import RESIZE_WASM from '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm?module';

// workerd (and Node) have no Canvas, so the codecs' ImageData isn't defined.
const g = globalThis as unknown as { ImageData?: unknown };
if (typeof g.ImageData === 'undefined') {
  g.ImageData = class {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(a: Uint8ClampedArray | number, b: number, c?: number) {
      if (a instanceof Uint8ClampedArray) {
        this.data = a;
        this.width = b;
        this.height = c ?? 0;
      } else {
        this.width = a;
        this.height = b;
        this.data = new Uint8ClampedArray(a * b * 4);
      }
    }
  };
}

let ready: Promise<unknown> | null = null;
function ensureInit(): Promise<unknown> {
  // On failure, clear `ready` so the next upload retries (don't cache a rejection).
  ready ??= Promise.all([
    initJpegDec(JPEG_DEC_WASM),
    initPngDec(PNG_DEC_WASM),
    initJpegEnc(JPEG_ENC_WASM),
    initWebpEnc(WEBP_ENC_WASM),
    initResize(RESIZE_WASM),
  ]).catch((e: unknown) => {
    ready = null;
    throw e;
  });
  return ready;
}

// mozjpeg has no alpha — composite RGBA over white so transparent PNGs don't
// turn black in the JPEG fallback. No-op for already-opaque images.
function flattenOnWhite(img: ImageData): ImageData {
  const { data, width, height } = img;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    out[i] = data[i] * a + 255 * (1 - a);
    out[i + 1] = data[i + 1] * a + 255 * (1 - a);
    out[i + 2] = data[i + 2] * a + 255 * (1 - a);
    out[i + 3] = 255;
  }
  return new ImageData(out, width, height);
}

export interface Variant {
  width: number;
  webp: ArrayBuffer;
  jpg: ArrayBuffer;
}
export interface Processed {
  w: number;
  h: number;
  variants: Variant[];
}

/** Decode → resize to each width (≤ original) → encode WebP + JPEG. */
export async function processImage(input: ArrayBuffer, type: string, widths: number[]): Promise<Processed> {
  await ensureInit();
  const decoded = type.includes('png') ? await decodePng(input) : await decodeJpeg(input);
  const W = decoded.width;
  const H = decoded.height;
  if (W < 1 || H < 1) throw new Error('Image has no dimensions');

  const targets = widths.filter((w) => w < W);
  targets.push(W); // always keep the (capped) original width as the largest

  const variants: Variant[] = [];
  for (const tw of targets) {
    const th = Math.max(1, Math.round((H * tw) / W)); // never round to 0 on extreme ratios
    const frame = tw === W ? decoded : await resize(decoded, { width: tw, height: th });
    const [webp, jpg] = await Promise.all([
      encodeWebp(frame, { quality: 80 }),
      encodeJpeg(flattenOnWhite(frame), { quality: 80 }),
    ]);
    variants.push({ width: tw, webp, jpg });
  }
  return { w: W, h: H, variants };
}
