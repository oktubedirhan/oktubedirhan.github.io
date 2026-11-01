// Yapay zekâ: ekran görüntüsünden kayıt okuma, aylık harcama yorumu, günlük gözlem ve koça soru.
// Gemini anahtarı uygulamada değil; istekler Supabase'teki "ai" fonksiyonundan geçer (supabase/functions/ai).
const UC = 'https://gitosjdfxpzxickgbndr.supabase.co/functions/v1/ai';
const ANAHTAR = 'sb_publishable_dzwuBVBle8Px9s3rt0pCMA_z0B7j5-h';

export const hataMetni = (kod) => ({
  kota: 'Bugünkü yapay zekâ hakkın doldu; yarın yeniden deneyebilirsin.',
  yogun: 'Yapay zekâ şu an çok yoğun. Birkaç dakika sonra yeniden dene.',
  gorsel: 'Bu dosya okunamadı. Ekran görüntüsünü PNG ya da JPG olarak seç.',
  yapilandirma: 'Yapay zekâ henüz kurulmadı.',
  ag: 'Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.',
}[kod] ?? 'Bir şeyler ters gitti, yeniden dene.');

async function istek(govde) {
  let yanit;
  try {
    yanit = await fetch(UC, { method: 'POST', headers: { apikey: ANAHTAR, 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
  } catch {
    throw Object.assign(new Error('ag'), { kod: 'ag' });
  }
  const veri = await yanit.json().catch(() => ({}));
  if (!yanit.ok) throw Object.assign(new Error(veri.hata ?? String(yanit.status)), { kod: veri.hata ?? 'ag' });
  return veri;
}

/** Fotoğrafı en uzun kenarı 1600 px olacak şekilde küçültüp JPEG base64'e çevirir; banka ekranı için yeterli, istek küçük kalır. */
async function gorselHazirla(dosya) {
  const resim = await createImageBitmap(dosya);
  const oran = Math.min(1, 1600 / Math.max(resim.width, resim.height));
  const tuval = Object.assign(document.createElement('canvas'), { width: Math.round(resim.width * oran), height: Math.round(resim.height * oran) });
  tuval.getContext('2d').drawImage(resim, 0, 0, tuval.width, tuval.height);
  const blob = await new Promise((r) => tuval.toBlob(r, 'image/jpeg', 0.88));
  const ikili = new Uint8Array(await blob.arrayBuffer());
  let metin = '';
  for (let i = 0; i < ikili.length; i += 0x8000) metin += String.fromCharCode(...ikili.subarray(i, i + 0x8000));
  return btoa(metin);
}

export async function fotoOku(durum, dosya, kategoriler, bugun) {
  const gorsel = await gorselHazirla(dosya);
  return istek({
    tur: 'oku',
    cihaz: durum.cihaz,
    mime: 'image/jpeg',
    gorsel,
    bugun,
    kategoriler: kategoriler.map((k) => ({ id: k.id, ad: k.ad, tur: k.tur })),
  });
}

export async function yorumIste(durum, ozet) {
  return istek({ tur: 'yorum', cihaz: durum.cihaz, ozet });
}

/** Bugünün gözlemi: sunucu { yorumlar: [ { gozlem, oneri } ] } döner (tam 1 yorum). */
export async function gunlukIste(durum, ozet) {
  return istek({ tur: 'gunluk', cihaz: durum.cihaz, ozet });
}

/** Koça sor: tek tur. Sunucu { cevap, kapsam_disi } döner. Geçmiş konuşma gönderilmez. */
export async function sorIste(durum, ozet, soru) {
  return istek({ tur: 'sor', cihaz: durum.cihaz, ozet, soru });
}

/** Koç geri bildirimi (yalnızca kullanıcı onay verdiyse çağrılır). En iyi çaba: hata sessizce yutulur, oy telefonda kalır. */
export async function geriBildirimGonder(govde) {
  try {
    const yanit = await fetch('https://gitosjdfxpzxickgbndr.supabase.co/rest/v1/rpc/koc_geri_bildirim_yaz', {
      method: 'POST',
      headers: { apikey: ANAHTAR, 'Content-Type': 'application/json' },
      body: JSON.stringify(govde),
    });
    return yanit.ok;
  } catch {
    return false;
  }
}
