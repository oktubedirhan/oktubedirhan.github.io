/* /epe sayfasının saf mantığı: not listesini ayrıştırma ve İYS II hesabı.
   DOM'a, storage'a, tarayıcıya bağımlı bir şey yok. */

export interface GradeRow {
  code: string;
  value: number;
}

export type Group = '501' | '401';
export type ComponentKey = 'QZ' | 'WA' | 'SA';
export type Status = 'missing' | 'free' | 'target' | 'impossible' | 'settled';

export const THRESHOLD: Record<Group, number> = { '501': 74.5, '401': 79.5 };

export const COMPONENTS: Record<ComponentKey, { label: string; weight: number }> = {
  QZ: { label: 'Küçük sınavlar (quiz)', weight: 0.25 },
  WA: { label: 'Yazma değerlendirmesi', weight: 0.15 },
  SA: { label: 'Konuşma değerlendirmesi', weight: 0.1 },
};

export const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* OCR tolere eden ön düzeltmeler: O/I rakam komşuluysa 0/1'dir;
   VVA/W A → WA, Q2/0Z → QZ, 5A → SA. */
export function normalizeOcrText(text: string): string {
  return text
    .toUpperCase()
    .replace(/\|/g, '1')
    .replace(/O(?=[0-9])/g, '0')
    .replace(/(?<=[0-9])O/g, '0')
    .replace(/I(?=[0-9])/g, '1')
    .replace(/(?<=[0-9])I/g, '1')
    .replace(/VVA/g, 'WA')
    .replace(/W\s+A(?=[0-9])/g, 'WA')
    .replace(/Q2(?=[0-9])/g, 'QZ')
    .replace(/0Z(?=[0-9])/g, 'QZ')
    .replace(/(^|[^A-Z0-9])5A(?=[0-9])/g, '$1SA');
}

const CODE_RE = /(AT|QZ|WA|SA|MT|MD)$/;
const isNum = (t: string | undefined) => t != null && /^\d/.test(t);
const toVal = (t: string) => Number.parseFloat(t.replace(',', '.'));

/* "AT01 12 QZ00 84,5 …" biçimindeki metni satırlara çevirir.
   Kodlar hep harf + 2 hanedir (QZ00, WA01). Metin harf ve sayı parçalarına bölünür;
   OCR'ın araya soktuğu fazladan rakam ("WA001 60", "WAO01 60") ya da yapıştırdığı not
   ("QZ0084", "SA01100") bu kurala göre ayrılır.
   Aynı kod iki kez gelirse sonuncusu kalır; 0–100 dışı notlar atılır. */
export function parseGrades(text: string): GradeRow[] {
  const rows = new Map<string, number>();
  const tokens = normalizeOcrText(text).match(/[A-Z]+|\d+(?:[.,]\d+)?/g) ?? [];
  for (let i = 0; i < tokens.length; i++) {
    const kind = CODE_RE.exec(tokens[i])?.[1];
    const digits = tokens[i + 1];
    if (!kind || !isNum(digits) || /[.,]/.test(digits)) continue;
    const next = tokens[i + 2];
    let num: string;
    let value: number;
    if (isNum(next) && digits.length <= 3) {
      // "WA01 60" ya da fazladan rakamlı "WA001 60": son iki hane kod numarası.
      num = digits.slice(-2);
      value = toVal(next);
      i += 2;
    } else if (digits.length >= 3) {
      // Not koda yapışmış: "QZ0084", "SA01100". 100'ü aşıyorsa OCR başa fazladan
      // rakam sokmuştur ("ATO0112" = AT01 12): ilk haneyi at.
      num = digits.slice(0, 2);
      value = toVal(digits.slice(2));
      if (value > 100 && digits.length >= 5) {
        num = digits.slice(1, 3);
        value = toVal(digits.slice(3));
      }
      i += 1;
    } else {
      continue;
    }
    if (!Number.isFinite(value) || value < 0 || value > 100) continue;
    rows.set(kind + num.padStart(2, '0'), value);
  }
  return [...rows].map(([code, value]) => ({ code, value }));
}

export interface Average {
  avg: number;
  count: number;
  estimated: boolean;
  contribution: number;
}

export interface ComputeOutput {
  group: Group;
  threshold: number;
  quiz: Average | null;
  writing: Average | null;
  speaking: Average | null;
  missing: ComponentKey[];
  /** Quiz + yazma + konuşma katkısı (üçü de belli değilse null). */
  r: number | null;
  /** Gereken ara sınav ortalaması (M). */
  m: number | null;
  midtermCount: number;
  midtermTaken: number;
  midtermTotal: number;
  midtermAvg: number | null;
  remainingCount: number;
  /** kalan sınavlarda gereken ortalama (0 < k < n iken). */
  remainingNeeded: number | null;
  status: Status;
  /** Ara sınavlardan 100 alınırsa ulaşılacak güz ortalaması (M > 100 durumunda). */
  averageIf100: number | null;
  /** Tüm ara sınavlar bitmişse şu anki güz ortalaması ve sonucu. */
  settledFall: number | null;
  settledPass: boolean | null;
}

