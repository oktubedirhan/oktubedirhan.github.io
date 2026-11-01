// Ev Bütçem: ekranlar ve etkileşim. Veri ve hesaplar veri.js'de, hane eşitlemesi esitle.js'de.
import {
  yukle, kaydet, tl, yeniId, bugun, buAy, ayKaydir, ayAdi, ayCoz, sonAylar, ilkAy,
  ayOzeti, aySonuBakiye, butceSatirlari, denge, harcamaYuku, aySonuTahmini, canliKayitlar, canliKategoriler, kategoriHaritasi, ornekVeri, kocOzeti, ozetImzasi, gunlukKarari, sohbeteEkle,
  planlariUret, planOlustur, planGuncelle, planDurdur, planSil, planli, elindekiPara, kartBorcu, netPara, hesapBakiyeleri, ANA_HESAP, gunSonuBakiye,
} from './veri.js';
import {
  taksitOnizleme, tekrarAciklamasi, adetSinirla, planAdi, planAltMetni, planlariSirala, planDurdurulmus, taksitSirasi,
} from './plan-arayuz.js';
import { kurulumGerekli, gunOku, gunGectiMi, satirDogrula, kurulumUygula, kurulumOzeti } from './kurulum.js';
import {
  HAZIR_EMOJILER, AD_SINIRI, butceOku, cizimliMi, varsayilanEmoji, adTemizle, adHatasi, emojiAl, kategoriEkle, kategoriGuncelle, kategoriTasi, kategoriGizle, kategoriGoster, gizliKategoriler, sonGorunenMi,
} from './kategori.js';
import { yorumAnahtari, gunlukAnahtari, sorAnahtari, oyDegistir, geriBildirimGovdesi } from './geri-bildirim.js';
import {
  HESAP_TURLERI, gorunenHesaplar, gizliHesaplar, hesapSecimiGerekli, varsayilanHesap, hesapAdHatasi, hesapEkle, hesapDuzelt, gosterilenTutar,
  hesapGizle, hesapGoster, aktarimHatasi, aktarimEkle, aktarimSil, sonAktarimlar, hesapBul, AD_SINIRI as HESAP_AD_SINIRI, HESAP_SINIRI,
} from './hesap.js';
import { kategoriTahmin, sonKategoriler, sonKayit, kayitAra, aramaEtkin, ARALIKLAR } from './hizli.js';
import * as esitle from './esitle.js';
import * as yz from './yz.js';
import * as hareket from './hareket.js';

const durum = yukle();
if (!durum.cihaz) { durum.cihaz = yeniId(); kaydet(durum); }
// Planların eksik aylarını üret (tekrar çalıştırılabilir); yeni kayıt geldiyse sakla.
if (planlariUret(durum, bugun()) > 0) kaydet(durum);
let sonGun = bugun();
let secAy = buAy();
let sallanacak = null; // yeni kayıtla bütçesi aşılan kategori, kartı bir kez sallanır
const $ = (s, kok = document) => kok.querySelector(s);
const ekran = $('#ekran');

const kacis = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Yapay zekâ metni: kaçışlı, "1.400 ₺" satır sonunda bölünmesin diye rakamla ₺ arasına bölünmez boşluk.
const yzMetin = (s) => kacis(s).replace(/(\d) (₺)/g, '$1\u00a0$2');
// Kategori simgesi: varsayılan kategorilerin çizilmiş simgesi (emojisi değiştirilmediyse); öbürlerinde emojisi.
const katIkon = (k) => (cizimliMi(k)
  ? `<svg class="kat-ikon ${k.tur === 'gelir' ? 'gelir' : ''}" aria-hidden="true"><use href="#k-${k.id}"/></svg>`
  : `<span aria-hidden="true">${kacis(k?.emoji ?? '❔')}</span>`);
const yuzde = (x) => `%${Math.round(Math.abs(x) * 100)}`;

function degisti() {
  kaydet(durum);
  esitle.degisti();
  ciz();
}

// ---------------------------------------------------------------- sekmeler ve ay seçici

const sekme = () => (['ozet', 'koc', 'aylar', 'kayitlar', 'ayarlar'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'ozet');

function ciz() {
  const s = sekme();
  document.querySelectorAll('.sekmeler a').forEach((a) => (a.dataset.sekme === s ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('#uyari-notu').hidden = s !== 'koc';
  $('#ornek-rozet').hidden = !durum.kayitlar.some((k) => k.ornek && !k.silindi);
  const kurulumda = s === 'ozet' && kurulumGerekli(durum);
  document.querySelectorAll('.ay-ok').forEach((b) => { b.hidden = s === 'ayarlar' || kurulumda; });
  $('#ay-baslik').textContent = s === 'ayarlar' ? 'Ayarlar' : ayAdi(secAy);
  $('[data-ay="1"]').disabled = secAy >= buAy();
  const rozet = $('#hane-rozet');
  rozet.hidden = !durum.hane;
  if (durum.hane) rozet.querySelector('span').textContent = esitle.rozetMetni();
  // Arka plandaki eşitleme, kullanıcı bir alana yazarken ekranı yeniden çizip yazdığını silmesin.
  if (ekran.contains(document.activeElement) && document.activeElement.matches('input')) return;
  ({ ozet: ozetCiz, koc: kocCiz, aylar: aylarCiz, kayitlar: kayitlarCiz, ayarlar: ayarlarCiz })[s]();
  hareket.sayaclar(ekran);
  hareket.halka(ekran);
  hareket.sirali(ekran, '.fatura, .gun, .koc-satir, .ai-satir');
}

let oncekiSekme = sekme();
const SEKME_SIRASI = ['ozet', 'koc', 'aylar', 'kayitlar', 'ayarlar'];

$('#ay-secici').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ay]');
  if (!b || b.disabled) return;
  secAy = ayKaydir(secAy, Number(b.dataset.ay));
  hareket.titret(8);
  hareket.gecis(ciz, Number(b.dataset.ay) > 0 ? 'ileri' : 'geri');
});
addEventListener('hashchange', () => {
  const s = sekme();
  const yon = SEKME_SIRASI.indexOf(s) >= SEKME_SIRASI.indexOf(oncekiSekme) ? 'ileri' : 'geri';
  oncekiSekme = s;
  hareket.gecis(() => { ciz(); scrollTo(0, 0); }, yon);
  ekran.focus({ preventScroll: true });
});
$('#ornek-rozet').addEventListener('click', () => eylemler['ornek-sil']());

// ---------------------------------------------------------------- özet

function bosDurum() {
  return `<section class="bos-durum">
    <h2>Evin parasını takip etmeye başla</h2>
    <p>Harcamanı ya da gelirini ekle; ay sonunda ne geldi, ne gitti, ne kaldı burada görünür.</p>
    <div class="dugme-sira">
      <button class="dugme dolu" data-eylem="ekle">İlk kaydı ekle</button>
      <button class="dugme" data-eylem="ornek">Örnek verilerle dene</button>
    </div>
  </section>`;
}

// Kayıtların başladığı aydan önceki aylar "veri yok" olarak çizilir; sıfır harcanan bir aydan ayırt edilsin.
function cubuklar(degerler, butce, ayAnahtarlari, buAyIndeksi, ilk) {
  const ust = Math.max(...degerler, butce || 0, 1);
  const cizgi = butce ? `<b class="butce-cizgi" style="bottom:${(butce / ust) * 100}%"></b>` : '';
  const sinif = (v, i) => (i === buAyIndeksi ? 'bu' : ayAnahtarlari[i] < ilk ? 'yok' : v ? '' : 'bos');
  const ciz = degerler.map((v, i) => `<i class="${sinif(v, i)}" style="height:${Math.max(v / ust, 0.04) * 100}%;--s:${i}"></i>`).join('');
  const et = ayAnahtarlari.map((a, i) => `<span class="${i === buAyIndeksi ? 'bu' : a < ilk ? 'yok' : ''}">${ayAdi(a, true)}</span>`).join('');
  return `<div class="cubuklar" aria-hidden="true">${ciz}${cizgi}</div><div class="aylar-etiket" aria-hidden="true">${et}</div>`;
}

function ozetCiz() {
  if (kurulumGerekli(durum)) {
    ekran.innerHTML = kurulumCiz();
    return;
  }
  if (!canliKayitlar(durum).length) {
    ekran.innerHTML = bosDurum();
    return;
  }
  const oz = ayOzeti(durum, secAy);
  // İçinde bulunulan ayda "şu an elindeki para" bugüne kadar olandır; planlı (ileri tarihli) kayıtlar sayılmaz.
  const el = secAy === buAy() ? elindekiPara(durum, bugun()) : aySonuBakiye(durum, secAy);
  const aylar = sonAylar(secAy, 6);
  // Bugünün gözlemi: yalnızca bu ay ve o ayda kayıt varsa. Bir kez alındıysa yeni günde kendiliğinden istenir.
  const gunluk = gunlukKarari(durum, bugun(), secAy === buAy() && canliKayitlar(durum).some((k) => k.tarih.startsWith(secAy)));
  if (gunluk.otomatik && !gunlukBekliyor) gunlukGetir(false);
  const gecmis = aylar.map((a) => ayOzeti(durum, a).toplam);
  const kat = kategoriHaritasi(durum);

  const ilk = ilkAy(durum);
  // Bütçeyi aşanlar en üstte: faturanın "bu dönem neye dikkat" kısmı.
  const asti = (s) => (s.butce && s.harcanan > s.butce ? 1 : 0);
  const satirlar = butceSatirlari(durum, secAy).sort((a, b) => asti(b) - asti(a) || b.harcanan - a.harcanan || (b.butce - a.butce));
  const faturalar = satirlar.map((s) => {
    const asti = s.butce && s.harcanan > s.butce;
    let alt = 'Bütçe yok';
    if (s.butce) {
      if (asti) alt = `Bütçe ${tl(s.butce)} · ${tl(s.harcanan - s.butce)} aşıldı`;
      else if (s.butce - s.harcanan < 0.5) alt = `Bütçe ${tl(s.butce)} · tam doldu`;
      else alt = `Bütçe ${tl(s.butce)} · ${tl(s.butce - s.harcanan)} kaldı`;
    }
    let deg = '';
    if (s.degisim !== null && Math.abs(s.degisim) >= 0.005) deg = `<span class="degisim ${s.degisim > 0 ? 'artti' : 'azaldi'}">${s.degisim > 0 ? '▲' : '▼'} ${yuzde(s.degisim)}</span>`;
    else if (s.degisim !== null) deg = '<span class="degisim">=</span>';
    else deg = '<span class="degisim"></span>';
    const degerler = gecmis.map((t) => t.get(s.kat.id) ?? 0);
    const aciklama = `${s.kat.ad}: bu ay ${tl(s.harcanan)}${s.butce ? `, bütçe ${tl(s.butce)}` : ''}. Son 6 ay: ${aylar.map((a, i) => `${ayAdi(a, true)} ${tl(degerler[i])}`).join(', ')}.`;
    const salla = asti && s.kat.id === sallanacak ? ' salla' : '';
    const ilerleme = !asti && s.butce ? `<div class="ilerleme" aria-hidden="true"><i style="width:${Math.min(100, (s.harcanan / s.butce) * 100)}%"></i></div>` : '';
    return `<article class="fatura${asti ? ' asti' : ' kisa'}${salla}" aria-label="${kacis(aciklama)}" ${asti ? '' : 'tabindex="0" aria-expanded="false"'}>
      <span class="ad"><span class="kat-kutu">${katIkon(s.kat)}</span><span>${kacis(s.kat.ad)}</span></span><span class="tutar">${tl(s.harcanan)}</span>
      <span class="alt">${alt}</span>${deg}
      ${ilerleme}
      ${cubuklar(degerler, s.butce, aylar, 5, ilk)}
    </article>`;
  }).join('');

  const gelirler = [...oz.toplam].filter(([id]) => kat.get(id)?.tur === 'gelir').sort((a, b) => b[1] - a[1]);
  const gelirListe = gelirler.length ? `<div class="bolum"><h2>Gelirler</h2></div><div class="liste">${gelirler.map(([id, t]) => {
    const k = kat.get(id);
    return `<div class="kayit"><span class="emoji">${katIkon(k)}</span><span><span class="ad">${kacis(k.ad)}</span></span><span class="tutar gelir">${tl(t)}</span></div>`;
  }).join('')}</div>` : '';

  const simdi = secAy === buAy();
  ekran.innerHTML = `
    <section class="kutular" aria-label="${ayAdi(secAy)} özeti">
      <div class="kutu"><small>Gelir</small><b data-sayac="${oz.gelir}" data-anahtar="gelir">${tl(oz.gelir)}</b></div>
      <div class="kutu"><small>Gider</small><b data-sayac="${oz.gider}" data-anahtar="gider">${tl(oz.gider)}</b></div>
      <div class="kutu kalan${oz.kalan < 0 ? ' eksi' : ''}"><small>Kalan</small><b data-sayac="${oz.kalan}" data-anahtar="kalan">${tl(oz.kalan)}</b></div>
    </section>
    <p class="el-satiri"><span>${simdi ? 'Şu an elindeki para' : kartVar() ? 'Ay sonunda net para' : 'Ay sonunda elindeki para'} <b data-sayac="${el}" data-anahtar="el">${tl(el)}</b></span>${oz.oran !== null ? `<em>Biriktirme ${oz.oran < 0 ? '−' : ''}${yuzde(oz.oran)}</em>` : ''}</p>
    ${simdi && (durum.hesaplar ?? []).some((h) => !h.silindi) ? hesapSeridi() : ''}
    ${gunlukKarti(gunluk)}
    ${faturalar ? `<div class="bolum"><h2>Giderler</h2><span class="anahtar"><i></i>bu ay <s></s>bütçe</span></div>${faturalar}` : '<section class="bos-durum"><h2>Bu ay henüz gider yok</h2><p>Eklediğin harcamalar burada kategori kategori görünür.</p></section>'}
    ${gelirListe}`;
}

// ---------------------------------------------------------------- yapay zekâ yorumu

// Koça kayıtların kendisi değil, yalnızca toplamlar ve oranlar gider (docs/koc-sozlesme.md).
const yorumOzeti = (ay) => kocOzeti(durum, ay);

const imzaAl = ozetImzasi;

// Eski sunucu düz metin, yeni sunucu {gozlem, oneri} döner; ikisi de çizilir.
const yorumSatiri = (m) => typeof m === 'string'
  ? `<li>${yzMetin(m)}</li>`
  : `<li>${yzMetin(m?.gozlem ?? '')}${m?.oneri ? `<br><small>${yzMetin(m.oneri)}</small>` : ''}</li>`;

// ---------------------------------------------------------------- koç geri bildirimi (js/geri-bildirim.js)

let izinBekleyen = null; // onay sorulan oyun anahtarı; panel o yorumun altında açılır

function oyDugmeleri(anahtar, ne) {
  const oy = durum.oylar?.[anahtar] ?? 0;
  const a = kacis(anahtar);
  return `<span class="oylar" role="group" aria-label="${ne} işine yaradı mı?">
    <button type="button" class="oy" data-eylem="oy" data-anahtar="${a}" data-oy="1" aria-pressed="${oy === 1}" aria-label="İşime yaradı"><svg class="ikon" aria-hidden="true"><use href="#i-begen"/></svg></button>
    <button type="button" class="oy" data-eylem="oy" data-anahtar="${a}" data-oy="-1" aria-pressed="${oy === -1}" aria-label="İşime yaramadı"><svg class="ikon" aria-hidden="true"><use href="#i-begenme"/></svg></button>
  </span>`;
}

function izinPaneli(anahtar) {
  if (izinBekleyen !== anahtar || durum.geriBildirimIzni !== undefined) return '';
  return `<div class="izin-paneli" role="group" aria-labelledby="izin-metni">
    <p id="izin-metni">Teşekkürler. Koçu iyileştirmek için bu yorumu, oyunu ve koçun gördüğü aylık özeti (kategori toplamları, bütçeler, son ayların eğilimi, ay sonu tahmini) bize gönderelim mi? Tek tek kayıtların, notların, elindeki para ve hane kodun gitmez.</p>
    <div class="dugme-sira"><button type="button" class="dugme dolu" data-eylem="izin-ver">Gönder</button><button type="button" class="dugme" data-eylem="izin-verme">Gönderme</button></div>
    <small>Ayarlar › Koç'tan istediğin zaman değiştirebilirsin.</small>
  </div>`;
}

function oyGonder(anahtar, oy) {
  if (durum.geriBildirimIzni !== true) return;
  const govde = geriBildirimGovdesi(durum, anahtar, oy);
  if (govde) yz.geriBildirimGonder(govde);
}

