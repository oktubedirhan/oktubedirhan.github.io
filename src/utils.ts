import { getCollection } from 'astro:content';
import type { Lang } from './i18n';

export async function getPosts(lang: Lang = 'tr') {
  const posts = await getCollection(
    'blog',
    ({ data }) => data.lang === lang && (import.meta.env.DEV || !data.draft),
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// İngilizce alan boşsa Türkçesi gösterilir.
export async function getProjects(lang: Lang = 'tr') {
  const projects = await getCollection('projeler');
  return projects
    .map(({ data: p }) => {
      const en = lang === 'en';
      return {
        ...p,
        description: (en && p.description_en) || p.description,
        detay: (en && p.detay_en) || p.detay,
        katmanlar: p.katmanlar?.map((k) => ({ ad: k.ad, is: (en && k.is_en) || k.is })),
      };
    })
    .sort((a, b) => a.order - b.order);
}

export type Project = Awaited<ReturnType<typeof getProjects>>[number];
