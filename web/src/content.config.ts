import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts live as Markdown in src/content/blog/. Adding a post = adding a file.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default('Safe Harbours'),
    youtube: z.string().optional(), // YouTube video id
    // Optional hero image: path under /public WITHOUT extension, e.g.
    // "/images/foster-family". Responsive avif/webp/jpg variants
    // (-640/-1024/-1440/-1920) are used when present.
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    // Short kicker shown above the headline (defaults to "Resources").
    kicker: z.string().default('Resources'),
  }),
});

export const collections = { blog };
