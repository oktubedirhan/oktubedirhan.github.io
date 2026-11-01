// Hesaplar (Faz 3 madde 5, docs/hesap-sozlesme.md): ekle, düzelt, gizle, aktarım. Saf işlemler; testi tests/hesap.test.mjs.
// Bakiye hesapları veri.js'de (hesapBakiyeleri, elindekiPara, kartBorcu, netPara).
import { ANA_HESAP, anaHesap, hesapBakiyeleri, siraSirala, yeniId, bugun } from './veri.js';

export const HESAP_TURLERI = { nakit: 'Nakit', banka: 'Banka', kart: 'Kredi kartı' };
export const AD_SINIRI = 24;
const TUTAR_SINIRI = 1e11; // sunucuda numeric(14,2)
/** Sunucu tek seferde en çok 50 hesap alır; fazlası bütün eşitlemeyi durdurur. */
export const HESAP_SINIRI = 50;

const kurus = (x) => Math.round(x * 100) / 100;
const adTemizle = (ad) => String(ad ?? '').replace(/\s+/g, ' ').trim().slice(0, AD_SINIRI);
const ayniAd = (a, b) => a.toLocaleLowerCase('tr') === b.toLocaleLowerCase('tr');
const gecerliTutar = (x) => Number.isFinite(x) && Math.abs(x) < TUTAR_SINIRI;
const sonSira = (durum) => Math.max(-1, ...(durum.hesaplar ?? []).map((h) => h.sira ?? 0)) + 1;

/** Ana hesap + görünen hesaplar, sırasıyla. */
export const gorunenHesaplar = (durum) => [anaHesap(durum), ...(durum.hesaplar ?? []).filter((h) => !h.silindi).sort(siraSirala)];
export const gizliHesaplar = (durum) => (durum.hesaplar ?? []).filter((h) => h.silindi).sort(siraSirala);
/** Kayıt formunda hesap seçici: yalnızca seçilecek birden çok hesap varsa. */
export const hesapSecimiGerekli = (durum) => gorunenHesaplar(durum).length >= 2;

export function hesapBul(durum, id) {
  if (!id || id === ANA_HESAP) return anaHesap(durum);
  return (durum.hesaplar ?? []).find((h) => h.id === id) ?? anaHesap(durum);
}

/** Yeni kayıtta önerilecek hesap: son kullanılan (görünüyorsa), yoksa Ana hesap. */
export function varsayilanHesap(durum) {
  const son = durum.sonHesap;
  return gorunenHesaplar(durum).some((h) => h.id === son) ? son : ANA_HESAP;
}

/** '' | 'bos' | 'ayni'. Ana hesabın adı da sayılır; gizli hesaplar da (aynı adla iki hesap karışır). */
export function hesapAdHatasi(durum, ad, haricId = null) {
  const temiz = adTemizle(ad);
  if (!temiz) return 'bos';
  return [anaHesap(durum), ...(durum.hesaplar ?? [])].some((h) => h.id !== haricId && ayniAd(h.ad, temiz)) ? 'ayni' : '';
}

/**
 * Yeni hesap. tutar: nakit/bankada bugünkü bakiye, kartta bugünkü BORÇ (artı yazılır, eksi saklanır).
 * Bugünden önce yapılmış kayıt olmadığı için başlangıç = bugünkü bakiye.
 * anadanDus: bu para (ya da bu borcun harcamaları) şimdiye kadar Ana hesapta sayılıyordu. Ana hesabın başlangıcı
 * karşı yönde kaydırılır: net para ve geçmiş ay sonları değişmez, para iki kez sayılmaz.
 * Sınır dolduysa null döner.
 */
export function hesapEkle(durum, { ad, tur, tutar = 0, anadanDus = false }, simdi = Date.now()) {
  if (!HESAP_TURLERI[tur]) throw new Error('Hesap türü nakit, banka ya da kart olmalı');
  if ((durum.hesaplar ?? []).length >= HESAP_SINIRI) return null;
  const t = gecerliTutar(tutar) ? (tur === 'kart' ? Math.abs(kurus(tutar)) : kurus(tutar)) : 0;
  if (anadanDus && t) {
    durum.baslangic = kurus((durum.baslangic || 0) + (tur === 'kart' ? Math.abs(t) : -t));
    durum.baslangicGuncel = simdi;
  }
  const h = { id: yeniId(), ad: adTemizle(ad) || HESAP_TURLERI[tur], tur, baslangic: tur === 'kart' ? -Math.abs(t) : t, sira: sonSira(durum), silindi: false, guncel: simdi };
  (durum.hesaplar ??= []).push(h);
  return h;
}

