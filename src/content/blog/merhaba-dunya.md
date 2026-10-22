---
title: Merhaba dünya
description: Bu sitenin ilk yazısı ve nasıl yapıldığına dair kısa bir not.
date: 2026-10-23
tags: [meta]
---

Bu blogun ilk yazısı. Site [Astro](https://astro.build) ile yapıldı ve GitHub Pages üzerinde duruyor.
Her `git push` sonrası GitHub Actions siteyi otomatik olarak yeniden derleyip yayınlıyor.

## Yeni yazı nasıl eklenir?

`src/content/blog/` klasörüne bir Markdown dosyası eklemek yeterli:

```md
---
title: Yazının başlığı
description: Kısa bir özet
date: 2026-10-23
tags: [matematik]
---

Yazının içeriği...
```

> Taslak bir yazıyı yayınlamadan önce `draft: true` ekleyerek gizleyebilirsin.
