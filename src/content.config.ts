import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Bu koleksiyonlar /admin panelinden de düzenleniyor; alanları değiştirirsen
// public/admin/config.yml dosyasını da güncelle.
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const projeler = defineCollection({
  loader: glob({ base: './src/content/projeler', pattern: '**/*.json' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    order: z.number().default(100),
    tags: z.array(z.string()).default([]),
    // Sitedeki yol (/karteikasten/) ya da tam adres (https://...)
    url: z.string().optional().transform((v) => v || undefined),
    repo: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  }),
});

const sayfalar = defineCollection({
  loader: glob({ base: './src/content/sayfalar', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { blog, projeler, sayfalar };
