// Uygulamanın verisi ve hesapları. Görünümden bağımsız; ekranlar buradan okur.
// Kayıtlar telefonda (localStorage) durur; hane paylaşımı açıksa esitle.js aynı kayıtları sunucuyla eşitler.

const ANAHTAR = 'ev-butcem:v1';

export const VARSAYILAN_KATEGORILER = [
  ['maas', '💼', 'Maaş', 'gelir', null],
  ['ek-gelir', '➕', 'Ek gelir', 'gelir', null],
  ['harclik', '🎁', 'Hediye / Harçlık', 'gelir', null],
  ['diger-gelir', '📦', 'Diğer gelir', 'gelir', null],
  ['kira', '🏠', 'Kira / Aidat', 'gider', 17500],
  ['market', '🛒', 'Market', 'gider', 9000],
  ['fatura', '💡', 'Faturalar', 'gider', 3000],
  ['iletisim', '📱', 'İnternet / Telefon', 'gider', 1100],
  ['ulasim', '🚗', 'Ulaşım / Yakıt', 'gider', 4500],
  ['disarida', '🍽️', 'Dışarıda yemek', 'gider', 2500],
  ['giyim', '👕', 'Giyim', 'gider', 2000],
  ['saglik', '💊', 'Sağlık', 'gider', 1000],
  ['egitim', '📚', 'Eğitim', 'gider', 1500],
  ['eglence', '🎉', 'Eğlence / Hobi', 'gider', 1500],
  ['abonelik', '📺', 'Abonelikler', 'gider', 500],
  ['kredi', '💳', 'Kredi / Taksit', 'gider', 3200],
  ['cocuk', '🧒', 'Çocuk', 'gider', 1500],
  ['evcil', '🐾', 'Evcil hayvan', 'gider', 800],
  ['hediye', '🎀', 'Hediye', 'gider', 500],
  ['diger-gider', '🧾', 'Diğer gider', 'gider', 1000],
].map(([id, emoji, ad, tur, butce], sira) => ({ id, emoji, ad, tur, butce, sira, guncel: 0 }));

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const tamSayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const kurusLu = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 12345.6 -> "12.346 ₺"; kuruş yalnızca istenirse. */
export function tl(x, { kurus = false, isaret = false } = {}) {
  const n = Math.abs(x) < 0.005 ? 0 : x;
  const metin = (kurus && n % 1 ? kurusLu : tamSayi).format(Math.abs(n));
  const on = n < 0 ? '−' : isaret && n > 0 ? '+' : '';
  return `${on}${metin}\u00a0₺`;
}

/** Kuruşa yuvarlar. Kayan noktada 63.22 + 265.48 + 171.3 = 500.00000000000006 eder; tam bütçe "aşıldı" görünmesin. */
const kurus = (x) => Math.round(x * 100) / 100;

export function yeniId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function bugun() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "2026-10" -> {yil, ay(0-11)} */
export function ayCoz(anahtar) {
  const [y, m] = anahtar.split('-').map(Number);
  return { yil: y, ay: m - 1 };
}
export function ayAnahtari(yil, ay) {
  const d = new Date(yil, ay, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function ayKaydir(anahtar, fark) {
  const { yil, ay } = ayCoz(anahtar);
  return ayAnahtari(yil, ay + fark);
}
export function ayAdi(anahtar, kisa = false) {
  const { yil, ay } = ayCoz(anahtar);
  return kisa ? AYLAR_KISA[ay] : `${AYLAR[ay]} ${yil}`;
}
export const buAy = () => bugun().slice(0, 7);

// ---------------------------------------------------------------- depo

function bosDurum() {
  return { surum: 1, baslangic: 0, baslangicGuncel: 0, kategoriler: structuredClone(VARSAYILAN_KATEGORILER), kayitlar: [], planlar: [], hesaplar: [], aktarimlar: [], hane: null };
}

export function yukle() {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (ham) {
      const d = { ...bosDurum(), ...JSON.parse(ham) };
      if (!Array.isArray(d.planlar)) d.planlar = []; // plan özelliğinden önce kaydedilmiş eski durum
      if (!Array.isArray(d.hesaplar)) d.hesaplar = []; // hesaplardan önce kaydedilmiş eski durum
      if (!Array.isArray(d.aktarimlar)) d.aktarimlar = [];
      return d;
    }
  } catch { /* bozuk ya da erişilemeyen depo: boş başla */ }
  return bosDurum();
}

export function kaydet(durum) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(durum));
  } catch { /* gizli sekme vb.: oturum boyunca bellekte kalır */ }
}

// ---------------------------------------------------------------- hesaplar

