// Hızlı giriş ve arama (Faz 3 madde 6-7): saf yardımcılar. DOM'a dokunmaz; testi tests/hizli.test.mjs.
// Kategori tahmini kural tabanlıdır, yapay zekâ gerekmez: önce kullanıcının kendi geçmişi, sonra hazır anahtar kelimeler.
import { canliKayitlar, kategoriHaritasi, ayKaydir } from './veri.js';

/** Türkçe harfleri sadeleştirip küçültür: "MİGROS Şişli" → "migros sisli". */
export function sadelestir(metin) {
  return String(metin ?? '').toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9&]+/g, ' ').trim();
}

// Varsayılan kategori kimliği → anahtar kelimeler (sadeleştirilmiş). Kelime başıyla eşleşir: "migros" "migros sisli"de bulunur.
const KURALLAR = {
  market: ['migros', 'a101', 'bim', 'sok market', 'carrefour', 'file market', 'macrocenter', 'metro market', 'getir', 'istegelsin', 'market', 'manav', 'kasap', 'firin', 'ekmek', 'bakkal', 'pazar'],
  disarida: ['yemeksepeti', 'trendyol yemek', 'restoran', 'lokanta', 'kafe', 'cafe', 'starbucks', 'kahve dunyasi', 'burger', 'pizza', 'doner', 'kebap', 'simit', 'yemek'],
  ulasim: ['benzin', 'akaryakit', 'mazot', 'opet', 'shell', 'petrol ofisi', 'bp', 'total', 'otopark', 'taksi', 'uber', 'bitaksi', 'istanbulkart', 'akbil', 'otobus', 'metrobus', 'marmaray', 'hgs', 'ogs', 'kopru', 'otoyol', 'ucak', 'thy', 'pegasus'],
  fatura: ['elektrik', 'dogalgaz', 'igdas', 'enerjisa', 'ck enerji', 'iski', 'aski', 'izsu', 'su faturasi', 'baskentgaz'],
  iletisim: ['turkcell', 'vodafone', 'turk telekom', 'superonline', 'turknet', 'internet', 'telefon faturasi', 'hat'],
  abonelik: ['netflix', 'spotify', 'youtube', 'disney', 'exxen', 'blutv', 'gain', 'icloud', 'amazon prime', 'apple', 'google one', 'chatgpt', 'claude'],
  saglik: ['eczane', 'hastane', 'doktor', 'ilac', 'dis hekimi', 'disci', 'muayene', 'tahlil', 'gozluk'],
  giyim: ['lc waikiki', 'lcw', 'zara', 'koton', 'defacto', 'h&m', 'mavi', 'boyner', 'ayakkabi', 'giyim'],
  egitim: ['kitap', 'kurs', 'okul', 'dershane', 'udemy', 'kirtasiye', 'universite', 'harc'],
  eglence: ['sinema', 'konser', 'bilet', 'tiyatro', 'steam', 'playstation', 'oyun', 'biletix'],
  kira: ['kira', 'aidat'],
  kredi: ['taksit', 'kredi karti odeme', 'kredi'],
  cocuk: ['bebek', 'bez', 'oyuncak', 'kres'],
  evcil: ['veteriner', 'petshop', 'kedi', 'kopek', 'mama'],
  hediye: ['hediye', 'cicek'],
  maas: ['maas', 'ucret'],
  'ek-gelir': ['freelance', 'prim', 'ikramiye', 'kira geliri', 'satis'],
  harclik: ['harclik'],
};
// Anahtar kelimeden sonra yalnızca yaygın Türkçe ekler gelebilir ("migrosta", "kirasi", "eczaneden"); böylece
// "kiraz" kira, "pazartesi" pazar, "hatice" hat, "bezelye" bez sayılmaz. Metin sadeleştirilmiş olduğu için ekler de sade.
const SONEK = '(?:|i|si|in|nin|im|imiz|miz|a|e|ya|ye|na|ne|da|de|ta|te|dan|den|tan|ten|lar|ler|ci|cu)';
const kacisRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KURAL_LISTESI = Object.entries(KURALLAR).flatMap(([kat, kelimeler]) => kelimeler.map((k) => [new RegExp(`(?:^| )${kacisRe(k)}${SONEK}(?= |$)`), kat, k.length]))
  .sort((a, b) => b[2] - a[2]);
const kullaniciKaydi = (k) => !k.silindi && !k.id.startsWith('p:') && !k.ornek;

/**
 * Nottan kategori tahmini: { kat, kaynak: 'gecmis' | 'kural' } ya da null. Yalnızca görünen ve türü uyan kategoriler.
 * Geçmiş: aynı (sadeleştirilmiş) notla en çok kullanılan kategori; eşitlikte en yenisi. Kural: en uzun eşleşen anahtar kelime.
 */
