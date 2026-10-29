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
    // tr yazılar /blog/ altında, en yazılar /en/blog/ altında listelenir.
    lang: z.enum(['tr', 'en']).default('tr'),
    draft: z.boolean().default(false),
  }),
});

const projeler = defineCollection({
  loader: glob({ base: './src/content/projeler', pattern: '**/*.json' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    description_en: z.string().optional(),
    order: z.number().default(100),
    tags: z.array(z.string()).default([]),
    // Nasıl yapıldığını anlatan tek cümle; ana sayfada açıklamanın altında görünür.
    detay: z.string().optional(),
    detay_en: z.string().optional(),
    // Öne çıkan projede üstten alta yığın şeması olarak çizilir.
    katmanlar: z.array(z.object({ ad: z.string(), is: z.string(), is_en: z.string().optional() })).optional(),
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