export const canliKayitlar = (durum) => durum.kayitlar.filter((k) => !k.silindi);
/** Kategori sırası; eşit sıra numarasında (iki telefondan aynı anda eklenmiş) kimlik bozar, her telefonda aynı sıra çıksın. */
export const siraSirala = (a, b) => (a.sira ?? 0) - (b.sira ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
export const canliKategoriler = (durum) =>
  durum.kategoriler.filter((k) => !k.silindi).sort(siraSirala);

export function kategoriHaritasi(durum) {
  return new Map(durum.kategoriler.map((k) => [k.id, k]));
}

/** Bir ayın gelir, gider ve kategori toplamları. */
export function ayOzeti(durum, ay) {
  const kat = kategoriHaritasi(durum);
  const toplam = new Map();
  let gelir = 0;
  let gider = 0;
  for (const k of canliKayitlar(durum)) {
    if (!k.tarih.startsWith(ay)) continue;
    const tur = kat.get(k.kat)?.tur ?? 'gider';
    if (tur === 'gelir') gelir += k.tutar;
    else gider += k.tutar;
    toplam.set(k.kat, (toplam.get(k.kat) ?? 0) + k.tutar);
  }
  gelir = kurus(gelir);
  gider = kurus(gider);
  for (const [id, t] of toplam) toplam.set(id, kurus(t));
  const kalan = kurus(gelir - gider);
  return { ay, gelir, gider, kalan, oran: gelir > 0 ? kalan / gelir : null, toplam };
}

// ---------------------------------------------------------------- hesaplar (docs/hesap-sozlesme.md)

export const ANA_HESAP = 'ana';
export const anaHesap = (durum) => ({ id: ANA_HESAP, ad: 'Ana hesap', tur: 'banka', baslangic: durum.baslangic || 0, sira: -1, silindi: false });
/** Kaydın hesabı: yoksa, "ana" ya da bilinmeyen bir hesapsa Ana hesap. */
export const kayitHesabi = (k, harita) => (k.hesap && harita.has(k.hesap) ? k.hesap : ANA_HESAP);
const hesapHaritasi = (durum) => new Map((durum.hesaplar ?? []).map((h) => [h.id, h]));
/** Bütün başlangıç bakiyeleri (Ana hesap + gizliler dahil bütün hesaplar; kart borcu eksi). */
const baslangiclarToplami = (durum) => (durum.hesaplar ?? []).reduce((t, h) => t + (Number(h.baslangic) || 0), durum.baslangic || 0);

/**
 * Hesap bakiyeleri, gün sonu itibarıyla (tarihi ≤ gun olan kayıt ve aktarımlar). Map: id → { hesap, bakiye }.
 * Ana hesap ve gizli hesaplar dahildir: gizlemek parayı yok etmez.
 */
export function hesapBakiyeleri(durum, gun = bugun()) {
  const kat = kategoriHaritasi(durum);
  const harita = hesapHaritasi(durum);
  const sonuc = new Map([[ANA_HESAP, { hesap: anaHesap(durum), bakiye: durum.baslangic || 0 }]]);
  for (const h of harita.values()) sonuc.set(h.id, { hesap: h, bakiye: Number(h.baslangic) || 0 });
  for (const k of canliKayitlar(durum)) {
    if (k.tarih > gun) continue;
    sonuc.get(kayitHesabi(k, harita)).bakiye += kat.get(k.kat)?.tur === 'gelir' ? k.tutar : -k.tutar;
  }
  for (const a of durum.aktarimlar ?? []) {
    if (a.silindi || a.tarih > gun || !(a.tutar > 0)) continue;
    const kaynak = kayitHesabi({ hesap: a.kaynak }, harita);
    const hedef = kayitHesabi({ hesap: a.hedef }, harita);
    if (kaynak === hedef) continue;
    sonuc.get(kaynak).bakiye -= a.tutar;
    sonuc.get(hedef).bakiye += a.tutar;
  }
  for (const v of sonuc.values()) v.bakiye = kurus(v.bakiye);
  return sonuc;
}

/** Kredi kartı borcu (artı = borç), gün sonu itibarıyla. Kart hesabı yoksa 0. */
export function kartBorcu(durum, gun = bugun()) {
  let b = 0;
  for (const { hesap, bakiye } of hesapBakiyeleri(durum, gun).values()) if (hesap.tur === 'kart') b -= bakiye;
  return kurus(b);
}

/** Net para: elindeki para − kart borcu. */
export const netPara = (durum, gun = bugun()) => kurus(elindekiPara(durum, gun) - kartBorcu(durum, gun));

/** Ayın sonunda net para: bütün başlangıçlar + o güne kadarki bütün gelirler − giderler (aktarımlar birbirini götürür). */
export function aySonuBakiye(durum, ay) {
  return gunSonuBakiye(durum, `${ay}-31`);
}

/** Günün sonunda net para (Kayıtlar'daki "gün sonu"): aySonuBakiye ile aynı kural, gün ölçeğinde. */
export function gunSonuBakiye(durum, gun) {
  const kat = kategoriHaritasi(durum);
  let b = baslangiclarToplami(durum);
  for (const k of canliKayitlar(durum)) {
    if (k.tarih > gun) continue;
    b += kat.get(k.kat)?.tur === 'gelir' ? k.tutar : -k.tutar;
  }
  return kurus(b);
}

/** Son n ay (eskiden yeniye), bitiş ayı dahil. */
export function sonAylar(bitis, n) {
  return Array.from({ length: n }, (_, i) => ayKaydir(bitis, i - n + 1));
}

/** Kaydı olan en eski ay; hiç kayıt yoksa bu ay. */
export function ilkAy(durum) {
  let ilk = null;
  for (const k of canliKayitlar(durum)) if (!ilk || k.tarih < ilk) ilk = k.tarih;
  return ilk ? ilk.slice(0, 7) : buAy();
}

/**
 * Bütçe satırları: harcanan, bütçe, oran, geçen aya göre değişim. Harcaması ya da bütçesi olmayanlar elenir.
 * Gizlenmiş kategori o ay harcaması varsa bütçesiz satır olarak kalır: satırların toplamı ayın giderine eşit olsun.
 */
export function butceSatirlari(durum, ay) {
  const bu = ayOzeti(durum, ay).toplam;
  const gecen = ayOzeti(durum, ayKaydir(ay, -1)).toplam;
  return durum.kategoriler
    .filter((k) => k.tur === 'gider' && (!k.silindi || (bu.get(k.id) ?? 0) > 0))
    .sort(siraSirala)
    .map((k) => {
      const harcanan = bu.get(k.id) ?? 0;
      const onceki = gecen.get(k.id) ?? 0;
      const butce = k.silindi ? 0 : k.butce || 0;
      return {
        kat: k,
        harcanan,
        butce,
        oran: butce ? harcanan / butce : null,
        degisim: onceki > 0 ? (harcanan - onceki) / onceki : null,
      };
    })
    .filter((s) => s.harcanan > 0 || s.butce > 0);
}

// ---------------------------------------------------------------- planlar (docs/plan-sozlesme.md)
// Plan para hareketi değildir; her ay için sıradan bir kayıt üretir (kimlik: p:<planId>:<YYYY-MM>).

const planKimligi = (planId, ay) => `p:${planId}:${ay}`;
/** Kaydın bu plandan geldiği kimliğinden anlaşılır (kayıttaki `plan` alanı yalnızca yerel kolaylıktır, sunucuya gitmez). */
const planinKaydi = (k, planId) => k.id.startsWith(`p:${planId}:`);
const ayFarki = (a, b) => { const x = ayCoz(a); const y = ayCoz(b); return (y.yil - x.yil) * 12 + (y.ay - x.ay); };

/** Zamandan (ms) yerel gün: bugun() ile aynı biçim. */
function gunuYaz(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Toplamı adet taksite böler; ilk adet−1 taksit aşağı yuvarlanır, son taksit kalan kuruşları alır. Toplamı kuruşu kuruşuna eşittir. */
export function taksitTutarlari(toplam, adet) {
  const kurusToplam = Math.round(toplam * 100);
  const taksit = Math.floor(kurusToplam / adet);
  return Array.from({ length: adet }, (_, i) => (i < adet - 1 ? taksit : kurusToplam - taksit * (adet - 1)) / 100);
}

/** Planın kayıt üretmesi gereken aylar ("YYYY-MM"). Tekrar: başlangıç…min(bitiş, bu ay + 1). Taksit: bütün aylar (bitiş varsa o aya kadar). */
export function planAylari(plan, bugunTarih = bugun()) {
  const ufuk = ayKaydir(bugunTarih.slice(0, 7), 1);
  let son;
  if (plan.tur === 'taksit') son = plan.bitis || ayKaydir(plan.baslangic, (plan.adet || 1) - 1);
  else son = plan.bitis && plan.bitis < ufuk ? plan.bitis : ufuk;
  const aylar = [];
  for (let a = plan.baslangic; a <= son && aylar.length < 600; a = ayKaydir(a, 1)) aylar.push(a);
  return aylar;
}

/** Ayın günü; kısa ayda ayın son günü (31 → Şubat 28/29). */
export function planGunu(ay, gun) {
  return `${ay}-${String(Math.min(Math.max(1, gun), gunSayisi(ay))).padStart(2, '0')}`;
}

/** Planın o aydaki tutarı: tekrarda hep `tutar`; taksitte son taksit kalan kuruşları alır. */
function planTutari(plan, ay) {
  if (plan.tur !== 'taksit' || plan.toplam == null || !plan.adet) return plan.tutar;
  return taksitTutarlari(plan.toplam, plan.adet)[ayFarki(plan.baslangic, ay)] ?? plan.tutar;
}

/**
 * Eksik plan kayıtlarını durum.kayitlar'a ekler; yeni eklenen sayısını döner. Tekrar çalıştırılabilir (idempotent).
 * Bu kimlikte kayıt zaten varsa (silinmiş olsa bile) dokunulmaz: silinen ya da düzenlenen ay geri gelmez.
 */
export function planlariUret(durum, bugunTarih = bugun()) {
  const mevcut = new Set(durum.kayitlar.map((k) => k.id));
  let yeni = 0;
  for (const plan of durum.planlar ?? []) {
    if (plan.silindi) continue;
    for (const ay of planAylari(plan, bugunTarih)) {
      const id = planKimligi(plan.id, ay);
      if (mevcut.has(id)) continue;
      mevcut.add(id);
      durum.kayitlar.push({ id, tarih: planGunu(ay, plan.gun), kat: plan.kat, tutar: planTutari(plan, ay), not: plan.not ?? '', ...(plan.hesap ? { hesap: plan.hesap } : {}), guncel: 1, plan: plan.id });
      yeni++;
    }
  }
  return yeni;
}

/** Planlı kayıt: tarihi bugünden sonra olan (plandan gelsin gelmesin). */
export const planli = (kayit, bugunTarih = bugun()) => kayit.tarih > bugunTarih;

/** Şu an elindeki para: nakit, banka ve Ana hesap bakiyeleri (tarihi bugün ve öncesi olan kayıtlar). Kart borcu ayrı: kartBorcu. */
export function elindekiPara(durum, bugunTarih = bugun()) {
  let b = 0;
  for (const { hesap, bakiye } of hesapBakiyeleri(durum, bugunTarih).values()) if (hesap.tur !== 'kart') b += bakiye;
  return kurus(b);
}

/**
 * Yeni plan. alanlar: { tur, kat, gun, baslangic?, not?, bitis? (tekrar) , tutar (tekrar) | toplam + adet (taksit) }.
 * Taksitte tutar ve bitiş toplam/adet'ten hesaplanır. Planı ekler, kayıtlarını üretir, planı döner.
 */
export function planOlustur(durum, alanlar, simdi = Date.now()) {
  const bugunTarih = gunuYaz(simdi);
  const taksit = alanlar.tur === 'taksit';
  if (!taksit && alanlar.tur !== 'tekrar') throw new Error('Plan türü tekrar ya da taksit olmalı');
  const baslangic = alanlar.baslangic || bugunTarih.slice(0, 7);
  const adet = taksit ? Math.min(36, Math.max(2, Math.round(alanlar.adet))) : null;
  const toplam = taksit ? kurus(alanlar.toplam) : null;
  const plan = {
    id: yeniId(),
    tur: alanlar.tur,
    kat: alanlar.kat,
    tutar: taksit ? taksitTutarlari(toplam, adet)[0] : kurus(alanlar.tutar),
    toplam,
    adet,
    gun: Math.min(31, Math.max(1, Math.round(alanlar.gun))),
    baslangic,
    bitis: taksit ? ayKaydir(baslangic, adet - 1) : alanlar.bitis ?? null,
    not: String(alanlar.not ?? '').slice(0, 200),
    hesap: alanlar.hesap ?? null,
    silindi: false,
    guncel: simdi,
  };
  (durum.planlar ??= []).push(plan);
  planlariUret(durum, bugunTarih);
  return plan;
}

/** Planın tarihi bugünden sonra olan, canlı kayıtları. */
const gelecekKayitlari = (durum, plan, bugunTarih) =>
  durum.kayitlar.filter((k) => !k.silindi && planinKaydi(k, plan.id) && planli(k, bugunTarih));

function gelecegiSil(durum, plan, bugunTarih, simdi) {
  for (const k of gelecekKayitlari(durum, plan, bugunTarih)) { k.silindi = true; k.guncel = simdi; }
}

/**
 * "Bundan sonra" düzenleme: değişiklik { tutar?, gun?, not?, toplam? } plana yazılır; tarihi bugünden sonra olan ve
 * kullanıcının elle değiştirmediği (elle !== true) kayıtlar yeni değerlerle güncellenir. Geçmiş kayıtlar değişmez.
 * Taksitte aylık tutar toplam'dan türer: tutar değişikliği yok sayılır, toplam verilirse tutar yeniden hesaplanır.
 * Plan yoksa ya da silinmişse null döner.
 */
export function planGuncelle(durum, planId, degisiklik, bugunTarih = bugun(), simdi = Date.now()) {
  const plan = (durum.planlar ?? []).find((p) => p.id === planId);
  if (!plan || plan.silindi) return null;
  if (plan.tur === 'taksit') {
    if (degisiklik.toplam !== undefined) {
      plan.toplam = kurus(degisiklik.toplam);
      plan.tutar = taksitTutarlari(plan.toplam, plan.adet)[0];
    }
  } else if (degisiklik.tutar !== undefined) plan.tutar = kurus(degisiklik.tutar);
  if (degisiklik.gun !== undefined) plan.gun = Math.min(31, Math.max(1, Math.round(degisiklik.gun)));
  if (degisiklik.not !== undefined) plan.not = String(degisiklik.not).slice(0, 200);
  plan.guncel = simdi;
  for (const k of gelecekKayitlari(durum, plan, bugunTarih)) {
    if (k.elle === true) continue;
    const ay = k.tarih.slice(0, 7);
    k.tarih = planGunu(ay, plan.gun);
    k.tutar = planTutari(plan, ay);
    k.not = plan.not ?? '';
    k.guncel = simdi;
  }
  planlariUret(durum, bugunTarih);
  return plan;
}

/** Durdur: bitiş bu ay olur (taksitte erken kapama); tarihi bugünden sonra olan kayıtlar silinir. */
export function planDurdur(durum, planId, bugunTarih = bugun(), simdi = Date.now()) {
  const plan = (durum.planlar ?? []).find((p) => p.id === planId);
  if (!plan || plan.silindi) return null;
  plan.bitis = bugunTarih.slice(0, 7);
  plan.guncel = simdi;
  gelecegiSil(durum, plan, bugunTarih, simdi);
  return plan;
}

/** Planı sil: plan silinir, tarihi bugünden sonra olan kayıtları da silinir; geçmiş kayıtlar kalır. */
export function planSil(durum, planId, bugunTarih = bugun(), simdi = Date.now()) {
  const plan = (durum.planlar ?? []).find((p) => p.id === planId);
  if (!plan || plan.silindi) return null;
  plan.silindi = true;
  plan.guncel = simdi;
  gelecegiSil(durum, plan, bugunTarih, simdi);
  return plan;
}

// ---------------------------------------------------------------- örnek veri

/** Temmuz–Ekim 2026 örnek hanesi (Excel ve Notion şablonlarıyla aynı kayıtlar). */
export async function ornekVeri() {
  const yanit = await fetch(new URL('../ornek.json', import.meta.url));
  const satirlar = await yanit.json();
  const adlar = new Map(VARSAYILAN_KATEGORILER.map((k) => [`${k.emoji} ${k.ad}`, k.id]));
  return satirlar.map((s) => ({
    id: yeniId(),
    tarih: s.tarih,
    kat: adlar.get(s.kat),
    tutar: s.tutar,
    not: s.aciklama ?? '',
    guncel: 0,
  }));
}

// ---------------------------------------------------------------- koç ölçüleri
// Puanları uygulama hesaplar (internetsiz, uydurma yok); yapay zekâ yalnızca açıklar.

// Her ay aşağı yukarı aynı olan ödemeler; "harcama hızı" hesabında sayılmaz.
const SABIT = new Set(['kira', 'kredi', 'fatura', 'iletisim', 'abonelik']);

const gunSayisi = (ay) => { const { yil, ay: a } = ayCoz(ay); return new Date(yil, a + 1, 0).getDate(); };
const sinirla = (x, a, b) => Math.min(b, Math.max(a, x));

/** Önceki n ayın (kaydı olan) ortalama gideri; hiç yoksa null. */
function ortalamaGider(durum, ay, n = 3) {
  const ilk = ilkAy(durum);
  const aylar = [1, 2, 3, 4, 5, 6].map((i) => ayKaydir(ay, -i)).filter((a) => a >= ilk).slice(0, n);
  if (!aylar.length) return null;
  return aylar.reduce((t, a) => t + ayOzeti(durum, a).gider, 0) / aylar.length;
}

/** Ayın tarihi bugün ve öncesi olan gider toplamı (gerçekleşen gider). */
function giderBugune(durum, ay, bugunTarih) {
  const kat = kategoriHaritasi(durum);
  let t = 0;
  for (const k of canliKayitlar(durum)) {
    if (k.tarih.startsWith(ay) && !planli(k, bugunTarih) && (kat.get(k.kat)?.tur ?? 'gider') !== 'gelir') t += k.tutar;
  }
  return kurus(t);
}

/**
 * Denge puanı (0–100), WHOOP'taki toparlanma puanının para karşılığı.
 *  - Hız (50): bütçenin, ayın geçen kısmına göre ne kadarı harcandı.
 *  - Aşım (25): bütçesini aşan her kategori puan düşürür.
 *  - Güvenlik payı (25): elindeki para kaç aylık gidere yetiyor (1 ay ve üstü tam puan).
 */
export function denge(durum, ay, bugunTarih = bugun()) {
  const gs = gunSayisi(ay);
  const gun = ay === bugunTarih.slice(0, 7) ? Number(bugunTarih.slice(8, 10)) : ay < bugunTarih.slice(0, 7) ? gs : 0;
  const oz = ayOzeti(durum, ay);
  const satirlar = butceSatirlari(durum, ay);
  const ortalama = ortalamaGider(durum, ay);
  // Sabit ödemeler (kira, kredi…) ayın başında tümüyle beklenir; değişkenler ayın geçen kısmı kadar.
  const sabitButce = satirlar.filter((s) => SABIT.has(s.kat.id)).reduce((t, s) => t + s.butce, 0);
  const degiskenButce = satirlar.filter((s) => !SABIT.has(s.kat.id)).reduce((t, s) => t + s.butce, 0);
  const plan = sabitButce + degiskenButce || ortalama || oz.gider || 1;
  const beklenen = sabitButce + degiskenButce
    ? sabitButce + degiskenButce * (gun / gs)
    : plan * (gun / gs);
  // Hız yalnızca bugüne kadar gerçekleşen gidere bakar: bu ay için ileri tarihli (planlı) kayıt hızı şişirmez.
  const hizGideri = ay === bugunTarih.slice(0, 7) ? giderBugune(durum, ay, bugunTarih) : oz.gider;
  const hizOrani = beklenen > 0 ? hizGideri / beklenen : 0;
  const hiz = Math.round(50 * sinirla((1.4 - hizOrani) / 0.5, 0, 1));
  const asanlar = satirlar.filter((s) => s.butce && s.harcanan > s.butce);
  const asim = Math.max(0, 25 - asanlar.length * 8);
  // İçinde bulunulan ayda "elindeki para" bugüne kadar olandır; planlı kayıtlar henüz cebe girmedi/çıkmadı.
  // Kart borcu düşülür (net para): kartla harcanan para da bir gün ödenecek.
  const el = ay === bugunTarih.slice(0, 7) ? netPara(durum, bugunTarih) : aySonuBakiye(durum, ay);
  const aylikGider = ortalama || oz.gider || 1;
  const pay = Math.round(25 * sinirla(el / aylikGider, 0, 1));
  const puan = hiz + asim + pay;
  return {
    puan,
    renk: puan >= 67 ? 'yesil' : puan >= 34 ? 'sari' : 'kirmizi',
    bilesen: { hiz, asim, pay },
    hizOrani, asanlar, el, gun, gunSayisi: gs, plan, beklenen, aylikGider,
  };
}

/** Harcama yükü: son 7 günün değişken harcaması, önceki 8 haftanın haftalık ortalamasına oranı. */
export function harcamaYuku(durum, bugunTarih = bugun()) {
  const kat = kategoriHaritasi(durum);
  const gunEkle = (t, g) => { const d = new Date(`${t}T12:00`); d.setDate(d.getDate() + g); return d.toISOString().slice(0, 10); };
  const degisken = canliKayitlar(durum).filter((k) => kat.get(k.kat)?.tur !== 'gelir' && kat.get(k.kat)?.tur !== 'devir' && !SABIT.has(k.kat) && !k.id.startsWith('p:'));
  const toplam = (bas, son) => degisken.reduce((t, k) => (k.tarih > bas && k.tarih <= son ? t + k.tutar : t), 0);
  const son = gunEkle(bugunTarih, -7);
  const buHafta = toplam(son, bugunTarih);
  // Önceki haftalar bugüne hizalı 7 günlük dilimler; ilk kaydın düştüğü dilim dahil, en çok 8.
  const ilk = degisken.reduce((m, k) => (k.tarih < m ? k.tarih : m), bugunTarih);
  const hafta = Math.max(1, Math.min(8, Math.floor((Date.parse(son) - Date.parse(ilk)) / 6048e5) + 1));
  const ortalama = toplam(gunEkle(son, -7 * hafta), son) / hafta;
  return { buHafta, ortalama, oran: ortalama > 0 ? buHafta / ortalama : null };
}

/** Ay sonu tahmini: değişken harcamaların günlük hızı ayın kalanına uzatılır; bütçeyi bitecek kategoriler ve tarihi. */
export function aySonuTahmini(durum, ay, bugunTarih = bugun()) {
  const d = denge(durum, ay, bugunTarih);
  const oz = ayOzeti(durum, ay);
  const kalanGun = d.gunSayisi - d.gun;
  // Günlük hız: bugüne kadarki, plan dışı değişken gider. Planlı (ileri tarihli) gider oz.gider içinde bir kez sayılır:
  // tahminiGider = gerçekleşen + planlı + hız × kalan gün.
  const kat = kategoriHaritasi(durum);
  let degiskenToplam = 0;
  for (const k of canliKayitlar(durum)) {
    if (k.tarih.startsWith(ay) && !planli(k, bugunTarih) && !k.id.startsWith('p:') && !SABIT.has(k.kat) && kat.get(k.kat)?.tur === 'gider') degiskenToplam += k.tutar;
  }
  const gunluk = d.gun ? kurus(degiskenToplam) / d.gun : 0;
  const tahminiGider = oz.gider + gunluk * kalanGun;
  // Ayda bir kez alınan şeyler (kedi maması gibi) hız tahminini bozar; en az 3 kaydı olanlara bakılır.
  // Hız ve adet yalnızca gerçekleşmiş, plan dışı kayıtlardan; planlı taksit bütçeden düşer ama hızı şişirmez.
  const adet = new Map();
  const gercek = new Map();
  for (const k of canliKayitlar(durum)) {
    if (!k.tarih.startsWith(ay) || planli(k, bugunTarih) || k.id.startsWith('p:')) continue;
    adet.set(k.kat, (adet.get(k.kat) ?? 0) + 1);
    gercek.set(k.kat, (gercek.get(k.kat) ?? 0) + k.tutar);
  }
  const bitecekler = butceSatirlari(durum, ay)
    .filter((s) => s.butce && !SABIT.has(s.kat.id) && s.harcanan <= s.butce && d.gun && (adet.get(s.kat.id) ?? 0) >= 3)
    .map((s) => {
      const hizi = (gercek.get(s.kat.id) ?? 0) / d.gun;
      const gunKaldi = hizi > 0 ? (s.butce - s.harcanan) / hizi : Infinity;
      return { kat: s.kat, gun: Math.floor(d.gun + gunKaldi) };
    })
    .filter((b) => b.gun < d.gunSayisi)
    .sort((a, b) => a.gun - b.gun);
  return { kalanGun, gunluk, tahminiGider, tahminiKalan: oz.gelir - tahminiGider, tahminiEl: aySonuBakiye(durum, ay) - gunluk * kalanGun, bitecekler };
}

/**
 * Koça giden özet, sürüm 2 (docs/koc-sozlesme.md bölüm 1). Saf fonksiyon.
 * Tek tek kayıtlar, notlar, elindeki para ve başlangıç parası ASLA girmez; yalnızca toplamlar ve oranlar.
 */
export function kocOzeti(durum, ay, bugunTarih = bugun()) {
  const oz = ayOzeti(durum, ay);
  const d = denge(durum, ay, bugunTarih);
  const ilk = ilkAy(durum);
  const bitti = ay < bugunTarih.slice(0, 7);
  const onceki = [1, 2, 3].map((i) => ayKaydir(ay, -i)).filter((a) => a >= ilk);
  const oncekiToplam = onceki.map((a) => ayOzeti(durum, a).toplam);
  const yuk = harcamaYuku(durum, bugunTarih);
  const tahmin = bitti ? null : aySonuTahmini(durum, ay, bugunTarih);
  return {
    surum: 2,
    ay: ayAdi(ay),
    ay_durumu: bitti ? 'bitti' : 'suruyor',
    gun: d.gun,
    gun_sayisi: d.gunSayisi,
    gelir: Math.round(oz.gelir),
    gider: Math.round(oz.gider),
    kalan: Math.round(oz.kalan),
    biriktirme_yuzde: oz.oran === null ? null : Math.round(oz.oran * 100),
    denge: {
      puan: d.puan,
      durum: { yesil: 'iyi', sari: 'dikkat', kirmizi: 'riskli' }[d.renk],
      hiz_puani: d.bilesen.hiz,
      hiz_yuzde: Math.round(d.hizOrani * 100),
      asim_puani: d.bilesen.asim,
      asan_kategoriler: d.asanlar.map((s) => s.kat.ad),
      guvenlik_puani: d.bilesen.pay,
      // Gider yoksa bölen 1 olur ve oran bakiyenin kendisine döner; bakiye özete hiç girmemeli.
      kac_aylik_gider: d.aylikGider > 1 ? Math.round((d.el / d.aylikGider) * 10) / 10 : null,
    },
    // Yük son 7 güne bakar; geçmiş bir ayı anlatırken bugünün haftası yanıltır.
    harcama_yuku: bitti || yuk.oran === null ? null : {
      son_7_gun: Math.round(yuk.buHafta),
      haftalik_ortalama: Math.round(yuk.ortalama),
      oran: Math.round(yuk.oran * 10) / 10,
    },
    ay_sonu_tahmini: tahmin && {
      tahmini_gider: Math.round(tahmin.tahminiGider),
      tahmini_kalan: Math.round(tahmin.tahminiKalan),
      bitecek_butceler: tahmin.bitecekler.map((b) => ({ kategori: b.kat.ad, gun: b.gun })),
    },
    egilim: onceki.slice().reverse().map((a) => {
      const o = ayOzeti(durum, a);
      return { ay: AYLAR[ayCoz(a).ay], gelir: Math.round(o.gelir), gider: Math.round(o.gider) };
    }),
    kategoriler: butceSatirlari(durum, ay).map((s) => ({
      ad: s.kat.ad,
      // O ay yürürlükte olan tekrar planı kategoriyi sabit yapar; bitmiş ya da başlamamış plan yapmaz.
      sabit: SABIT.has(s.kat.id) || (durum.planlar ?? []).some((p) => !p.silindi && p.tur === 'tekrar' && p.kat === s.kat.id && p.baslangic <= ay && (!p.bitis || p.bitis >= ay)),
      bu_ay: Math.round(s.harcanan),
      butce: s.butce ? Math.round(s.butce) : null,
      gecen_ay: oncekiToplam.length ? Math.round(oncekiToplam[0].get(s.kat.id) ?? 0) : null,
      uc_ay_ortalamasi: oncekiToplam.length
        ? Math.round(oncekiToplam.reduce((t, m) => t + (m.get(s.kat.id) ?? 0), 0) / oncekiToplam.length) : null,
    })),
  };
}

// ---------------------------------------------------------------- bugünün gözlemi ve "Koça sor" (yalnızca yerel; eşitlenmez)

/**
 * Sabah kartının durumu. durum.gunluk = { tarih, imza, yorum }, durum.gunlukAcik = kullanıcı bir kez aldı,
 * durum.gunlukKapali = Ayarlar'dan kapatıldı, durum.gunlukDeneme = bugün istek atılan gün (gün içinde tek otomatik istek).
 * Döner: { goster, yorum (bugünün yorumu ya da null), otomatik (Özet açılınca kendiliğinden istensin mi) }.
 */
export function gunlukKarari(durum, tarih, kayitVar) {
  const goster = !durum.gunlukKapali && Boolean(kayitVar);
  const kayitli = durum.gunluk?.yorum;
  // Elle bozulmuş yerel veri ekrana "undefined" yazdırmasın: yalnızca {gozlem: metin} biçimi geçer.
  const yorum = goster && durum.gunluk?.tarih === tarih && typeof kayitli?.gozlem === 'string' ? kayitli : null;
  const otomatik = goster && !yorum && durum.gunlukAcik === true && durum.gunlukDeneme !== tarih;
  return { goster, yorum, otomatik };
}

/** Ay için sohbet geçmişine bir soru-cevap ekler: en yeni üstte, en çok 3. Yeni nesne döner. */
export function sohbeteEkle(sohbet, ay, soru, cevap, zaman) {
  return { ...sohbet, [ay]: [{ soru, cevap, zaman }, ...(Array.isArray(sohbet?.[ay]) ? sohbet[ay] : [])].slice(0, 3) };
}

/** Koç özetinin kayıtlara bağlı kısmının imzası. Güne bağlı alanlar (gün, tahmin, haftalık yük, hız) girmez;
 *  böylece kayıtlar değişmedikçe ertesi gün "kayıtlar değişti" denmez. */
export function ozetImzasi(o) {
  const sabit = JSON.stringify({ gelir: o?.gelir, gider: o?.gider, kategoriler: o?.kategoriler, egilim: o?.egilim });
  return [...sabit].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
}
