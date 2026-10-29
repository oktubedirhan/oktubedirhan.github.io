import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from './consts';
import { getPosts } from './utils';
import { ui, postHref, type Lang } from './i18n';

export const rssFeed = (lang: Lang) => async (context: APIContext) => {
  const posts = await getPosts(lang);
  return rss({
    title: SITE_TITLE,
    description: ui[lang].description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postHref(lang, post.id),
    })),
  });
};