const geriBildirimEylemleri = {
  oy(dugme) {
    const anahtar = dugme.dataset.anahtar;
    const r = oyDegistir(durum.oylar, anahtar, Number(dugme.dataset.oy));
    durum.oylar = r.oylar;
    kaydet(durum); // yalnızca bu telefonda; hane eşitlemesine girmez
    hareket.titret(8);
    if (durum.geriBildirimIzni === undefined && r.oy) izinBekleyen = anahtar;
    else oyGonder(anahtar, r.oy);
    ciz();
    // Yeniden çizimden sonra odak aynı düğmede kalsın.
    ekran.querySelector(`[data-eylem="oy"][data-anahtar="${CSS.escape(anahtar)}"][data-oy="${dugme.dataset.oy}"]`)?.focus({ preventScroll: true });
  },
  'izin-ver'() {
    durum.geriBildirimIzni = true;
    kaydet(durum);
    const anahtar = izinBekleyen;
    izinBekleyen = null;
    if (anahtar && durum.oylar?.[anahtar]) oyGonder(anahtar, durum.oylar[anahtar]);
    ciz();
    bildir('Teşekkürler, gönderildi.');
  },
  'izin-verme'() {
    durum.geriBildirimIzni = false;
    kaydet(durum);
    izinBekleyen = null;
    ciz();
    bildir('Tamam, oyların yalnızca bu telefonda kalır.');
  },
};

function yorumKutusu() {
  const k = durum.yorumlar?.[secAy];
  const baslik = '<h2><svg class="ikon"><use href="#i-yorum"/></svg>Koçun yorumu</h2>';
  if (!k) {
    return `<section class="yorum-kutu">${baslik}
      <p class="ai-aciklama">Yapay zekâ bu ayki harcamalarına bakıp neye dikkat etmen gerektiğini iki üç cümleyle söyler.</p>
      <button class="dugme" data-eylem="yorum">Yorum al</button></section>`;
  }
  const eski = k.imza !== imzaAl(yorumOzeti(secAy));
  const anahtar = yorumAnahtari(secAy, k.zaman);
  return `<section class="yorum-kutu">${baslik}
    <ul>${k.metinler.map(yorumSatiri).join('')}</ul>
    <div class="dipnot"><span>${eski ? 'Bu yorumdan sonra kayıtlar değişti.' : 'Yapay zekâ yorumudur.'}</span><span class="dipnot-sag">${oyDugmeleri(anahtar, 'Bu yorum')}<button data-eylem="yorum">Yenile</button></span></div>
    ${izinPaneli(anahtar)}</section>`;
}

// ---------------------------------------------------------------- bugünün gözlemi (Özet'in en üstü)

const DIPNOT = 'Yapay zekâ yorumudur, yatırım tavsiyesi değildir.';
let gunlukBekliyor = false;

function gunlukKarti(g) {
  if (!g.goster) return '';
  const baslik = '<h2><svg class="ikon"><use href="#i-yorum"/></svg>Bugünün gözlemi</h2>';
  const dugme = (yazi) => `<button data-eylem="gunluk"${gunlukBekliyor ? ' disabled' : ''}>${gunlukBekliyor ? 'Hazırlanıyor…' : yazi}</button>`;
  if (g.yorum) {
    // Kayıtlar gözlemden sonra değiştiyse rakamlar sayfadakiyle çelişebilir: söyle, yenilemeyi öner.
    const eski = durum.gunluk?.imza !== undefined && durum.gunluk.imza !== imzaAl(yorumOzeti(buAy()));
    const anahtar = durum.gunluk?.tarih ? gunlukAnahtari(durum.gunluk) : null;
    return `<section class="yorum-kutu gunluk-kutu">${baslik}
      <p class="gozlem">${yzMetin(g.yorum.gozlem)}</p>${g.yorum.oneri ? `<small>${yzMetin(g.yorum.oneri)}</small>` : ''}
      <div class="dipnot"><span>${eski ? 'Bu gözlemden sonra kayıtlar değişti.' : DIPNOT}</span><span class="dipnot-sag">${anahtar ? oyDugmeleri(anahtar, 'Bu gözlem') : ''}${eski ? dugme('Yenile') : ''}</span></div>
      ${anahtar ? izinPaneli(anahtar) : ''}</section>`;
  }
  return `<section class="yorum-kutu gunluk-kutu bos">${baslik}
    <p class="dipnot"><span>Koç bugünkü durumuna bakıp tek bir gözlem yazar.</span>${dugme('Gözlemi al')}</p></section>`;
}

/** Günde bir gözlem ister. elle=false (kendiliğinden) iken hata sessizdir: kullanıcı düğmeyi görür. */
async function gunlukGetir(elle) {
  if (gunlukBekliyor) return;
  gunlukBekliyor = true;
  const tarih = bugun();
  durum.gunlukDeneme = tarih; // aynı gün içinde kendiliğinden ikinci istek atılmaz
  kaydet(durum);
  try {
    const ozet = yorumOzeti(buAy());
    const r = await yz.gunlukIste(durum, ozet);
    const y = (Array.isArray(r.yorumlar) ? r.yorumlar : []).find((m) => m && typeof m.gozlem === 'string' && m.gozlem.trim());
    if (!y) throw Object.assign(new Error('bos'), { kod: 'yogun' });
    durum.gunluk = { tarih, imza: imzaAl(ozet), yorum: { gozlem: y.gozlem, oneri: typeof y.oneri === 'string' ? y.oneri : '' } };
    if (elle) durum.gunlukAcik = true;
    kaydet(durum);
  } catch (e) {
    if (elle) bildir(yz.hataMetni(e.kod));
  } finally {
    gunlukBekliyor = false;
    ciz();
  }
}

// ---------------------------------------------------------------- koça sor

const SOR_CIPLERI = ['Bu ay neden fazla harcadım?', 'Ay sonuna kadar ne kadar harcayabilirim?', 'En çok nerede kısabilirim?', 'Geçen aya göre ne değişti?'];
const sohbetZamani = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
let sorBekliyor = false;
let sorTaslak = '';
let yeniCevap = '';

function sorKutusu() {
  // Yerel veri elle bozulmuş olabilir: dizi değilse ya da zaman geçersizse o kaydı çizme.
  const gecmis = (Array.isArray(durum.sohbet?.[secAy]) ? durum.sohbet[secAy] : [])
    .filter((o) => o && typeof o.soru === 'string' && typeof o.cevap === 'string' && Number.isFinite(o.zaman));
  const kapali = sorBekliyor ? ' disabled' : '';
  return `<section class="yorum-kutu sor-kutu" aria-label="Koça sor"${sorBekliyor ? ' aria-busy="true"' : ''}>
    <h2><svg class="ikon"><use href="#i-yorum"/></svg>Koça sor</h2>
    <div class="cipler">${SOR_CIPLERI.map((c) => `<button type="button" class="cip" data-eylem="sor-cip" data-soru="${kacis(c)}"${kapali}>${kacis(c)}</button>`).join('')}</div>
    <form class="sor-form" data-sor-formu autocomplete="off">
      <label class="gorunmez" for="sor-girdi">Koça sor</label>
      <input id="sor-girdi" name="soru" type="text" maxlength="200" enterkeyhint="send" placeholder="Kendi sorunu yaz" value="${kacis(sorTaslak)}"${sorBekliyor ? ' readonly' : ''}>
      <button class="dugme dolu" type="submit"${kapali}>${sorBekliyor ? 'Düşünüyor…' : 'Sor'}</button>
    </form>
    ${gecmis.length ? `<ul class="sohbet">${gecmis.map((o) => `
      <li class="sohbet-oge"><p class="soru-metin">${kacis(o.soru)}</p><p class="cevap-metin" tabindex="-1">${yzMetin(o.cevap)}</p><div class="cevap-alt"><small>${kacis(sohbetZamani.format(o.zaman))}</small>${oyDugmeleri(sorAnahtari(secAy, o.zaman), 'Bu cevap')}</div>${izinPaneli(sorAnahtari(secAy, o.zaman))}</li>`).join('')}</ul>` : ''}
  </section>`;
}

async function soruGonder(ham) {
  if (sorBekliyor) return;
  const soru = String(ham ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!soru) { bildir('Önce bir soru yaz.'); return; }
  const ay = secAy;
  sorBekliyor = true;
  sorTaslak = soru;
  ciz();
  try {
    const r = await yz.sorIste(durum, yorumOzeti(ay), soru);
    const cevap = typeof r.cevap === 'string' ? r.cevap.trim() : '';
    if (!cevap) throw Object.assign(new Error('bos'), { kod: 'yogun' });
    durum.sohbet = sohbeteEkle(durum.sohbet, ay, soru, cevap, Date.now());
    sorTaslak = '';
    kaydet(durum);
    yeniCevap = cevap;
  } catch (e) {
    bildir(yz.hataMetni(e.kod));
  } finally {
    sorBekliyor = false;
    ciz();
    if (yeniCevap) {
      // #ekran her çizimde yeniden kurulur; duyuru ekran dışındaki kalıcı canlı bölgeden yapılır.
      const duyuru = document.getElementById('duyuru');
      if (duyuru) duyuru.textContent = `Koçun cevabı: ${yeniCevap}`;
      ekran.querySelector('.sohbet-oge .cevap-metin')?.focus({ preventScroll: true });
      yeniCevap = '';
    }
  }
}

ekran.addEventListener('submit', (e) => {
  const f = e.target.closest?.('[data-sor-formu]');
  if (!f) return;
  e.preventDefault();
  document.activeElement?.blur?.(); // yazarken yeniden çizim ertelenir; cevap görünsün
  soruGonder(f.elements.soru.value);
});
ekran.addEventListener('input', (e) => {
  if (e.target.id === 'sor-girdi') sorTaslak = e.target.value;
  else if (e.target.dataset.kurulum) kurulumYazildi(e.target);
});

// ---------------------------------------------------------------- koç

const DENGE_METNI = { yesil: 'Dengedesin', sari: 'Dikkat', kirmizi: 'Zorlanıyorsun' };

function kocCiz() {
  if (!canliKayitlar(durum).length) {
    ekran.innerHTML = bosDurum();
    return;
  }
  const d = denge(durum, secAy);
  const y = harcamaYuku(durum);
  const a = aySonuTahmini(durum, secAy);
  const simdi = secAy === buAy();
  const cevre = 2 * Math.PI * 52;
  const halka = `<svg class="halka" viewBox="0 0 120 120" role="img" aria-label="Denge puanı ${d.puan}, 100 üzerinden">
    <circle cx="60" cy="60" r="52" class="halka-zemin"/>
    <circle cx="60" cy="60" r="43" class="halka-kopuk"/>
    <circle cx="60" cy="60" r="52" class="halka-dolu ${d.renk}" data-cevre="${cevre}" data-puan="${d.puan}" style="stroke-dasharray:${cevre};stroke-dashoffset:${cevre}"/>
    <text x="60" y="66" text-anchor="middle" class="halka-puan" data-sayac="${d.puan}" data-anahtar="puan" data-bicim="tam">${d.puan}</text>
    <text x="60" y="78" text-anchor="middle" class="halka-alt">DENGE</text></svg>`;
  const ayAdiUzun = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
  const tarihi = (g) => ayAdiUzun.format(new Date(ayCoz(secAy).yil, ayCoz(secAy).ay, g));
  const yuk = y.oran === null ? '–' : `${y.oran.toFixed(1).replace('.', ',')}×`;
  const yukMetni = y.oran === null ? 'Karşılaştırmak için birkaç haftalık kayıt gerekiyor.'
    : y.oran >= 1.15 ? 'Bu hafta normalinden fazla harcadın.' : y.oran <= 0.85 ? 'Bu hafta normalinden sakin geçti.' : 'Bu hafta normal seviyende.';
  const tahmin = simdi && a.kalanGun > 0
    ? `<b class="${a.tahminiKalan < 0 ? 'eksi' : ''}">≈ ${tl(a.tahminiKalan)}</b><small>Bu hızla ay sonunda bu aydan kalacak</small>`
    : `<b class="${a.tahminiKalan < 0 ? 'eksi' : ''}">${tl(a.tahminiKalan)}</b><small>${simdi ? 'Ay bugün bitiyor; bu aydan kalan' : 'Bu aydan kalan'}</small>`;
  const yuzdeGecti = Math.round((d.gun / d.gunSayisi) * 100);
  const satirlar = [
    [`Harcama hızı`, d.bilesen.hiz, 50, `Ayın %${yuzdeGecti}'i geçti; beklenenin ${d.hizOrani <= 1 ? 'altında ya da hizasında' : `%${Math.round((d.hizOrani - 1) * 100)} üstünde`} harcadın.`],
    [`Bütçe aşımı`, d.bilesen.asim, 25, d.asanlar.length ? `${d.asanlar.map((s) => kacis(s.kat.ad)).join(', ')} bütçesini aştı.` : 'Bütçesini aşan kategori yok.'],
    [`Güvenlik payı`, d.bilesen.pay, 25, `Elindeki para yaklaşık ${(d.el / d.aylikGider).toFixed(1).replace('.', ',')} aylık gidere yetiyor.`],
  ];
  const uyarilar = simdi ? a.bitecekler.slice(0, 3).map((b) => `<li>Bu hızla <b>${kacis(b.kat.ad)}</b> bütçesi <b>${tarihi(b.gun)}</b> civarında biter.</li>`).join('') : '';
  ekran.innerHTML = `
    <section class="koc-ust">
      ${halka}
      <p class="koc-durum ${d.renk}">${DENGE_METNI[d.renk]}<span>${d.asanlar.length ? `${d.asanlar.length} kategori bütçesini aştı` : 'Bütçeler yolunda'}${simdi && a.kalanGun > 0 ? `; ay sonunda ≈ ${tl(a.tahminiKalan)} kalacak` : ''}.</span></p>
      <p class="koc-yuk"><b>${yuk}</b><span>Son 7 günde normal haftanın ${y.oran === null ? '–' : y.oran.toFixed(1).replace('.', ',')} katı harcadın. ${yukMetni}</span></p>
    </section>
    <section class="ayar-kutu koc-tahmin">${tahmin}${uyarilar ? `<ul>${uyarilar}</ul>` : ''}</section>
    <div class="bolum"><h2>Puan nasıl oluştu</h2><span>${d.puan} / 100</span></div>
    <section class="liste">${satirlar.map(([ad, p, ust, metin]) => `
      <div class="koc-satir"><div><b>${ad}</b><small>${metin}</small></div><span>${p}<i>/${ust}</i></span>
        <div class="koc-cubuk"><i style="width:${(p / ust) * 100}%"></i></div></div>`).join('')}
    </section>
    ${yorumKutusu()}
    ${sorKutusu()}`;
}

// ---------------------------------------------------------------- aylar

