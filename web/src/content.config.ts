import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Resource articles live as Markdown in src/content/resources/. Adding an
// article = adding a file. Bodies are markdown prose with raw HTML kept for the
// formatting markdown can't express (centred blocks, tables, new-tab links).
const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: z.object({
    title: z.string(),
    heroImage: z.string(),
    // Card fields — present for articles that appear as a post card somewhere.
    thumbnail: z.string().optional(),
    excerpt: z.string().optional(),
    date: z.coerce.date(),
    author: z.string().default('Safe Harbours'),
    // Ordered slugs shown in this article's related-posts row.
    related: z.array(z.string()).default([]),
    // Position on the /resources index grid (omit to keep an article off the index).
    indexOrder: z.number().optional(),
  }),
});

export const collections = { resources };
