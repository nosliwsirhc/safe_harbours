// @ts-check
import { defineConfig, passthroughImageService, sessionDrivers } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import remarkDirective from 'remark-directive';
import remarkArticle from './src/lib/remark-article.mjs';

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
  // routes instead of using a runtime Cloudflare Images binding. We already
  // pre-generate every image and use passthroughImageService below, so this
  // just avoids requiring an IMAGES binding on the Worker.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap()],
  // Images live in public/ and are referenced directly, so we don't need
  // sharp-based optimization. Passthrough avoids the native sharp dependency.
  image: { service: passthroughImageService() },
  prefetch: { prefetchAll: true },
  // We don't use Astro sessions. Without an explicit driver the Cloudflare
  // adapter defaults to a KV-backed session and emits a SESSION KV binding
  // that would need a provisioned namespace at deploy time. A memory driver
  // keeps the build binding-free; nothing in the site ever reads a session.
  session: { driver: sessionDrivers.memory() },
  // Article authoring directives (:::pullquote, :::stats, ::figure, ...) that
  // map onto the editorial classes in global.css. remarkDirective must run
  // first to parse the syntax; remarkArticle then rewrites the nodes.
  markdown: { remarkPlugins: [remarkDirective, remarkArticle] },
});