export function kategoriTahmin(durum, not, tur) {
  const metin = sadelestir(not);
  if (metin.length < 2) return null;
  const kat = kategoriHaritasi(durum);
  const uygun = (id) => { const c = kat.get(id); return c && !c.silindi && c.tur === tur; };
  const sayac = new Map();
  for (const k of durum.kayitlar) {
    if (!kullaniciKaydi(k) || !uygun(k.kat) || sadelestir(k.not) !== metin) continue;
    const s = sayac.get(k.kat) ?? { n: 0, son: 0 };
    sayac.set(k.kat, { n: s.n + 1, son: Math.max(s.son, k.guncel ?? 0) });
  }
  const enIyi = [...sayac].sort((a, b) => b[1].n - a[1].n || b[1].son - a[1].son)[0];
  if (enIyi) return { kat: enIyi[0], kaynak: 'gecmis' };
  const kural = KURAL_LISTESI.find(([desen, id]) => uygun(id) && desen.test(metin));
  return kural ? { kat: kural[1], kaynak: 'kural' } : null;
}

/** Son kullanılan n kategori (en yeni kullanıcı kaydından geriye), yalnızca görünen ve türü uyanlar. */
export function sonKategoriler(durum, tur, n = 4) {
  const kat = kategoriHaritasi(durum);
  const sonuc = [];
  for (const k of [...durum.kayitlar].filter(kullaniciKaydi).sort((a, b) => (b.guncel ?? 0) - (a.guncel ?? 0))) {
    const c = kat.get(k.kat);
    if (!c || c.silindi || c.tur !== tur || sonuc.includes(c.id)) continue;
    sonuc.push(c.id);
    if (sonuc.length === n) break;
  }
  return sonuc;
}

/** Kullanıcının en son girdiği kayıt (plandan üretilen ve örnek kayıtlar hariç); yoksa null. */
export function sonKayit(durum) {
  let son = null;
  for (const k of durum.kayitlar) if (kullaniciKaydi(k) && (!son || (k.guncel ?? 0) > (son.guncel ?? 0))) son = k;
  return son;
}

export const ARALIKLAR = { ay: 'Bu ay', uc: 'Son 3 ay', yil: 'Bu yıl', hepsi: 'Tümü' };

/** "1.250,50" / "850" / "12.5" → sayı; sayı değilse NaN. "1.250" binlik ayraçtır (bin iki yüz elli). */
const sayiMi = (t) => {
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^\d+\.\d{1,2}$/.test(t)) return Number(t);
  return NaN;
};

/**
 * Kayıtlarda arama. suzgec: { metin, kat, tur ('' | 'gider' | 'gelir'), aralik (ARALIKLAR anahtarı), min, max }.
 * Metin sözcüklere bölünür, hepsi eşleşmeli (VE): not, kategori adı ya da (sözcük sayıysa) tutarın kendisi.
 * Döner: { kayitlar (yeniden eskiye), gelir, gider }. Planlı (ileri tarihli) kayıtlar da dahildir.
 */
export function kayitAra(durum, suzgec, bugunTarih) {
  const kat = kategoriHaritasi(durum);
  const buAy = bugunTarih.slice(0, 7);
  const baslangic = { ay: `${buAy}-01`, uc: `${ayKaydir(buAy, -2)}-01`, yil: `${bugunTarih.slice(0, 4)}-01-01` }[suzgec.aralik] ?? '';
  // Bu ay ve bu yıl takvimle biter: aralık sonundaki ay için önceden üretilmiş plan kayıtları sızmasın.
  const bitis = { ay: `${buAy}-31`, yil: `${bugunTarih.slice(0, 4)}-12-31` }[suzgec.aralik] ?? '9999';
  const ham = String(suzgec.metin ?? '').trim().split(/\s+/).filter(Boolean);
  const sozcukler = ham.map((t) => ({ sayi: sayiMi(t), metin: sadelestir(t) })).filter((s) => s.metin || Number.isFinite(s.sayi));
  const min = Number.isFinite(suzgec.min) ? suzgec.min : -Infinity;
  const max = Number.isFinite(suzgec.max) ? suzgec.max : Infinity;
  let gelir = 0;
  let gider = 0;
  const kayitlar = canliKayitlar(durum).filter((k) => {
    if (k.tarih < baslangic || k.tarih > bitis) return false;
    if (suzgec.kat && k.kat !== suzgec.kat) return false;
    const c = kat.get(k.kat);
    const tur = c?.tur ?? 'gider';
    if (suzgec.tur && tur !== suzgec.tur) return false;
    if (k.tutar < min || k.tutar > max) return false;
    if (sozcukler.length) {
      const metin = ` ${sadelestir(k.not)} ${sadelestir(c?.ad)} `;
      if (!sozcukler.every((s) => (Number.isFinite(s.sayi) && Math.abs(k.tutar - s.sayi) < 0.005) || (s.metin && metin.includes(` ${s.metin}`)))) return false;
    }
    if (tur === 'gelir') gelir += k.tutar; else gider += k.tutar;
    return true;
  }).sort((a, b) => b.tarih.localeCompare(a.tarih) || (b.guncel ?? 0) - (a.guncel ?? 0));
  return { kayitlar, gelir: Math.round(gelir * 100) / 100, gider: Math.round(gider * 100) / 100 };
}

/** Arama ya da süzgeç etkin mi (etkinse Kayıtlar ay görünümü yerine sonuçları gösterir). */
export const aramaEtkin = (s) => Boolean(String(s.metin ?? '').trim() || s.kat || s.tur || Number.isFinite(s.min) || Number.isFinite(s.max) || (s.aralik && s.aralik !== 'hepsi'));
