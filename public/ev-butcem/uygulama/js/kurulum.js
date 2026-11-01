// Açılış kurulumu (Faz 3 madde 1): saf hesaplar. DOM'a dokunmaz; arayüzü app.js'de, testi tests/kurulum.test.mjs.
import { canliKayitlar, planOlustur, elindekiPara, planGunu, tl } from './veri.js';

const gunuYaz = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Sihirbaz yalnızca bomboş bir telefonda görünür: kayıt yok, plan yok, hane yok, daha önce bitirilmemiş ya da atlanmamış. */
export function kurulumGerekli(durum) {
  return !durum.kurulumBitti && !durum.hane && !canliKayitlar(durum).length && !(durum.planlar ?? []).some((p) => !p.silindi);
}

/** "15" → 15; 1..31 dışı ya da boşsa NaN. */
export function gunOku(metin) {
  const s = String(metin ?? '').trim();
  if (!/^\d{1,2}$/.test(s)) return NaN;
  const n = Number(s);
  return n >= 1 && n <= 31 ? n : NaN;
}

/** Bu ayın o günü bugün ya da daha önce mi? (kısa ayda ayın son günü; 31 → 30 Kasım) */
export const gunGectiMi = (gun, bugunTarih) => planGunu(bugunTarih.slice(0, 7), gun) <= bugunTarih;

/**
 * Bir düzenli satırı (maaş ya da kira) doğrular. tutar: sayı ya da NaN (boş). gun: sayı ya da NaN.
 * Döner: { tamam: true, deger: {tutar, gun} | null } ya da { tamam: false, hata: 'tutar' | 'gun' }.
 */
export function satirDogrula(tutar, gun, bos) {
  if (bos) return { tamam: true, deger: null };
  if (!(tutar > 0)) return { tamam: false, hata: 'tutar' };
  if (!Number.isInteger(gun)) return { tamam: false, hata: 'gun' };
  return { tamam: true, deger: { tutar, gun } };
}

/**
 * Sihirbazın sonucunu uygular. girdi: { maas: {tutar, gun} | null, kira: {tutar, gun} | null, elindeki: sayı | null }.
 * - Maaş ve kira bu aydan başlayan süresiz "tekrar" planı olur (gelecek ay da hemen üretilir).
 * - Kira tutarı Kira / Aidat bütçesi olur.
 * - Başlangıç parası, bugün "elindeki para" tam olarak girilen tutar olacak şekilde ayarlanır:
 *   bu ay günü geçmiş bir maaş ya da kira alınmış/ödenmiş sayılır, girilen tutarın içindedir.
 * Planları ekler, durum.kurulumBitti'yi işaretler. Kaydetmek ve eşitlemek çağıranın işi.
 */
export function kurulumUygula(durum, girdi, simdi = Date.now()) {
  const bugunTarih = gunuYaz(simdi);
  const baslangic = bugunTarih.slice(0, 7);
  const planlar = [];
  for (const [alan, kat, not] of [['maas', 'maas', 'Maaş'], ['kira', 'kira', 'Kira']]) {
    const s = girdi[alan];
    if (!s) continue;
    planlar.push(planOlustur(durum, { tur: 'tekrar', kat, tutar: s.tutar, gun: s.gun, baslangic, not }, simdi));
  }
  if (girdi.kira) {
    const k = durum.kategoriler.find((x) => x.id === 'kira' && !x.silindi);
    if (k) { k.butce = Math.round(girdi.kira.tutar * 100) / 100; k.guncel = simdi; }
  }
  // Boş bırakılan tutar sıfırdır: bugün elde 0 ₺ (günü geçmiş kira eksiye düşürmesin).
  // Değer değişmiyorsa baslangicGuncel'e dokunulmaz; sonradan katılınan hanenin başlangıç parasını ezmesin.
  const hedef = Number.isFinite(girdi.elindeki) ? girdi.elindeki : 0;
  const kayitlarinEtkisi = elindekiPara(durum, bugunTarih) - (durum.baslangic || 0);
  const yeni = Math.round((hedef - kayitlarinEtkisi) * 100) / 100;
  if (yeni !== (durum.baslangic || 0) || Number.isFinite(girdi.elindeki)) {
    durum.baslangic = yeni;
    durum.baslangicGuncel = simdi;
  }
  durum.kurulumBitti = true;
  return planlar;
}

/** Son adımdaki özet satırları: ["Her ayın 15'i", "Maaş", "+45.000 ₺"]. */
export function kurulumOzeti(girdi) {
  const satirlar = [];
  if (girdi.maas) satirlar.push([`Her ayın ${girdi.maas.gun}. günü`, 'Maaş', tl(girdi.maas.tutar, { kurus: true, isaret: true })]);
  if (girdi.kira) satirlar.push([`Her ayın ${girdi.kira.gun}. günü`, 'Kira', tl(-girdi.kira.tutar, { kurus: true })]);
  return satirlar;
}
