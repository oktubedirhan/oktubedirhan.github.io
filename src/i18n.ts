// İki dil: Türkçe kökte, İngilizce /en/ altında. CV yalnızca İngilizce (/en/cv/).
export type Lang = 'tr' | 'en';

export const routes = {
  home: { tr: '/', en: '/en/' },
  blog: { tr: '/blog/', en: '/en/blog/' },
  projects: { tr: '/projeler/', en: '/en/projects/' },
  about: { tr: '/hakkimda/', en: '/en/about/' },
  kopru: { tr: '/kopru/', en: '/en/kopru/' },
  cv: { tr: '/en/cv/', en: '/en/cv/' },
  rss: { tr: '/rss.xml', en: '/en/rss.xml' },
} as const;

export type RouteName = keyof typeof routes;

export const ui = {
  tr: {
    locale: 'tr-TR',
    description: 'ODTÜ Matematik öğrencisi. Yazılar, projeler ve notlar.',
    nav: { blog: 'Blog', projects: 'Projeler', about: 'Hakkımda', cv: 'CV' },
    navLabel: 'Ana menü',
    footerLabel: 'Bağlantılar',
    email: 'E-posta',
    switchTo: { label: 'EN', name: 'English' },
    themeToDark: 'Koyu temaya geç',
    themeToLight: 'Açık temaya geç',
    hello: 'Merhaba, ben',
    seeProjects: 'Projelere bak ↓',
    writing: 'Yazılar',
    cvOther: { text: 'CV in English', lang: 'en' },
    now: 'Şu an',
    projects: 'Projeler',
    all: 'Tümü →',
    projectPage: 'Proje sayfası →',
    source: 'Kaynak kod',
    stackCaption: 'Bir oyun açıldığında çağrılar yukarıdan aşağı iner.',
    noPostsHome: 'İlk yazı üzerinde çalışıyorum. Yayınlandığında {rss} akışında görünecek.',
    noPosts: 'Henüz yazı yok.',
    blogLead: 'Matematik, yazılım ve öğrendiklerim üzerine yazılar.',
    projectsTitle: 'Projeler',
    projectsLead: 'Üzerinde çalıştığım ya da çalışmış olduğum şeyler.',
    projectsDescription: 'Üzerinde çalıştığım projeler.',
    readingTime: (m: number) => `· ${m} dk okuma`,
    draft: 'taslak',
    toc: 'İçindekiler',
    allPosts: '← Tüm yazılar',
    allProjects: '← Tüm projeler',
    kopruKicker: 'Proje · macOS',
    kopruDescription: "Windows oyunlarını Apple Silicon Mac'te çalıştıran başlatıcı.",
    kopruGithub: "GitHub'da incele →",
    kopruInstall: 'Kurulum',
  },
  en: {
    locale: 'en-GB',
    description: 'Mathematics student at METU. Writing, projects and notes.',
    nav: { blog: 'Blog', projects: 'Projects', about: 'About', cv: 'CV' },
    navLabel: 'Main menu',
    footerLabel: 'Links',
    email: 'Email',
    switchTo: { label: 'TR', name: 'Türkçe' },
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
    hello: "Hi, I'm",
    seeProjects: 'See my projects ↓',
    writing: 'Writing',
    cvOther: null,
    now: 'Now',
    projects: 'Projects',
    all: 'All →',
    projectPage: 'Project page →',
    source: 'Source code',
    stackCaption: 'When a game starts, calls travel from the top layer down.',
    noPostsHome: "I'm working on the first post. It will show up in the {rss} feed once it's out.",
    noPosts: 'No posts yet.',
    blogLead: 'Writing on mathematics, software and what I learn along the way.',
    projectsTitle: 'Projects',
    projectsLead: "Things I'm working on or have worked on.",
    projectsDescription: "Projects I've built.",
    readingTime: (m: number) => `· ${m} min read`,
    draft: 'draft',
    toc: 'Contents',
    allPosts: '← All posts',
    allProjects: '← All projects',
    kopruKicker: 'Project · macOS',
    kopruDescription: 'A launcher that runs Windows games on Apple Silicon Macs.',
    kopruGithub: 'View on GitHub →',
    kopruInstall: 'Install guide (Turkish)',
  },
} as const;

export const other = (lang: Lang): Lang => (lang === 'tr' ? 'en' : 'tr');

// Köprü'nün sayfası iki dilde var; öbür proje siteleri (/karteikasten/ vb.) tek dilli.
export const localHref = (lang: Lang, href?: string) => (href === routes.kopru.tr ? routes.kopru[lang] : href);

export const postHref = (lang: Lang, id: string) => `${routes.blog[lang]}${id}/`;