function aylarCiz() {
  if (!canliKayitlar(durum).length) {
    ekran.innerHTML = bosDurum();
    return;
  }
  const son = buAy();
  let bas = ilkAy(durum);
  if (bas > ayKaydir(son, -5)) bas = ayKaydir(son, -5);
  if (bas < ayKaydir(son, -11)) bas = ayKaydir(son, -11);
  const aylar = [];
  for (let a = bas; a <= son; a = ayKaydir(a, 1)) aylar.push(a);
  const ozetler = aylar.map((a) => ayOzeti(durum, a));

  // grafik: faturadaki aylık tüketim çubukları; gider çubuk, gelir üstünde kısa çizgi, tutar çubuğun içinde
  const G = 340, Y = 170, alt = 22, ust = Math.max(...ozetler.map((o) => Math.max(o.gelir, o.gider)), 1);
  const adim = G / aylar.length, gen = Math.min(adim * 0.62, 44);
  const y = (v) => (Y - alt) - (v / ust) * (Y - alt - 8);
  const kisa = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
  const svg = `<svg class="grafik" viewBox="0 0 ${G} ${Y}" role="img" aria-label="Aylara göre gelir ve gider">
    <line class="zemin-cizgi" x1="0" x2="${G}" y1="${Y - alt}" y2="${Y - alt}"/>
    ${ozetler.map((o, i) => {
      const x = adim * i + (adim - gen) / 2;
      const bu = o.ay === secAy;
      const boy = Math.max(Y - alt - y(o.gider), 0);
      const etiket = o.gider ? `<text class="deger${boy < 22 ? ' disari' : ''}" x="${x + gen / 2}" y="${boy < 22 ? y(o.gider) - 4 : y(o.gider) + 14}" text-anchor="middle">${kisa.format(o.gider)}</text>` : '';
      return `<g data-ay="${o.ay}">
        <rect class="gider${bu ? ' bu' : ''}" x="${x}" y="${y(o.gider)}" width="${gen}" height="${boy}" rx="2" style="animation-delay:${i * 40}ms"/>
        ${etiket}
        ${o.gelir ? `<line class="gelir" x1="${x - 4}" x2="${x + gen + 4}" y1="${y(o.gelir)}" y2="${y(o.gelir)}"/>` : ''}
        <text class="${bu ? 'bu' : ''}" x="${x + gen / 2}" y="${Y - 6}" text-anchor="middle">${ayAdi(o.ay, true)}</text>
        <rect class="dokunma" x="${adim * i}" y="0" width="${adim}" height="${Y}"><title>${ayAdi(o.ay)}: gelir ${tl(o.gelir)}, gider ${tl(o.gider)}</title></rect>
      </g>`;
    }).join('')}
  </svg>`;

  const ilk = ilkAy(durum);
  const sayi = (x) => tl(x).replace('\u00a0₺', '');
  const satirlar = [...ozetler].filter((o) => o.ay >= ilk).reverse().map((o) => `<tr data-ay="${o.ay}" class="${o.ay === secAy ? 'secili' : ''}">
    <td>${ayAdi(o.ay, true)} ${ayCoz(o.ay).yil}</td><td>${sayi(o.gelir)}</td><td>${sayi(o.gider)}</td>
    <td class="${o.kalan < 0 ? 'eksi' : ''}">${sayi(o.kalan)}</td><td>${sayi(aySonuBakiye(durum, o.ay))}</td></tr>`).join('');

  // ısı tablosu: son 6 ay, her kategori kendi en yüksek ayına göre koyulaşır
  const isiAylar = sonAylar(secAy, 6).filter((a) => a >= ilk);
  const isiOz = isiAylar.map((a) => ayOzeti(durum, a).toplam);
  const isiSatir = canliKategoriler(durum).filter((k) => k.tur === 'gider').map((k) => {
    const v = isiOz.map((t) => t.get(k.id) ?? 0);
    return { k, v, enCok: Math.max(...v), toplam: v.reduce((a, b) => a + b, 0) };
  }).filter((s) => s.toplam > 0).sort((a, b) => b.toplam - a.toplam);
  // Dört basamaklı renk (faturadaki kademeler gibi): açık üç basamakta koyu yazı, en koyuda beyaz yazı; ikisi de 4.5:1 üstü.
  const hucre = (v, enCok, bu) => {
    if (!v) return `<td class="hucre yok">–</td>`;
    const r = v / enCok;
    const n = r >= 0.75 ? 4 : r >= 0.5 ? 3 : r >= 0.25 ? 2 : 1;
    return `<td class="hucre" style="background:var(--isi-${n});color:${n === 4 ? 'var(--isi-yazi4)' : 'var(--murekkep)'};${bu ? 'box-shadow:inset 0 -3px 0 var(--turuncu)' : ''}">${new Intl.NumberFormat('tr-TR').format(Math.round(v))}</td>`;
  };

  ekran.innerHTML = `
    <section class="grafik-kutu"><h2>Aylık gelir ve gider</h2>${svg}
      <div class="grafik-anahtar"><span><i style="background:var(--mavi-acik)"></i>Gider</span><span><i style="background:var(--turuncu);height:3px;vertical-align:3px"></i>Gelir</span><span><i style="background:#c8763a"></i>Seçili ay</span></div>
    </section>
    <div class="bolum"><h2>Ay ay, ₺</h2><span>Satıra dokun, o ayı aç</span></div>
    <div class="tablo-kutu"><table><thead><tr><th>Ay</th><th>Gelir</th><th>Gider</th><th>Kalan</th><th>Elinde</th></tr></thead><tbody>${satirlar}</tbody></table></div>
    <div class="bolum"><h2>Harcamalar nasıl değişti</h2><span>₺, son ${isiAylar.length} ay</span></div>
    <div class="tablo-kutu"><table class="isi"><thead><tr><th>Kategori</th>${isiAylar.map((a) => `<th>${ayAdi(a, true)}</th>`).join('')}</tr></thead>
      <tbody>${isiSatir.map((s) => `<tr><td><span class="isi-ad">${katIkon(s.k)}${kacis(s.k.ad)}</span></td>${s.v.map((v, i) => hucre(v, s.enCok, i === s.v.length - 1)).join('')}</tr>`).join('') || '<tr><td colspan="7">Bu aralıkta gider yok.</td></tr>'}</tbody></table></div>`;
}

ekran.addEventListener('click', (e) => {
  const ay = e.target.closest('[data-ay]');
  if (ay && sekme() === 'aylar') {
    secAy = ay.dataset.ay;
    ciz();
    return;
  }
  const kisa = e.target.closest('.fatura.kisa');
  if (kisa) {
    const acik = kisa.classList.toggle('acik');
    kisa.setAttribute('aria-expanded', String(acik));
    hareket.titret(6);
  }
  const eylem = e.target.closest('[data-eylem]');
  if (eylem) {
    if (eylem.dataset.eylem !== 'hane-katil') document.activeElement?.blur?.();
    eylemler[eylem.dataset.eylem]?.(eylem);
  }
  const planSatiri = e.target.closest('[data-plan]');
  if (planSatiri) { planSayfasiAc(planSatiri.dataset.plan); return; }
  const kayit = e.target.closest('[data-kayit]');
  if (kayit?.dataset.kaydirildi) { delete kayit.dataset.kaydirildi; return; }
  if (kayit) sayfaAc(durum.kayitlar.find((k) => k.id === kayit.dataset.kayit));
});

// ---------------------------------------------------------------- kayıtlar

// Arama ve süzgeç (js/hizli.js kayitAra). Durum yalnızca bellekte; sekmeden çıkıp gelince korunur.
const arama = { metin: '', kat: '', tur: '', aralik: 'hepsi', min: NaN, max: NaN, acik: false };
const gunAdi = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
const kisaGun = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });

function kayitSatiri(k, tarihGoster, kat, bugunTarih) {
  const c = kat.get(k.kat) ?? { emoji: '❔', ad: 'Silinmiş kategori', tur: 'gider' };
  const planKaydi = k.id.startsWith('p:');
  const alt = [tarihGoster ? kisaGun.format(new Date(`${k.tarih}T12:00`)) : '', k.not ? kacis(k.not) : ''].filter(Boolean).join(' · ');
  const rozet = `${planKaydi ? '<svg class="ikon mini" role="img" aria-label="Plandan"><use href="#i-tekrar"/></svg>' : ''}${planli(k, bugunTarih) ? '<span class="etiket">Planlı</span>' : ''}`;
  return `<div class="kaydir"><button class="kayit" data-kayit="${kacis(k.id)}"><span class="emoji">${katIkon(c)}</span><span><span class="ad">${kacis(c.ad)}${rozet}</span>${alt ? `<small>${alt}</small>` : ''}</span><span class="tutar ${c.tur === 'gelir' ? 'gelir' : ''}">${c.tur === 'gelir' ? '+' : '−'}${tl(k.tutar, { kurus: true })}</span></button></div>`;
}

function kayitlarCiz() {
  if (!canliKayitlar(durum).length) { ekran.innerHTML = bosDurum(); return; }
  ekran.innerHTML = `${aramaCubugu()}<div id="kayit-govde">${kayitGovdesi()}</div>`;
}

const kayitGovdesi = () => (aramaEtkin(arama) ? aramaSonucu() : ayKayitlari());

function suzgecSayisi() {
  return [arama.kat, arama.tur, arama.aralik !== 'hepsi', Number.isFinite(arama.min) || Number.isFinite(arama.max)].filter(Boolean).length;
}

function aramaCubugu() {
  // Gizlenmiş kategorilerin eski kayıtları da süzülebilsin.
  const kats = [...canliKategoriler(durum), ...durum.kategoriler.filter((k) => k.silindi)];
  const secenek = (k) => `<option value="${kacis(k.id)}"${arama.kat === k.id ? ' selected' : ''}>${kacis(k.ad)}${k.silindi ? ' (gizli)' : ''}</option>`;
  const sayiYaz_ = (x) => (Number.isFinite(x) ? kacis(String(x).replace('.', ',')) : '');
  const n = suzgecSayisi();
  return `<div class="arama" role="search">
      <label class="arama-kutu"><svg class="ikon" aria-hidden="true"><use href="#i-ara"/></svg><span class="gorunmez">Kayıtlarda ara</span>
        <input type="search" id="ara" placeholder="Ara: migros, market, 850" value="${kacis(arama.metin)}" enterkeyhint="search" autocomplete="off" aria-controls="kayit-govde"></label>
      <button type="button" class="filtre-dugme" id="filtre-dugme" aria-expanded="${arama.acik}" aria-controls="filtre-panel">Süzgeç${n ? ` <b>${n}</b>` : ''}</button>
    </div>
    <div class="filtre-panel" id="filtre-panel"${arama.acik ? '' : ' hidden'}>
      <div class="tema-secici aralik-secici" role="group" aria-label="Zaman">${Object.entries(ARALIKLAR).map(([d, ad]) => `<button type="button" data-aralik="${d}" aria-pressed="${arama.aralik === d}">${ad}</button>`).join('')}</div>
      <div class="filtre-satir">
        <label class="kucuk-alan"><span>Tür</span><select id="filtre-tur"><option value="">Hepsi</option><option value="gider"${arama.tur === 'gider' ? ' selected' : ''}>Gider</option><option value="gelir"${arama.tur === 'gelir' ? ' selected' : ''}>Gelir</option></select></label>
        <label class="kucuk-alan genis"><span>Kategori</span><select id="filtre-kat"><option value="">Hepsi</option>
          <optgroup label="Gider">${kats.filter((k) => k.tur === 'gider').map(secenek).join('')}</optgroup>
          <optgroup label="Gelir">${kats.filter((k) => k.tur === 'gelir').map(secenek).join('')}</optgroup></select></label>
      </div>
      <div class="filtre-satir">
        <label class="kucuk-alan"><span>En az (₺)</span><input id="filtre-min" inputmode="decimal" value="${sayiYaz_(arama.min)}" placeholder="—"></label>
        <label class="kucuk-alan"><span>En çok (₺)</span><input id="filtre-max" inputmode="decimal" value="${sayiYaz_(arama.max)}" placeholder="—"></label>
      </div>
      <button type="button" class="baglanti" data-filtre-temizle>Süzgeci temizle</button>
    </div>`;
}

function aramaSonucu() {
  const kat = kategoriHaritasi(durum);
  const bugunTarih = bugun();
  const r = kayitAra(durum, arama, bugunTarih);
  const ozet = `<p class="arama-ozet" role="status"><b>${r.kayitlar.length} kayıt</b>${r.gider ? ` · gider ${tl(r.gider, { kurus: true })}` : ''}${r.gelir ? ` · gelir ${tl(r.gelir, { kurus: true })}` : ''} <span>· ${ARALIKLAR[arama.aralik].toLocaleLowerCase('tr')}</span></p>`;
  if (!r.kayitlar.length) return `${ozet}<section class="bos-durum kucuk"><h2>Bu aramaya uyan kayıt yok</h2><p>Başka bir sözcük dene ya da süzgeci gevşet.</p></section>`;
  const aylar = new Map();
  for (const k of r.kayitlar.slice(0, 300)) (aylar.get(k.tarih.slice(0, 7)) ?? aylar.set(k.tarih.slice(0, 7), []).get(k.tarih.slice(0, 7))).push(k);
  return ozet + [...aylar].map(([ay, liste]) => `
    <section class="gun">
      <div class="gun-baslik"><b>${ayAdi(ay)}</b><span>${liste.length} kayıt</span></div>
      <div class="liste">${liste.map((k) => kayitSatiri(k, true, kat, bugunTarih)).join('')}</div>
    </section>`).join('') + (r.kayitlar.length > 300 ? '<p class="kat-not">İlk 300 kayıt gösteriliyor; aramayı daraltabilirsin.</p>' : '');
}

function ayKayitlari() {
  const kat = kategoriHaritasi(durum);
  const ayin = canliKayitlar(durum).filter((k) => k.tarih.startsWith(secAy)).sort((a, b) => (b.tarih.localeCompare(a.tarih)) || (b.guncel - a.guncel));
  if (!ayin.length) return `<section class="bos-durum"><h2>${ayAdi(secAy)} için kayıt yok</h2><p>Başka bir aya geçebilir ya da yeni kayıt ekleyebilirsin.</p><div class="dugme-sira"><button class="dugme dolu" data-eylem="ekle">Kayıt ekle</button></div></section>`;
  // Günün sonunda net para (bütün hesapların başlangıcı + o güne kadarki hareketler; kart borcu düşülmüş).
  const gunSonu = (gun) => gunSonuBakiye(durum, gun);
  const bugunTarih = bugun();
  const yaklasan = ayin.filter((k) => planli(k, bugunTarih)).sort((a, b) => a.tarih.localeCompare(b.tarih) || (a.guncel - b.guncel));
  const gunler = new Map();
  for (const k of ayin) if (!planli(k, bugunTarih)) (gunler.get(k.tarih) ?? gunler.set(k.tarih, []).get(k.tarih)).push(k);
  const yaklasanKutu = yaklasan.length ? `
    <section class="gun yaklasan" aria-label="Yaklaşan kayıtlar">
      <div class="gun-baslik"><b>Yaklaşan</b><span>${yaklasan.length} planlı kayıt</span></div>
      <div class="liste">${yaklasan.map((k) => kayitSatiri(k, true, kat, bugunTarih)).join('')}</div>
    </section>` : '';
  return yaklasanKutu + [...gunler].map(([gun, liste]) => `
    <section class="gun">
      <div class="gun-baslik"><b>${gunAdi.format(new Date(`${gun}T12:00`))}</b><span>gün sonu ${tl(gunSonu(gun))}</span></div>
      <div class="liste">${liste.map((k) => kayitSatiri(k, false, kat, bugunTarih)).join('')}</div>
    </section>`).join('');
}

/** Yalnızca sonuçları yeniler: arama kutusu odakta kalsın, yazılan silinmesin. */
function aramaYenile() {
  const govde = $('#kayit-govde');
  if (govde) govde.innerHTML = kayitGovdesi();
  const n = suzgecSayisi();
  const d = $('#filtre-dugme');
  if (d) d.innerHTML = `Süzgeç${n ? ` <b>${n}</b>` : ''}`;
}

ekran.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'ara') { arama.metin = t.value; aramaYenile(); }
  else if (t.id === 'filtre-min' || t.id === 'filtre-max') {
    const v = t.value.trim() ? sayiOku(t.value) : NaN;
    arama[t.id === 'filtre-min' ? 'min' : 'max'] = v;
    aramaYenile();
  }
});
ekran.addEventListener('change', (e) => {
  if (e.target.id === 'filtre-kat') { arama.kat = e.target.value; aramaYenile(); }
  if (e.target.id === 'filtre-tur') { arama.tur = e.target.value; aramaYenile(); }
});
ekran.addEventListener('click', (e) => {
  const aralik = e.target.closest('[data-aralik]');
  if (aralik) {
    arama.aralik = aralik.dataset.aralik;
    ekran.querySelectorAll('[data-aralik]').forEach((b) => b.setAttribute('aria-pressed', String(b === aralik)));
    aramaYenile();
    return;
  }
  if (e.target.closest('#filtre-dugme')) {
    arama.acik = !arama.acik;
    $('#filtre-panel').hidden = !arama.acik;
    $('#filtre-dugme').setAttribute('aria-expanded', String(arama.acik));
    if (arama.acik) $('#filtre-panel [data-aralik][aria-pressed="true"]')?.focus();
    return;
  }
  if (e.target.closest('[data-filtre-temizle]')) {
    Object.assign(arama, { kat: '', tur: '', aralik: 'hepsi', min: NaN, max: NaN });
    ciz();
    $('#filtre-dugme')?.focus();
  }
});

// ---------------------------------------------------------------- açılış kurulumu (js/kurulum.js)

// Sihirbazın taslağı yalnızca bellekte; bitirilince ya da atlanınca durum.kurulumBitti işaretlenir (yalnızca bu telefonda).
const kurulum = { adim: 1, kim: null, maas: { tutar: '', gun: '' }, kira: { tutar: '', gun: '' }, elindeki: '', hata: null };
const KURULUM_BASLIK = ['', 'Bütçeyi kiminle tutacaksın?', 'Her ay düzenli olanlar', 'Bugün elinde ne kadar var?'];
const KIM = [
  ['tek', 'Yalnızca ben', 'Kayıtların bu telefonda kalır.'],
  ['kur', 'Evdekilerle, ilk ben kuruyorum', 'Sonunda bir hane kodu alırsın; evdeki diğer telefona o kod girilir.'],
  ['katil', 'Evden biri kurdu, kodum var', 'Hanenin kayıtları bu telefona da gelir.'],
];
const DUZENLI = [['maas', 'Maaş', 'Bu ayki maaş yatmış sayılır.'], ['kira', 'Kira / Aidat', 'Bu ayki kira ödenmiş sayılır.']];
const kimSecili = () => (kurulum.kim ??= esitle.bekleyenKodVar() ? 'katil' : 'tek');

