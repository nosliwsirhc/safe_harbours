// @ts-check
import { defineConfig, passthroughImageService, sessionDrivers } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// Mostly-static content site with one on-demand endpoint (the contact form).
// Pages are prerendered by default; the contact API route opts into SSR and
// runs as a Cloudflare Worker (static assets + a server entry).
export default defineConfig({
  site: 'https://www.safeharbours.ca',
  output: 'static',
  trailingSlash: 'never',
  // Emit flat files (/our-story.html, not /our-story/index.html) so Cloudflare
  // serves no-slash URLs with a 200 instead of 308-redirecting to a trailing
  // slash — keeps the served URL matching our no-slash canonicals.
  build: { format: 'file' },
  // imageService 'compile' transforms images at build time for prerendered
  // routes instead of using a runtime Cloudflare Images binding. Combined with
  // passthroughImageService below, this avoids requiring an IMAGES binding on
  // the Worker.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap()],
  // Images are served as-is from public/ (the mirror writes them under
  // public/assets/), so no build-time image transformation is needed.
  image: { service: passthroughImageService() },
  prefetch: { prefetchAll: true },
  // We don't use Astro sessions. Without an explicit driver the Cloudflare
  // adapter defaults to a KV-backed session and emits a SESSION KV binding
  // that would need a provisioned namespace at deploy time. A memory driver
  // keeps the build binding-free; nothing in the site ever reads a session.
  // @ts-expect-error — `memory` exists at runtime (it's in sessionDrivers) but is
  // omitted from Astro's sessionDrivers type. Self-clears if Astro fixes the type.
  session: { driver: sessionDrivers.memory() },
});
