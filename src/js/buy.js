// Кнопка «Где купить»: открывает выбор магазина/маркетплейса.
// Атрибуты кнопки: data-buy, data-buy-name, data-buy-q (поисковый запрос), data-buy-exact (JSON точных ссылок).
// Без JS кнопка — обычная ссылка на страницу «Где купить».
import site from '../data/site.json';
import { goal, withUtm } from './analytics.js';

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

export function initBuy(root = document) {
  const dlg = document.querySelector('[data-buy-dialog]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const list = dlg.querySelector('[data-buy-list]');
  const title = dlg.querySelector('[data-buy-title]');
  let lastBtn = null;

  const open = (btn) => {
    lastBtn = btn;
    const q = btn.dataset.buyQ || 'тафт';
    let exact = {};
    try { exact = btn.dataset.buyExact ? JSON.parse(btn.dataset.buyExact) : {}; } catch { exact = {}; }
    const name = btn.dataset.buyName || 'Выбери магазин';
    const code = btn.dataset.buyId || 'all';
    title.textContent = name;
    goal('where_to_buy', { product: name });
    list.innerHTML = site.shops.map((s) => {
      const href = withUtm(exact[s.id] || s.url.replace('{q}', encodeURIComponent(q)), code);
      return `<li><a class="buy-item buy-item--${s.id}" data-shop="${s.id}" data-product="${name.replace(/"/g, '&quot;')}" href="${href}" target="_blank" rel="noopener">
        <span class="buy-item__name">${s.label}</span><span class="buy-item__kind">${exact[s.id] ? 'карточка товара' : s.kind}</span>${ICON}
        <span class="visually-hidden">(откроется в новой вкладке)</span></a></li>`;
    }).join('');
    dlg.showModal();
  };

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    e.preventDefault();
    open(btn);
  });
  dlg.querySelector('[data-buy-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => lastBtn?.focus());
}