function kurulumCiz() {
  const a = kurulum.adim;
  return `<section class="kurulum" aria-labelledby="kurulum-baslik">
    <p class="kurulum-adim"><span>Adım ${a} / 3</span><span class="kurulum-cubuk" aria-hidden="true">${[1, 2, 3].map((i) => `<i${i <= a ? ' class="dolu"' : ''}></i>`).join('')}</span></p>
    <h2 id="kurulum-baslik" tabindex="-1">${KURULUM_BASLIK[a]}</h2>
    ${[null, kurulumKim, kurulumDuzenli, kurulumPara][a]()}
  </section>`;
}

function kurulumKim() {
  const kim = kimSecili();
  return `<p>İlk ay için bir dakikalık kurulum. Hepsini sonra Ayarlar'dan değiştirebilirsin.</p>
    <div class="secenekler" role="radiogroup" aria-labelledby="kurulum-baslik">${KIM.map(([d, ad, alt]) => `
      <label class="secenek"><input type="radio" name="kurulum-kim" value="${d}"${kim === d ? ' checked' : ''}><span><b>${ad}</b><small>${alt}</small></span></label>`).join('')}
    </div>
    <div class="kurulum-katil" id="kurulum-katil"${kim === 'katil' ? '' : ' hidden'}>
      <label class="kurulum-etiket" for="hane-kod">Hane kodu</label>
      <input class="metin-giris" id="hane-kod" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off" spellcheck="false" value="${kacis(esitle.bekleyenKodu())}" aria-describedby="hane-durum">
      <button type="button" class="kaydet-dugme" data-eylem="kurulum-katil">Haneye katıl</button>
      <p class="durum-satiri" id="hane-durum">Kod, haneyi kuran telefonda Ayarlar › Hane paylaşımı'nda yazar.</p>
    </div>
    <div class="kurulum-dugmeler" id="kurulum-ileri"${kim === 'katil' ? ' hidden' : ''}><button type="button" class="kaydet-dugme" data-eylem="kurulum-ileri">Devam</button></div>
    <p class="kurulum-alt"><button type="button" class="baglanti" data-eylem="ornek">Örnek verilerle dene</button><button type="button" class="baglanti" data-eylem="kurulum-atla">Şimdilik atla</button></p>`;
}

function duzenliNotu(alan, gecmis) {
  if (kurulum.hata?.alan === alan) return kurulum.hata.metin;
  const g = gunOku(kurulum[alan].gun);
  return Number.isInteger(g) && gunGectiMi(g, bugun()) ? gecmis : '';
}

function kurulumDuzenli() {
  return `<p>Maaş ve kira her ay kendiliğinden eklenir. Hangisi yoksa boş bırak.</p>
    ${DUZENLI.map(([alan, ad, gecmis]) => {
      const s = kurulum[alan];
      const hata = kurulum.hata?.alan === alan ? kurulum.hata.alt : '';
      return `<fieldset class="duzenli-satir"><legend>${ad}</legend>
        <div class="duzenli-alanlar">
          <label class="kurulum-alan"><span>Aylık tutar</span><span class="para-giris${hata === 'tutar' ? ' yanlis' : ''}"><input data-kurulum="${alan}.tutar" inputmode="decimal" placeholder="0" value="${kacis(s.tutar)}" aria-describedby="${alan}-not"${hata === 'tutar' ? ' aria-invalid="true"' : ''}><span>₺</span></span></label>
          <label class="kurulum-alan"><span>Ayın günü</span><span class="para-giris gun-giris${hata === 'gun' ? ' yanlis' : ''}"><input data-kurulum="${alan}.gun" inputmode="numeric" maxlength="2" placeholder="1–31" value="${kacis(s.gun)}" aria-describedby="${alan}-not"${hata === 'gun' ? ' aria-invalid="true"' : ''}></span></label>
        </div>
        <p class="duzenli-not${hata ? ' hata' : ''}" id="${alan}-not" data-gecmis="${gecmis}" aria-live="polite">${duzenliNotu(alan, gecmis)}</p>
      </fieldset>`;
    }).join('')}
    <div class="kurulum-dugmeler"><button type="button" class="dugme" data-eylem="kurulum-geri">Geri</button><button type="button" class="kaydet-dugme" data-eylem="kurulum-ileri">Devam</button></div>`;
}

function kurulumPara() {
  const ozet = kurulumOzeti(kurulumGirdisi());
  const hata = kurulum.hata?.alan === 'elindeki';
  return `<p>Nakit ve banka hesaplarındaki paranın toplamı; yaklaşık olması yeter. "Elindeki para" bunun üstüne hesaplanır.</p>
    <label class="para-giris kurulum-para${hata ? ' yanlis' : ''}"><span class="gorunmez">Bugün elindeki para</span><input data-kurulum="elindeki" inputmode="decimal" placeholder="0" value="${kacis(kurulum.elindeki)}" aria-describedby="elindeki-not"${hata ? ' aria-invalid="true"' : ''}><span>₺</span></label>
    <p class="duzenli-not${hata ? ' hata' : ''}" id="elindeki-not" aria-live="polite">${hata ? kurulum.hata.metin : 'Boş bırakırsan sıfırdan başlar.'}</p>
    ${ozet.length ? `<h3 class="kurulum-ara">Her ay kendiliğinden eklenecek</h3><ul class="kurulum-ozet">${ozet.map(([gun, ad, tutar]) => `<li><span>${ad}<small>${gun}</small></span><b class="${tutar.startsWith('+') ? 'arti' : ''}">${tutar}</b></li>`).join('')}</ul>` : ''}
    ${kimSecili() === 'kur' ? '<p class="kurulum-hane-not"><svg class="ikon" aria-hidden="true"><use href="#i-hane"/></svg>Bitirince hane kurulur; kodu Ayarlar\'da göreceksin.</p>' : ''}
    <div class="kurulum-dugmeler"><button type="button" class="dugme" data-eylem="kurulum-geri">Geri</button><button type="button" class="kaydet-dugme" data-eylem="kurulum-bitir">Bitir</button></div>`;
}

/** Taslağı kurulumUygula girdisine çevirir; ilk hatada { hata } döner. */
function kurulumGirdisi() {
  const g = {};
  for (const [alan, ad] of DUZENLI) {
    const s = kurulum[alan];
    const r = satirDogrula(sayiOku(s.tutar), gunOku(s.gun), !s.tutar.trim() && !s.gun.trim());
    if (!r.tamam) return { hata: { alan, alt: r.hata, metin: r.hata === 'tutar' ? `${ad} için aylık tutarı yaz.` : `${ad} için ayın gününü yaz: 1 ile 31 arası.` } };
    g[alan] = r.deger;
  }
  const e = kurulum.elindeki.trim();
  g.elindeki = e ? sayiOku(e) : null;
  // Para hatasında maaş ve kira yine döner: son adımdaki özet kaybolmasın.
  if (e && !Number.isFinite(g.elindeki)) g.hata = { alan: 'elindeki', metin: 'Tutarı rakamla yaz; örneğin 25.000 ya da 25000,50.' };
  return g;
}

function kurulumYazildi(girdi) {
  const [alan, alt] = girdi.dataset.kurulum.split('.');
  if (alt) kurulum[alan][alt] = girdi.value;
  else kurulum[alan] = girdi.value;
  // Hata, alana yazmaya başlayınca hemen kalkar.
  if (kurulum.hata?.alan === alan) {
    kurulum.hata = null;
    girdi.closest('fieldset, section')?.querySelectorAll('.yanlis').forEach((x) => x.classList.remove('yanlis'));
    girdi.removeAttribute('aria-invalid');
  }
  const not = document.getElementById(`${alan}-not`);
  if (not && alt) { not.classList.remove('hata'); not.textContent = duzenliNotu(alan, not.dataset.gecmis); }
  if (not && !alt) { not.classList.remove('hata'); not.textContent = 'Boş bırakırsan sıfırdan başlar.'; }
}

function kurulumGecis(yon) {
  hareket.gecis(() => { ciz(); scrollTo(0, 0); $('#kurulum-baslik')?.focus({ preventScroll: true }); }, yon);
}

function kurulumHatasiGoster(hata) {
  kurulum.hata = hata;
  ciz();
  ekran.querySelector('[aria-invalid="true"]')?.focus();
}

const kurulumEylemleri = {
  'kurulum-ileri'() {
    if (kurulum.adim === 2) {
      const g = kurulumGirdisi();
      if (g.hata && g.hata.alan !== 'elindeki') return kurulumHatasiGoster(g.hata);
    }
    kurulum.hata = null;
    kurulum.adim = Math.min(3, kurulum.adim + 1);
    kurulumGecis('ileri');
  },
  'kurulum-geri'() {
    kurulum.hata = null;
    kurulum.adim = Math.max(1, kurulum.adim - 1);
    kurulumGecis('geri');
  },
  'kurulum-atla'() {
    durum.kurulumBitti = true;
    kaydet(durum);
    ciz();
  },
  async 'kurulum-katil'(dugme) {
    await esitle.eylemler['hane-katil'](dugme);
    if (durum.hane) { durum.kurulumBitti = true; kaydet(durum); }
  },
  async 'kurulum-bitir'(dugme) {
    const g = kurulumGirdisi();
    if (g.hata) {
      if (g.hata.alan !== 'elindeki') kurulum.adim = 2;
      return kurulumHatasiGoster(g.hata);
    }
    const haneKur = kimSecili() === 'kur';
    const planlar = kurulumUygula(durum, g);
    secAy = buAy();
    degisti();
    hareket.titret(10);
    if (!haneKur) {
      bildir(planlar.length ? 'Hazır. Düzenli kayıtların bu aya eklendi.' : 'Hazır. İlk kaydını + ile ekleyebilirsin.');
      return;
    }
    await esitle.eylemler['hane-kur'](dugme);
    if (!durum.hane) { bildir("Hane kurulamadı. Ayarlar › Hane paylaşımı'ndan yeniden deneyebilirsin."); return; }
    location.hash = '#ayarlar';
    setTimeout(() => $('#hane-kutu')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 450);
  },
};

// ---------------------------------------------------------------- ayarlar

function sayiOku(metin) {
  let s = String(metin).replace(/[\s₺]/g, '');
  // Eksi işareti binlik ayraç kontrolünden önce ayrılır: "-1.234" bin iki yüz otuz dört eksidir, eksi bir virgül iki değil.
  const eksi = /^[-−]/.test(s);
  if (eksi) s = s.slice(1);
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return eksi ? -n : n;
}

function duzenliOdemeler() {
  const kat = kategoriHaritasi(durum);
  const ay = buAy();
  const planlar = planlariSirala(durum.planlar ?? [], kat);
  if (!planlar.length) return '<section class="ayar-kutu"><p>Kira, maaş, abonelik gibi her ay tekrarlanan kayıtları eklerken «Her ay»ı seç; taksitli alışverişlerde «Taksit»i.</p></section>';
  return `<section class="ayar-kutu plan-liste">${planlar.map((p) => {
    const c = kat.get(p.kat) ?? { emoji: '❔', ad: 'Silinmiş kategori', tur: 'gider' };
    return `<button type="button" class="plan-satir" data-plan="${kacis(p.id)}"><span class="kat-kutu">${katIkon(c)}</span><span><b>${kacis(planAdi(p, kat))}</b><small>${kacis(planAltMetni(p, ay))}</small></span><svg class="ikon" aria-hidden="true"><use href="#i-sag"/></svg></button>`;
  }).join('')}</section>`;
}

function ayarlarCiz() {
  const giderler = canliKategoriler(durum).filter((k) => k.tur === 'gider');
  const ornekVar = durum.kayitlar.some((k) => k.ornek && !k.silindi);
  ekran.innerHTML = `
    <div class="bolum"><h2>Hesaplar</h2><span>nakit, banka, kart</span></div>
    <section class="ayar-kutu">${hesapOzetSatiri()}</section>
    <div class="bolum"><h2>Başlangıç parası</h2></div>
    <section class="ayar-kutu">
      <p>Kayıtlara başladığın gün elinde (nakit ve hesapta) ne kadar para vardı? "Elindeki para" bunun üstüne hesaplanır.</p>
      <label class="para-giris"><span class="gorunmez">Başlangıç parası</span><input data-ayar="baslangic" inputmode="decimal" value="${durum.baslangic ? new Intl.NumberFormat('tr-TR').format(durum.baslangic) : ''}" placeholder="0"><span>₺</span></label>
    </section>
    <div class="bolum"><h2>Aylık bütçeler</h2><span>boş bırakılabilir</span></div>
    <section class="ayar-kutu">${giderler.map((k) => `
      <div class="ayar-satir"><label for="b-${kacis(k.id)}"><span class="kat-kutu">${katIkon(k)}</span><span>${kacis(k.ad)}</span></label>
        <span class="para-giris"><input id="b-${kacis(k.id)}" data-butce="${kacis(k.id)}" inputmode="decimal" value="${k.butce ? new Intl.NumberFormat('tr-TR').format(k.butce) : ''}" placeholder="—"><span>₺</span></span></div>`).join('')}
    </section>
    <div class="bolum"><h2>Kategoriler</h2></div>
    <section class="ayar-kutu">${kategoriOzetSatiri()}</section>
    <div class="bolum"><h2>Düzenli ödemeler</h2><span>tekrar ve taksit</span></div>
    ${duzenliOdemeler()}
    <div class="bolum"><h2>Görünüm</h2></div>
    <section class="ayar-kutu"><div class="tema-secici" role="group" aria-label="Tema">
      ${[['oto', 'Otomatik'], ['acik', 'Açık'], ['koyu', 'Koyu']].map(([d, ad]) => `<button type="button" data-tema="${d}" aria-pressed="${temaAl() === d}">${ad}</button>`).join('')}
    </div></section>
    <div class="bolum"><h2>Koç</h2></div>
    <section class="ayar-kutu"><label class="ayar-ac"><span><b>Özet'te günlük kart</b><small>Koç, her gün tek bir gözlem yazar. Kapalıyken kart görünmez ve istek atılmaz.</small></span>
      <input type="checkbox" role="switch" data-ayar="gunluk"${durum.gunlukKapali ? '' : ' checked'}></label>
      <label class="ayar-ac"><span><b>Geri bildirimimi gönder</b><small>Koçun yorumlarına verdiğin oy, yorumun metni ve aylık kategori toplamlarıyla birlikte koçu iyileştirmek için gönderilir. Kayıtların ve notların gitmez.</small></span>
      <input type="checkbox" role="switch" data-ayar="geri-bildirim"${durum.geriBildirimIzni === true ? ' checked' : ''}></label></section>
    <div class="bolum"><h2>Hane paylaşımı</h2></div>
    <section class="ayar-kutu" id="hane-kutu">${esitle.ayarKutusu()}</section>
    <div class="bolum"><h2>Veriler</h2></div>
    <section class="ayar-kutu">
      <p>Kayıtların bu telefonda saklanır${durum.hane ? ' ve hanendeki telefonlarla eşitlenir' : ''}.</p>
      <div class="dugme-sira">
        ${ornekVar ? '<button class="dugme" data-eylem="ornek-sil">Örnek kayıtları kaldır</button>' : '<button class="dugme" data-eylem="ornek">Örnek kayıtları yükle</button>'}
        <button class="dugme" data-eylem="csv">CSV olarak indir</button>
      </div>
    </section>
    ${GIZLILIK}`;
}

