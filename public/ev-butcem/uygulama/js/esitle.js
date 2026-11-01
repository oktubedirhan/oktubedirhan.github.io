// Hane paylaşımı: aynı evdeki telefonlar aynı kayıtları görür.
// Hesap yok; hane kodu anahtar gibi çalışır. Sunucu yalnızca üç fonksiyon açar (supabase/sema.sql).
// Telefon asıl kaynaktır: değişiklikler önce yerelde kaydedilir, sonra arka planda gönderilir ve çekilir.
import { kaydet, bugun, planlariUret } from './veri.js';

const RPC = 'https://gitosjdfxpzxickgbndr.supabase.co/rest/v1/rpc/';
const ANAHTAR = 'sb_publishable_dzwuBVBle8Px9s3rt0pCMA_z0B7j5-h'; // yayımlanabilir anahtar; tablolar ona kapalı
const PARCA = 1500;

let durum;
let cb;
let zamanlayici;
let calisiyor = false;
let tekrar = false;
let son = 'bekliyor'; // esit | cevrimdisi | hata | bekliyor
let bekleyenKod = '';

async function rpc(ad, govde) {
  const yanit = await fetch(RPC + ad, {
    method: 'POST',
    headers: { apikey: ANAHTAR, 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
  });
  if (!yanit.ok) {
    const hata = await yanit.json().catch(() => ({}));
    throw Object.assign(new Error(hata.message || `HTTP ${yanit.status}`), { kod: hata.code });
  }
  return yanit.status === 204 ? null : yanit.json();
}

const kodBicimle = (k) => k.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(?=.)/g, '$1-');

// ---------------------------------------------------------------- eşitleme

// Sunucuya yalnızca sözleşmedeki alanlar gider: yerel kolaylık alanları (kayıttaki plan ve elle) gitmez.
// Hesap: Ana hesap null değil "ana" yazılır; sunucu null'u "değiştirme" sayar (eski istemci uyumu, docs/hesap-sozlesme.md 7).
export const sunucuyaKayit = (k) => ({ id: k.id, tarih: k.tarih, kat: k.kat, tutar: k.tutar, not: k.not ?? '', hesap: k.hesap || 'ana', silindi: Boolean(k.silindi), guncel: k.guncel });
export const sunucuyaKategori = (k) => ({ id: k.id, emoji: k.emoji, ad: k.ad, tur: k.tur, butce: k.butce, sira: k.sira, silindi: Boolean(k.silindi), guncel: k.guncel });
export const sunucuyaPlan = (p) => ({
  id: p.id, tur: p.tur, kat: p.kat, tutar: p.tutar, toplam: p.toplam ?? null, adet: p.adet ?? null, gun: p.gun,
  baslangic: p.baslangic, bitis: p.bitis ?? null, not: p.not ?? '', hesap: p.hesap || 'ana', silindi: Boolean(p.silindi), guncel: p.guncel,
});
export const sunucuyaHesap = (h) => ({ id: h.id, ad: h.ad, tur: h.tur, baslangic: h.baslangic, sira: h.sira, silindi: Boolean(h.silindi), guncel: h.guncel });
export const sunucuyaAktarim = (a) => ({ id: a.id, tarih: a.tarih, kaynak: a.kaynak, hedef: a.hedef, tutar: a.tutar, not: a.not ?? '', silindi: Boolean(a.silindi), guncel: a.guncel });
export const gelenHesap = (g) => ({ id: g.id, ad: g.ad, tur: g.tur, baslangic: Number(g.baslangic), sira: Number(g.sira) || 0, silindi: Boolean(g.silindi), guncel: Number(g.guncel) });
export const gelenAktarim = (g) => ({ id: g.id, tarih: g.tarih, kaynak: g.kaynak, hedef: g.hedef, tutar: Number(g.tutar), not: g.not ?? g.notu ?? '', silindi: Boolean(g.silindi), guncel: Number(g.guncel) });
const sayiVeyaNull = (x) => (x === null || x === undefined ? null : Number(x));
/** Sunucudan gelen plan satırı → yerel plan (sayısal alanlar Number). */
export const gelenPlan = (g) => ({
  id: g.id, tur: g.tur, kat: g.kat, tutar: Number(g.tutar), toplam: sayiVeyaNull(g.toplam), adet: sayiVeyaNull(g.adet), gun: Number(g.gun),
  baslangic: g.baslangic, bitis: g.bitis ?? null, not: g.not ?? g.notu ?? '', hesap: g.hesap ?? null, silindi: Boolean(g.silindi), guncel: Number(g.guncel),
});

