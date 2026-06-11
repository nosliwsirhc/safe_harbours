import { imageVariants } from '../data/image-variants';

// Builds a CSS image-set() for a background image: the browser picks AVIF or
// WebP (the original is the in-set fallback). Chooses the largest pre-generated
// variant whose width is <= maxWidth. Variant widths come from the build-time
// manifest (scripts/images.mjs) — the Cloudflare prerender runtime has no
// node:fs, so we can't scan the disk here.
export function bgImageSet(src: string, maxWidth = 1920): string {
  const widths = Object.hasOwn(imageVariants, src) ? imageVariants[src] : undefined;
  if (!widths?.length) return `url("${src}")`; // no variants — serve original
  const base = src.replace(/\.(jpe?g|png)$/i, '');
  const pick = widths.filter((w) => w <= maxWidth).pop() ?? widths[0];
  return `image-set(url("${base}-${pick}.avif") type("image/avif"), url("${base}-${pick}.webp") type("image/webp"), url("${src}"))`;
}
