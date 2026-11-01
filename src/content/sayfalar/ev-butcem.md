---
title: Ev Bütçem
---

Ev Bütçem, evin parasını iki telefondan birlikte tutmak için yazdığım bir uygulama. Her kategori bir fatura gibi okunuyor: bu ayki tutar, son altı ayın küçük çubukları ve kesik çizgiyle bütçe. Şu an telefonda çalışan bir web uygulaması (PWA) ve mağazalara hazırlanıyor. O zamana kadar en güncel deneme sürümü yukarıdaki düğmeyle açılıyor; her yeni özellikten sonra güncelleniyor.

## Neler yapıyor

- **Açılış kurulumu:** Maaş, kira ve bugün elindeki para üç adımda soruluyor; maaş ve kira her ay kendiliğinden ekleniyor.
- **Tekrarlayan kayıt ve taksit:** "1.200 ₺, 6 taksit" altı aya bölünüyor ve ileriki aylarda planlı görünüyor. Bölünmeyen kuruşlar son taksitte toplanıyor; taksitlerin toplamı kuruşu kuruşuna aynı.
- **Hesaplar:** Nakit, banka ve kredi kartı ayrı. Kartla yapılan harcama elindeki parayı değil kart borcunu artırıyor; kart ödemesi gider sayılmıyor.
- **Koç:** 100 üzerinden bir denge puanı (harcama hızı, bütçe aşımı, güvenlik payı) ve yapay zekâyla yazılan kısa yorumlar. Koç yalnızca harcama alışkanlığı hakkında konuşuyor; yatırım, kredi ya da döviz önerisi vermiyor.
- **Ekran görüntüsünden ekleme:** Banka uygulamasının ekran görüntüsündeki hareketler okunuyor; hiçbiri sen onaylamadan eklenmiyor.
- **Hızlı giriş ve arama:** Nottan kategori tahmini ("Migros" yazınca Market), son kaydı tekrarlama ve kayıtlarda metin, tarih aralığı ya da tutarla arama.
- **Hane paylaşımı:** Hesap ya da e-posta yok. Bir telefonda hane kuruluyor, verilen kod öbür telefona giriliyor.

## Gizlilik

- Kayıtlar telefonda duruyor. Hane paylaşımı açıksa eşitlenmek için Supabase'in Frankfurt'taki sunucusuna gidiyor; sunucu hane kodunu değil, yalnızca SHA-256 özetini saklıyor. Tablolar dışarıya kapalı, telefon yalnızca üç fonksiyonu çağırabiliyor.
- Koça tek tek kayıtlar, notlar ya da elindeki para gitmiyor; yalnızca aylık kategori toplamları ve oranlar gidiyor.

## Nasıl test ediliyor

- Para hesapları (bütçe, taksit, denge puanı, bakiyeler) arayüzden ayrı saf fonksiyonlarda; 350 birim testiyle sınanıyor.
- Koçun cevapları 30 hazır senaryoluk bir değerlendirme setiyle ölçülüyor: rakamlar doğru olmalı, yasak öneri sıfır olmalı. Model ya da istem ancak puan düşmüyorsa değişiyor.
- Ekranlar açık ve koyu temada, telefon genişliğinde kontrol ediliyor.

## Yol haritası

| İş | Durum |
|---|---|
| Özet, Aylar, Kayıtlar ekranları ve bütçeler | Bitti |
| İki telefon arasında hane eşitlemesi | Bitti |
| Koç: denge puanı, yorum, günlük gözlem, koça soru | Bitti |
| Kurulum, tekrarlayan kayıt, taksit, kategori yönetimi | Bitti |
| Hesaplar, hızlı giriş, arama | Bitti |
| Etiketler, abonelik dedektifi, haftalık özet, bildirimler | Sırada |
| Mağaza sürümü, önce Google Play | Sırada |
