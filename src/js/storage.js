// Безопасная работа с localStorage: приватный режим Safari, переполнение,
// запрет cookies — ничего не должно ломать сайт.
// Используется для избранного, голосования «Какая банка следующая?», квиза и счётчика находок.
const PREFIX = 'taft:';

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------------- Избранное ---------------- */
const FAV = 'favorites';
export const getFavorites = () => { const f = load(FAV, []); return Array.isArray(f) ? f : []; };
export function toggleFavorite(id) {
  const fav = getFavorites();
  const next = fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id];
  save(FAV, next);
  document.dispatchEvent(new CustomEvent('fav:change', { detail: { favorites: next } }));
  return next.includes(id);
}
