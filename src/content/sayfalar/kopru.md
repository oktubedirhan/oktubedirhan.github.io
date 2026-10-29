---
title: Köprü
---

Köprü, Windows oyunlarını Apple Silicon Mac'te çalıştıran ve kişisel kullanım için yazdığım bir başlatıcı. Amacım hem çalışan bir araç elde etmekti, hem de bu tür araçların (Wine, D3DMetal, CrossOver, GameToMac) nasıl çalıştığını adım adım öğrenmek.

Bu bir Mac uygulaması, tarayıcıda çalışmıyor. Kaynak kodu açık ama hazır paket dağıtmıyorum: D3DMetal'i herkes Apple'dan kendisi indiriyor, oyunlar da kişinin kendi Steam kopyası.

## Çalışan oyunlar

- **The Witcher 3** (Steam, DirectX 12, D3DMetal 4)
- **Batman: Arkham Asylum** (DirectX 9 → wined3d/OpenGL, 32-bit; ses sorunu hâlâ açık)

Elden Ring, RDR2 gibi yeni oyunlar şimdilik rafta.

## Yol haritası

| İş | Durum |
|---|---|
| Wine'ı kurmak, terminalden bir Windows programı açmak | Bitti |
| Apple Game Porting Toolkit'teki D3DMetal'i Wine'a bağlamak | Bitti |
| Prefix içine Windows Steam'i kurup bir DirectX oyunu çalıştırmak | Bitti |
| Wine'ı (CrossOver 26.3) kaynaktan derlemek ve kendi yamalarımı eklemek | Bitti |
| Kendi SwiftUI başlatıcım: oyun listesi, tek tıkla başlatma, ayarlar | Sürüyor |
| Yeni oyunlar: Elden Ring, RDR2, Batman: Arkham Knight… | Rafta |

## Kendin denemek istersen

Apple Silicon bir Mac ve macOS 15 veya üstü gerekiyor. Adım adım kurulum [docs/KURULUM.md](https://github.com/oktubedirhan/kopru/blob/main/docs/KURULUM.md) dosyasında.
