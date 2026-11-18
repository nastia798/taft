// Генератор страниц каталога из src/data/products.json.
// Создаёт: catalog/index.html, catalog/<раздел>/index.html, catalog/<раздел>/<товар>/index.html
// Запускается автоматически при `npm run dev` и `npm run build` (см. vite.config.js).
// Файлы в папке catalog/ НЕ правь руками — они перезаписываются. Правь данные или этот шаблон.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s = '') => String(s).replace(/<[^>]+>/g, '');
const cut = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/[,.;:—-]+$/, '') + '…');

export function formatPrice(price) {
  if (!price || price === 'TODO' || typeof price.value !== 'number') return null;
  const v = price.value;
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
}

function crumbs(items) {
  const all = [['Главная', '/'], ...items];
  return `<nav class="crumbs" aria-label="Хлебные крошки">
          <ol itemscope itemtype="https://schema.org/BreadcrumbList">
${all.map(([n, h], i) => `            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">${h ? `<a itemprop="item" href="${h}"><span itemprop="name">${esc(n)}</span></a>` : `<span itemprop="name" aria-current="page">${esc(n)}</span>`}<meta itemprop="position" content="${i + 1}" /></li>`).join('\n')}
          </ol>
        </nav>`;
}

function page({ title, description, bodyPage, script, main, extraHead = '', bodyAttrs = '' }) {
  return `<!doctype html>
<!-- Сгенерировано scripts/generate-catalog.mjs из src/data/products.json — не править вручную -->
<html lang="ru" class="no-js">
  <head>
    <!-- @include head -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <script type="module" src="${script}"></script>${extraHead}
  </head>
  <body data-page="${bodyPage}"${bodyAttrs}>
    <!-- @include header -->

    <main id="main">
${main}
    </main>

    <!-- @include buy-dialog -->
    <!-- @include footer -->
  </body>
</html>
`;
}

/* ---------- Фрагменты ---------- */
const url = (p, sec) => `/catalog/${sec}/${p.slug}/`;
const img = (id, w) => `/img/products/${id}-${w}.webp`;
const fixLabel = (f) => (f ? `фиксация ${f}` : '');

function fixScale(f) {
  if (!f) return '';
  const n = parseInt(f, 10);
  const plus = f.includes('+');
  return `<span class="fix" role="img" aria-label="Фиксация ${esc(f)} из 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}${i === n ? ' cur' : ''}"></i>`).join('')}<b>${esc(f)}${plus ? '' : ''}</b></span>`;
}

function buyAttrs(p) {
  return `data-buy data-buy-id="${esc(p.id)}" data-buy-name="${esc(p.name)}" data-buy-q="${esc(p.search)}"${p.exactLinks ? ` data-buy-exact="${esc(JSON.stringify(p.exactLinks))}"` : ''}`;
}

function priceHtml(p) {
  const f = formatPrice(p.price);
  return f
    ? `<span class="price"><span class="price__v">${f}</span><span class="price__n">ориентировочно</span></span>`
    : `<span class="price price--none">${p.line === 'new' ? 'Скоро на полках' : 'Смотреть цену на маркетплейсе'}</span>`;
}

let BYID = {};
function twinChip(p) {
  const t = p.twinNew && BYID[p.twinNew];
  if (!t) return '';
  return `<a class="pcard__twin" href="${url(t, t.section)}"><span class="swatch" style="background:${t.variant.colors[0]}"></span>есть в новом дизайне ${esc(t.variant.name)}</a>`;
}

export function card(p, sec, order, headingTag = 'h3') {
  const alt = `${p.name}, ${p.volume}`;
  const v = p.variant;
  return `<li class="pcard${p.line === 'new' ? ' pcard--new' : ''}" data-line="${p.line}" data-section="${p.section}" data-name="${esc((p.name + ' ' + (p.nameShort || '') + ' ' + p.type).toLowerCase())}" data-price="${formatPrice(p.price) ? p.price.value : ''}" data-order="${order}"${v ? ` style="--vc:${v.tint}"` : ''}>
            <article class="pcard__in">
              <a class="pcard__link" href="${url(p, sec)}">
                <span class="pcard__badge pcard__badge--${p.line}">${esc(p.badge)}</span>
                <span class="pcard__media">
                  <span class="pcard__cloud" aria-hidden="true"></span>
                  <img src="${img(p.image, 300)}" srcset="${img(p.image, 300)} 300w, ${img(p.image, 600)} 600w" sizes="(max-width: 600px) 45vw, 260px" width="300" height="400" alt="${esc(alt)}" loading="lazy" decoding="async" />
                </span>
                <span class="pcard__meta">${esc(p.type)} · ${esc(p.volume)}${p.fixation ? ` · ${fixLabel(p.fixation)}` : ''}</span>
                <${headingTag} class="pcard__name">${esc(v ? p.productName : p.name)}${v ? ` <span class="pcard__nick">${esc(v.name)} ${esc(v.nick)}</span>` : ''}</${headingTag}>
              </a>
              ${twinChip(p)}
              <div class="pcard__foot">
                ${priceHtml(p)}
                <a class="btn btn--sm" href="/gde-kupit/" ${buyAttrs(p)}>Где купить</a>
              </div>
            </article>
          </li>`;
}