export function birlestir(liste, gelenler, donustur) {
  const yerel = new Map(liste.map((x) => [x.id, x]));
  let degisti = false;
  for (const g of gelenler) {
    const y = yerel.get(g.id);
    if (y && y.guncel >= g.guncel) continue;
    const yeni = donustur(g);
    if (y) Object.assign(y, yeni);
    else liste.push(yeni);
    degisti = true;
  }
  return degisti;
}

async function esitle() {
  if (!durum.hane) return;
  if (calisiyor) { tekrar = true; return; }
  calisiyor = true;
  const h = durum.hane;
  const onceki = son;
  try {
    const sinir = h.gonderilen ?? 0;
    const kayitlar = durum.kayitlar.filter((k) => k.guncel > sinir);
    const kategoriler = durum.kategoriler.filter((k) => k.guncel > sinir);
    const planlar = (durum.planlar ?? []).filter((p) => p.guncel > sinir);
    const baslangicVar = (durum.baslangicGuncel ?? 0) > sinir;
    // Hesaplar ve aktarımlar kendi sınırıyla gider ve yalnızca sunucu destekliyorsa (eski sunucu yeni parametreyi tanımaz).
    const hSinir = h.hesapGonderilen ?? 0;
    const hesaplar = h.hesapDestek ? (durum.hesaplar ?? []).filter((x) => x.guncel > hSinir) : [];
    const aktarimlar = h.hesapDestek ? (durum.aktarimlar ?? []).filter((x) => x.guncel > hSinir) : [];
    const hEnYeni = Math.max(hSinir, ...hesaplar.map((x) => x.guncel), ...aktarimlar.map((x) => x.guncel));
    const enYeni = Math.max(sinir, durum.baslangicGuncel ?? 0, ...kayitlar.map((k) => k.guncel), ...kategoriler.map((k) => k.guncel), ...planlar.map((p) => p.guncel));
    if (kayitlar.length || kategoriler.length || planlar.length || baslangicVar || hesaplar.length || aktarimlar.length) {
      for (let i = 0; i < Math.max(kayitlar.length, 1); i += PARCA) {
        await rpc('hane_yaz', {
          p_kod: h.kod,
          p_kayitlar: kayitlar.slice(i, i + PARCA).map(sunucuyaKayit),
          p_kategoriler: i === 0 ? kategoriler.map(sunucuyaKategori) : [],
          // Eski sunucu p_planlar'ı tanımaz; plan yoksa parametre hiç gönderilmez.
          ...(i === 0 && planlar.length ? { p_planlar: planlar.map(sunucuyaPlan) } : {}),
          ...(i === 0 && hesaplar.length ? { p_hesaplar: hesaplar.map(sunucuyaHesap) } : {}),
          ...(i === 0 && aktarimlar.length ? { p_aktarimlar: aktarimlar.map(sunucuyaAktarim) } : {}),
          p_baslangic: i === 0 && baslangicVar ? durum.baslangic : null,
          p_baslangic_guncel: i === 0 && baslangicVar ? durum.baslangicGuncel : null,
        });
      }
      h.gonderilen = enYeni;
      h.hesapGonderilen = hEnYeni;
    }

    const cevap = await rpc('hane_cek', { p_kod: h.kod, p_sonra: h.sonCekme ?? '-infinity' });
    let degisti = birlestir(durum.kayitlar, cevap.kayitlar, (g) => ({ ...g, tutar: Number(g.tutar) }));
    degisti = birlestir(durum.kategoriler, cevap.kategoriler, (g) => ({ ...g, butce: g.butce === null ? null : Number(g.butce) })) || degisti;
    // Eski sunucu cevapta `planlar` vermez: sessizce geç.
    if (Array.isArray(cevap.planlar)) degisti = birlestir(durum.planlar ??= [], cevap.planlar, gelenPlan) || degisti;
    // Eski sunucu `hesaplar` vermez: hesap ekleme o zaman hanede kapalı kalır (docs/hesap-sozlesme.md 7).
    if (Array.isArray(cevap.hesaplar)) {
      if (!h.hesapDestek) {
        // Sunucu yeni güncellendi: daha önce gönderilen kayıt ve planların hesap alanı eski sunucuda kayboldu.
        // Hepsi bir kez yeniden gönderilir (sunucu yalnızca daha yenisini yazar), hesaplar da hemen gider.
        h.hesapDestek = true;
        h.gonderilen = 0;
        tekrar = true;
        degisti = true;
      }
      degisti = birlestir(durum.hesaplar ??= [], cevap.hesaplar, gelenHesap) || degisti;
      degisti = birlestir(durum.aktarimlar ??= [], cevap.aktarimlar ?? [], gelenAktarim) || degisti;
    }
    // Gelen planların eksik aylarını üret (ayrıca zaman ilerleyince yeni ay için). Yeni kayıt çizimi gerektirir.
    if (planlariUret(durum, bugun()) > 0) degisti = true;
    if (cevap.hane && cevap.hane.baslangic_guncel > (durum.baslangicGuncel ?? 0)) {
      durum.baslangic = Number(cevap.hane.baslangic);
      durum.baslangicGuncel = cevap.hane.baslangic_guncel;
      degisti = true;
    }
    // Sunucu saatine göre biraz geriden çek: aynı anda yazan başka bir telefonun kaydı kaçmasın.
    h.sonCekme = new Date(Date.parse(cevap.simdi) - 10_000).toISOString();
    h.sonEsitleme = Date.now();
    son = 'esit';
    kaydet(durum);
    if (degisti || onceki !== son) cb.ciz();
  } catch (e) {
    son = navigator.onLine ? 'hata' : 'cevrimdisi';
    console.warn('Eşitleme olmadı:', e.message);
    if (onceki !== son) cb.ciz();
  } finally {
    calisiyor = false;
    if (tekrar) { tekrar = false; esitle(); }
  }
}

