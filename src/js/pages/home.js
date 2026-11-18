// Главная: прелоадер, 3D-флакон, видео «пяти характеров», квиз-калькулятор.
import '../../styles/pages/home.css';
import '../../styles/pages/catalog.css';
import { initBuy } from '../buy.js';
import { initQuiz } from '../home/quiz.js';
import '../../styles/pages/content.css';
import { initTV } from '../tv.js';
import tutorials from '../../data/tutorials.json';
import { load, save } from '../storage.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

/* ================= Прелоадер ================= */
function runPreloader() {
  const pl = document.querySelector('[data-preloader]');
  if (!pl) return Promise.resolve();
  const finish = () => {
    pl.classList.add('is-done');
    document.body.classList.remove('pl-lock');
    root.classList.remove('pl-active');
    try { sessionStorage.setItem('taft:pl', '1'); } catch { /* приватный режим */ }
    setTimeout(() => pl.remove(), 1000);
  };
  if (root.classList.contains('pl-skip') || reduced()) { pl.remove(); return Promise.resolve(); }

  root.classList.add('pl-active');
  document.body.classList.add('pl-lock');
  const scale = [...pl.querySelectorAll('[data-pl-scale] li')];
  const phrase = pl.querySelector('[data-pl-phrase]');
  const can = pl.querySelector('.preloader__can');
  let step = 0;
  const fill = (n) => { while (step < n) scale[step++]?.classList.add('on'); };

  // облачко спрея: частицы на canvas
  const cv = pl.querySelector('[data-pl-canvas]');
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  size();
  const parts = [];
  const nozzle = () => {
    const r = can.getBoundingClientRect();
    return { x: (r.left + r.width * 0.72) * dpr, y: (r.top + 8) * dpr };
  };
  const psh = (n) => {
    can.classList.remove('is-psh'); void can.offsetWidth; can.classList.add('is-psh');
    const o = nozzle();
    for (let i = 0; i < n; i++) {
      const a = -0.55 + (Math.random() - 0.5) * 0.9;
      const sp = (2 + Math.random() * 6) * dpr;
      parts.push({ x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (4 + Math.random() * 10) * dpr, life: 1, grow: 1.02 + Math.random() * 0.03 });
    }
  };
  let raf = 0;
  const tick = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.955; p.vy = p.vy * 0.955 - 0.03 * dpr;
      p.r *= p.grow; p.life -= 0.009;
      if (p.life <= 0) continue;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(255,255,255,${0.55 * p.life})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    raf = requestAnimationFrame(tick);
  };
  tick();
  setTimeout(() => psh(60), 350);
  setTimeout(() => psh(45), 700);
  setTimeout(() => pl.classList.add('is-logo'), 950);
  setTimeout(() => {
    phrase.classList.add('is-swap');
    setTimeout(() => { phrase.textContent = '…и у нас есть кое-что новое'; phrase.classList.remove('is-swap'); }, 350);
  }, 1100);

  // реальный прогресс загрузки → деления шкалы 1…5
  const start = performance.now();
  const heroImg = document.querySelector('[data-bottle-fallback]');
  const waits = [
    Promise.resolve().then(() => fill(1)),
    (document.fonts?.ready || Promise.resolve()).then(() => fill(2)),
    (heroImg && !heroImg.complete ? new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); }) : Promise.resolve()).then(() => fill(3)),
    (document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }))).then(() => fill(4)),
  ];
  const minTime = new Promise((r) => setTimeout(r, 1200));
  const maxTime = new Promise((r) => setTimeout(r, 4000));
  return Promise.race([Promise.all([...waits, minTime]), maxTime]).then(() => {
    fill(5);
    return new Promise((r) => setTimeout(() => {
      const left = Math.max(0, 1300 - (performance.now() - start));
      setTimeout(() => { cancelAnimationFrame(raf); finish(); r(); }, left);
    }, 250));
  });
}

/* ================= 3D-флакон первого экрана ================= */
const NAMES = {
  'glow-call': ['Мусс-уход', 'Glow Call'],
  bordeaux: ['Лак-уход', 'Bordeaux'],
  'chrome-y2k': ['Текстурайзер', 'Chrome Y2K'],
  'lime-accent': ['Флюид 10в1', 'Lime Accent'],
  gradient: ['Сухой шампунь', 'Gradient'],
};
async function initHeroBottle() {
  const box = document.querySelector('[data-hero-bottle]');
  if (!box) return;
  const dots = [...document.querySelectorAll('[data-set-product]')];
  const nameEl = document.querySelector('[data-product-name]');
  const img = box.querySelector('[data-bottle-fallback]');
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
  let bottle = null;

  const select = (key) => {
    const dot = dots.find((d) => d.dataset.setProduct === key);
    dots.forEach((d) => d.setAttribute('aria-pressed', String(d === dot)));
    box.dataset.product = key;
    const [prod, design] = NAMES[key];
    if (nameEl) nameEl.textContent = `${prod} · ${design}`;
    img.alt = `${prod} Тафт в новом дизайне ${design}`;
    if (bottle) bottle.setProduct(key);
    else {
      // без 3D: меняем картинку, высота — как у продукта в общем ряду, и «прыжок»
      img.src = `${BASE}/img/pack/cut/${key}.webp`;
      img.style.setProperty('--h', dot.dataset.h);
      img.classList.remove('is-hop'); void img.offsetWidth; img.classList.add('is-hop');
    }
  };
  dots.forEach((d) => d.addEventListener('click', () => select(d.dataset.setProduct)));
  img.addEventListener('click', () => { img.classList.remove('is-hop'); void img.offsetWidth; img.classList.add('is-hop'); });

  const { can3D, createBottle } = await import('../three/bottle3d.js');
  if (!can3D()) return;
  bottle = await createBottle(box, { product: box.dataset.product || 'glow-call' });
  box.classList.add('is-3d');
}