function toolbar(sections, current) {
  return `<div class="toolbar" data-toolbar>
          <div class="toolbar__row">
            <div class="seg" role="group" aria-label="Упаковка">
              <button class="chip" type="button" data-line-filter="all" aria-pressed="true">Все</button>
              <button class="chip" type="button" data-line-filter="new" aria-pressed="false">Новая упаковка</button>
              <button class="chip" type="button" data-line-filter="classic" aria-pressed="false">Классика</button>
            </div>
            <div class="toolbar__tools">
              <label class="search-field">
                <span class="visually-hidden">Поиск по названию</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>
                <input class="input" type="search" name="q" placeholder="Найти по названию" autocomplete="off" data-search />
              </label>
              <label class="sort-field">
                <span class="visually-hidden">Сортировка</span>
                <select class="select" data-sort>
                  <option value="default">Сначала популярное</option>
                  <option value="price-asc">Цена: по возрастанию</option>
                  <option value="price-desc">Цена: по убыванию</option>
                  <option value="name">По названию</option>
                </select>
              </label>
            </div>
          </div>
          <nav class="toolbar__sections" aria-label="Разделы каталога">
            <a class="chip" href="/catalog/"${!current ? ' aria-current="page"' : ''}>Все средства</a>
            ${sections.map((s) => `<a class="chip" href="/catalog/${s.id}/"${current === s.id ? ' aria-current="page"' : ''}>${esc(s.name)}</a>`).join('\n            ')}
          </nav>
          <p class="toolbar__count" data-count role="status" aria-live="polite"></p>
        </div>`;
}

function listing({ data, list, section, head }) {
  const secName = (id) => data.sections.find((s) => s.id === id);
  return `      <section class="spread spread--milk page-head">
        <!-- @include decor -->
        <div class="container">
        ${crumbs(section ? [['Каталог', '/catalog/'], [section.name]] : [['Каталог']])}
        <h1 class="display page-title">${head.h1}</h1>
        <p class="lead">${esc(head.lead)}</p>
        </div>
      </section>

      <section class="spread spread--soft catalog" aria-label="Товары">
        <div class="container">
        ${toolbar(data.sections, section?.id)}
          <ul class="pgrid" role="list" data-grid>
          ${list.map((p, i) => card(p, p.section, i, 'h2')).join('\n          ')}
          </ul>
          <div class="empty" data-empty hidden>
            <p class="h3">ничего не нашлось</p>
            <p>Попробуй другое слово — например, «объём» или «текстурайзер».</p>
            <button class="btn btn--ghost btn--sm" type="button" data-reset>Сбросить фильтры</button>
          </div>
        </div>
      </section>`;
}

