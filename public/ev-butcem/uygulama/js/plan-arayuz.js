// Plan arayüzünün saf yardımcıları: metinler ve sıralama. DOM'a dokunmaz, testi tests/plan-arayuz.test.mjs.
import { tl, ayAdi, ayCoz, ayKaydir, taksitTutarlari } from './veri.js';

const para = (x) => tl(x, { kurus: true });
const ayFarki = (a, b) => { const x = ayCoz(a); const y = ayCoz(b); return (y.yil - x.yil) * 12 + (y.ay - x.ay); };

// Yılın son okunan sözcüğü: [ön ünlü mü, ünlüyle mi bitiyor]. 2026 → "altı" → [false, true].
const BIRLER = { 1: [true, false], 2: [true, true], 3: [true, false], 4: [true, false], 5: [true, false], 6: [false, true], 7: [true, true], 8: [true, false], 9: [false, false] };
const ONLAR = { 1: [false, false], 2: [true, true], 3: [false, false], 4: [false, false], 5: [true, true], 6: [false, false], 7: [true, false], 8: [true, false], 9: [false, false] };

function sonSozcuk(yil) {
  const son2 = yil % 100;
  if (yil % 10) return BIRLER[yil % 10];
  if (son2) return ONLAR[Math.floor(son2 / 10)];
  return [true, false]; // "yüz" / "bin"
}

/** "2027-04" → "Nisan 2027'de" (ünlü uyumuna göre -de / -da). */
export function ayYilBulunma(anahtar) {
  const [on] = sonSozcuk(ayCoz(anahtar).yil);
  return `${ayAdi(anahtar)}'${on ? 'de' : 'da'}`;
}

/** "2027-04" → "Nisan 2027'ye" (-e / -a; ünlüyle biten yılda araya y girer). */
export function ayYilYonelme(anahtar) {
  const [on, unluyle] = sonSozcuk(ayCoz(anahtar).yil);
  return `${ayAdi(anahtar)}'${unluyle ? 'y' : ''}${on ? 'e' : 'a'}`;
}

/** Taksit sayısını 2–36 arasına çeker; sayı değilse 6. */
export function adetSinirla(metin) {
  const n = Math.round(Number(String(metin).replace(/\D/g, '')));
  if (!Number.isFinite(n) || n === 0) return 6;
  return Math.min(36, Math.max(2, n));
}

/** "6 × 200 ₺ · son taksit 201 ₺ · Nisan 2027'de biter"; son taksit yalnızca farklıysa. Geçersiz girdide boş. */
export function taksitOnizleme(toplam, adet, baslangicAy) {
  if (!(toplam > 0) || !Number.isInteger(adet) || adet < 2 || adet > 36) return '';
  const t = taksitTutarlari(toplam, adet);
  const parcalar = [`${adet} × ${para(t[0])}`];
  if (t[adet - 1] !== t[0]) parcalar.push(`son taksit ${para(t[adet - 1])}`);
  parcalar.push(`${ayYilBulunma(ayKaydir(baslangicAy, adet - 1))} biter`);
  return parcalar.join(' · ');
}

export function tekrarAciklamasi(gun) {
  return `Her ayın ${gun}. günü kendiliğinden eklenir.${gun > 28 ? ' Kısa aylarda ayın son günü eklenir.' : ''}`;
}

/** Taksitte şimdiki sıra (1..adet). */
export function taksitSirasi(plan, buAy) {
  return Math.min(plan.adet, Math.max(1, ayFarki(plan.baslangic, buAy) + 1));
}

/** Tekrar: bitişi bu ay ya da öncesi. Taksit: normal bitişinden önce kapatılmış (sıradan bitiş durdurma sayılmaz). */
export function planDurdurulmus(plan, buAy) {
  if (!plan.bitis) return false;
  if (plan.tur === 'taksit') return plan.bitis < ayKaydir(plan.baslangic, plan.adet - 1);
  return plan.bitis <= buAy;
}

export function planAdi(plan, katHaritasi) {
  return String(plan.not ?? '').trim() || katHaritasi.get(plan.kat)?.ad || 'Silinmiş kategori';
}

/** Ayarlar'daki satırın ikinci satırı. */
export function planAltMetni(plan, buAy) {
  if (plan.tur === 'taksit') {
    if (plan.baslangic > buAy) return `${plan.adet} taksit · ${para(plan.tutar)} · ${ayYilBulunma(plan.baslangic)} başlıyor`;
    const bas = `Taksit ${taksitSirasi(plan, buAy)}/${plan.adet} · ${para(plan.tutar)}`;
    if (planDurdurulmus(plan, buAy)) return `${bas} · Durduruldu`;
    return plan.bitis && plan.bitis < buAy ? `${bas} · tamamlandı` : `${bas} · ${ayYilBulunma(plan.bitis)} bitiyor`;
  }
  if (planDurdurulmus(plan, buAy)) return 'Durduruldu';
  const bas = `Her ay ${plan.gun}. gün · ${para(plan.tutar)}`;
  return plan.bitis ? `${bas} · ${ayYilYonelme(plan.bitis)} kadar` : bas;
}

/** Silinmemiş planlar: tekrarlar (gelirler önce), sonra taksitler. Girdiyi değiştirmez; eşitlerde sıra korunur. */
export function planlariSirala(planlar, katHaritasi) {
  const grup = (p) => (p.tur === 'taksit' ? 2 : katHaritasi.get(p.kat)?.tur === 'gelir' ? 0 : 1);
  return planlar.filter((p) => !p.silindi).map((p, i) => [p, i]).sort((a, b) => grup(a[0]) - grup(b[0]) || a[1] - b[1]).map(([p]) => p);
}