/** Hesabın bugünkü bakiyesi kullanıcıya gösterilecek biçimde: kartta borç (artı), öbürlerinde bakiye. */
export function gosterilenTutar(durum, id, gun = bugun()) {
  const v = hesapBakiyeleri(durum, gun).get(id ?? ANA_HESAP);
  if (!v) return 0;
  return v.hesap.tur === 'kart' ? kurus(-v.bakiye) : v.bakiye;
}

/**
 * Ad ve bugünkü bakiyeyi düzeltir. Bakiye, başlangıç kaydırılarak tutturulur (geçmiş kayıtlar değişmez).
 * Ana hesapta ad değişmez, başlangıç durum.baslangic'tır. Değişmeyen alana dokunmaz. Değişti mi döner.
 */
export function hesapDuzelt(durum, id, { ad, tutar }, gun = bugun(), simdi = Date.now()) {
  const ana = !id || id === ANA_HESAP;
  const h = ana ? null : (durum.hesaplar ?? []).find((x) => x.id === id);
  if (!ana && !h) return false;
  let degisti = false;
  if (h && ad !== undefined) {
    const yeniAd = adTemizle(ad) || h.ad;
    if (yeniAd !== h.ad) { h.ad = yeniAd; degisti = true; }
  }
  if (tutar !== undefined && gecerliTutar(tutar)) {
    const fark = kurus(tutar - gosterilenTutar(durum, ana ? ANA_HESAP : id, gun));
    if (fark !== 0) {
      const kayma = h?.tur === 'kart' ? -fark : fark;
      if (ana) { durum.baslangic = kurus((durum.baslangic || 0) + kayma); durum.baslangicGuncel = simdi; }
      else h.baslangic = kurus((Number(h.baslangic) || 0) + kayma);
      degisti = true;
    }
  }
  if (degisti && h) h.guncel = simdi;
  return degisti;
}

/** Gizler (Ana hesap gizlenemez). Parası toplamlara girmeye devam eder; yeni kayıtta seçilemez. */
export function hesapGizle(durum, id, simdi = Date.now()) {
  const h = (durum.hesaplar ?? []).find((x) => x.id === id);
  if (!h || h.silindi) return false;
  h.silindi = true;
  h.guncel = simdi;
  if (durum.sonHesap === id) durum.sonHesap = ANA_HESAP;
  return true;
}

export function hesapGoster(durum, id, simdi = Date.now()) {
  const h = (durum.hesaplar ?? []).find((x) => x.id === id);
  if (!h || !h.silindi) return false;
  h.silindi = false;
  h.sira = sonSira(durum);
  h.guncel = simdi;
  return true;
}

/** '' | 'ayni' (kaynak = hedef) | 'tutar'. */
export function aktarimHatasi({ kaynak, hedef, tutar }) {
  if ((kaynak || ANA_HESAP) === (hedef || ANA_HESAP)) return 'ayni';
  // Kuruşa yuvarlanınca sıfır olan tutar sunucuda reddedilir ve bütün eşitlemeyi durdurur.
  if (!(kurus(tutar) > 0) || !gecerliTutar(tutar)) return 'tutar';
  return '';
}

/** Hesaplar arası para ya da kart ödemesi. Gelir ya da gider değildir. Doğrulanmış olmalı. */
export function aktarimEkle(durum, { kaynak, hedef, tutar, tarih = bugun(), not = '' }, simdi = Date.now()) {
  if (aktarimHatasi({ kaynak, hedef, tutar })) throw new Error('Geçersiz aktarım');
  const a = { id: yeniId(), tarih, kaynak: kaynak || ANA_HESAP, hedef: hedef || ANA_HESAP, tutar: kurus(tutar), not: String(not ?? '').slice(0, 200), silindi: false, guncel: simdi };
  (durum.aktarimlar ??= []).push(a);
  return a;
}

export function aktarimSil(durum, id, simdi = Date.now()) {
  const a = (durum.aktarimlar ?? []).find((x) => x.id === id);
  if (!a || a.silindi) return false;
  a.silindi = true;
  a.guncel = simdi;
  return true;
}

/** Son aktarımlar, yeniden eskiye. */
export const sonAktarimlar = (durum, n = 10) => (durum.aktarimlar ?? []).filter((a) => !a.silindi)
  .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.guncel - a.guncel).slice(0, n);