/* ---------- Карточка товара ---------- */
function productPage(data, p) {
  const section = data.sections.find((s) => s.id === p.section);
  const v = p.variant;
  const twin = p.twin ? data.products.find((x) => x.id === p.twin) : null;          // классика для новой упаковки
  const twinNew = p.twinNew ? data.products.find((x) => x.id === p.twinNew) : null; // новая упаковка для классики
  const related = p.related.map((id) => data.products.find((x) => x.id === id)).filter(Boolean);
  const price = formatPrice(p.price);
  const alt = `${p.name}, ${p.volume}`;

  // Галерея: единое фото каталога + (для новой упаковки) рендеры
  const gallery = [
    { s: img(p.image, 600), set: `${img(p.image, 600)} 600w, ${img(p.image, 1200)} 1200w`, big: img(p.image, 1200), w: 600, h: 800, alt, cap: v ? `${p.productName} ${v.name}, ${p.volume}` : p.name, cls: 'pack' },
  ];
  if (v) {
    gallery.push({ s: `${v.frame}-760.webp`, set: `${v.frame}-380.webp 380w, ${v.frame}-760.webp 760w`, big: `${v.frame}-760.webp`, w: 760, h: 950, alt: `${p.name}: флакон крупным планом`, cap: `${v.name} крупным планом`, cls: 'photo' });
    gallery.push({ s: `${v.scene}-760.webp`, set: `${v.scene}-760.webp 760w, ${v.scene}-1520.webp 1520w`, big: `${v.scene}-1520.webp`, w: 1520, h: 900, alt: `${p.name} на розовом фоне`, cap: `${p.productName} ${v.name}`, cls: 'photo' });
  }

  const title = v
    ? (() => {
        const full = `${p.productName.replace(' & ', ' и ')} Тафт ${v.name}, ${p.volume} — новая упаковка`;
        return full.length <= 70 ? full : `${p.type} Тафт ${v.name}, ${p.volume} — новая упаковка`;
      })()
    : cut(`${p.name}, ${p.volume} — Тафт`, 70);
  const description = v
    ? cut(`${p.productName} Тафт в новом дизайне ${v.name} ${v.nick}, ${p.volume}. ${p.description} Как наносить и где купить.`, 200)
    : cut(`${p.description} ${p.volume}${p.fixation ? `, фиксация ${p.fixation}` : ''}. Как наносить и где купить.`, 200);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    brand: { '@type': 'Brand', name: 'Тафт' },
    category: section.name,
    description: p.description,
    image: `${SITE_URL}${img(p.image, 1200)}`,
    size: p.volume,
    ...(price ? { offers: { '@type': 'Offer', price: p.price.value, priceCurrency: 'RUB', url: `${SITE_URL}${url(p, p.section)}` } } : {}),
  };

  const faq = [
    ['Как наносить?', p.howTo.join(' ') + (p.tip ? ` ${p.tip}` : '')],
    ...(p.fixation ? [['Какая фиксация?', `Уровень фиксации — ${p.fixation} по шкале Тафт от 1 до 5. Чем выше цифра, тем крепче держится укладка.`]] : []),
    ['Какой объём флакона?', `${p.volume}.`],
    ['Где купить?', 'На маркетплейсах, в магазинах косметики и в сервисах доставки — нажми «Где купить» и выбери удобное место.'],
  ];

  const main = `      <section class="spread spread--milk product" aria-labelledby="p-title">
        <div class="container">
        ${crumbs([['Каталог', '/catalog/'], [section.name, `/catalog/${section.id}/`], [v ? `${p.productName} ${v.name}` : p.name]])}
        <div class="product__grid">
          <div class="gallery" data-gallery>
            <div class="gallery__stage${v ? ' gallery__stage--new' : ''}"${v ? ` style="--vc:${v.tint}"` : ''}>
              ${v ? `<div class="gallery__3d" data-3d data-product="${v.key}" aria-hidden="true"></div>` : ''}
              <button class="gallery__main" type="button" data-zoom="0" aria-label="Увеличить фото: ${esc(gallery[0].cap)}">
                <img src="${gallery[0].s}" srcset="${gallery[0].set}" sizes="(max-width: 860px) 90vw, 520px" width="${gallery[0].w}" height="${gallery[0].h}" alt="${esc(gallery[0].alt)}" fetchpriority="high" data-main-img />
                <span class="gallery__zoom" aria-hidden="true" title="Увеличить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5"/></svg></span>
              </button>
              <span class="sticker gallery__st" style="--rot:-7deg">${v ? 'новая упаковка ✦' : esc(p.type.toLowerCase())}</span>
            </div>
            ${gallery.length > 1 ? `<ul class="gallery__thumbs" role="list">
              ${gallery.map((g, i) => `<li><button type="button" class="gallery__thumb gallery__thumb--${g.cls}" data-thumb="${i}" aria-label="Показать фото: ${esc(g.cap)}"${i === 0 ? ' aria-current="true"' : ''}><img src="${g.s}" width="${g.w}" height="${g.h}" alt="" loading="lazy" /></button></li>`).join('\n              ')}
            </ul>` : ''}
            <template data-gallery-items>${esc(JSON.stringify(gallery.map((g) => ({ src: g.big, alt: g.alt, cap: g.cap, set: g.set, s: g.s, w: g.w, h: g.h }))))}</template>
          </div>

          <div class="pinfo">
            <span class="pcard__badge pcard__badge--${p.line}">${esc(p.badge)}</span>
            <h1 id="p-title" class="pinfo__title" data-split="words">${esc(v ? `${p.productName} ${v.name}` : p.name)}</h1>
            ${v ? `<p class="pinfo__nick">${esc(v.nick)}</p>` : ''}
            <dl class="pinfo__facts">
              <div><dt>Тип</dt><dd>${esc(p.type)}</dd></div>
              <div><dt>Объём</dt><dd>${esc(p.volume)}</dd></div>
              ${p.fixation ? `<div><dt>Фиксация</dt><dd>${fixScale(p.fixation)}</dd></div>` : ''}
              ${v ? `<div><dt>Корпус</dt><dd>${esc(v.body)}</dd></div><div><dt>Крышка</dt><dd>${esc(v.cap)}</dd></div>` : ''}
            </dl>

            ${twin ? `<p class="pinfo__twin">Это ${esc(twin.name.charAt(0).toLowerCase() + twin.name.slice(1))} — в новом дизайне ${esc(v.name)}. <a href="${url(twin, twin.section)}">Классическая версия →</a></p>` : ''}
            ${twinNew ? `<p class="pinfo__twin pinfo__twin--new"><span class="swatch" style="background:${twinNew.variant.colors[0]}"></span> Есть в новом дизайне <a href="${url(twinNew, twinNew.section)}">${esc(twinNew.variant.name)} ${esc(twinNew.variant.nick)} →</a></p>` : ''}

            <div class="pinfo__buy">
              ${price ? `<p class="pinfo__price">${price}<small>цена ориентировочная, в магазинах может отличаться</small></p>` : `<p class="pinfo__price pinfo__price--none">${v ? 'Новая упаковка скоро на полках' : 'Цену смотри на маркетплейсе'}<small>${v ? 'а пока это средство можно найти в классической упаковке' : 'нажми «Где купить» — покажем, где он есть'}</small></p>`}
              <a class="btn" href="/gde-kupit/" ${buyAttrs(p)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                Где купить
              </a>
            </div>

            <p class="pinfo__desc">${esc(p.description)}</p>
            ${p.benefits.length ? `<ul class="benefits" role="list">${p.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
          </div>
        </div>
        </div>
      </section>

      ${v ? `<section class="spread spread--pink pvideo" aria-labelledby="v-title">
        <div class="container pvideo__grid">
          <div>
            <p class="kicker">характер ${esc(v.num)} · ${esc(p.productName.toLowerCase())} · ${esc(p.volume)}</p>
            <h2 id="v-title" class="display">${esc(v.name)} <em>${esc(v.nick)}</em></h2>
            <p class="lead">${esc(v.design)}</p>
            <p>${esc(v.why)}</p>
            <ul class="swatches" role="list">${v.colors.map((c) => `<li><span class="swatch" style="background:${c}"></span><code>${c}</code></li>`).join('')}</ul>
          </div>
          <figure class="pvideo__frame polaroid" style="--rot:3deg">
            <video src="${v.video}" muted loop playsinline autoplay preload="none" poster="${v.frame}-380.webp" width="1080" height="1350" aria-label="Флакон ${esc(v.name)} вращается"></video>
          </figure>
        </div>
      </section>` : ''}

      <section class="spread spread--soft howto" aria-labelledby="h-title">
        <div class="container">
          <h2 id="h-title" class="display">как <em>наносить</em></h2>
          <ol class="steps" role="list">
            ${p.howTo.map((s, i) => `<li class="step reveal"><span class="step__n">${i + 1}</span><p>${esc(s)}</p></li>`).join('\n            ')}
          </ol>
          ${p.tip ? `<p class="tip"><span class="sticker sticker--pink" style="--rot:-4deg">лайфхак</span> ${esc(p.tip)}</p>` : ''}
        </div>
      </section>

      <section class="spread spread--milk related" aria-labelledby="r-title">
        <div class="container">
          <h2 id="r-title" class="display">с этим товаром <em>чаще покупают</em></h2>
          <ul class="pgrid pgrid--3" role="list">
          ${related.map((r, i) => card(r, r.section, i)).join('\n          ')}
          </ul>
        </div>
      </section>

      <section class="spread spread--pink reviews" aria-labelledby="rv-title">
        <div class="container reviews__grid">
          <div>
            <h2 id="rv-title" class="display">отзывы</h2>
            <p class="lead">Отзывов пока нет. Пробовала ${esc(v ? p.productName.toLowerCase() + ' ' + v.name : p.nameShort || 'это средство')}? Расскажи честно — и про плюсы, и про минусы.</p>
            <div class="my-review" data-my-review hidden></div>
          </div>
          <form class="review-form card" data-review-form data-product="${p.id}" novalidate>
            <h3 class="h3">оставь свой отзыв</h3>
            <div class="field">
              <label for="rv-name">Имя</label>
              <input class="input" id="rv-name" name="name" autocomplete="given-name" maxlength="40" required />
            </div>
            <fieldset class="field stars">
              <legend>Оценка</legend>
              <div class="stars__row">
                ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="rv-s${n}" name="rating" value="${n}" required /><label for="rv-s${n}" title="${n} из 5"><span class="visually-hidden">${n} из 5</span>★</label>`).join('')}
              </div>
            </fieldset>
            <div class="field">
              <label for="rv-text">Отзыв</label>
              <textarea class="textarea" id="rv-text" name="text" maxlength="1000" required placeholder="Как держится укладка, не склеивает ли пряди, какой запах…"></textarea>
            </div>
            <button class="btn" type="submit">Отправить отзыв</button>
            <p class="form-note">Отзыв появится на сайте после проверки. Мы публикуем и критические отзывы.</p>
            <p class="form-msg" data-form-msg role="status" aria-live="polite"></p>
          </form>
        </div>
      </section>

      <section class="spread spread--milk pfaq" aria-labelledby="f-title">
        <div class="container container--narrow">
          <h2 id="f-title" class="display">вопросы <em>о средстве</em></h2>
          <div class="faq-list">
            ${faq.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n            ')}
          </div>
          <p style="margin-top:var(--sp-5)"><a class="btn btn--ghost btn--sm" href="/faq/">Все вопросы и ответы</a></p>
        </div>
      </section>

      <dialog class="lightbox" data-lightbox aria-label="Фото товара">
        <button class="icon-btn lightbox__close" type="button" data-lb-close aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <button class="icon-btn lightbox__nav lightbox__nav--prev" type="button" data-lb-prev aria-label="Предыдущее фото"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
        <figure><img data-lb-img alt="" /><figcaption data-lb-cap></figcaption></figure>
        <button class="icon-btn lightbox__nav lightbox__nav--next" type="button" data-lb-next aria-label="Следующее фото"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
      </dialog>`;

  return page({
    title,
    description,
    bodyPage: 'product',
    bodyAttrs: ` data-product-id="${esc(p.id)}" data-product-name="${esc(p.name)}"${p.variant ? ' data-new-pack' : ''}`,
    script: '/src/js/pages/product.js',
    main,
    extraHead: `\n    <link rel="preload" as="image" imagesrcset="${gallery[0].set}" imagesizes="(max-width: 860px) 90vw, 520px" fetchpriority="high" />\n    <script type="application/ld+json">${JSON.stringify(ld)}</script>`,
  });
}

