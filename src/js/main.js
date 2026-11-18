// Общий скрипт для всех страниц: меню, поиск, анимация заголовков и блоков,
// подписка. Тяжёлые анимации (GSAP: параллакс, флакон) подгружаются отдельно.
import '../styles/main.css';
import { splitHeadings } from './split.js';
import { goal, initTracking } from './analytics.js';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Бургер-меню ---------- */
function initDrawer() {
  const btn = document.querySelector('.burger');
  const drawer = document.getElementById('drawer');
  if (!btn || !drawer) return;

  const open = (state) => {
    btn.setAttribute('aria-expanded', String(state));
    btn.setAttribute('aria-label', state ? 'Закрыть меню' : 'Открыть меню');
    drawer.classList.toggle('is-open', state);
    drawer.inert = !state;
    document.body.classList.toggle('drawer-open', state);
    if (state) drawer.querySelector('a')?.focus({ preventScroll: true });
  };

  btn.addEventListener('click', () => open(btn.getAttribute('aria-expanded') !== 'true'));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) open(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) { open(false); btn.focus(); }
  });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (m) => { if (m.matches) open(false); });
}

/* ---------- Поиск ---------- */
function initSearch() {
  const dlg = document.querySelector('.search-dialog');
  if (!dlg) return;
  document.querySelectorAll('[data-search-open]').forEach((b) =>
    b.addEventListener('click', () => {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else window.location.href = dlg.querySelector('form').action;
      dlg.querySelector('input')?.focus();
    })
  );
  dlg.querySelector('[data-search-close]')?.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

/* ---------- Появление блоков и заголовков при прокрутке ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal, .split');
  if (!items.length) return;
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  items.forEach((el) => io.observe(el));
}

/* ---------- Подписка (данные никуда не отправляются — концепт) ---------- */
function initSubscribe() {
  document.querySelectorAll('[data-subscribe]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const msg = form.querySelector('[data-form-msg]');
      if (!input.checkValidity()) {
        msg.textContent = 'Кажется, в почте опечатка — проверь?';
        input.focus();
        return;
      }
      msg.textContent = 'Готово! Первое письмо уже собирается ✦';
      goal('subscribe');
      form.reset();
    });
  });
}

function init() {
  initDrawer();
  initSearch();
  if (!reducedMotion()) splitHeadings();
  initReveal();
  initSubscribe();
  initTracking();

  // Мыльные пузыри работают и при reduced motion (просто не плавают)
  if (document.querySelector('[data-bubbles]')) {
    import('./motion/bubbles.js').then((m) => m.initBubbles());
  }
  // Консультант, pop-up и находки — отдельным модулем, чтобы не тормозить первую отрисовку
  import('./widgets.js');
  // Параллакс, покачивание флакона, реакция на мышь — только если движение разрешено
  if (!reducedMotion()) {
    import('./motion/index.js').then((m) => m.initMotion());
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