// KVKK aydınlatma metni. Uygulamanın gerçekte yaptığıyla birebir tutulmalı (docs/koc-sozlesme.md, supabase/sema.sql).
// Yayından önce: veri sorumlusunun adı ve iletişim adresi eklenmeli, metin bir hukukçuya okutulmalı.
const GIZLILIK = `<details class="ayar-kutu gizlilik"><summary>Gizlilik ve KVKK aydınlatma metni</summary>
  <h3>Telefonunda kalanlar</h3>
  <p>Kayıtların, bütçelerin, hesapların ve bakiyeleri, başlangıç paran ve koçun yorumları yalnızca bu telefonda saklanır. Uygulamayı silersen ya da tarayıcı verilerini temizlersen bunlar da silinir.</p>
  <h3>Hane paylaşımı açıksa</h3>
  <p>Kayıtların, kategorilerin, düzenli ödemelerin, hesapların (adları, türleri, başlangıç bakiyeleri), hesaplar arası aktarımların ve başlangıç paran, hanendeki telefonlarla eşitlenebilmesi için Supabase'in Avrupa Birliği'ndeki (Frankfurt) sunucusunda tutulur. Hane kodunun kendisi sunucuda saklanmaz, yalnızca şifrelenmiş özeti tutulur.</p>
  <h3>Ekran görüntüsünden ekleme</h3>
  <p>Seçtiğin ekran görüntüsü, içindeki hareketleri okumak için yurt dışındaki bir yapay zekâ servisine (NVIDIA ya da Google Gemini) gönderilir. Bizim sunucumuzda saklanmaz; servis sağlayıcının kendi kullanım koşulları geçerlidir. Hesap numarası gibi yerleri kırparak göndermeni öneririz.</p>
  <h3>Koç</h3>
  <p>Koçun yorumu, günlük gözlem ve sorduğun sorular için yapay zekâya yalnızca aylık toplamlar ve oranlar gider:</p>
  <ul><li>Gönderilenler: kategori toplamları, bütçeler, önceki ayların toplamları, sorunun metni.</li>
    <li>Gönderilmeyenler: tek tek kayıtlar, notların, mağaza adları, elindeki paranın tutarı, hane kodun.</li></ul>
  <h3>Koç geri bildirimi (yalnızca onay verirsen)</h3>
  <p>Koçun bir yorumuna 👍 ya da 👎 verdiğinde ve gönderilmesine onay verdiysen, koçu iyileştirmek için şunlar Supabase'in Frankfurt'taki sunucusunda saklanır: oyun, yorumun metni, sohbetteyse sorduğun soru ve koçun gördüğü aylık özet (kategori toplamları, bütçeler, son ayların eğilimi, ay sonu tahmini, puanlar). Telefonunun kimliği ham olarak değil, şifrelenmiş özetiyle tutulur. Tek tek kayıtların, notların, elindeki para ve hane kodun gönderilmez. Onayı Ayarlar › Koç'tan kapatabilirsin.</p>
  <h3>Kullanım sınırı</h3>
  <p>Yapay zekâ özelliklerinde günlük sınırı uygulayabilmek için telefonuna rastgele verilmiş bir kimlik ve o gün kaç istek yapıldığı tutulur. Bu kimlik seni tanımlamaz.</p>
  <h3>Hakların</h3>
  <p>6698 sayılı KVKK'nın 11. maddesi uyarınca verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini ya da silinmesini isteme haklarına sahipsin. Haneden ayrılmak yalnızca eşitlemeyi durdurur; sunucudaki hane verilerinin silinmesi için bizimle iletişime geçebilirsin.</p>
</details>`;

ekran.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.ayar === 'baslangic') {
    const v = sayiOku(t.value);
    durum.baslangic = Number.isFinite(v) ? v : 0;
    durum.baslangicGuncel = Date.now();
    degisti();
  } else if (t.name === 'kurulum-kim') {
    kurulum.kim = t.value;
    $('#kurulum-katil').hidden = t.value !== 'katil';
    $('#kurulum-ileri').hidden = t.value === 'katil';
  } else if (t.dataset.ayar === 'geri-bildirim') {
    durum.geriBildirimIzni = t.checked;
    kaydet(durum); // yalnızca bu telefonda
  } else if (t.dataset.ayar === 'gunluk') {
    durum.gunlukKapali = !t.checked;
    kaydet(durum); // yalnızca bu telefonda; hane eşitlemesine girmez
  } else if (t.dataset.butce) {
    const k = durum.kategoriler.find((x) => x.id === t.dataset.butce);
    k.butce = butceOku(sayiOku(t.value));
    k.guncel = Date.now();
    degisti();
  }
});

// ---------------------------------------------------------------- tema

const temaAl = () => { try { return localStorage.getItem('ev-butcem:tema') || 'oto'; } catch { return 'oto'; } };
function temaUygula(t) {
  if (t === 'oto') delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = t;
  try { t === 'oto' ? localStorage.removeItem('ev-butcem:tema') : localStorage.setItem('ev-butcem:tema', t); } catch { /* gizli sekme */ }
}
ekran.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tema]');
  if (!b) return;
  hareket.gecis(() => { temaUygula(b.dataset.tema); ciz(); });
  hareket.titret(8);
});

// ---------------------------------------------------------------- eylemler