export function degisti() {
  if (!durum.hane) return;
  clearTimeout(zamanlayici);
  zamanlayici = setTimeout(esitle, 1200);
}

export function baslat(d, geriCagrilar) {
  durum = d;
  cb = geriCagrilar;
  const m = location.hash.match(/^#katil=([A-Za-z0-9-]+)/);
  if (m) {
    bekleyenKod = kodBicimle(m[1]);
    history.replaceState(null, '', '#ayarlar');
  }
  addEventListener('online', esitle);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && esitle());
  setInterval(() => document.visibilityState === 'visible' && esitle(), 30_000);
  esitle();
}

// ---------------------------------------------------------------- ekran parçaları

export const bekleyenKodVar = () => Boolean(bekleyenKod);
export const bekleyenKodu = () => bekleyenKod;

export function rozetMetni() {
  return { esit: 'Hane · eşitlendi', cevrimdisi: 'Hane · çevrimdışı', hata: 'Hane · eşitlenemedi', bekliyor: 'Hane' }[son];
}

function sonEsitlemeMetni() {
  const h = durum.hane;
  if (son === 'cevrimdisi') return 'İnternet yok. Kayıtların bu telefonda duruyor; bağlanınca gönderilecek.';
  if (son === 'hata') return 'Şu an eşitlenemedi. Kayıtların bu telefonda duruyor; birazdan yeniden denenecek.';
  if (!h.sonEsitleme) return 'Eşitleniyor…';
  const dk = Math.round((Date.now() - h.sonEsitleme) / 60000);
  return dk < 1 ? 'Az önce eşitlendi.' : `${dk} dakika önce eşitlendi.`;
}

