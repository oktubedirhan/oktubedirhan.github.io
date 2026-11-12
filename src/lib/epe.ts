/* /epe sınıf sıralaması: Supabase "epe" projesine REST RPC çağrıları (supabase-js'siz).
   Anahtar herkese açık "publishable" anahtardır; tabloya doğrudan erişim yok, yalnızca mt_* fonksiyonları
   (bkz. supabase/epe.sql). */

export const EPE_URL = 'https://cecqyjxekwkdquzhtjya.supabase.co';
export const EPE_KEY = 'sb_publishable_bf4wejmm35XCB9dJ37hoMw_D7MohZa5';
export const epeHazir = () => Boolean(EPE_URL && EPE_KEY);

export interface SiraSatiri {
  sira: number;
  ad: string;
  ortalama: number;
}

export class EpeHata extends Error {
  constructor(public kod: string) {
    super(kod);
  }
}

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${EPE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: EPE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let kod = 'baglanti';
    try {
      const j = await res.json();
      const m = String(j.message ?? '');
      kod = ['isim_alinmis', 'kapasite_dolu', 'gecersiz_anahtar', 'gecersiz_notlar'].find((k) => m.includes(k)) ?? 'sunucu';
    } catch {}
    throw new EpeHata(kod);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const kaydet = (ad: string, token: string, grup: string, notlar: unknown[], ortalama: number) =>
  rpc<null>('mt_kaydet', { p_ad: ad, p_token: token, p_grup: grup, p_notlar: notlar, p_ortalama: ortalama });

export const siralama = (grup: string) =>
  rpc<SiraSatiri[]>('mt_siralama', { p_grup: grup }).then((r) =>
    (r ?? []).map((s) => ({ sira: Number(s.sira), ad: s.ad, ortalama: Number(s.ortalama) })),
  );

export const sil = (ad: string, token: string) => rpc<boolean>('mt_sil', { p_ad: ad, p_token: token });
