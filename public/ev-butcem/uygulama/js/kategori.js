// Kategori yönetimi (Faz 3 madde 4): saf işlemler. DOM'a dokunmaz; arayüzü app.js'de, testi tests/kategori.test.mjs.
// Gizlemek = silindi: true (sunucu şeması aynı). Geçmiş kayıtlar adını korur, yeni kayıtta seçilemez; "Göster" ile geri gelir.
import { VARSAYILAN_KATEGORILER, yeniId, siraSirala } from './veri.js';

export const AD_SINIRI = 24;
/** Sunucuda bütçe numeric(14,2): taşan tutar bütün hane eşitlemesini durdurur. */
export const BUTCE_SINIRI = 1e11;
export const HAZIR_EMOJILER = ['🏠', '🛒', '💡', '📱', '🚗', '🍽️', '☕', '👕', '💊', '📚', '🎉', '📺', '💳', '🧒', '🐾', '🎁', '✈️', '🏋️', '🎮', '💄', '🔧', '⛽', '💰', '🏦'];

const VARSAYILAN_EMOJI = new Map(VARSAYILAN_KATEGORILER.map((k) => [k.id, k.emoji]));

/** Varsayılan kategori, emojisi değiştirilmediyse çizilmiş simgesiyle görünür. */
export const cizimliMi = (k) => Boolean(k) && VARSAYILAN_EMOJI.has(k.id) && k.emoji === VARSAYILAN_EMOJI.get(k.id);
export const varsayilanEmoji = (id) => VARSAYILAN_EMOJI.get(id) ?? null;

/** Boşlukları toparlar, sınırda keser. */
export const adTemizle = (ad) => String(ad ?? '').replace(/\s+/g, ' ').trim().slice(0, AD_SINIRI);

const ayniAd = (a, b) => a.toLocaleLowerCase('tr') === b.toLocaleLowerCase('tr');
const turListesi = (durum, tur) => durum.kategoriler.filter((k) => k.tur === tur && !k.silindi).sort(siraSirala);

/** '' (geçerli) | 'bos' | 'ayni' (aynı türde aynı adlı görünen kategori var) | 'gizli' (gizlenenlerde var: onu göstermek yeter). */
export function adHatasi(durum, ad, tur, haricId = null) {
  const temiz = adTemizle(ad);
  if (!temiz) return 'bos';
  const ayni = durum.kategoriler.find((k) => k.tur === tur && k.id !== haricId && ayniAd(k.ad, temiz));
  return !ayni ? '' : ayni.silindi ? 'gizli' : 'ayni';
}

/** Metnin ilk emojisi; emoji değilse ''. "🏋️‍♀️ spor" → "🏋️‍♀️". */
export function emojiAl(metin) {
  const s = String(metin ?? '').trim();
  if (!s) return '';
  const ilk = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('tr', { granularity: 'grapheme' }).segment(s)][0].segment : [...s][0];
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(ilk) && ilk.length <= 16 ? ilk : '';
}

/** Geçerli bütçe ya da null (boş, sıfır, eksi, sınırı aşan). */
export const butceOku = (b) => (Number.isFinite(b) && b > 0 && b < BUTCE_SINIRI ? Math.round(b * 100) / 100 : null);
const sonSira = (durum) => Math.max(-1, ...durum.kategoriler.map((k) => k.sira ?? 0)) + 1;

/** Yeni kategori, kendi türünün listesinin sonuna. Ad ve emoji doğrulanmış olmalı. */
export function kategoriEkle(durum, { ad, emoji, tur, butce = null }, simdi = Date.now()) {
  if (tur !== 'gelir' && tur !== 'gider') throw new Error('Tür gelir ya da gider olmalı');
  const k = { id: yeniId(), emoji: emojiAl(emoji) || '🏷️', ad: adTemizle(ad), tur, butce: tur === 'gider' ? butceOku(butce) : null, sira: sonSira(durum), guncel: simdi };
  durum.kategoriler.push(k);
  return k;
}

/** Ad, emoji ve bütçe; türü değişmez (kayıtları bozmasın diye). Değişmeyen kategoriye dokunmaz. */
export function kategoriGuncelle(durum, id, { ad, emoji, butce }, simdi = Date.now()) {
  const k = durum.kategoriler.find((x) => x.id === id);
  if (!k) return false;
  const yeni = {
    ad: ad === undefined ? k.ad : adTemizle(ad) || k.ad,
    emoji: emoji === undefined ? k.emoji : emojiAl(emoji) || k.emoji,
    butce: butce === undefined || k.tur !== 'gider' ? k.butce : butceOku(butce),
  };
  if (yeni.ad === k.ad && yeni.emoji === k.emoji && yeni.butce === k.butce) return false;
  Object.assign(k, yeni, { guncel: simdi });
  return true;
}

/**
 * Görünen listede bir yukarı (-1) ya da aşağı (+1) taşır. Sıra numaraları eşitse (iki telefondan aynı anda eklenmiş)
 * önce o türün listesi yeniden numaralanır. Yalnızca sırası değişen kategorilerin guncel'i yenilenir.
 */
export function kategoriTasi(durum, id, yon, simdi = Date.now()) {
  const k = durum.kategoriler.find((x) => x.id === id);
  if (!k || k.silindi) return false;
  const liste = turListesi(durum, k.tur);
  const i = liste.indexOf(k);
  const j = i + yon;
  if (j < 0 || j >= liste.length) return false;
  const siralar = liste.map((x) => x.sira);
  const essiz = new Set(siralar).size === siralar.length;
  const yeniSira = essiz ? siralar.slice() : liste.map((_, n) => Math.min(...siralar) + n);
  [yeniSira[i], yeniSira[j]] = [yeniSira[j], yeniSira[i]];
  liste.forEach((x, n) => { if (x.sira !== yeniSira[n]) { x.sira = yeniSira[n]; x.guncel = simdi; } });
  return true;
}

/** Gizler. Türünün son görünen kategorisi gizlenemez (yeni kayıtta seçecek bir şey kalmalı). */
export function kategoriGizle(durum, id, simdi = Date.now()) {
  const k = durum.kategoriler.find((x) => x.id === id);
  if (!k || k.silindi || turListesi(durum, k.tur).length <= 1) return false;
  k.silindi = true;
  k.guncel = simdi;
  return true;
}

/** Gizlenmiş kategoriyi listenin sonuna geri getirir. */
export function kategoriGoster(durum, id, simdi = Date.now()) {
  const k = durum.kategoriler.find((x) => x.id === id);
  if (!k || !k.silindi) return false;
  // Gizliyken aynı adla yenisi eklendiyse ad ayırt edilsin.
  if (turListesi(durum, k.tur).some((x) => ayniAd(x.ad, k.ad))) k.ad = `${k.ad.slice(0, AD_SINIRI - 4)} (2)`;
  k.silindi = false;
  k.sira = sonSira(durum);
  k.guncel = simdi;
  return true;
}

export const gizliKategoriler = (durum, tur) => durum.kategoriler.filter((k) => k.tur === tur && k.silindi);
export const sonGorunenMi = (durum, id) => {
  const k = durum.kategoriler.find((x) => x.id === id);
  return Boolean(k) && !k.silindi && turListesi(durum, k.tur).length <= 1;
};
