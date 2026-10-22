// Domain belli olunca SITE_URL'i güncelle (public/CNAME ile aynı olmalı).
export const SITE_URL = 'https://example.com';
export const SITE_TITLE = 'Bedirhan Oktu';
export const SITE_DESCRIPTION = 'ODTÜ Matematik öğrencisi. Yazılar, projeler ve notlar.';

export const LINKS = {
  github: 'https://github.com/oktubedirhan',
  email: 'mailto:oktubedirhan@gmail.com',
};

export type Project = {
  name: string;
  description: string;
  tags: string[];
  url?: string;
  repo?: string;
};

export const PROJECTS: Project[] = [
  {
    name: 'Köprü',
    description:
      "Apple Silicon Mac'te Windows oyunlarını CrossOver Wine + D3DMetal ile çalıştırmak için yazdığım bir öğrenme projesi.",
    tags: ['Swift', 'macOS'],
    repo: 'https://github.com/oktubedirhan/kopru',
  },
  {
    name: 'Denge',
    description: 'Denge iPhone uygulaması ve onun tanıtım / gizlilik sayfaları.',
    tags: ['iOS', 'HTML'],
    url: 'https://oktubedirhan.github.io/denge-site/',
    repo: 'https://github.com/oktubedirhan/denge-site',
  },
  {
    name: 'Blackjack',
    description: 'Tarayıcıda oynanan basit bir blackjack oyunu.',
    tags: ['JavaScript'],
    repo: 'https://github.com/oktubedirhan/blackjack',
  },
];
