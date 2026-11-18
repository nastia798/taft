// Ретро-телевизор: каналы = туториалы. Помехи на canvas при переключении.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initTV(tv, items) {
  if (!tv || !items?.length) return;
  const img = tv.querySelector('[data-tv-img]');
  const ch = tv.querySelector('[data-tv-ch]');
  const title = tv.querySelector('[data-tv-title]');
  const soon = tv.querySelector('[data-tv-soon]');
  const noise = tv.querySelector('[data-tv-noise]');
  const knob = tv.querySelector('.tv__knob span');
  const ctx = noise.getContext('2d');
  let i = 0;
  let raf = 0;

  const fuzz = (ms) => {
    if (reduced()) return;
    noise.width = 120; noise.height = 160;
    const end = performance.now() + ms;
    noise.classList.add('is-on');
    const frame = () => {
      const d = ctx.createImageData(120, 160);
      for (let k = 0; k < d.data.length; k += 4) { const v = Math.random() * 255; d.data[k] = v; d.data[k + 1] = v * 0.9; d.data[k + 2] = v * 0.95; d.data[k + 3] = 255; }
      ctx.putImageData(d, 0, 0);
      if (performance.now() < end) raf = requestAnimationFrame(frame); else noise.classList.remove('is-on');
    };
    cancelAnimationFrame(raf);
    frame();
  };

  const tune = (n) => {
    i = (n + items.length) % items.length;
    const t = items[i];
    fuzz(380);
    knob.style.transform = `rotate(${i * (360 / items.length)}deg)`;
    setTimeout(() => {
      img.src = BASE + t.poster;
      ch.textContent = `канал ${t.channel}`;
      title.textContent = t.title;
      soon.textContent = t.video ? '' : 'видео скоро ✦';
    }, reduced() ? 0 : 220);
    document.querySelectorAll('[data-tutorial]').forEach((el) => el.classList.toggle('is-on', el.dataset.tutorial === t.id));
    document.dispatchEvent(new CustomEvent('taft:find', { detail: 'tv' }));
  };

  tv.querySelector('[data-tv-next]').addEventListener('click', () => tune(i + 1));
  tv.querySelector('[data-tv-next2]')?.addEventListener('click', () => tune(i + 1));
  tv.querySelector('[data-tv-prev]')?.addEventListener('click', () => tune(i - 1));
  tv.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); tune(i + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); tune(i - 1); }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tune]');
    if (!b) return;
    tune(+b.dataset.tune);
    tv.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
  });
}
