// Где купить: карта магазинов, фильтр по сетям, список, доставка и маркетплейсы.
import '../../styles/pages/catalog.css';
import '../../styles/pages/where.css';
import site from '../../data/site.json';
import { withUtm } from '../analytics.js';
import { createStoreMap, chains, stores, hoursText, routeUrl } from '../map/storemap.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const km = (a, b) => {
  const R = 6371, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

function initWhere() {
  const mapEl = document.querySelector('[data-map]');
  if (!mapEl) return;
  const list = document.querySelector('[data-store-list]');
  const count = document.querySelector('[data-store-count]');
  const filterBox = document.querySelector('[data-chain-filter]');
  let on = Object.keys(chains);
  let me = null;

  const map = createStoreMap(mapEl, { onSelect: (id) => select(id, false) });

  filterBox.innerHTML = Object.values(chains).map((c) =>
    `<button type="button" class="chip chain-chip" data-chain="${c.id}" aria-pressed="true" style="--c:${c.color}"><span class="chain-dot" aria-hidden="true"></span>${esc(c.name)} <small>${stores.filter((s) => s.chain === c.id).length}</small></button>`).join('');

  const render = () => {
    let vis = stores.filter((s) => on.includes(s.chain));
    if (me) vis = vis.map((s) => ({ ...s, d: km(me, s) })).sort((a, b) => a.d - b.d);
    count.textContent = `${vis.length} ${vis.length % 10 === 1 && vis.length !== 11 ? 'магазин' : vis.length % 10 >= 2 && vis.length % 10 <= 4 && (vis.length < 10 || vis.length > 20) ? 'магазина' : 'магазинов'}${me ? ' — ближайшие сверху' : ''}`;
    list.innerHTML = vis.map((s) => {
      const c = chains[s.chain];
      return `<li><article class="store" data-store="${s.id}" style="--c:${c.color}">
        <button type="button" class="store__main" data-focus="${s.id}">
          <span class="chain-dot" aria-hidden="true"></span>
          <span class="store__chain">${esc(c.name)}</span>
          <span class="store__addr">${esc(s.address.replace('Москва, ', ''))}</span>
          <span class="store__meta">${esc(s.district)}${s.d != null ? ` · ${s.d.toFixed(1).replace('.', ',')} км` : ''} · ${esc(hoursText(s))}</span>
        </button>
        <a class="store__route" data-route="${s.chain}" href="${routeUrl(s)}" target="_blank" rel="noopener" aria-label="Маршрут до магазина ${esc(c.name)}, ${esc(s.address)} (откроется в новой вкладке)">Маршрут</a>
      </article></li>`;
    }).join('');
    map.filter(on);
  };

  const select = (id, fly = true) => {
    list.querySelectorAll('.store').forEach((el) => el.classList.toggle('is-active', el.dataset.store === id));
    const el = list.querySelector(`[data-store="${id}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (fly) map.focus(id);
  };

  filterBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chain]');
    if (!b) return;
    const id = b.dataset.chain;
    on = on.includes(id) ? on.filter((x) => x !== id) : [...on, id];
    if (!on.length) on = Object.keys(chains);   // нельзя выключить всё — вернём все сети
    filterBox.querySelectorAll('[data-chain]').forEach((x) => x.setAttribute('aria-pressed', String(on.includes(x.dataset.chain))));
    render();
    map.fitAll();
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-focus]');
    if (b) select(b.dataset.focus);
  });

  const nearBtn = document.querySelector('[data-near]');
  if (!('geolocation' in navigator)) nearBtn.hidden = true;
  nearBtn.addEventListener('click', () => {
    nearBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        render();
        const first = stores.filter((s) => on.includes(s.chain)).sort((a, b) => km(me, a) - km(me, b))[0];
        if (first) select(first.id);
        nearBtn.disabled = false;
      },
      () => { count.textContent = 'Не получилось определить место — выбери магазин на карте.'; nearBtn.disabled = false; },
      { timeout: 8000, maximumAge: 600000 }
    );
  });

  render();
}

function initDelivery() {
  const shop = (id) => site.shops.find((s) => s.id === id);
  const q = encodeURIComponent('тафт');
  const del = document.querySelector('[data-delivery]');
  if (del) {
    del.innerHTML = [['lavka', 'Заказать в Лавке за 15 минут', ''], ['samokat', 'Заказать в Самокате за 15 минут', 'btn--milk']].map(([id, label, cls]) =>
      `<a class="btn ${cls}" data-shop="${id}" href="${withUtm(shop(id).url.replace('{q}', q))}" target="_blank" rel="noopener">${label}<span class="visually-hidden"> (откроется в новой вкладке)</span></a>`).join('');
  }
  const mp = document.querySelector('[data-marketplaces]');
  if (mp) {
    mp.innerHTML = ['wildberries', 'ozon', 'market', 'goldapple', 'magnit'].map((id) => shop(id)).map((s) =>
      `<li><a class="buy-item" data-shop="${s.id}" href="${withUtm(s.url.replace('{q}', q))}" target="_blank" rel="noopener"><span class="buy-item__name">${esc(s.label)}</span><span class="buy-item__kind">${esc(s.kind)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg><span class="visually-hidden">(откроется в новой вкладке)</span></a></li>`).join('');
  }
}

initWhere();
initDelivery();
