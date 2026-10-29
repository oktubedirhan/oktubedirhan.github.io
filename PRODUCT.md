# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Karma bir kitle, hiçbiri öne çıkarılmıyor:

- Akademik değerlendirenler: yurt dışı programlar, hocalar. CV'ye ve projelere bakarlar.
- İş ve staj için bakanlar: şirketler, işe alımcılar. Yazılım projelerine ve GitHub'a bakarlar.
- Kişisel çevre ve okuyucular: blog yazılarını ve notları okurlar.

## Product Purpose

Bedirhan Oktu'nun kişisel sitesi: ODTÜ Matematik öğrencisi (İngilizce hazırlık), kendi başına Swift ile Apple uygulamaları ve TypeScript ile web uygulamaları geliştiriyor. Site üç işi yapar: kim olduğunu anlatır (Hakkımda, CV), ne yaptığını gösterir (Projeler ve proje sayfaları), ne öğrendiğini paylaşır (Blog). Başarı: her ziyaretçi grubu aradığına bir iki tıkla ulaşır ve sahibini hatırlar.

## Positioning

Matematik okuyan biri olup gerçekten çalışan yazılımı kendi başına yazan bir öğrenci. Köprü (Wine'ı kaynaktan derleyip D3DMetal ile The Witcher 3'ü Apple Silicon'da çalıştırıyor) ve gerçek 52 kartlık deste ile Fisher–Yates karıştırma yapan Blackjack gibi teknik derinliği olan, merakla yapılmış projeler.

## Operating Context

- Astro 7 statik site, GitHub Pages'te, `main`'e her push sonrası GitHub Actions ile yayınlanıyor. Alan adı www.bedirhanoktu.dev.
- İçerik `/admin` panelinden düzenleniyor (`public/admin/config.yml`): blog yazıları, projeler (`src/content/projeler/*.json`), sayfalar (`src/content/sayfalar/*.md`), CV (`src/data/cv.json`), ana sayfa metni (`src/data/home.json`).
- Rotalar: Türkçe kökte (`/`, `/blog/`, `/blog/<slug>/`, `/projeler/`, `/hakkimda/`, `/kopru/`), İngilizce `/en/` altında (`/en/`, `/en/blog/`, `/en/projects/`, `/en/about/`, `/en/kopru/`, `/en/cv/`). Eski `/cv/` adresi `/en/cv/`'ye yönlenir. Başka repolarda duran proje siteleri (`/denge-site/`, `/karteikasten/`, `/blackjack/`) tek dillidir.
- Şu an blogda yayınlanmış yazı yok; boş durum gerçek bir durum.

## Capabilities and Constraints

- Panel alanları korunmalı: koleksiyon şemalarını ya da `cv.json` ve `home.json` alan adlarını değiştiren bir iş `config.yml`'yi de güncellemeli ve panelden düzenlemeyi bozmamalı.
- CV sayfasının "PDF olarak kaydet" yazdırma çıktısı tek bir A4 sayfa olarak kalmalı; site header'ı ve footer'ı yazdırmada çıkmamalı.
- Açık ve koyu tema sistem tercihine (`prefers-color-scheme`) göre çalışmalı.
- Dil: site iki dilli (TR/EN). Sayfa görünümleri `src/views/` altında bir kez yazılır, arayüz metinleri `src/i18n.ts`'dedir; panelde her içerik alanının bir `(English)` karşılığı var (`*_en` alanları, `src/content/sayfalar/en/`), blog yazılarında `lang` alanı. İngilizce alan boşsa Türkçesi gösterilir. CV yalnızca İngilizce.
- CV'ye adres, telefon, doğum tarihi ve doğum yeri bilerek eklenmedi; eklenmemeli.

## Brand Commitments

- Ad: Bedirhan Oktu. Ses birinci tekil şahıs ve samimi; Türkçede okuyucuya "sen" diye hitap ediliyor.

## Evidence on Hand

- CV verisi: `src/data/cv.json` (eğitim, YKS sayısalda ilk %0,84, projeler, diller, yüzgeçli yüzme 400 m İstanbul ikinciliği).
- Dört proje ve açıklamaları: `src/content/projeler/`. Köprü'nün uzun tanıtım metni: `src/content/sayfalar/kopru.md`.
- Denge'nin gerçek ekran görüntüleri var (denge-site reposundaki `img/`, sitede `public/media/denge/`). Başka proje ekran görüntüsü, fotoğraf ya da portre yok. Uydurma yapılmamalı; görsel gerekirse kullanıcıdan istenmeli ya da açıkça örnek diye etiketlenmeli.
- Referans, müşteri ya da sayı iddiası yok; eklenmemeli.

## Product Principles

1. Üç kitleye de eşit kapı: CV, projeler ve yazılar ilk ekrandan bulunabilir olmalı.
2. Gösterilen şeyler gerçek: projeler kendi teknik ayrıntılarıyla anlatılır, abartılmaz.
3. İçeriği sahibi kendi düzenler: tasarım paneli ve içerik akışını hiçbir zaman zorlaştırmamalı.
4. Okunabilirlik süsten önce gelir: uzun yazılar ve CV rahat okunmalı, yazdırılabilmeli.