const midOf = (rows: GradeRow[]) => rows.filter((r) => /^(MT|MD)/.test(r.code)).map((r) => r.value);

export function compute(
  rows: GradeRow[],
  group: Group,
  midtermCount: number,
  estimates: { QZ?: number | null; WA?: number | null; SA?: number | null } = {},
): ComputeOutput {
  const threshold = THRESHOLD[group];
  const avgOf = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;
  const mk = (vals: number[], est: number | null | undefined, weight: number): Average | null => {
    if (vals.length) {
      const avg = avgOf(vals);
      return { avg, count: vals.length, estimated: false, contribution: weight * avg };
    }
    if (est != null && Number.isFinite(est)) {
      return { avg: est, count: 0, estimated: true, contribution: weight * est };
    }
    return null;
  };

  const quiz = mk(
    rows.filter((r) => r.code.startsWith('QZ')).map((r) => r.value),
    estimates.QZ,
    COMPONENTS.QZ.weight,
  );
  const writing = mk(
    rows.filter((r) => r.code.startsWith('WA')).map((r) => r.value),
    estimates.WA,
    COMPONENTS.WA.weight,
  );
  const speaking = mk(
    rows.filter((r) => r.code.startsWith('SA')).map((r) => r.value),
    estimates.SA,
    COMPONENTS.SA.weight,
  );

  const missing: ComponentKey[] = [];
  if (!quiz) missing.push('QZ');
  if (!writing) missing.push('WA');
  if (!speaking) missing.push('SA');

  const mids = midOf(rows);
  const midtermTaken = mids.length;
  const midtermTotal = mids.reduce((a, b) => a + b, 0);
  const midtermAvg = midtermTaken ? midtermTotal / midtermTaken : null;

  const out: ComputeOutput = {
    group,
    threshold,
    quiz,
    writing,
    speaking,
    missing,
    r: null,
    m: null,
    midtermCount,
    midtermTaken,
    midtermTotal,
    midtermAvg,
    remainingCount: Math.max(0, midtermCount - midtermTaken),
    remainingNeeded: null,
    status: 'missing',
    averageIf100: null,
    settledFall: null,
    settledPass: null,
  };

  if (missing.length) return out;

  const r = quiz.contribution + writing.contribution + speaking.contribution;
  const m = (threshold - r) / 0.5;
  out.r = r;
  out.m = m;
  out.averageIf100 = r + 50;

  if (midtermTaken > 0 && midtermTaken >= midtermCount) {
    const fall = r + 0.5 * (midtermTotal / midtermTaken);
    out.status = 'settled';
    out.settledFall = fall;
    out.settledPass = fall >= threshold;
    return out;
  }

  // Bir kısmı alındıysa karar kalan sınavlarda gereken ortalamaya göre verilir.
  let need = m;
  if (midtermTaken > 0) {
    const left = midtermCount - midtermTaken;
    need = (midtermCount * m - midtermTotal) / left;
    out.remainingNeeded = need;
    out.averageIf100 = r + 0.5 * ((midtermTotal + 100 * left) / midtermCount);
  }

  if (need <= 0) out.status = 'free';
  else if (need > 100) out.status = 'impossible';
  else out.status = 'target';

  return out;
}

export interface Scenario {
  midterm: number;
  fall: number;
  pass: boolean;
}

/* Ara sınav ortalaması 50/60/…/100 olursa güz ortalaması ne olur? */
export function scenarios(r: number, group: Group): Scenario[] {
  return [50, 60, 70, 80, 90, 100].map((midterm) => {
    const fall = r + 0.5 * midterm;
    return { midterm, fall, pass: fall >= THRESHOLD[group] };
  });
}

/* Sıralama ortalaması: yalnızca gerçek notlar (tahmin yok). Olan bileşenlerin ağırlıklı ortalaması,
   100 üzerinden: ara sınav %50, quiz %25, writing %15, speaking %10; eksik bileşenin ağırlığı paydadan düşer.
   Böylece ara sınava girmiş ve girmemiş öğrenciler aynı ölçekte kıyaslanır. */
export function rankAverage(rows: GradeRow[]): number | null {
  const parts: [RegExp, number][] = [
    [/^(MT|MD)/, 0.5],
    [/^QZ/, 0.25],
    [/^WA/, 0.15],
    [/^SA/, 0.1],
  ];
  let sum = 0;
  let w = 0;
  for (const [re, weight] of parts) {
    const vals = rows.filter((r) => re.test(r.code) && Number.isFinite(r.value)).map((r) => r.value);
    if (!vals.length) continue;
    sum += weight * (vals.reduce((a, b) => a + b, 0) / vals.length);
    w += weight;
  }
  return w ? sum / w : null;
}