const eylemler = {
  ekle: () => sayfaAc(),
  async yorum(dugme) {
    const once = dugme.textContent;
    dugme.disabled = true;
    dugme.textContent = 'Yorum yazılıyor…';
    try {
      const ozet = yorumOzeti(secAy);
      const r = await yz.yorumIste(durum, ozet);
      durum.yorumlar = { ...durum.yorumlar, [secAy]: { metinler: (Array.isArray(r.yorumlar) ? r.yorumlar : []).filter((m) => typeof m === 'string' || m?.gozlem), imza: imzaAl(ozet), zaman: Date.now() } };
      kaydet(durum);
      ciz();
    } catch (e) {
      dugme.disabled = false;
      dugme.textContent = once;
      bildir(yz.hataMetni(e.kod));
    }
  },
  gunluk(dugme) {
    if (gunlukBekliyor) return;
    dugme.disabled = true;
    dugme.textContent = 'Hazırlanıyor…';
    gunlukGetir(true);
  },
  'sor-cip': (dugme) => soruGonder(dugme.dataset.soru),
  async ornek() {
    const kayitlar = await ornekVeri();
    const simdi = Date.now();
    for (const k of kayitlar) durum.kayitlar.push({ ...k, ornek: true, guncel: simdi });
    if (!durum.baslangic) { durum.baslangic = 20000; durum.baslangicGuncel = simdi; }
    secAy = kayitlar.at(-1).tarih.slice(0, 7);
    degisti();
    bildir(`${kayitlar.length} örnek kayıt yüklendi`);
  },
  'ornek-sil'() {
    const simdi = Date.now();
    for (const k of durum.kayitlar) if (k.ornek && !k.silindi) { k.silindi = true; k.guncel = simdi; }
    degisti();
    bildir('Örnek kayıtlar kaldırıldı');
  },
  csv() {
    const kat = kategoriHaritasi(durum);
    // = + - @ ile başlayan metin Excel'de formül olarak çalışır; başına ' konur (tutar sütunu sayı olduğu için etkilenmez).
    const guvenli = (x) => (typeof x === 'string' && /^[=+\-@\t\r]/.test(x) && !/^-?\d/.test(x) ? `'${x}` : x);
    const satir = (h) => h.map((x) => `"${String(guvenli(x)).replace(/"/g, '""')}"`).join(';');
    const metin = [satir(['Tarih', 'Kategori', 'Tür', 'Tutar', 'Not']),
      ...canliKayitlar(durum).sort((a, b) => a.tarih.localeCompare(b.tarih)).map((k) => {
        const c = kat.get(k.kat);
        return satir([k.tarih, c ? `${c.emoji} ${c.ad}` : '', c?.tur === 'gelir' ? 'Gelir' : 'Gider', String(k.tutar).replace('.', ','), k.not ?? '']);
      })].join('\r\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿', metin], { type: 'text/csv' })), download: `ev-butcem-${bugun()}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  ...esitle.eylemler,
  ...kurulumEylemleri,
  kategoriler: () => kategoriSayfasiAc(),
  ...geriBildirimEylemleri,
  hesaplar: () => hesapSayfasiAc(),
};

// ---------------------------------------------------------------- kayıt sayfası

const sayfa = $('#kayit-sayfasi');
const form = $('#kayit-formu');
let duzenlenen = null;

function kategoriIzgara(tur, secili) {
  const kats = canliKategoriler(durum).filter((k) => k.tur === tur);
  // Gizlenmiş kategorideki eski bir kayıt düzenlenirken kategorisi seçili kalsın.
  const gizli = secili && !kats.some((k) => k.id === secili) ? kategoriHaritasi(durum).get(secili) : null;
  if (gizli?.tur === tur) kats.push(gizli);
  $('#kategori-izgara').innerHTML = `<legend class="gorunmez">Kategori</legend>${kats.map((k) => `
    <label class="kat-secim"><input type="radio" name="kat" value="${kacis(k.id)}" ${k.id === secili ? 'checked' : ''}><span><em>${katIkon(k)}</em>${kacis(k.ad)}</span></label>`).join('')}${kats.length ? '' : `<p class="kat-bos">Görünen ${tur} kategorisi yok. Ayarlar › Kategoriler'den birini göster.</p>`}`;
}

// ---------------------------------------------------------------- hızlı giriş (js/hizli.js)

let katElle = false; // kullanıcı kategoriyi kendisi seçti: tahmin artık dokunmaz
let tahminSecti = false; // şu anki seçim nottan tahminle geldi

function sonKatCiz(tur, kayit) {
  const ids = kayit ? [] : sonKategoriler(durum, tur, 4);
  const kat = kategoriHaritasi(durum);
  $('#son-kat').hidden = ids.length < 2;
  $('#son-kat').innerHTML = `<span>Son kullanılanlar</span>${ids.map((id) => `<button type="button" class="cip" data-son-kat="${kacis(id)}">${katIkon(kat.get(id))}${kacis(kat.get(id).ad)}</button>`).join('')}`;
}

function kategoriSec(id) {
  const r = form.querySelector(`[name=kat][value="${CSS.escape(id)}"]`);
  if (!r) return false;
  r.checked = true;
  $('#kategori-hata').hidden = true;
  return true;
}

/** Not yazılırken kategori tahmini; kullanıcı kategoriyi kendisi seçtiyse ya da kayıt düzenleniyorsa dokunmaz. */
function notTahmini() {
  if (duzenlenen || katElle) return;
  const t = kategoriTahmin(durum, $('#not').value, form.tur.value);
  const ipucu = $('#tahmin-not');
  if (t && kategoriSec(t.kat)) {
    tahminSecti = true;
    ipucu.hidden = false;
    ipucu.textContent = `Nota göre «${kategoriHaritasi(durum).get(t.kat).ad}» seçildi${t.kaynak === 'gecmis' ? ' (önceki kayıtlarına bakarak)' : ''}. Değiştirmek için başka bir kategoriye dokun.`;
  } else if (tahminSecti) {
    form.querySelectorAll('[name=kat]').forEach((r) => { r.checked = false; });
    tahminSecti = false;
    ipucu.hidden = true;
  }
}

function sonKaydiDoldur(k) {
  const c = k && kategoriHaritasi(durum).get(k.kat);
  if (!c || c.silindi) return;
  form.tur.value = c.tur;
  kategoriIzgara(c.tur, c.id);
  sonKatCiz(c.tur, null);
  $('#tutar').value = String(k.tutar).replace('.', ',');
  $('#not').value = k.not ?? '';
  hesapSecici(gorunenHesaplar(durum).some((h) => h.id === (k.hesap || ANA_HESAP)) ? (k.hesap || ANA_HESAP) : varsayilanHesap(durum), null);
  katElle = true;
  $('#son-kayit').hidden = true;
  $('#tahmin-not').hidden = true;
  tekrarGuncelle();
  $('#tutar').focus();
  $('#tutar').select?.();
}

$('#not').addEventListener('input', notTahmini);
$('#son-kat').addEventListener('click', (e) => {
  const b = e.target.closest('[data-son-kat]');
  if (!b || !kategoriSec(b.dataset.sonKat)) return;
  katElle = true;
  tahminSecti = false;
  $('#tahmin-not').hidden = true;
  hareket.titret(6);
});
$('#son-kayit-dugme').addEventListener('click', () => sonKaydiDoldur(sonKayit(durum)));

function sayfaAc(kayit = null) {
  duzenlenen = kayit;
  const kat = kayit ? kategoriHaritasi(durum).get(kayit.kat) : null;
  const tur = kat?.tur ?? 'gider';
  form.reset();
  form.tur.value = tur;
  kategoriIzgara(tur, kayit?.kat);
  $('#tutar').value = kayit ? String(kayit.tutar).replace('.', ',') : '';
  $('#tarih').value = kayit?.tarih ?? (secAy === buAy() ? bugun() : `${secAy}-01`);
  $('#not').value = kayit?.not ?? '';
  $('#sayfa-baslik').textContent = kayit ? 'Kaydı düzenle' : 'Yeni kayıt';
  $('#sil-dugme').hidden = !kayit;
  $('#tutar-hata').hidden = true;
  $('#kategori-hata').hidden = true;
  $('#adet').value = '6';
  $('#tekrar-bolum').hidden = Boolean(kayit); // tekrar yalnızca yeni kayıtta seçilir
  hesapSecici(kayit ? (kayit.hesap || ANA_HESAP) : varsayilanHesap(durum), kayit);
  katElle = Boolean(kayit);
  tahminSecti = false;
  $('#tahmin-not').hidden = true;
  sonKatCiz(tur, kayit);
  const son = kayit ? null : sonKayit(durum);
  const sonKat = son ? kategoriHaritasi(durum).get(son.kat) : null;
  $('#son-kayit').hidden = !son || !sonKat || sonKat.silindi;
  if (son && sonKat) $('#son-kayit-dugme').textContent = `Son kaydı tekrarla: ${sonKat.ad} · ${tl(son.tutar, { kurus: true })}`;
  planBilgisi(kayit);
  tekrarGuncelle();
  sayfa.showModal();
  if (!kayit) $('#tutar').focus();
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'tur') { kategoriIzgara(e.target.value); sonKatCiz(e.target.value, duzenlenen); katElle = false; tahminSecti = false; notTahmini(); }
  if (e.target.name === 'kat') { $('#kategori-hata').hidden = true; katElle = true; tahminSecti = false; $('#tahmin-not').hidden = true; }
  if (e.target.name === 'tekrar' || e.target.id === 'tarih') tekrarGuncelle();
  // Form uzayınca seçilen tekrarın ayrıntıları sabit Kaydet çubuğunun altında kalmasın.
  if (e.target.name === 'tekrar' && e.target.value !== 'tek') $('#tekrar-bolum').scrollIntoView({ block: 'nearest' });
});

// Plandan gelen kaydı düzenlerken: yalnızca bu ayın değiştiği ve planın nereden düzenleneceği söylenir.
const planKaydiMi = (k) => Boolean(k?.id?.startsWith('p:'));
const kayitPlani = (k) => (planKaydiMi(k) ? (durum.planlar ?? []).find((p) => !p.silindi && k.id.startsWith(`p:${p.id}:`)) : null);

function planBilgisi(kayit) {
  const plan = kayitPlani(kayit);
  $('#plan-bilgi').hidden = !plan;
  if (plan) $('#plan-bilgi-metin').textContent = `Bu kayıt «${planAdi(plan, kategoriHaritasi(durum))}» planından. Yalnızca bu ayı değiştiriyorsun.`;
}

$('#plan-duzenle').addEventListener('click', () => {
  const plan = kayitPlani(duzenlenen);
  if (!plan) return;
  sayfa.close();
  planSayfasiAc(plan.id);
});

// Tekrar seçimine göre ekle sayfasını düzenler: etiketler, açıklama, taksit sayısı ve canlı hesap.
function tekrarGuncelle() {
  const mod = duzenlenen ? 'tek' : form.tekrar.value;
  const taksit = mod === 'taksit';
  $('#taksit-alan').hidden = !taksit;
  $('#tutar-alani').classList.toggle('toplam', taksit);
  $('#tutar').placeholder = taksit ? 'Toplam tutar' : '0';
  $('#tutar-etiket').textContent = taksit ? 'Toplam tutar' : 'Tutar';
  const tarih = $('#tarih').value || bugun();
  const not = $('#tekrar-not');
  const hesap = $('#taksit-hesap');
  not.hidden = mod !== 'ay';
  hesap.hidden = !taksit;
  if (mod === 'ay') not.textContent = tekrarAciklamasi(Number(tarih.slice(8, 10)) || 1);
  if (taksit) {
    const toplam = sayiOku($('#tutar').value);
    hesap.textContent = taksitOnizleme(toplam, adetSinirla($('#adet').value), tarih.slice(0, 7)) || 'Toplam tutarı yaz; taksitlere bölünür.';
    if (sayfa.open) hesap.scrollIntoView({ block: 'nearest' }); // sabit Kaydet çubuğunun altında kalmasın
  }
}
form.addEventListener('input', (e) => { if (e.target.id === 'tutar' || e.target.id === 'adet') tekrarGuncelle(); });
function adetDegistir(fark) {
  $('#adet').value = String(adetSinirla(String(adetSinirla($('#adet').value) + fark)));
  tekrarGuncelle();
}
$('#adet-eksi').addEventListener('click', () => adetDegistir(-1));
$('#adet-arti').addEventListener('click', () => adetDegistir(1));
$('#adet').addEventListener('change', () => { $('#adet').value = String(adetSinirla($('#adet').value)); tekrarGuncelle(); });
sayfa.addEventListener('click', (e) => {
  if (e.target === sayfa || e.target.closest('[data-kapat]')) sayfa.close();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const tutar = sayiOku($('#tutar').value);
  const katId = form.kat?.value;
  const tutarOk = Number.isFinite(tutar) && tutar > 0;
  $('#tutar-hata').hidden = tutarOk;
  $('#kategori-hata').hidden = Boolean(katId);
  if (!tutarOk) return $('#tutar').focus();
  if (!katId) return;
  const veri = { tarih: $('#tarih').value || bugun(), kat: katId, tutar: Math.round(tutar * 100) / 100, not: $('#not').value.trim(), guncel: Date.now() };
  // Hesap seçici görünmüyorsa (tek hesap) yeni kayıt Ana hesaba gider, düzenlenen kaydın hesabı korunur.
  const hesapSecim = $('#hesap-secici').hidden ? undefined : form.hesap?.value;
  if (hesapSecim) { veri.hesap = hesapSecim; durum.sonHesap = hesapSecim; }
  const c = kategoriHaritasi(durum).get(katId);
  const mod = duzenlenen ? 'tek' : form.tekrar.value;
  if (mod !== 'tek') {
    // Tekrar ve taksit: kayıtlar plandan üretilir (planOlustur ilk aylarını hemen ekler).
    const ortak = { kat: katId, gun: Number(veri.tarih.slice(8, 10)) || 1, baslangic: veri.tarih.slice(0, 7), not: veri.not, hesap: hesapSecim ?? null };
    const adet = adetSinirla($('#adet').value);
    const plan = mod === 'ay' ? planOlustur(durum, { ...ortak, tur: 'tekrar', tutar: veri.tutar }) : planOlustur(durum, { ...ortak, tur: 'taksit', toplam: veri.tutar, adet });
    hareket.titret(12);
    bildir(mod === 'ay' ? `${c.ad} her ay eklenecek` : `${adet} taksit eklendi`, () => {
      // Geri al: planı ve onun bütün kayıtlarını (geçmiş ay dahil) siler.
      const t = Date.now();
      plan.silindi = true; plan.guncel = t;
      for (const k of durum.kayitlar) if (k.id.startsWith(`p:${plan.id}:`)) { k.silindi = true; k.guncel = t; }
    });
    secAy = veri.tarih.slice(0, 7);
    sayfa.close();
    degisti();
    return;
  }
  if (duzenlenen) {
    const once = { ...duzenlenen };
    Object.assign(duzenlenen, veri);
    // Plandan gelen ayın elle değiştirildiği işaretlenir: "bundan sonra" düzenlemesi bu ayı ezmez.
    if (planKaydiMi(duzenlenen)) duzenlenen.elle = true;
    const k = duzenlenen;
    bildir(`${c.ad} güncellendi`, () => {
      Object.assign(k, once, { guncel: Date.now() });
      if (!('elle' in once)) delete k.elle;
      if (!('hesap' in once)) delete k.hesap;
    });
  } else {
    const yeni = { id: yeniId(), ...veri };
    const butce = c.tur === 'gider' && c.butce;
    const onceki = butce ? (ayOzeti(durum, veri.tarih.slice(0, 7)).toplam.get(katId) ?? 0) : 0;
    durum.kayitlar.push(yeni);
    if (butce && onceki <= c.butce && onceki + yeni.tutar > c.butce) { sallanacak = katId; hareket.titret([20, 60, 20]); }
    else hareket.titret(12);
    bildir(`${c.ad} · ${tl(yeni.tutar, { kurus: true })} eklendi`, () => Object.assign(yeni, { silindi: true, guncel: Date.now() }));
  }
  secAy = veri.tarih.slice(0, 7);
  sayfa.close();
  degisti();
  sallanacak = null;
});

$('#sil-dugme').addEventListener('click', () => {
  const k = duzenlenen;
  Object.assign(k, { silindi: true, guncel: Date.now() });
  sayfa.close();
  degisti();
  bildir('Kayıt silindi', () => Object.assign(k, { silindi: false, guncel: Date.now() }));
});

hareket.kaydirarakSil(ekran, (id) => {
  const k = durum.kayitlar.find((x) => x.id === id);
  if (!k) return;
  Object.assign(k, { silindi: true, guncel: Date.now() });
  degisti();
  // Arama kutusu odaktayken ciz() yazılanı korumak için çizmez; sonuçlar ayrıca yenilensin.
  if ($('#kayit-govde')) aramaYenile();
  bildir('Kayıt silindi', () => { Object.assign(k, { silindi: false, guncel: Date.now() }); if ($('#kayit-govde')) aramaYenile(); });
});
hareket.surukleKapat(sayfa);

// + düğmesine uzun basınca son kayıt hazır gelir (görünür yolu: formdaki "Son kaydı tekrarla").
let uzunBasis = null;
let uzunBasildi = false;
const ekleDugme = $('#ekle-dugme');
ekleDugme.addEventListener('pointerdown', (e) => {
  uzunBasildi = false;
  if (e.button !== 0) return;
  clearTimeout(uzunBasis);
  uzunBasis = setTimeout(() => {
    const son = sonKayit(durum);
    if (!son) return;
    uzunBasildi = true;
    hareket.titret(20);
    sayfaAc();
    sonKaydiDoldur(son);
  }, 550);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((o) => ekleDugme.addEventListener(o, () => clearTimeout(uzunBasis)));
ekleDugme.addEventListener('contextmenu', (e) => e.preventDefault());
// Uzun basıştan sonraki tıklama yutulur; klavyeyle (detail 0) gelen tıklama hiçbir zaman yutulmaz.
ekleDugme.addEventListener('click', (e) => { const yut = uzunBasildi && e.detail > 0; uzunBasildi = false; if (!yut) sayfaAc(); });
sayfa.addEventListener('close', () => { uzunBasildi = false; });

// ---------------------------------------------------------------- plan sayfası

const planSayfa = $('#plan-sayfasi');
const planForm = $('#plan-formu');
let acikPlan = null;
let bekleyenIslem = null; // onay bekleyen işlem: 'durdur' | 'sil'

const sayiYaz = (x) => String(x ?? '').replace('.', ',');

function planOnayiKapat() {
  bekleyenIslem = null;
  $('#plan-onay').hidden = true;
  $('#plan-eylemler').hidden = false;
}

function planSayfasiAc(id) {
  const plan = (durum.planlar ?? []).find((p) => p.id === id && !p.silindi);
  if (!plan) return;
  acikPlan = plan;
  const kat = kategoriHaritasi(durum);
  const ay = buAy();
  const taksit = plan.tur === 'taksit';
  const notu = String(plan.not ?? '').trim();
  const durum_ = taksit
    ? `${plan.adet} taksit · ${plan.baslangic > ay ? 'henüz başlamadı' : `${taksitSirasi(plan, ay)}. taksitte`}${planDurdurulmus(plan, ay) ? ' · Durduruldu' : ''}`
    : planDurdurulmus(plan, ay) ? 'Durduruldu' : 'Her ay';
  $('#plan-baslik').textContent = kat.get(plan.kat)?.ad ?? 'Silinmiş kategori';
  const baslik = kat.get(plan.kat)?.ad ?? 'Silinmiş kategori';
  $('#plan-alt').textContent = notu && notu !== baslik ? `${notu} · ${durum_}` : durum_;
  $('#plan-tutar-etiket').textContent = taksit ? 'Toplam tutar' : 'Aylık tutar';
  $('#plan-tutar').value = sayiYaz(taksit ? plan.toplam : plan.tutar);
  $('#plan-gun').value = String(plan.gun);
  $('#plan-not').value = plan.not ?? '';
  $('#plan-hata').hidden = true;
  $('#plan-durdur').hidden = Boolean(plan.bitis && plan.bitis <= ay);
  planOnayiKapat();
  planSayfa.showModal();
}

planForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!acikPlan) return;
  const taksit = acikPlan.tur === 'taksit';
  const tutar = sayiOku($('#plan-tutar').value);
  const gun = sayiOku($('#plan-gun').value);
  const hata = $('#plan-hata');
  const mesaj = !(Number.isFinite(tutar) && tutar > 0) ? 'Tutarı yaz; ondalık için virgül kullanabilirsin.'
    : !(Number.isInteger(gun) && gun >= 1 && gun <= 31) ? 'Ayın günü 1 ile 31 arasında olmalı.' : '';
  hata.hidden = !mesaj;
  hata.textContent = mesaj;
  if (mesaj) return;
  planGuncelle(durum, acikPlan.id, { [taksit ? 'toplam' : 'tutar']: tutar, gun, not: $('#plan-not').value.trim() }, bugun());
  planSayfa.close();
  degisti();
  bildir('Plan güncellendi; sonraki aylar değişti');
});

function planOnayiIste(islem) {
  bekleyenIslem = islem;
  $('#plan-onay-metin').textContent = islem === 'durdur' ? 'Bu aydan sonra eklenmesin mi? Geçmiş kayıtlar kalır.' : 'Bu plan silinsin mi? Sonraki aylar kalkar, geçmiş kayıtlar kalır.';
  const evet = $('#plan-onayla');
  evet.textContent = islem === 'durdur' ? 'Evet, durdur' : 'Evet, sil';
  evet.className = islem === 'sil' ? 'sil-dugme' : 'dugme dolu';
  $('#plan-eylemler').hidden = true;
  $('#plan-onay').hidden = false;
  $('#plan-vazgec').focus();
}
$('#plan-durdur').addEventListener('click', () => planOnayiIste('durdur'));
$('#plan-sil').addEventListener('click', () => planOnayiIste('sil'));
$('#plan-vazgec').addEventListener('click', planOnayiKapat);
$('#plan-onayla').addEventListener('click', () => {
  if (!acikPlan || !bekleyenIslem) return;
  const islem = bekleyenIslem;
  if (islem === 'durdur') planDurdur(durum, acikPlan.id, bugun());
  else planSil(durum, acikPlan.id, bugun());
  planSayfa.close();
  degisti();
  bildir(islem === 'durdur' ? 'Plan durduruldu' : 'Plan silindi');
});
planSayfa.addEventListener('click', (e) => {
  if (e.target === planSayfa || e.target.closest('[data-kapat]')) planSayfa.close();
});
planSayfa.addEventListener('close', () => { acikPlan = null; planOnayiKapat(); });
hareket.surukleKapat(planSayfa);

// ---------------------------------------------------------------- kategori yönetimi (js/kategori.js)

const katSayfa = $('#kategori-sayfasi');
const katIcerik = $('#kategori-icerik');
let katTur = 'gider';
let katDuzenlenen = null; // null: liste görünümü; 'yeni' ya da kategori kimliği: düzenleme görünümü

function kategoriOzetSatiri() {
  const say = (tur) => canliKategoriler(durum).filter((k) => k.tur === tur).length;
  const gizli = durum.kategoriler.filter((k) => k.silindi).length;
  return `<button type="button" class="plan-satir" data-eylem="kategoriler"><span class="kat-kutu"><svg class="ikon" aria-hidden="true"><use href="#i-kayitlar"/></svg></span><span><b>Kategorileri düzenle</b><small>${say('gider')} gider · ${say('gelir')} gelir${gizli ? ` · ${gizli} gizli` : ''}</small></span><svg class="ikon" aria-hidden="true"><use href="#i-sag"/></svg></button>`;
}

function kategoriSayfasiAc() {
  katDuzenlenen = null;
  kategoriCiz();
  katSayfa.showModal();
}

function kategoriCiz(odak) {
  const duzenleme = katDuzenlenen !== null;
  $('#kategori-geri').hidden = !duzenleme;
  if (!duzenleme) {
    $('#kategori-baslik').textContent = 'Kategoriler';
    katIcerik.innerHTML = kategoriListesi();
  } else {
    const k = katDuzenlenen === 'yeni' ? null : durum.kategoriler.find((x) => x.id === katDuzenlenen);
    $('#kategori-baslik').textContent = k ? 'Kategoriyi düzenle' : katTur === 'gelir' ? 'Yeni gelir kategorisi' : 'Yeni gider kategorisi';
    katIcerik.innerHTML = kategoriFormu(k);
  }
  if (odak) katIcerik.querySelector(odak)?.focus();
}

function kategoriListesi() {
  const liste = canliKategoriler(durum).filter((k) => k.tur === katTur);
  const gizli = gizliKategoriler(durum, katTur);
  const satir = (k, i) => `<li class="kat-satir">
      <button type="button" class="kat-ac" data-kat-ac="${kacis(k.id)}"><span class="kat-kutu">${katIkon(k)}</span><span class="kat-ad">${kacis(k.ad)}</span>${k.butce ? `<small>${tl(k.butce)}</small>` : ''}</button>
      <button type="button" class="kat-ok" data-kat-tasi="${kacis(k.id)}" data-yon="-1" aria-label="${kacis(k.ad)}: yukarı taşı"${i === 0 ? ' disabled' : ''}><svg class="ikon" aria-hidden="true"><use href="#i-yukari"/></svg></button>
      <button type="button" class="kat-ok" data-kat-tasi="${kacis(k.id)}" data-yon="1" aria-label="${kacis(k.ad)}: aşağı taşı"${i === liste.length - 1 ? ' disabled' : ''}><svg class="ikon" aria-hidden="true"><use href="#i-asagi"/></svg></button>
    </li>`;
  return `<div class="tur-secici" role="radiogroup" aria-label="Tür">
      <label><input type="radio" name="kat-tur" value="gider"${katTur === 'gider' ? ' checked' : ''}><span>Gider</span></label>
      <label><input type="radio" name="kat-tur" value="gelir"${katTur === 'gelir' ? ' checked' : ''}><span>Gelir</span></label>
    </div>
    <ul class="kat-liste" aria-label="${katTur === 'gelir' ? 'Gelir' : 'Gider'} kategorileri">${liste.map(satir).join('')}</ul>
    <button type="button" class="dugme kat-yeni" data-kat-yeni><svg class="ikon" aria-hidden="true"><use href="#i-arti"/></svg>Yeni kategori</button>
    ${gizli.length ? `<h3 class="kat-ara">Gizlenenler</h3>
    <ul class="kat-liste gizli">${gizli.map((k) => `<li class="kat-satir"><span class="kat-ac"><span class="kat-kutu">${katIkon(k)}</span><span class="kat-ad">${kacis(k.ad)}</span></span><button type="button" class="dugme" data-kat-goster="${kacis(k.id)}" aria-label="${kacis(k.ad)}: göster">Göster</button></li>`).join('')}</ul>
    <p class="kat-not">Gizlenen kategorinin geçmiş kayıtları yerinde kalır; yeni kayıtta seçilemez.</p>` : ''}`;
}

function kategoriFormu(k) {
  const tur = k?.tur ?? katTur;
  const cizim = k && varsayilanEmoji(k.id);
  const secenekler = [...(cizim ? [cizim] : []), ...HAZIR_EMOJILER.filter((e) => e !== cizim)].slice(0, HAZIR_EMOJILER.length);
  const secili = k?.emoji ?? '';
  const serbest = secili && !secenekler.includes(secili) ? secili : '';
  const planVar = k && (durum.planlar ?? []).some((p) => !p.silindi && p.kat === k.id && (!p.bitis || p.bitis >= buAy()));
  return `<form id="kategori-formu" novalidate autocomplete="off">
    <label class="kucuk-alan"><span>Ad</span><input id="kat-ad" maxlength="${AD_SINIRI}" value="${kacis(k?.ad ?? '')}" placeholder="${tur === 'gelir' ? 'Örneğin Kira geliri' : 'Örneğin Spor salonu'}" aria-describedby="kat-ad-hata" enterkeyhint="done"></label>
    <p class="hata kat-hata" id="kat-ad-hata" hidden></p>
    <fieldset class="emoji-izgara"><legend>Simge</legend>
      ${secenekler.map((e) => `<label class="emoji-secim"><input type="radio" name="kat-emoji" value="${e}"${e === secili ? ' checked' : ''}><span>${cizim && e === cizim ? katIkon({ id: k.id, emoji: e, tur }) : e}</span></label>`).join('')}
    </fieldset>
    <label class="kucuk-alan"><span>Ya da klavyeden bir emoji</span><input id="kat-emoji-serbest" maxlength="16" value="${kacis(serbest)}" aria-describedby="kat-emoji-hata"></label>
    <p class="hata kat-hata" id="kat-emoji-hata" hidden></p>
    ${tur === 'gider' ? `<label class="kurulum-alan kat-butce"><span>Aylık bütçe (boş bırakılabilir)</span><span class="para-giris"><input id="kat-butce" inputmode="decimal" placeholder="—" value="${k?.butce ? new Intl.NumberFormat('tr-TR').format(k.butce) : ''}"><span>₺</span></span></label>` : ''}
    <div class="sayfa-dugmeler"><button type="submit" class="kaydet-dugme">${k ? 'Kaydet' : 'Ekle'}</button></div>
    ${k ? `<div class="kat-gizle">
      <button type="button" class="dugme tehlike" data-kat-gizle${sonGorunenMi(durum, k.id) ? ' disabled aria-describedby="kat-gizle-not"' : ''}>Gizle</button>
      <p class="kat-not" id="kat-gizle-not">${sonGorunenMi(durum, k.id) ? `Son ${tur} kategorisi gizlenemez.` : `Geçmiş kayıtları yerinde kalır; yeni kayıtta seçilemez.${planVar ? ' Bu kategorideki düzenli ödeme eklenmeye devam eder.' : ''}`}</p>
    </div>` : ''}
  </form>`;
}

function kategoriHatasi(id, metin) {
  const p = $(`#${id}`);
  p.textContent = metin;
  p.hidden = !metin;
}

