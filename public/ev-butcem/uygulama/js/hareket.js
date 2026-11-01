// Hareket katmanı: fatura dünyasının "sayaç" dili. Rakamlar sayaç gibi akar, ekranlar kayarak değişir.
// Azaltılmış hareket açıksa her şey anında olur.
const azalt = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ekran yeniden çizilince sayaçlar eski değerden yeniye aksın diye son değerler burada tutulur.
const sonDeger = new Map();
const tamSayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const bicimle = (v, bicim) => (bicim === 'tam' ? tamSayi.format(Math.round(v)) : `${v < -0.5 ? '−' : ''}${tamSayi.format(Math.abs(Math.round(v)))} ₺`);

/** data-sayac="1234" data-anahtar="gelir" [data-bicim="tam"] taşıyan öğeleri sayaç gibi akıtır. */
export function sayaclar(kok) {
  for (const el of kok.querySelectorAll('[data-sayac]')) {
    const hedef = Number(el.dataset.sayac);
    const anahtar = el.dataset.anahtar;
    const bicim = el.dataset.bicim;
    const bas = sonDeger.has(anahtar) ? sonDeger.get(anahtar) : 0;
    sonDeger.set(anahtar, hedef);
    if (azalt() || bas === hedef) { el.textContent = bicimle(hedef, bicim); continue; }
    const t0 = performance.now();
    const sure = 650;
    const adim = (t) => {
      const p = Math.min(1, (t - t0) / sure);
      const e = 1 - Math.pow(2, -10 * p); // üstel yavaşlama
      el.textContent = bicimle(bas + (hedef - bas) * (p === 1 ? 1 : e), bicim);
      if (p < 1 && el.isConnected) requestAnimationFrame(adim);
    };
    el.textContent = bicimle(bas, bicim);
    requestAnimationFrame(adim);
  }
}

/** Denge halkası: önceki puandan yeniye dolar. */
export function halka(kok) {
  const daire = kok.querySelector('.halka-dolu');
  if (!daire) return;
  const cevre = Number(daire.dataset.cevre);
  const hedef = Number(daire.dataset.puan);
  const bas = sonDeger.get('halka') ?? 0;
  sonDeger.set('halka', hedef);
  daire.style.strokeDashoffset = cevre * (1 - bas / 100);
  if (azalt()) { daire.style.strokeDashoffset = cevre * (1 - hedef / 100); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => { daire.style.strokeDashoffset = cevre * (1 - hedef / 100); }));
  if (hedef > bas && bas > 0) daire.closest('.koc-ust')?.classList.add('parla');
}

/** Liste öğeleri sırayla belirir (ilk 8 öğe, 35 ms arayla). */
export function sirali(kok, secici) {
  if (azalt()) return;
  [...kok.querySelectorAll(secici)].slice(0, 8).forEach((el, i) => {
    el.style.setProperty('--sira', i);
    el.classList.add('belir');
  });
}

/** Ekran değişimini View Transitions ile kaydırır; yön: 'ileri' | 'geri' | 'yerinde'. */
export function gecis(degistir, yon = 'yerinde') {
  if (azalt() || !document.startViewTransition) { degistir(); return; }
  document.documentElement.dataset.yon = yon;
  document.startViewTransition(degistir);
}

export function titret(desen = 12) {
  if (!azalt()) navigator.vibrate?.(desen);
}

/**
 * Kayıt satırını sola kaydırınca sil. Satır .kaydir sarmalayıcısının içinde olmalı.
 * Kısa kaydırma geri döner; satır genişliğinin %35'ini geçerse silme çağrılır.
 */
export function kaydirarakSil(kok, sil) {
  let satir = null, x0 = 0, y0 = 0, dx = 0, yatay = null;
  kok.addEventListener('pointerdown', (e) => {
    satir = e.target.closest('.kaydir .kayit');
    if (!satir || e.pointerType === 'mouse' && e.button !== 0) { satir = null; return; }
    x0 = e.clientX; y0 = e.clientY; dx = 0; yatay = null;
  });
  kok.addEventListener('pointermove', (e) => {
    if (!satir) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (yatay === null && Math.hypot(mx, my) > 8) yatay = Math.abs(mx) > Math.abs(my);
    if (!yatay) return;
    dx = Math.min(0, mx);
    satir.style.transition = 'none';
    satir.style.transform = `translateX(${dx}px)`;
    satir.parentElement.classList.toggle('hazir', -dx > satir.offsetWidth * 0.35);
  });
  const bitir = () => {
    if (!satir) return;
    const s = satir;
    satir = null;
    s.style.transition = '';
    if (yatay) s.dataset.kaydirildi = '1'; // ardından gelen tıklama düzenleme açmasın
    if (yatay && -dx > s.offsetWidth * 0.35) {
      s.style.transform = 'translateX(-110%)';
      titret([10, 40, 10]);
      setTimeout(() => sil(s.dataset.kayit), 180);
    } else {
      s.style.transform = '';
      s.parentElement.classList.remove('hazir');
    }
  };
  kok.addEventListener('pointerup', bitir);
  kok.addEventListener('pointercancel', bitir);
}

/** Alttan açılan pencere: tutamaktan aşağı sürükleyince kapanır. */
export function surukleKapat(pencere) {
  const tutamak = pencere.querySelector('.tutamak');
  if (!tutamak) return;
  let y0 = null, dy = 0;
  tutamak.addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; tutamak.setPointerCapture(e.pointerId); pencere.style.transition = 'none'; });
  tutamak.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    pencere.style.transform = `translateY(${dy}px)`;
  });
  const bitir = () => {
    if (y0 === null) return;
    y0 = null;
    pencere.style.transition = '';
    pencere.style.transform = '';
    if (dy > 110) pencere.close();
  };
  tutamak.addEventListener('pointerup', bitir);
  tutamak.addEventListener('pointercancel', bitir);
}
