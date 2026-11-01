// Koç geri bildirimi (Faz 2 adım 5): yorum, günlük gözlem ve sohbet cevabına 👍 / 👎. Saf yardımcılar; testi tests/geri-bildirim.test.mjs.
// Oylar telefonda durur (durum.oylar, eşitlenmez). Sunucuya yalnızca kullanıcı onay verdiyse (durum.geriBildirimIzni === true) gider;
// sunucu tarafı supabase/goc/2026-11-02-koc-geri-bildirim.sql (koc_geri_bildirim_yaz).
import { kocOzeti } from './veri.js';

const OY_SINIRI = 200; // telefonda en çok bu kadar oy tutulur; eskiler düşer

export const yorumAnahtari = (ay, zaman) => `y:${ay}:${zaman}`;
export const gunlukAnahtari = (g) => `g:${g.tarih}:${g.imza}`;
export const sorAnahtari = (ay, zaman) => `s:${ay}:${zaman}`;

const satirMetni = (m) => (typeof m === 'string' ? m : [m?.gozlem, m?.oneri].filter((x) => typeof x === 'string' && x.trim()).join('\n'));

/**
 * Anahtarın gösterdiği yorumu durumdan bulur: { tur, ay, metin, soru } ya da (yorum yenilendiyse, silindiyse) null.
 * Metin her zaman telefondaki kopyadan alınır; arayüzden gelen metne güvenilmez.
 */
export function oyKaynagi(durum, anahtar) {
  const [tur, a, b] = String(anahtar ?? '').split(':');
  if (tur === 'y') {
    const y = durum.yorumlar?.[a];
    if (!y || String(y.zaman) !== b || !Array.isArray(y.metinler)) return null;
    const metin = y.metinler.map(satirMetni).filter(Boolean).join('\n\n');
    return metin ? { tur: 'yorum', ay: a, metin, soru: null } : null;
  }
  if (tur === 'g') {
    const g = durum.gunluk;
    if (!g?.yorum || g.tarih !== a || String(g.imza) !== b) return null;
    const metin = satirMetni(g.yorum);
    return metin ? { tur: 'gunluk', ay: a.slice(0, 7), metin, soru: null } : null;
  }
  if (tur === 's') {
    const o = (Array.isArray(durum.sohbet?.[a]) ? durum.sohbet[a] : []).find((x) => String(x?.zaman) === b);
    if (!o || typeof o.cevap !== 'string' || !o.cevap.trim()) return null;
    return { tur: 'sor', ay: a, metin: o.cevap, soru: typeof o.soru === 'string' ? o.soru : null };
  }
  return null;
}

/** Aynı oya yeniden dokunmak oyu geri alır (0). Yeni oylar listesini ve sunucuya gidecek oyu döner. Girdiyi değiştirmez. */
export function oyDegistir(oylar, anahtar, oy) {
  const simdiki = oylar?.[anahtar] ?? 0;
  const yeni = simdiki === oy ? 0 : oy;
  const { [anahtar]: _, ...kalan } = oylar ?? {};
  const sirali = yeni ? { ...kalan, [anahtar]: yeni } : kalan;
  const anahtarlar = Object.keys(sirali);
  const sonuc = anahtarlar.length > OY_SINIRI ? Object.fromEntries(anahtarlar.slice(-OY_SINIRI).map((k) => [k, sirali[k]])) : sirali;
  return { oylar: sonuc, oy: yeni };
}

/** RPC gövdesi; kaynak bulunamazsa null (gönderilmez). Oy geri alındıysa (0) metin gerekmez. */
export function geriBildirimGovdesi(durum, anahtar, oy) {
  if (!durum.cihaz) return null;
  if (oy === 0) return { p_cihaz: durum.cihaz, p_anahtar: anahtar, p_tur: 'yorum', p_oy: 0, p_metin: '', p_soru: null, p_ozet: {} };
  const k = oyKaynagi(durum, anahtar);
  if (!k) return null;
  return {
    p_cihaz: durum.cihaz,
    p_anahtar: anahtar,
    p_tur: k.tur,
    p_oy: oy,
    p_metin: k.metin.slice(0, 2000),
    p_soru: k.soru ? k.soru.slice(0, 300) : null,
    p_ozet: ozetTemizle(kocOzeti(durum, k.ay)),
  };
}

/** Geri bildirimde saklanacak özetten elindeki paraya geri götürülebilecek alan çıkarılır (kac_aylik_gider = net para / aylık gider). */
function ozetTemizle(ozet) {
  if (ozet?.denge) { const { kac_aylik_gider: _, ...denge } = ozet.denge; return { ...ozet, denge }; }
  return ozet;
}
