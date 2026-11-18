// Карта магазинов: Leaflet + OpenStreetMap (без ключей и регистрации).
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import data from '../../data/stores.json';

export const chains = Object.fromEntries(data.chains.map((c) => [c.id, c]));
export const stores = data.stores;

const pin = (chain, active = false) => L.divIcon({
  className: '',
  html: `<span class="pin${active ? ' is-active' : ''}" style="--c:${chain.color};--i:${chain.ink}"><b>${chain.name[0]}</b></span>`,
  iconSize: [34, 42],
  iconAnchor: [17, 40],
  popupAnchor: [0, -36],
});

export function hoursText(s) {
  return s.hours || 'часы работы уточняй у сети';
}

export function routeUrl(s) {
  return `https://yandex.ru/maps/?rtext=~${s.lat},${s.lon}&rtt=auto`;
}

/**
 * @param {HTMLElement} el
 * @param {{ compact?: boolean, onSelect?: (id) => void }} opts
 */
export function createStoreMap(el, { compact = false, onSelect } = {}) {
  const map = L.map(el, {
    center: data.center,
    zoom: compact ? 10 : 11,
    zoomControl: !compact,
    scrollWheelZoom: false,      // колесо не мешает листать страницу
    dragging: !L.Browser.mobile || !compact,
    tap: true,
    attributionControl: true,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);
  el.querySelector('.leaflet-tile-pane')?.classList.add('tiles-soft');
  // колесо мыши включаем только после клика по карте
  map.on('click', () => map.scrollWheelZoom.enable());
  el.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  const markers = {};
  for (const s of stores) {
    const c = chains[s.chain];
    const m = L.marker([s.lat, s.lon], { icon: pin(c), title: `${c.name}, ${s.address}`, keyboard: true, riseOnHover: true })
      .bindPopup(`<strong>${c.name}</strong><br>${s.address.replace('Москва, ', '')}<br><small>${hoursText(s)}</small><br><a href="${routeUrl(s)}" target="_blank" rel="noopener">Маршрут →</a>`)
      .addTo(map);
    m.on('click', () => onSelect?.(s.id));
    markers[s.id] = m;
  }

  let active = null;
  const api = {
    map,
    /** показать только выбранные сети */
    filter(ids) {
      for (const s of stores) {
        const m = markers[s.id];
        if (ids.includes(s.chain)) m.addTo(map); else m.remove();
      }
    },
    /** выделить магазин и подлететь к нему */
    focus(id, open = true) {
      const s = stores.find((x) => x.id === id);
      if (!s) return;
      if (active) markers[active].setIcon(pin(chains[stores.find((x) => x.id === active).chain]));
      active = id;
      markers[id].setIcon(pin(chains[s.chain], true));
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) map.setView([s.lat, s.lon], 14); else map.flyTo([s.lat, s.lon], 14, { duration: 0.8 });
      if (open) markers[id].openPopup();
    },
    fitAll() {
      const vis = stores.filter((s) => map.hasLayer(markers[s.id]));
      if (vis.length) map.fitBounds(L.latLngBounds(vis.map((s) => [s.lat, s.lon])), { padding: [30, 30] });
    },
  };
  setTimeout(() => { map.invalidateSize(); api.fitAll(); }, 50);
  return api;
}
