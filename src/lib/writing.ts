/* DBE 501 bağımsız yazma (paragraf) rubric'i: yapay zekanın ham değerlendirmesine
   rubric'in tavan ve kesinti kurallarını (GUIDELINES + paragraph what-if) kodla uygular.
   Kaynak: "RUBRIC FOR THE INDEPENDENT WRITING DBE 501". DOM'a bağımlı değil. */

export const KRITERLER = ['content', 'organization', 'grammar', 'vocabulary'] as const;
export type Kriter = (typeof KRITERLER)[number];
export const KRITER_AD: Record<Kriter, string> = {
  content: 'Content',
  organization: 'Organization',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
};

/** Modelin döndürdüğü (doğrulanmış) ham değerlendirme. */
export interface HamDegerlendirme {
  durum: 'normal' | 'konu_disi' | 'yetersiz' | 'bos';
  puanlar: Record<Kriter, number>; // 1–5, tavansız
  gerekce: Record<Kriter, string>;
  major_sayisi: number; // ana fikir (major) sayısı
  karsit_yon: boolean; // istenenin tersini tartışıyor (avantaj yerine dezavantaj vb.)
  topic_sentence: boolean;
  concluding_sentence: boolean;
  essay_formati: boolean; // giriş + tez cümlesi vb. ya da her bölüm girintili
  fazla_girinti: boolean; // paragrafta birden fazla girinti / paragraf bölünmüş
  gayri_resmi: boolean; // emoji, gonna, wanna, stuff… yazı boyunca
  outline_var: boolean;
  hatalar: { alinti: string; duzeltme: string; aciklama: string }[];
  oneriler: string[];
  ozet: string;
}

export interface Sonuc {
  toplam20: number;
  toplam100: number;
  puanlar: Record<Kriter, number>; // tavanlar uygulanmış
  tavanNotu: string | null;
  kesintiler: { neden: string; puan: number }[];
  uyarilar: string[];
  tekPuan: string | null; // konu dışı / yetersiz / boş: toplam 1
}

const sinirla = (n: number) => Math.min(5, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));

export function kelimeSay(metin: string): number {
  return (metin.match(/[A-Za-zÀ-ÿ0-9]+(?:['’-][A-Za-zÀ-ÿ0-9]+)*/g) ?? []).length;
}

export function puanla(h: HamDegerlendirme): Sonuc {
  const uyarilar: string[] = [];
  if (h.outline_var) uyarilar.push('Yazıda outline var; rubric "C&A" diyor, bu sayfa puan kesmiyor.');

  // Guideline 7–9: konu dışı, yetersiz yanıt, boş kâğıt → toplam 1 (midterm 1/20, WP 1/100).
  if (h.durum !== 'normal') {
    const neden = { konu_disi: 'Yazı konu dışı', yetersiz: 'Yanıt yetersiz (yalnızca birkaç cümle)', bos: 'Görev denenmemiş' }[h.durum];
    return {
      toplam20: 1,
      toplam100: 1,
      puanlar: { content: 1, organization: 1, grammar: 1, vocabulary: 1 },
      tavanNotu: null,
      kesintiler: [],
      uyarilar,
      tekPuan: `${neden}: rubric'e göre toplam 1 (1/20, WP'de 1/100).`,
    };
  }

  const p = Object.fromEntries(KRITERLER.map((k) => [k, sinirla(h.puanlar[k])])) as Record<Kriter, number>;
  let tavanNotu: string | null = null;

  // Guideline 6: istenenin tersi tartışılmışsa Content 1 (ardından Guideline 5).
  if (h.karsit_yon) {
    p.content = 1;
    tavanNotu = 'İstenenin tersi tartışılmış (ör. avantaj yerine dezavantaj): Content 1.';
  }
  // Guideline 2: tek major → Content en fazla 3, diğerleri de en fazla 3.
  if (h.major_sayisi === 1 && p.content > 1) {
    p.content = Math.min(p.content, 3);
    for (const k of ['organization', 'grammar', 'vocabulary'] as const) p[k] = Math.min(p[k], 3);
    tavanNotu = 'Tek ana fikir (major) var: Content ve diğer kriterler en fazla 3.';
  }
  // Guideline 5: Content 1 → diğerleri en fazla 2.
  if (p.content === 1) {
    for (const k of ['organization', 'grammar', 'vocabulary'] as const) p[k] = Math.min(p[k], 2);
    tavanNotu = (tavanNotu ? tavanNotu + ' ' : '') + 'Content 1 olduğu için diğer kriterler en fazla 2.';
  }

  // Paragraf what-if kesintileri ve Guideline 11 (resmi olmayan dil).
  const kesintiler: { neden: string; puan: number }[] = [];
  if (!h.topic_sentence) kesintiler.push({ neden: 'Topic sentence yok', puan: 1 });
  if (!h.concluding_sentence) kesintiler.push({ neden: 'Concluding sentence yok', puan: 1 });
  if (h.major_sayisi >= 3) kesintiler.push({ neden: 'İki yerine üç (ya da daha fazla) ana fikir', puan: 1 });
  if (h.essay_formati) kesintiler.push({ neden: 'Essay formatında (giriş + tez cümlesi vb.) ya da her bölüm girintili', puan: 1 });
  else if (h.fazla_girinti) kesintiler.push({ neden: 'Paragrafta birden fazla girinti', puan: 1 });
  if (h.gayri_resmi) kesintiler.push({ neden: 'Resmi olmayan ögeler (emoji, gonna, stuff vb.)', puan: 1 });

  const ham = KRITERLER.reduce((t, k) => t + p[k], 0);
  const toplam20 = Math.max(1, ham - kesintiler.reduce((t, k) => t + k.puan, 0));
  return { toplam20, toplam100: toplam20 * 5, puanlar: p, tavanNotu, kesintiler, uyarilar, tekPuan: null };
}
