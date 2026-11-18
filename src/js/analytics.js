// Яндекс Метрика: цели и UTM-метки. Сам счётчик (114348242) подключён в src/partials/head.html.
// Если Метрика не загрузилась (блокировщик, офлайн), вызовы тихо ничего не делают.
export const COUNTER_ID = 114348242;

/** Отправить цель: goal('where_to_buy', { product: 'Лак Ultimate' }) */
export function goal(name, params) {
  try {
    if (typeof window.ym !== 'function') return;
    if (params) window.ym(COUNTER_ID, 'reachGoal', name, params);
    else window.ym(COUNTER_ID, 'reachGoal', name);
  } catch { /* аналитика не должна ломать сайт */ }
}

/** Добавить UTM-метки к ссылке на магазин или маркетплейс. Метки, уже стоящие в ссылке, не трогаем. */
export function withUtm(href, code = 'all') {
  try {
    const u = new URL(href, window.location.href);
    const set = (k, v) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); };
    set('utm_source', 'taft_site');
    set('utm_medium', 'referral');
    set('utm_campaign', 'new_pack');
    set('utm_content', code);
    return u.toString();
  } catch {
    return href;
  }
}

/** Цели на переходы: маркетплейсы и магазины, маршруты, соцсети. Работает на любой странице. */
export function initTracking() {
  const onLink = (e) => {
    if (e.type === 'auxclick' && e.button !== 1) return;
    const a = e.target.closest && e.target.closest('a[data-shop], a[data-route], a[data-social]');
    if (!a) return;
    if (a.dataset.shop) goal('marketplace_click', { shop: a.dataset.shop, product: a.dataset.product || 'all' });
    else if (a.dataset.route) goal('map_route', { chain: a.dataset.route });
    else if (a.dataset.social) goal('social_click', { network: a.dataset.social });
  };
  document.addEventListener('click', onLink);
  document.addEventListener('auxclick', onLink);
}
