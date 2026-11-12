// /epe yapay zeka asistanı (Supabase "epe" projesi, edge function "epe-ai").
// Mistral anahtarı yalnızca burada, MISTRAL_API_KEY gizli değeri olarak durur; sayfaya hiç gitmez.
// Yapay zeka yalnızca not listesini çıkarır/günceller; ortalama ve eşik hesabı sayfadaki kodda yapılır.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const IZINLI = ['https://www.bedirhanoktu.dev', 'https://bedirhanoktu.dev', 'http://localhost:4321'];
const KISI_SINIR = 40; // kişi başı günlük çağrı
const TOPLAM_SINIR = 400; // herkes toplam günlük çağrı
const MODEL = 'mistral-small-latest';

const SISTEM = `Sen ODTÜ hazırlık (DBE) öğrencilerinin not asistanısın. Görevin yalnızca NOT LİSTESİNİ güncellemek; ortalama ya da eşik hesabı yapma, onu uygulama yapıyor.

Not kodları: iki harf + iki rakam.
- ATnn: devam (attendance), nota sayılmaz ama listede kalabilir
- QZnn: quiz (küçük sınav)
- WAnn: writing
- SAnn: speaking
- MTnn: ara sınav (midterm)
Notlar 0–100 arası.

Sana mevcut liste, varsa not ekranının görüntüsü ve öğrencinin mesajı gelir.
- Görüntü varsa: görüntüdeki kodları ve notları aynen oku. Görüntü not ekranının tamamıdır; görüntüdeki notlar listedeki aynı kodların yerine geçer. Kodu yanlış okuma: kod her zaman iki harf + iki rakamdır (WA01, QZ03); not, koddan sonra gelen ayrı sayıdır.
- Mesajda kesin bir not varsa ("speaking'den 80 aldım", "QZ04 75 geldi") tahmin=false ile ekle ya da değiştir.
- Varsayım ya da gelecek not varsa ("WA02'den 70 alırsam", "sonraki quizler 85 olsun") tahmin=true ile ekle. Numara verilmemişse o türün sıradaki boş numarasını kullan.
- Silme ya da düzeltme isterse uygula.
- Notla ilgisi olmayan bir şey sorarsa listeyi değiştirmeden kısaca söyle.

Yalnızca şu JSON'u döndür:
{"rows":[{"code":"QZ00","value":84,"tahmin":false}],"yanit":"Türkçe, en fazla iki cümle: neyi ekledin/değiştirdin."}
rows her zaman listenin TAMAMI olsun (değişmeyenler dahil).`;

type Row = { code: string; value: number; tahmin?: boolean };

function cors(origin: string | null) {
  const o = origin && IZINLI.includes(origin) ? origin : IZINLI[0];
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    Vary: 'Origin',
  };
}

function temizle(rows: unknown): Row[] {
  if (!Array.isArray(rows)) return [];
  const out = new Map<string, Row>();
  for (const r of rows.slice(0, 60)) {
    const code = String((r as Row)?.code ?? '').toUpperCase().trim();
    const value = Number((r as Row)?.value);
    if (!/^(AT|QZ|WA|SA|MT|MD)\d{2}$/.test(code) || !Number.isFinite(value) || value < 0 || value > 100) continue;
    out.set(code, { code, value: Math.round(value * 100) / 100, tahmin: Boolean((r as Row)?.tahmin) });
  }
  return [...out.values()].slice(0, 40);
}

async function ozet(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('epe:' + s));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const h = { ...cors(origin), 'Content-Type': 'application/json' };
  const cevap = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return cevap(405, { hata: 'yontem' });
  if (!origin || !IZINLI.includes(origin)) return cevap(403, { hata: 'kaynak' });

  const anahtar = Deno.env.get('MISTRAL_API_KEY');
  if (!anahtar) return cevap(503, { hata: 'anahtar_yok' });

  let body: { image?: string; message?: string; rows?: unknown };
  try {
    const text = await req.text();
    if (text.length > 4_500_000) return cevap(413, { hata: 'buyuk' });
    body = JSON.parse(text);
  } catch {
    return cevap(400, { hata: 'istek' });
  }
  const image = typeof body.image === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(body.image) ? body.image : null;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  const rows = temizle(body.rows);
  if (!image && !message) return cevap(400, { hata: 'bos' });

  // Günlük sınır (IP özeti; ham IP saklanmaz).
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'bilinmiyor';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: hak, error: kotaHata } = await db.rpc('ai_hak', {
    p_kisi: await ozet(ip),
    p_kisi_sinir: KISI_SINIR,
    p_toplam_sinir: TOPLAM_SINIR,
  });
  if (kotaHata) return cevap(500, { hata: 'kota_kontrol' });
  if (!hak) return cevap(429, { hata: 'sinir' });

  const kullanici: unknown[] = [
    { type: 'text', text: `Mevcut liste: ${JSON.stringify(rows)}\nÖğrencinin mesajı: ${message || '(yok, yalnızca görüntü)'}` },
  ];
  if (image) kullanici.push({ type: 'image_url', image_url: image });

  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${anahtar}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SISTEM },
          { role: 'user', content: kullanici },
        ],
      }),
    });
    if (!res.ok) {
      console.error('mistral', res.status, (await res.text()).slice(0, 300));
      return cevap(502, { hata: res.status === 429 ? 'mistral_sinir' : 'mistral' });
    }
    const j = await res.json();
    const icerik = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
    return cevap(200, {
      rows: temizle(icerik.rows),
      yanit: String(icerik.yanit ?? '').slice(0, 600),
    });
  } catch (e) {
    console.error('hata', String(e).slice(0, 300));
    return cevap(502, { hata: 'mistral' });
  }
});