/* ================= Видео «пяти характеров» ================= */
function initCharVideos() {
  const vids = document.querySelectorAll('[data-chars] video');
  if (!vids.length || reduced() || navigator.connection?.saveData) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { threshold: 0.4 });
  vids.forEach((v) => io.observe(v));
}

/* ================= До / после: кинохлопушка ================= */
function initBeforeAfter() {
  const frame = document.querySelector('[data-ba-frame]');
  if (!frame) return;
  const tabs = [...document.querySelectorAll('[data-ba-tab]')];
  const label = frame.querySelector('[data-ba-label]');
  const clap = document.querySelector('[data-clapper]');
  const take = clap.querySelector('[data-take]');
  const types = ['прямые', 'вьющиеся', 'тонкие', 'густые'];
  let type = 0;
  let after = false;
  let n = 1;
  const draw = () => {
    frame.dataset.state = after ? 'after' : 'before';
    label.innerHTML = `${after ? 'после' : 'до'} · ${types[type]} волосы<br>здесь будет фото`;
    clap.setAttribute('aria-label', `Щёлк! Показать «${after ? 'до' : 'после'}»`);
  };
  tabs.forEach((t) => t.addEventListener('click', () => {
    type = +t.dataset.baTab; after = false;
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    draw();
  }));
  clap.addEventListener('click', () => {
    clap.classList.remove('is-clap'); void clap.offsetWidth; clap.classList.add('is-clap');
    setTimeout(() => { after = !after; take.textContent = String(++n); draw(); }, reduced() ? 0 : 180);
    document.dispatchEvent(new CustomEvent('taft:find', { detail: 'clapper' }));
  });
}

/* ================= Голосование «Какая банка следующая?» ================= */
function initVote() {
  const box = document.querySelector('[data-vote]');
  if (!box) return;
  const opts = [...box.querySelectorAll('[data-vote-opt]')];
  const note = box.querySelector('[data-vote-note]');
  const render = () => {
    const v = load('vote', { choice: null, counts: {} });
    const total = Object.values(v.counts).reduce((a, b) => a + b, 0);
    opts.forEach((o) => {
      const k = o.dataset.voteOpt;
      const pct = total ? Math.round(((v.counts[k] || 0) / total) * 100) : 0;
      o.setAttribute('aria-pressed', String(v.choice === k));
      o.querySelector('.vote__bar i').style.width = `${pct}%`;
      o.querySelector('.vote__pct').textContent = total ? `${pct}%` : '—';
    });
    box.classList.toggle('is-voted', !!v.choice);
  };
  opts.forEach((o) => o.addEventListener('click', () => {
    const v = load('vote', { choice: null, counts: {} });
    if (v.choice) v.counts[v.choice] = Math.max(0, (v.counts[v.choice] || 1) - 1);   // голос можно поменять
    v.choice = o.dataset.voteOpt;
    v.counts[v.choice] = (v.counts[v.choice] || 0) + 1;
    save('vote', v);
    note.textContent = 'Голос засчитан ✦ Проценты считаются по голосам с этого устройства.';
    render();
  }));
  render();
}

/* ================= Мини-карта (Leaflet грузится, когда блок рядом) ================= */
function initMiniMap() {
  const el = document.querySelector('[data-minimap]');
  if (!el) return;
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    await import('../../styles/pages/where.css');
    const { createStoreMap } = await import('../map/storemap.js');
    createStoreMap(el, { compact: true });
  }, { rootMargin: '400px 0px' });
  io.observe(el);
}

/* ================= Телефон «Тафт на связи» ================= */
function initPhone() {
  const dial = document.querySelector('[data-dial]');
  if (!dial) return;
  const holes = dial.querySelector('.phone__holes');
  const text = dial.querySelector('[data-dial-text]');
  const small = dial.querySelector('[data-dial-small]');
  let busy = false;
  dial.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-hole]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (busy) return;
    busy = true;
    const i = +a.parentElement.style.getPropertyValue('--a');
    // диск проворачивается по часовой до упора (упор — внизу справа)
    const deg = (((135 - (189 + i * 36)) % 360) + 360) % 360;   // от отверстия до упора по часовой
    text.innerHTML = 'дозваниваемся…';
    small.textContent = a.dataset.hole;
    document.dispatchEvent(new CustomEvent('taft:find', { detail: 'phone' }));
    if (reduced()) { location.href = a.href; return; }
    holes.style.transition = 'transform .9s cubic-bezier(.3,.7,.2,1)';
    holes.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
      holes.style.transition = 'transform .7s cubic-bezier(.5,0,.3,1)';
      holes.style.transform = 'rotate(0deg)';
      text.innerHTML = 'соединяем ✦';
    }, 950);
    setTimeout(() => { location.href = a.href; }, 1600);
  });
}

/* ================= Запуск ================= */
const ready = runPreloader();
// 3D грузим после первого экрана: когда прелоадер ушёл и браузер свободен
ready.then(() => {
  const go = () => initHeroBottle().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 300);
});
initCharVideos();
initQuiz();
initBeforeAfter();
initVote();
initMiniMap();
initPhone();
initTV(document.querySelector('[data-tv]'), tutorials.items);
initBuy();