katSayfa.addEventListener('click', (e) => {
  if (e.target === katSayfa || e.target.closest('[data-kapat]')) { katSayfa.close(); return; }
  const t = e.target;
  const tasi = t.closest('[data-kat-tasi]');
  if (tasi) {
    const id = tasi.dataset.katTasi;
    const yon = Number(tasi.dataset.yon);
    if (kategoriTasi(durum, id, yon)) {
      degisti();
      hareket.titret(6);
      kategoriCiz();
      // Odak taşınan kategoride kalsın; uca geldiyse öbür okuna geçer.
      const ayni = katIcerik.querySelector(`[data-kat-tasi="${CSS.escape(id)}"][data-yon="${yon}"]`);
      (ayni && !ayni.disabled ? ayni : katIcerik.querySelector(`[data-kat-tasi="${CSS.escape(id)}"]:not([disabled])`))?.focus();
      $('#duyuru').textContent = `${kategoriHaritasi(durum).get(id)?.ad ?? ''} ${yon < 0 ? 'yukarı' : 'aşağı'} taşındı`;
    }
    return;
  }
  const ac = t.closest('[data-kat-ac]');
  if (ac && ac.tagName === 'BUTTON') { katDuzenlenen = ac.dataset.katAc; kategoriCiz('#kat-ad'); return; }
  if (t.closest('[data-kat-yeni]')) { katDuzenlenen = 'yeni'; kategoriCiz('#kat-ad'); return; }
  const goster = t.closest('[data-kat-goster]');
  if (goster) {
    const k = kategoriHaritasi(durum).get(goster.dataset.katGoster);
    if (kategoriGoster(durum, goster.dataset.katGoster)) { degisti(); kategoriCiz(); bildir(`«${k.ad}» yeniden görünüyor`); }
    return;
  }
  if (t.closest('[data-kat-gizle]')) {
    const k = durum.kategoriler.find((x) => x.id === katDuzenlenen);
    const eskiSira = k?.sira;
    if (!k || !kategoriGizle(durum, k.id)) return;
    degisti();
    katDuzenlenen = null;
    kategoriCiz();
    $('#kategori-baslik').focus();
    bildir(`«${k.ad}» gizlendi`, () => {
      k.silindi = false; k.sira = eskiSira; k.guncel = Date.now();
      degisti();
      if (katSayfa.open && katDuzenlenen === null) kategoriCiz();
    });
  }
});

katSayfa.addEventListener('change', (e) => {
  if (e.target.name === 'kat-tur') { katTur = e.target.value; kategoriCiz(); katIcerik.querySelector(`[name=kat-tur][value=${katTur}]`)?.focus(); }
  if (e.target.name === 'kat-emoji') { $('#kat-emoji-serbest').value = ''; kategoriHatasi('kat-emoji-hata', ''); }
});

katSayfa.addEventListener('input', (e) => {
  if (e.target.id === 'kat-ad') kategoriHatasi('kat-ad-hata', '');
  if (e.target.id === 'kat-emoji-serbest') {
    kategoriHatasi('kat-emoji-hata', '');
    // Klavyeden emoji yazılınca hazır seçim kalkar; hangisi geçerli belli olsun.
    if (e.target.value.trim()) katIcerik.querySelectorAll('[name=kat-emoji]').forEach((r) => { r.checked = false; });
  }
});

katSayfa.addEventListener('submit', (e) => {
  e.preventDefault();
  const k = katDuzenlenen === 'yeni' ? null : durum.kategoriler.find((x) => x.id === katDuzenlenen);
  const tur = k?.tur ?? katTur;
  const ad = $('#kat-ad').value;
  const adH = adHatasi(durum, ad, tur, k?.id);
  const serbest = $('#kat-emoji-serbest').value;
  const emoji = serbest.trim() ? emojiAl(serbest) : katIcerik.querySelector('[name=kat-emoji]:checked')?.value ?? '';
  kategoriHatasi('kat-ad-hata', adH === 'bos' ? 'Kategoriye bir ad ver.' : adH === 'ayni' ? `«${adTemizle(ad)}» adında bir ${tur} kategorisi zaten var.` : adH === 'gizli' ? `«${adTemizle(ad)}» gizlenenlerde var; listeden «Göster»e dokunman yeter.` : '');
  kategoriHatasi('kat-emoji-hata', serbest.trim() && !emoji ? 'Buraya tek bir emoji yaz; harf ve rakam olmaz.' : !emoji && !k ? 'Bir simge seç ya da klavyeden bir emoji yaz.' : '');
  if (adH || (serbest.trim() && !emoji) || (!emoji && !k)) {
    katIcerik.querySelector('.kat-hata:not([hidden])')?.previousElementSibling?.querySelector('input')?.focus();
    return;
  }
  const butceAlan = $('#kat-butce');
  const butce = butceAlan ? sayiOku(butceAlan.value) : undefined;
  if (k) {
    if (kategoriGuncelle(durum, k.id, { ad, emoji: emoji || undefined, butce: butceAlan ? (Number.isFinite(butce) ? butce : null) : undefined })) { degisti(); bildir('Kategori güncellendi'); }
  } else {
    const yeni = kategoriEkle(durum, { ad, emoji, tur, butce: Number.isFinite(butce) ? butce : null });
    degisti();
    bildir(`«${yeni.ad}» eklendi`);
  }
  katDuzenlenen = null;
  kategoriCiz();
  $('#kategori-baslik').focus();
});

$('#kategori-geri').addEventListener('click', () => { katDuzenlenen = null; kategoriCiz(); $('#kategori-baslik').focus(); });
katSayfa.addEventListener('close', () => { katDuzenlenen = null; });
hareket.surukleKapat(katSayfa);

// ---------------------------------------------------------------- hesaplar (js/hesap.js, docs/hesap-sozlesme.md)

const hesapSayfa = $('#hesap-sayfasi');
const hesapIcerik = $('#hesap-icerik');
let hesapGorunum = 'liste'; // 'liste' | 'aktar' | 'yeni' | hesap kimliği (düzenleme)
const HESAP_SIMGE = { nakit: 'i-nakit', banka: 'k-baslangic', kart: 'k-kredi' };
const hesapIkon = (h) => `<svg class="kat-ikon" aria-hidden="true"><use href="#${HESAP_SIMGE[h.tur] ?? 'k-baslangic'}"/></svg>`;
// Yeni hesabın parası çoğu zaman zaten Ana hesapta sayılıyordur (kurulumda "elindeki para" hepsini kapsar):
// açıkken Ana hesaptan düşülür, aynı para iki kez sayılmaz (hesap.js hesapEkle anadanDus).
const ANADAN_METIN = {
  nakit: ['Bu parayı Ana hesaptan düş', 'Bu para şimdiye kadar Ana hesapta sayılıyorduysa açık bırak; yoksa iki kez sayılır.'],
  banka: ['Bu parayı Ana hesaptan düş', 'Bu para şimdiye kadar Ana hesapta sayılıyorduysa açık bırak; yoksa iki kez sayılır.'],
  kart: ['Bu borcun harcamalarını zaten kaydettim', 'Açıksa o harcamalar Ana hesaptan geri alınır ve karta yazılır; borç iki kez düşmez.'],
};
const kartVar = () => (durum.hesaplar ?? []).some((h) => h.tur === 'kart');
/** Hanede ve sunucu henüz hesapları eşitlemiyorsa yeni hesap ve aktarım kapalı (docs/hesap-sozlesme.md 7). */
const hesapKilitli = () => Boolean(durum.hane) && !durum.hane.hesapDestek;
const hesapTutarMetni = (h, gosterilen) => (h.tur === 'kart' ? (gosterilen > 0 ? `borç ${tl(gosterilen, { kurus: true })}` : gosterilen < 0 ? `alacak ${tl(-gosterilen, { kurus: true })}` : 'borç yok') : tl(gosterilen, { kurus: true }));

function hesapSeridi() {
  const borc = kartBorcu(durum, bugun());
  return `<p class="hesap-seridi"><button type="button" data-eylem="hesaplar">${kartVar() ? `Kart borcu <b>${tl(borc)}</b> · net <b>${tl(netPara(durum, bugun()))}</b>` : 'Hesaplarındaki para'}<svg class="ikon" aria-hidden="true"><use href="#i-sag"/></svg></button></p>`;
}

function hesapOzetSatiri() {
  const n = (durum.hesaplar ?? []).filter((h) => !h.silindi).length;
  const alt = n ? `${n + 1} hesap${kartVar() ? ` · kart borcu ${tl(kartBorcu(durum, bugun()))}` : ''}` : 'Nakit, banka ya da kredi kartını ayrı tut';
  return `<button type="button" class="plan-satir" data-eylem="hesaplar"><span class="kat-kutu">${hesapIkon({ tur: 'banka' })}</span><span><b>${n ? 'Hesapları düzenle' : 'Hesap ekle'}</b><small>${alt}</small></span><svg class="ikon" aria-hidden="true"><use href="#i-sag"/></svg></button>`;
}

function hesapSecici(secili, kayit) {
  const gorunen = gorunenHesaplar(durum);
  // Düzenlenen kaydın hesabı gizlenmişse de seçili görünsün.
  const kendi = kayit?.hesap && !gorunen.some((h) => h.id === kayit.hesap) ? (durum.hesaplar ?? []).find((h) => h.id === kayit.hesap) : null;
  const liste = kendi ? [...gorunen, kendi] : gorunen;
  $('#hesap-secici').hidden = liste.length < 2;
  $('#hesap-cipler').innerHTML = liste.map((h) => `<label class="hesap-cip"><input type="radio" name="hesap" value="${kacis(h.id)}"${h.id === secili ? ' checked' : ''}><span>${hesapIkon(h)}${kacis(h.ad)}</span></label>`).join('');
}

function hesapSayfasiAc(gorunum = 'liste') {
  hesapGorunum = gorunum;
  hesapCiz();
  hesapSayfa.showModal();
}

function hesapCiz(odak) {
  $('#hesap-geri').hidden = hesapGorunum === 'liste';
  if (hesapGorunum === 'liste') { $('#hesap-baslik').textContent = 'Hesaplar'; hesapIcerik.innerHTML = hesapListesi(); }
  else if (hesapGorunum === 'aktar') { $('#hesap-baslik').textContent = kartVar() ? 'Para aktar ya da kart öde' : 'Para aktar'; hesapIcerik.innerHTML = aktarimFormu(); }
  else {
    const h = hesapGorunum === 'yeni' ? null : hesapBul(durum, hesapGorunum);
    $('#hesap-baslik').textContent = h ? h.ad : 'Yeni hesap';
    hesapIcerik.innerHTML = hesapFormu(h);
  }
  if (odak) hesapIcerik.querySelector(odak)?.focus();
}

function hesapListesi() {
  const gun = bugun();
  const bakiyeler = hesapBakiyeleri(durum, gun);
  const gorunen = gorunenHesaplar(durum);
  const satir = (h) => {
    const g = gosterilenTutar(durum, h.id, gun);
    return `<li class="kat-satir hesap-satir"><button type="button" class="kat-ac" data-hesap-ac="${kacis(h.id)}"><span class="kat-kutu">${hesapIkon(h)}</span><span class="kat-ad">${kacis(h.ad)}<small>${HESAP_TURLERI[h.tur]}${h.id === ANA_HESAP ? ' · başlangıç parası burada' : ''}</small></span><b class="hesap-tutar">${hesapTutarMetni(h, g)}</b></button></li>`;
  };
  const gizli = gizliHesaplar(durum).filter((h) => bakiyeler.has(h.id));
  const aktarimlar = sonAktarimlar(durum, 8);
  const tarihYaz = (t) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(`${t}T12:00:00`));
  const kilit = hesapKilitli();
  return `<ul class="kat-liste">${gorunen.map(satir).join('')}</ul>
    <dl class="hesap-toplam">
      <div><dt>Elindeki para</dt><dd>${tl(elindekiPara(durum, gun), { kurus: true })}</dd></div>
      ${kartVar() ? `<div><dt>Kart borcu</dt><dd>${tl(kartBorcu(durum, gun), { kurus: true })}</dd></div><div class="net"><dt>Net</dt><dd>${tl(netPara(durum, gun), { kurus: true })}</dd></div>` : ''}
    </dl>
    <div class="hesap-dugmeler">
      <button type="button" class="dugme kat-yeni" data-hesap-yeni${kilit || (durum.hesaplar ?? []).length >= HESAP_SINIRI ? ' disabled aria-describedby="hesap-kilit"' : ''}><svg class="ikon" aria-hidden="true"><use href="#i-arti"/></svg>Yeni hesap</button>
      ${gorunen.length >= 2 ? `<button type="button" class="dugme kat-yeni" data-hesap-aktar${kilit ? ' disabled aria-describedby="hesap-kilit"' : ''}><svg class="ikon" aria-hidden="true"><use href="#i-aktar"/></svg>${kartVar() ? 'Aktar / kart öde' : 'Para aktar'}</button>` : ''}
    </div>
    ${kilit ? '<p class="kat-not" id="hesap-kilit">Hanendeki eşitleme sunucusu henüz hesapları tanımıyor; güncellenince burada hesap ekleyebilirsin.</p>' : ''}
    ${!(durum.hesaplar ?? []).length ? '<p class="kat-not">Kredi kartıyla yaptığın harcama elindeki parayı hemen azaltmaz, kart borcuna yazılır. Kartı ödediğinde «Aktar / kart öde» ile kaydet; ödeme gider sayılmaz.</p>' : ''}
    ${aktarimlar.length ? `<h3 class="kat-ara">Son aktarımlar</h3><ul class="kat-liste aktarim-liste">${aktarimlar.map((a) => `<li class="kat-satir"><span class="kat-ac"><span class="kat-ad">${kacis(hesapBul(durum, a.kaynak).ad)} → ${kacis(hesapBul(durum, a.hedef).ad)}<small>${kacis(tarihYaz(a.tarih))}${a.not ? ` · ${kacis(a.not)}` : ''}</small></span><b class="hesap-tutar">${tl(a.tutar, { kurus: true })}</b></span><button type="button" class="kat-ok" data-aktarim-sil="${kacis(a.id)}" aria-label="${kacis(tarihYaz(a.tarih))} tarihli ${kacis(tl(a.tutar))} aktarımı sil"><svg class="ikon" aria-hidden="true"><use href="#i-kapat"/></svg></button></li>`).join('')}</ul>` : ''}
    ${gizli.length ? `<h3 class="kat-ara">Gizlenenler</h3><ul class="kat-liste gizli">${gizli.map((h) => `<li class="kat-satir"><span class="kat-ac"><span class="kat-kutu">${hesapIkon(h)}</span><span class="kat-ad">${kacis(h.ad)}<small>${hesapTutarMetni(h, gosterilenTutar(durum, h.id, gun))}</small></span></span><button type="button" class="dugme" data-hesap-goster="${kacis(h.id)}" aria-label="${kacis(h.ad)}: göster">Göster</button></li>`).join('')}</ul>
    <p class="kat-not">Gizlenen hesabın parası toplamlarda kalır; yeni kayıtta seçilemez.</p>` : ''}`;
}