export function ayarKutusu() {
  const kac = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if (durum.hane) {
    return `
      <p>Bu kodu bilen telefon bu hanenin kayıtlarını görür ve ekleyebilir. Yalnızca evdekilerle paylaş.</p>
      <div class="kod" aria-label="Hane kodu">${kac(durum.hane.kod)}</div>
      <div class="dugme-sira">
        <button class="dugme dolu" data-eylem="hane-paylas">Kodu paylaş</button>
        <button class="dugme" data-eylem="hane-esitle">Şimdi eşitle</button>
        <button class="dugme tehlike" data-eylem="hane-ayril">Haneden ayrıl</button>
      </div>
      <p class="durum-satiri${son === 'hata' ? ' hata' : ''}">${sonEsitlemeMetni()}</p>`;
  }
  return `
    <p>Aynı evde yaşadığın biriyle (eşin gibi) bütçeyi kendi telefonlarınızdan birlikte tutun. Hane kurunca bir kod alırsın; o kod diğer telefona girilince kayıtlar iki telefonda da görünür. Hesap ya da e-posta gerekmez.</p>
    <div class="dugme-sira"><button class="dugme dolu" data-eylem="hane-kur">Hane kur</button></div>
    <p style="margin:18px 0 8px">Evden biri hane kurduysa onun kodunu gir:</p>
    <label class="gorunmez" for="hane-kod">Hane kodu</label>
    <input class="metin-giris" id="hane-kod" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off" spellcheck="false" value="${kac(bekleyenKod)}">
    <button class="dugme" data-eylem="hane-katil">Haneye katıl</button>
    <p class="durum-satiri" id="hane-durum">${bekleyenKod ? 'Paylaşılan bağlantıdan gelen kod yazıldı; katılmak için dokun.' : 'Katılınca bu telefondaki kayıtlar da haneye eklenir.'}${(durum.planlar ?? []).some((p) => !p.silindi) ? ' Düzenli ödemelerin de eklenir; hanede aynısı varsa birini Düzenli ödemeler\'den sil.' : ''}</p>`;
}

function haneDurum(metin, hata = false) {
  const p = document.getElementById('hane-durum');
  if (!p) return;
  p.textContent = metin;
  p.classList.toggle('hata', hata);
}

function haneyiAc(kod) {
  durum.hane = { kod, gonderilen: 0, sonCekme: null };
  bekleyenKod = '';
  son = 'bekliyor';
  kaydet(durum);
  cb.ciz();
  return esitle();
}

export const eylemler = {
  async 'hane-kur'(dugme) {
    dugme.disabled = true;
    try {
      const kod = await rpc('hane_olustur', {});
      await haneyiAc(kod);
      cb.bildir('Hane kuruldu. Kodu evdeki diğer telefona gir.');
    } catch {
      dugme.disabled = false;
      haneDurum('Hane kurulamadı. İnternet bağlantını kontrol edip yeniden dene.', true);
    }
  },
  async 'hane-katil'(dugme) {
    const girilen = document.getElementById('hane-kod').value;
    document.activeElement?.blur?.();
    const kod = kodBicimle(girilen);
    if (kod.replace(/-/g, '').length !== 12) return haneDurum('Kod 12 harf ve rakamdan oluşur, örneğin 3GRW-8AEL-B9M5.', true);
    dugme.disabled = true;
    haneDurum('Kontrol ediliyor…');
    try {
      await rpc('hane_cek', { p_kod: kod, p_sonra: 'infinity' });
      await haneyiAc(kod);
      cb.bildir('Haneye katıldın; kayıtlar eşitleniyor.');
    } catch (e) {
      dugme.disabled = false;
      haneDurum(e.kod === 'P0002' ? 'Bu kodla bir hane yok. Kodu kuran telefondan tekrar kontrol et.' : 'Bağlanılamadı. İnternet bağlantını kontrol edip yeniden dene.', true);
    }
  },
  async 'hane-paylas'() {
    const kod = durum.hane.kod;
    const url = `${location.origin}${location.pathname}#katil=${kod}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Ev Bütçem', text: `Ev Bütçem hane kodumuz: ${kod}`, url });
      else { await navigator.clipboard.writeText(`Ev Bütçem hane kodumuz: ${kod}\n${url}`); cb.bildir('Kod ve bağlantı kopyalandı'); }
    } catch { /* paylaşım penceresi kapatıldı */ }
  },
  'hane-esitle'() {
    esitle();
  },
  'hane-ayril'() {
    if (!confirm('Bu telefon haneden ayrılsın mı? Kayıtlar bu telefonda kalır; artık eşitlenmez. Aynı kodla yeniden katılabilirsin.')) return;
    durum.hane = null;
    son = 'bekliyor';
    kaydet(durum);
    cb.ciz();
    cb.bildir('Haneden ayrıldın');
  },
};
