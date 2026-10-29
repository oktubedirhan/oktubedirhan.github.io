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
    ogAlt: 'Bedirhan Oktu. ODTÜ · Matematik · Swift ve TypeScript.',
    nav: { blog: 'Blog', projects: 'Projeler', about: 'Hakkımda', cv: 'CV' },
    navLabel: 'Ana menü',
    skip: 'İçeriğe geç',
    footerLabel: 'Bağlantılar',
    email: 'E-posta',
    switchTo: { label: 'EN', name: 'English' },
    themeToDark: 'Koyu temaya geç',
    themeToLight: 'Açık temaya geç',
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
    kopruKicker: 'Proje',
    kopruDescription: "Windows oyunlarını Apple Silicon Mac'te çalıştıran başlatıcı.",
    kopruGithub: "GitHub'da incele →",
    kopruInstall: 'Kurulum',
    howItWorks: 'Nasıl çalışıyor?',
    shuffleCaption:
      'Fisher–Yates, 8 kartla: sondan başlayarak her konuma, kendisi dahil önündeki kartlardan rastgele biri gelir. Oyun aynısını 52 kartla yapıyor.',
    leitnerBox: 'Kutu',
    leitnerGaps: ['bugün', '1 gün', '3 gün', '7 gün', '16 gün'],
    leitnerCaption:
      "Doğru bilinen kart bir sonraki kutuya geçer ve daha seyrek sorulur; yanlış bilinen kart hangi kutuda olursa olsun Kutu 1'e döner.",
  },
  en: {
    locale: 'en-GB',
    description: 'Mathematics student at METU. Writing, projects and notes.',
    ogAlt: 'Bedirhan Oktu. METU · Mathematics · Swift & TypeScript.',
    nav: { blog: 'Blog', projects: 'Projects', about: 'About', cv: 'CV' },
    navLabel: 'Main menu',
    skip: 'Skip to content',
    footerLabel: 'Links',
    email: 'Email',
    switchTo: { label: 'TR', name: 'Türkçe' },
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
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
    kopruKicker: 'Project',
    kopruDescription: 'A launcher that runs Windows games on Apple Silicon Macs.',
    kopruGithub: 'View on GitHub →',
    kopruInstall: 'Install guide (Turkish)',
    howItWorks: 'How does it work?',
    shuffleCaption:
      'Fisher–Yates with 8 cards: working back from the end, each position gets a random card from those at or before it. The game does the same with 52.',
    leitnerBox: 'Box',
    leitnerGaps: ['today', '1 day', '3 days', '7 days', '16 days'],
    leitnerCaption:
      'A card you get right moves to the next box and comes back less often; a card you get wrong drops to Box 1, wherever it was.',
  },
} as const;

export const other = (lang: Lang): Lang => (lang === 'tr' ? 'en' : 'tr');

// Köprü'nün sayfası iki dilde var; öbür proje siteleri (/karteikasten/ vb.) tek dilli.
export const localHref = (lang: Lang, href?: string) => (href === routes.kopru.tr ? routes.kopru[lang] : href);

export const postHref = (lang: Lang, id: string) => `${routes.blog[lang]}${id}/`;
