// Каталог и разделы: фильтр «Новая упаковка / Классика», поиск по названию, сортировка.
// Список товаров уже есть в HTML (для поисковиков) — скрипт только скрывает/переставляет карточки.
import '../../styles/pages/catalog.css';
import { initBuy } from '../buy.js';

const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').trim();
const plural = (n) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'средство';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'средства';
  return 'средств';
};

function initCatalog() {
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;
  const cards = [...grid.children];
  const tb = document.querySelector('[data-toolbar]');
  const search = tb.querySelector('[data-search]');
  const sort = tb.querySelector('[data-sort]');
  const lineBtns = [...tb.querySelectorAll('[data-line-filter]')];
  const count = tb.querySelector('[data-count]');
  const empty = document.querySelector('[data-empty]');

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    line: ['new', 'classic'].includes(params.get('line')) ? params.get('line') : 'all',
    sort: params.get('sort') || 'default',
  };
  search.value = state.q;
  if ([...sort.options].some((o) => o.value === state.sort)) sort.value = state.sort;

  const apply = (push = true) => {
    const q = norm(state.q);
    const words = q.split(/\s+/).filter(Boolean);
    let shown = 0;
    cards.forEach((c) => {
      const okLine = state.line === 'all' || c.dataset.line === state.line;
      const name = norm(c.dataset.name);
      const okQ = !words.length || words.every((w) => name.includes(w) || name.includes(w.replace(/ъ/g, 'ь')));
      const ok = okLine && okQ;
      c.hidden = !ok;
      if (ok) shown++;
    });

    const price = (c) => (c.dataset.price ? parseFloat(c.dataset.price) : null);
    const sorted = [...cards].sort((a, b) => {
      if (state.sort === 'name') return a.querySelector('.pcard__name').textContent.localeCompare(b.querySelector('.pcard__name').textContent, 'ru');
      if (state.sort === 'price-asc' || state.sort === 'price-desc') {
        const pa = price(a), pb = price(b);
        if (pa == null && pb == null) return a.dataset.order - b.dataset.order;
        if (pa == null) return 1; // без цены — в конец
        if (pb == null) return -1;
        return state.sort === 'price-asc' ? pa - pb : pb - pa;
      }
      return a.dataset.order - b.dataset.order;
    });
    sorted.forEach((c) => grid.append(c));

    lineBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lineFilter === state.line)));
    count.textContent = shown ? `${shown} ${plural(shown)}` : '';
    empty.hidden = shown > 0;

    if (push) {
      const p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.line !== 'all') p.set('line', state.line);
      if (state.sort !== 'default') p.set('sort', state.sort);
      history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
    }
  };

  let t;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = search.value; apply(); }, 120); });
  search.closest('label').addEventListener('submit', (e) => e.preventDefault());
  sort.addEventListener('change', () => { state.sort = sort.value; apply(); });
  lineBtns.forEach((b) => b.addEventListener('click', () => { state.line = b.dataset.lineFilter; apply(); }));
  document.querySelector('[data-reset]')?.addEventListener('click', () => {
    Object.assign(state, { q: '', line: 'all', sort: 'default' });
    search.value = ''; sort.value = 'default';
    apply();
    search.focus();
  });

  apply(false);
}

initCatalog();
initBuy();
