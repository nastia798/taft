// Новая упаковка: витрина пяти продуктов с 3D-флаконом и вендинговый автомат.
import '../../styles/pages/catalog.css';
import '../../styles/pages/product.css';
import '../../styles/pages/newpack.css';
import { initBuy } from '../buy.js';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Вкладки + 3D ---------- */
async function initViewer() {
  const tabs = [...document.querySelectorAll('[data-np-tab]')];
  const box = document.querySelector('[data-np-bottle]');
  if (!tabs.length || !box) return;
  const img = box.querySelector('[data-np-fallback]');
  let bottle = null;

  const playActive = () => {
    document.querySelectorAll('[data-np-panel] video').forEach((v) => {
      const on = !v.closest('[data-np-panel]').hidden && !reduced();
      if (on) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    });
  };

  const select = (key, focus = false) => {
    tabs.forEach((t) => {
      const on = t.dataset.npTab === key;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    document.querySelectorAll('[data-np-panel]').forEach((p) => { p.hidden = p.dataset.npPanel !== key; });
    box.dataset.product = key;
    if (bottle) bottle.setProduct(key);
    else {
      img.src = `${BASE}/img/pack/cut/${key}.webp`;
      img.classList.remove('is-hop'); void img.offsetWidth; img.classList.add('is-hop');
    }
    playActive();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.npTab));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length].dataset.npTab, true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0].dataset.npTab, true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1].dataset.npTab, true); }
    });
  });
  img.addEventListener('click', () => { img.classList.remove('is-hop'); void img.offsetWidth; img.classList.add('is-hop'); });

  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) playActive(); else document.querySelectorAll('[data-np-panel] video').forEach((v) => v.pause()); }, { threshold: 0.2 });
  io.observe(document.querySelector('.np'));

  const { can3D, createBottle } = await import('../three/bottle3d.js');
  if (!can3D()) return;
  bottle = await createBottle(box, { product: box.dataset.product });
  box.classList.add('is-3d');
}

/* ---------- Вендинговый автомат ---------- */
function initVending() {
  const m = document.querySelector('[data-vend]');
  if (!m) return;
  const screen = m.querySelector('[data-vend-screen]');
  const tray = m.querySelector('[data-vend-tray]');
  let busy = false;
  m.querySelectorAll('[data-vend-key]').forEach((k) => k.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    const n = k.dataset.vendKey;
    const cell = m.querySelector(`[data-cell="${n}"]`);
    const src = cell.querySelector('img').src;
    screen.textContent = `ячейка ${n}…`;
    tray.querySelector('.vend-drop')?.remove();
    tray.querySelector('.vend-take')?.remove();
    cell.classList.add('is-spin');
    const drop = document.createElement('img');
    drop.className = 'vend-drop';
    drop.src = src;
    drop.alt = '';
    const done = () => {
      tray.append(drop);
      const take = document.createElement('a');
      take.className = 'btn btn--sm vend-take';
      take.href = BASE + k.dataset.href;
      take.textContent = `Открыть: ${k.dataset.name} →`;
      tray.append(take);
      screen.textContent = 'забирай ✦';
      cell.classList.remove('is-spin');
      busy = false;
      document.dispatchEvent(new CustomEvent('taft:find', { detail: 'vending' }));
    };
    if (reduced()) { done(); return; }
    setTimeout(done, 900);
  }));
}

initViewer().catch(() => {});
initVending();
initBuy();
