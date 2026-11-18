// Карточка товара: галерея с увеличением (лайтбокс), «Где купить», форма отзыва.
import '../../styles/pages/catalog.css';
import '../../styles/pages/product.css';
import { initBuy } from '../buy.js';
import { load, save } from '../storage.js';
import { goal } from '../analytics.js';

const BASE = import.meta.env.BASE_URL; // '/' или '/имя-репозитория/' на GitHub Pages
const withBase = (u) => (u && u.startsWith('/') ? BASE.replace(/\/$/, '') + u : u);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Галерея + лайтбокс ---------- */
function initGallery() {
  const g = document.querySelector('[data-gallery]');
  if (!g) return;
  const tpl = g.querySelector('[data-gallery-items]');
  const items = JSON.parse(tpl.content.textContent || tpl.textContent).map((i) => ({
    ...i,
    src: withBase(i.src),
    s: withBase(i.s),
    set: i.set.split(', ').map((part) => withBase(part)).join(', '),
  }));
  const mainBtn = g.querySelector('.gallery__main');
  const mainImg = g.querySelector('[data-main-img]');
  const thumbs = [...g.querySelectorAll('[data-thumb]')];
  let current = 0;

  const stage = g.querySelector('.gallery__stage');
  const show = (i) => {
    current = i;
    stage.classList.toggle('is-3d', i === 0 && stage.dataset.ready === '1');
    const it = items[i];
    mainImg.classList.add('is-swapping');
    setTimeout(() => {
      mainImg.src = it.s;
      mainImg.srcset = it.set;
      mainImg.width = it.w;
      mainImg.height = it.h;
      mainImg.alt = it.alt;
      mainImg.classList.toggle('is-photo', i > 0);
      mainImg.classList.remove('is-swapping');
    }, reduced() ? 0 : 160);
    mainBtn.dataset.zoom = String(i);
    mainBtn.setAttribute('aria-label', `Увеличить фото: ${it.cap}`);
    thumbs.forEach((t, k) => (k === i ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
  };
  thumbs.forEach((t) => t.addEventListener('click', () => show(+t.dataset.thumb)));

  // Лайтбокс
  const lb = document.querySelector('[data-lightbox]');
  if (!lb || typeof lb.showModal !== 'function') return;
  const lbImg = lb.querySelector('[data-lb-img]');
  const lbCap = lb.querySelector('[data-lb-cap]');
  const nav = lb.querySelectorAll('.lightbox__nav');
  let lbI = 0;
  const lbShow = (i) => {
    lbI = (i + items.length) % items.length;
    lbImg.src = items[lbI].src;
    lbImg.alt = items[lbI].alt;
    lbCap.textContent = `${items[lbI].cap}${items.length > 1 ? ` · ${lbI + 1} из ${items.length}` : ''}`;
  };
  nav.forEach((n) => (n.hidden = items.length < 2));
  mainBtn.addEventListener('click', () => { lbShow(current); lb.showModal(); });
  lb.querySelector('[data-lb-close]').addEventListener('click', () => lb.close());
  lb.querySelector('[data-lb-prev]').addEventListener('click', () => lbShow(lbI - 1));
  lb.querySelector('[data-lb-next]').addEventListener('click', () => lbShow(lbI + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') lbShow(lbI - 1);
    if (e.key === 'ArrowRight') lbShow(lbI + 1);
  });
  // свайп в лайтбоксе
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) lbShow(lbI + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

/* ---------- Отзыв: сохраняется только на этом устройстве (концепт без сервера) ---------- */
function initReview() {
  const form = document.querySelector('[data-review-form]');
  if (!form) return;
  const id = form.dataset.product;
  const box = document.querySelector('[data-my-review]');
  const msg = form.querySelector('[data-form-msg]');

  const render = () => {
    const r = load(`review:${id}`, null);
    if (!r) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '';
    const card = document.createElement('article');
    card.className = 'review card';
    const head = document.createElement('p');
    head.className = 'review__head';
    head.textContent = `${r.name} · ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}`;
    const body = document.createElement('p');
    body.textContent = r.text;
    const note = document.createElement('p');
    note.className = 'review__note';
    note.textContent = 'Твой отзыв на проверке. Пока его видишь только ты.';
    card.append(head, body, note);
    box.append(card);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const text = String(fd.get('text') || '').trim();
    const rating = parseInt(fd.get('rating'), 10);
    if (!name) { msg.textContent = 'Как тебя зовут?'; form.name.focus(); return; }
    if (!rating) { msg.textContent = 'Поставь оценку — от 1 до 5 звёзд.'; form.querySelector('[name="rating"]').focus(); return; }
    if (text.length < 10) { msg.textContent = 'Напиши хотя бы пару слов о средстве.'; form.text.focus(); return; }
    save(`review:${id}`, { name, text, rating, date: new Date().toISOString().slice(0, 10) });
    msg.textContent = 'Спасибо! Отзыв отправлен на проверку ✦';
    goal('review_submit', { product: document.body.dataset.productName || id });
    form.reset();
    render();
  });
  render();
}

/* ---------- Видео без автоплея при reduced motion ---------- */
function initVideo() {
  document.querySelectorAll('video[autoplay]').forEach((v) => {
    if (reduced()) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; }
  });
}

/* ---------- 3D-флакон для новой упаковки (только наклон и «прыжок», лицом к зрителю) ---------- */
async function init3D() {
  const slot = document.querySelector('[data-3d]');
  if (!slot) return;
  const { can3D, createBottle } = await import('../three/bottle3d.js');
  if (!can3D()) return;
  await createBottle(slot, { product: slot.dataset.product, fit: 'product' });
  const stage = slot.closest('.gallery__stage');
  stage.dataset.ready = '1';
  if (!document.querySelector('[data-thumb][aria-current="true"]') || document.querySelector('[data-thumb="0"][aria-current="true"]')) stage.classList.add('is-3d');
}

if (document.body.hasAttribute('data-new-pack')) goal('new_pack_view', { product: document.body.dataset.productName });
initGallery();
initReview();
const run3D = () => init3D().catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(run3D, { timeout: 1500 }); else setTimeout(run3D, 300);
initVideo();
initBuy();