function hesapFormu(h) {
  const yeni = !h;
  const ana = h?.id === ANA_HESAP;
  const tur = h?.tur ?? 'banka';
  const tutar = h ? gosterilenTutar(durum, h.id, bugun()) : null;
  return `<form id="hesap-formu" novalidate autocomplete="off">
    ${yeni ? `<div class="tur-secici uclu" role="radiogroup" aria-label="Hesap türü">${Object.entries(HESAP_TURLERI).map(([d, ad]) => `<label><input type="radio" name="hesap-tur" value="${d}"${d === tur ? ' checked' : ''}><span>${ad}</span></label>`).join('')}</div>` : `<p class="kat-not hesap-tur-notu">${HESAP_TURLERI[tur]}${ana ? ' · hesap seçilmeyen kayıtlar buraya yazılır' : ''}</p>`}
    ${ana ? '' : `<label class="kucuk-alan"><span>Ad</span><input id="hesap-ad" maxlength="${HESAP_AD_SINIRI}" value="${kacis(h?.ad ?? '')}" placeholder="Örneğin Ziraat, Cüzdan, Bonus kart" aria-describedby="hesap-ad-hata"></label>
    <p class="hata kat-hata" id="hesap-ad-hata" hidden></p>`}
    <label class="kurulum-alan"><span id="hesap-tutar-etiket">${tur === 'kart' ? 'Bugünkü borç' : 'Bugünkü bakiye'}</span><span class="para-giris"><input id="hesap-tutar" inputmode="decimal" placeholder="0" value="${tutar === null ? '' : kacis(new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(tutar))}" aria-describedby="hesap-tutar-not"><span>₺</span></span></label>
    <p class="kat-not" id="hesap-tutar-not">${tur === 'kart' ? 'Ekstre değil, kartın bugünkü toplam borcu.' : yeni ? 'Bugün bu hesapta ne kadar var?' : 'Gerçek bakiyeyle tutmuyorsa düzelt; geçmiş kayıtlar değişmez.'}</p>
    ${yeni ? `<label class="ayar-ac hesap-anadan"><span><b id="hesap-anadan-baslik">${ANADAN_METIN[tur][0]}</b><small id="hesap-anadan-not">${ANADAN_METIN[tur][1]}</small></span><input type="checkbox" role="switch" id="hesap-anadan" checked></label>` : ''}
    <div class="sayfa-dugmeler"><button type="submit" class="kaydet-dugme">${yeni ? 'Ekle' : 'Kaydet'}</button></div>
    ${h && !ana ? '<div class="kat-gizle"><button type="button" class="dugme tehlike" data-hesap-gizle>Gizle</button><p class="kat-not">Parası toplamlarda kalır; yeni kayıtta seçilemez.</p></div>' : ''}
  </form>`;
}

function aktarimFormu() {
  const gorunen = gorunenHesaplar(durum);
  const kart = gorunen.find((h) => h.tur === 'kart');
  const kaynak = ANA_HESAP;
  const hedef = kart?.id ?? gorunen.find((h) => h.id !== ANA_HESAP)?.id;
  const secenekler = (sec) => gorunen.map((h) => `<option value="${kacis(h.id)}"${h.id === sec ? ' selected' : ''}>${kacis(h.ad)}</option>`).join('');
  return `<form id="aktarim-formu" novalidate autocomplete="off">
    <div class="aktarim-yon">
      <label class="kucuk-alan"><span>Nereden</span><select id="aktarim-kaynak">${secenekler(kaynak)}</select></label>
      <svg class="ikon" aria-hidden="true"><use href="#i-sag"/></svg>
      <label class="kucuk-alan"><span>Nereye</span><select id="aktarim-hedef" aria-describedby="aktarim-hata">${secenekler(hedef)}</select></label>
    </div>
    <label class="kurulum-alan"><span>Tutar</span><span class="para-giris"><input id="aktarim-tutar" inputmode="decimal" placeholder="0" aria-describedby="aktarim-hata"><span>₺</span></span></label>
    <div class="sayfa-alt-alanlar aktarim-alt">
      <label class="kucuk-alan"><span>Tarih</span><input type="date" id="aktarim-tarih" value="${bugun()}"></label>
      <label class="kucuk-alan genis"><span>Not</span><input id="aktarim-not" maxlength="60" placeholder="İsteğe bağlı"></label>
    </div>
    <p class="hata kat-hata" id="aktarim-hata" hidden></p>
    <p class="kat-not">Aktarım gelir ya da gider sayılmaz; yalnızca iki hesabın bakiyesi değişir.</p>
    <div class="sayfa-dugmeler"><button type="submit" class="kaydet-dugme">Aktar</button></div>
  </form>`;
}

function hesapHata(id, metin) {
  const p = $(`#${id}`);
  if (!p) return;
  p.textContent = metin;
  p.hidden = !metin;
}

hesapSayfa.addEventListener('click', (e) => {
  if (e.target === hesapSayfa || e.target.closest('[data-kapat]')) { hesapSayfa.close(); return; }
  const t = e.target;
  const ac = t.closest('[data-hesap-ac]');
  if (ac) { hesapGorunum = ac.dataset.hesapAc; hesapCiz(ac.dataset.hesapAc === ANA_HESAP ? '#hesap-tutar' : '#hesap-ad'); return; }
  if (t.closest('[data-hesap-yeni]')) { hesapGorunum = 'yeni'; hesapCiz('#hesap-ad'); return; }
  if (t.closest('[data-hesap-aktar]')) { hesapGorunum = 'aktar'; hesapCiz('#aktarim-tutar'); return; }
  const goster = t.closest('[data-hesap-goster]');
  if (goster) {
    if (hesapGoster(durum, goster.dataset.hesapGoster)) { degisti(); hesapCiz(); bildir(`«${hesapBul(durum, goster.dataset.hesapGoster).ad}» yeniden görünüyor`); }
    return;
  }
  const sil = t.closest('[data-aktarim-sil]');
  if (sil) {
    const a = (durum.aktarimlar ?? []).find((x) => x.id === sil.dataset.aktarimSil);
    if (a && aktarimSil(durum, a.id)) {
      degisti();
      hesapCiz();
      $('#hesap-baslik').focus();
      bildir('Aktarım silindi', () => { a.silindi = false; a.guncel = Date.now(); degisti(); if (hesapSayfa.open && hesapGorunum === 'liste') hesapCiz(); });
    }
    return;
  }
  if (t.closest('[data-hesap-gizle]')) {
    const h = hesapBul(durum, hesapGorunum);
    if (!hesapGizle(durum, h.id)) return;
    degisti();
    hesapGorunum = 'liste';
    hesapCiz();
    $('#hesap-baslik').focus();
    bildir(`«${h.ad}» gizlendi`, () => { hesapGoster(durum, h.id); degisti(); if (hesapSayfa.open && hesapGorunum === 'liste') hesapCiz(); });
  }
});

hesapSayfa.addEventListener('change', (e) => {
  if (e.target.name === 'hesap-tur') {
    const kart = e.target.value === 'kart';
    $('#hesap-tutar-etiket').textContent = kart ? 'Bugünkü borç' : 'Bugünkü bakiye';
    $('#hesap-tutar-not').textContent = kart ? 'Ekstre değil, kartın bugünkü toplam borcu.' : 'Bugün bu hesapta ne kadar var?';
    $('#hesap-anadan-baslik').textContent = ANADAN_METIN[e.target.value][0];
    $('#hesap-anadan-not').textContent = ANADAN_METIN[e.target.value][1];
  }
  if (e.target.id === 'aktarim-kaynak' || e.target.id === 'aktarim-hedef') hesapHata('aktarim-hata', '');
});
hesapSayfa.addEventListener('input', (e) => {
  if (e.target.id === 'hesap-ad') hesapHata('hesap-ad-hata', '');
  if (e.target.id === 'aktarim-tutar') hesapHata('aktarim-hata', '');
});

hesapSayfa.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'aktarim-formu') {
    const veri = { kaynak: $('#aktarim-kaynak').value, hedef: $('#aktarim-hedef').value, tutar: sayiOku($('#aktarim-tutar').value), tarih: $('#aktarim-tarih').value || bugun(), not: $('#aktarim-not').value.trim() };
    const hata = aktarimHatasi(veri);
    if (hata) {
      hesapHata('aktarim-hata', hata === 'ayni' ? 'Nereden ve nereye aynı hesap olamaz.' : 'Tutarı yaz; ondalık için virgül kullanabilirsin.');
      (hata === 'ayni' ? $('#aktarim-hedef') : $('#aktarim-tutar')).focus();
      return;
    }
    const a = aktarimEkle(durum, veri);
    degisti();
    hesapGorunum = 'liste';
    hesapCiz();
    $('#hesap-baslik').focus();
    bildir(`${hesapBul(durum, a.kaynak).ad} → ${hesapBul(durum, a.hedef).ad} · ${tl(a.tutar, { kurus: true })}`, () => { a.silindi = true; a.guncel = Date.now(); degisti(); if (hesapSayfa.open && hesapGorunum === 'liste') hesapCiz(); });
    return;
  }
  const h = hesapGorunum === 'yeni' ? null : hesapBul(durum, hesapGorunum);
  const ana = h?.id === ANA_HESAP;
  const ad = ana ? undefined : $('#hesap-ad').value;
  if (!ana) {
    const adH = hesapAdHatasi(durum, ad, h?.id);
    if (adH && !(adH === 'bos' && !h)) {
      hesapHata('hesap-ad-hata', adH === 'bos' ? 'Hesaba bir ad ver.' : 'Bu adda bir hesap zaten var.');
      $('#hesap-ad').focus();
      return;
    }
  }
  const tutarHam = $('#hesap-tutar').value.trim();
  const tutar = tutarHam ? sayiOku(tutarHam) : 0;
  if (!Number.isFinite(tutar)) { $('#hesap-tutar').focus(); return; }
  if (!h) {
    const tur = hesapIcerik.querySelector('[name=hesap-tur]:checked')?.value ?? 'banka';
    const yeni = hesapEkle(durum, { ad: ad.trim() ? ad : '', tur, tutar, anadanDus: $('#hesap-anadan')?.checked });
    if (!yeni) { bildir('En çok 50 hesap tutulabilir.'); return; }
    degisti();
    bildir(`«${yeni.ad}» eklendi`);
  } else if (hesapDuzelt(durum, h.id, { ad, tutar: tutarHam ? tutar : undefined })) {
    degisti();
    bildir('Hesap güncellendi');
  }
  hesapGorunum = 'liste';
  hesapCiz();
  $('#hesap-baslik').focus();
});

$('#hesap-geri').addEventListener('click', () => { hesapGorunum = 'liste'; hesapCiz(); $('#hesap-baslik').focus(); });
hareket.surukleKapat(hesapSayfa);

// ---------------------------------------------------------------- ekran görüntüsünden ekleme

const aiSayfa = $('#ai-sayfasi');
let aiSonuc = [];

// Onay penceresi yok (kullanıcı isteği, 2026-11-01): görüntünün nereye gittiği Ayarlar > Gizlilik ve KVKK metninde yazar.
$('#foto-dugme').addEventListener('click', () => $('#foto-giris').click());

$('#foto-giris').addEventListener('change', (e) => {
  const dosya = e.target.files?.[0];
  e.target.value = '';
  if (!dosya) return;
  sayfa.close();
  aiAc(dosya);
});

async function aiAc(dosya) {
  $('#ai-icerik').innerHTML = `<div class="ai-bekle"><div class="ai-cubuklar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <b>Ekran görüntüsü okunuyor</b>Hareketler ve tutarlar ayıklanıyor; birkaç saniye sürer.</div>`;
  $('#ai-dugmeler').hidden = true;
  aiSayfa.showModal();
  try {
    aiSonuc = (await yz.fotoOku(durum, dosya, canliKategoriler(durum), bugun())).islemler;
    aiListe();
  } catch (e) {
    $('#ai-icerik').innerHTML = `<div class="ai-bekle"><b>Okunamadı</b>${kacis(yz.hataMetni(e.kod))}</div>`;
  }
}

function aiListe() {
  if (!aiSonuc.length) {
    $('#ai-icerik').innerHTML = '<div class="ai-bekle"><b>Hareket bulunamadı</b>Bu görüntüde tutarı okunan bir para hareketi göremedim. Hesap hareketleri ya da fiş ekranını dene.</div>';
    return;
  }
  const kats = canliKategoriler(durum);
  const mevcut = canliKayitlar(durum);
  const gunAdi = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
  const sayi = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const satirlar = aiSonuc.map((i, n) => {
    const kopya = mevcut.some((k) => k.tarih === i.tarih && Math.abs(k.tutar - i.tutar) < 0.01);
    const not = kopya ? ' · <b>Bu tutar o gün zaten kayıtlı</b>' : !i.emin ? ' · <b>Kontrol et</b>' : '';
    return `<div class="ai-satir ${i.yon}" data-i="${n}">
      <input type="checkbox" ${i.emin && !kopya ? 'checked' : ''} aria-label="${kacis(i.aciklama)} eklensin">
      <span class="ad">${kacis(i.aciklama)}</span>
      <label class="para-giris"><span class="gorunmez">Tutar</span><input inputmode="decimal" value="${sayi.format(i.tutar)}"><span>₺</span></label>
      <select aria-label="Kategori">${kats.filter((k) => k.tur === i.yon).map((k) => `<option value="${kacis(k.id)}" ${k.id === i.kategori ? 'selected' : ''}>${kacis(k.ad)}</option>`).join('')}</select>
      <small>${gunAdi.format(new Date(`${i.tarih}T12:00`))} · ${i.yon === 'gelir' ? 'gelir' : 'gider'}${not}</small>
    </div>`;
  }).join('');
  $('#ai-icerik').innerHTML = `<p class="ai-aciklama">${aiSonuc.length} hareket buldum. Tutarları ekrandakiyle karşılaştır; eklemek istemediklerinin işaretini kaldır.</p><div class="ai-liste">${satirlar}</div>`;
  $('#ai-dugmeler').hidden = false;
  aiSayac();
}

function aiSayac() {
  const n = document.querySelectorAll('#ai-icerik .ai-satir input[type="checkbox"]:checked').length;
  $('#ai-ekle').textContent = n ? `${n} kaydı ekle` : 'Seçili kayıt yok';
  $('#ai-ekle').disabled = !n;
}

$('#ai-icerik').addEventListener('change', aiSayac);
aiSayfa.addEventListener('click', (e) => {
  if (e.target === aiSayfa || e.target.closest('[data-kapat]')) aiSayfa.close();
});

$('#ai-formu').addEventListener('submit', (e) => {
  e.preventDefault();
  const simdi = Date.now();
  const yeniler = [];
  document.querySelectorAll('#ai-icerik .ai-satir').forEach((s) => {
    if (!s.querySelector('input[type="checkbox"]').checked) return;
    const i = aiSonuc[Number(s.dataset.i)];
    const tutar = sayiOku(s.querySelector('.para-giris input').value);
    if (!(tutar > 0)) return;
    yeniler.push({ id: yeniId(), tarih: i.tarih, kat: s.querySelector('select').value, tutar: Math.round(tutar * 100) / 100, not: i.aciklama, guncel: simdi, kaynak: 'foto', ...(hesapSecimiGerekli(durum) ? { hesap: varsayilanHesap(durum) } : {}) });
  });
  if (!yeniler.length) return;
  durum.kayitlar.push(...yeniler);
  secAy = yeniler.map((k) => k.tarih).sort().at(-1).slice(0, 7);
  aiSayfa.close();
  degisti();
  bildir(`${yeniler.length} kayıt eklendi`, () => { const t = Date.now(); yeniler.forEach((k) => Object.assign(k, { silindi: true, guncel: t })); });
});

// ---------------------------------------------------------------- bildirim (geri al)

let bildirimZamani;
function bildir(metin, geriAl) {
  const b = $('#bildirim');
  b.querySelector('span').textContent = metin;
  const dugme = b.querySelector('button');
  dugme.hidden = !geriAl;
  dugme.onclick = () => { geriAl(); b.hidden = true; degisti(); };
  b.hidden = false;
  clearTimeout(bildirimZamani);
  bildirimZamani = setTimeout(() => { b.hidden = true; }, 5000);
}

// ---------------------------------------------------------------- başlat

esitle.baslat(durum, { degisti, ciz, bildir });
ciz();
// Uygulama arka planda açık kalıp gün değiştiyse yeni günün plan kayıtlarını üret ve yeniden çiz.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const g = bugun();
  if (g === sonGun) return;
  sonGun = g;
  if (planlariUret(durum, g) > 0) kaydet(durum);
  ciz();
});
// Paylaşılan katılma bağlantısıyla gelen, doğrudan hane bölümünü görsün.
if (esitle.bekleyenKodVar()) $('#hane-kutu')?.scrollIntoView({ block: 'center' });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