/* ---------- Сборка ---------- */
export function generateCatalog() {
  const data = JSON.parse(readFileSync(resolve(root, 'src/data/products.json'), 'utf8'));
  BYID = Object.fromEntries(data.products.map((x) => [x.id, x]));
  const outDir = resolve(root, 'catalog');
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

  const write = (rel, html) => {
    const file = resolve(outDir, rel, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
  };

  // Порядок: по разделам, классика и новая линейка на равных —
  // пять новых дизайнов стоят сразу за классическим текстурайзером
  const ordered = data.sections.flatMap((s) =>
    data.products.filter((p) => p.section === s.id && !p.variant).flatMap((p) => {
      const twin = data.products.find((x) => x.twin === p.id);
      return twin ? [p, twin] : [p];
    })
  );

  write('', page({
    title: data.catalog.title,
    description: data.catalog.description,
    bodyPage: 'catalog',
    script: '/src/js/pages/catalog.js',
    main: listing({ data, list: ordered, head: data.catalog }),
  }));

  for (const s of data.sections) {
    const list = ordered.filter((p) => p.section === s.id);
    write(s.id, page({
      title: s.title,
      description: s.description,
      bodyPage: 'catalog',
      script: '/src/js/pages/catalog.js',
      main: listing({ data, list, section: s, head: s }),
    }));
    for (const p of list) write(`${s.id}/${p.slug}`, productPage(data, p));
  }
  return data.products.length;
}

// Запуск напрямую: node scripts/generate-catalog.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(`Каталог: сгенерировано ${generateCatalog()} карточек`);
}
