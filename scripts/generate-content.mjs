// Генератор страниц «Туториалы» и «Вопросы и ответы» из src/data/tutorials.json и src/data/faq.json.
// Файлы tutorialy/index.html и faq/index.html перезаписываются — правь данные или этот шаблон.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = (f) => JSON.parse(readFileSync(resolve(root, 'src/data', f), 'utf8'));

function crumbs(name) {
  return `<nav class="crumbs" aria-label="Хлебные крошки">
          <ol itemscope itemtype="https://schema.org/BreadcrumbList">
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Главная</span></a><meta itemprop="position" content="1" /></li>
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name" aria-current="page">${esc(name)}</span><meta itemprop="position" content="2" /></li>
          </ol>
        </nav>`;
}

function page({ title, description, bodyPage, script, main, extraHead = '' }) {
  return `<!doctype html>
<!-- Сгенерировано scripts/generate-content.mjs из src/data — не править вручную -->
<html lang="ru" class="no-js">
  <head>
    <!-- @include head -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <script type="module" src="${script}"></script>${extraHead}
  </head>
  <body data-page="${bodyPage}">
    <!-- @include header -->

    <main id="main">
${main}
    </main>

    <!-- @include footer -->
  </body>
</html>
`;
}

/* ---------- Туториалы ---------- */
export function tutorialCards(items, products, { headingTag = 'h3', withSteps = true } = {}) {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  return items.map((t, i) => `<li class="tcard reveal" data-tutorial="${t.id}">
            <button type="button" class="tcard__screen" data-tune="${i}" aria-label="Включить на телевизоре: ${esc(t.title)}">
              <img src="${t.poster}" width="600" height="800" alt="" loading="lazy" />
              <span class="tcard__ch">канал ${esc(t.channel)}</span>
              <span class="tcard__dur">${esc(t.duration)}</span>
              ${t.video ? '' : '<span class="sticker tcard__soon" style="--rot:-6deg">скоро</span>'}
            </button>
            <${headingTag} class="tcard__title">${esc(t.title)}</${headingTag}>
            <p class="tcard__kicker">${esc(t.kicker)}</p>
            ${withSteps && t.steps.length ? `<ol class="tcard__steps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
            ${withSteps && t.products.length ? `<p class="tcard__prods">${t.products.map((id) => byId[id]).filter(Boolean).map((p) => `<a href="/catalog/${p.section}/${p.slug}/">${esc(p.name)}</a>`).join(' · ')}</p>` : ''}
          </li>`).join('\n          ');
}

export function tvMarkup(items, { compact = false } = {}) {
  const t = items[0];
  return `<div class="tv${compact ? ' tv--compact' : ''}" data-tv>
            <span class="tv__antenna" aria-hidden="true"><i></i><i></i></span>
            <div class="tv__body">
              <div class="tv__screen" aria-live="polite">
                <img class="tv__img" data-tv-img src="${t.poster}" width="600" height="800" alt="" />
                <canvas class="tv__noise" data-tv-noise aria-hidden="true"></canvas>
                <div class="tv__info">
                  <p class="tv__ch" data-tv-ch>канал ${esc(t.channel)}</p>
                  <p class="tv__title" data-tv-title>${esc(t.title)}</p>
                  <p class="tv__soon" data-tv-soon>${t.video ? '' : 'видео скоро ✦'}</p>
                </div>
              </div>
              <div class="tv__panel">
                <button type="button" class="tv__knob" data-tv-next aria-label="Следующий канал"><span aria-hidden="true"></span></button>
                <div class="tv__btns">
                  <button type="button" class="tv__btn" data-tv-prev aria-label="Предыдущий канал">◀</button>
                  <button type="button" class="tv__btn" data-tv-next2 aria-label="Следующий канал">▶</button>
                </div>
                <span class="tv__grill" aria-hidden="true"></span>
              </div>
            </div>
            <span class="tv__feet" aria-hidden="true"><i></i><i></i></span>
          </div>`;
}

function tutorialsPage(tut, products) {
  const main = `      <section class="spread spread--milk page-head">
        <!-- @include decor -->
        <div class="container">
        ${crumbs('Туториалы')}
        <h1 class="display page-title">туториалы</h1>
        <p class="lead">Не знаешь, что такое текстурайзер? Объясняем за 30 секунд — и честно показываем, как не надо.</p>
        </div>
      </section>

      <section class="spread spread--pink tutorials" aria-labelledby="tv-title">
        <div class="container tutorials__grid">
          <div class="tutorials__intro">
            <h2 id="tv-title" class="display">переключай <em>каналы</em></h2>
            <p class="lead">Крути ручку или жми стрелки — на каждом канале свой урок. Вертикальные видео скоро появятся, а шаги уже здесь.</p>
          </div>
          ${tvMarkup(tut.items)}
        </div>
      </section>

      <section class="spread spread--soft" aria-labelledby="all-title">
        <div class="container">
          <h2 id="all-title" class="display">все <em>уроки</em></h2>
          <ul class="tgrid" role="list">
          ${tutorialCards(tut.items, products)}
          </ul>
          <p class="tutorials__ask">Хочешь урок под свой тип волос? <a href="/faq/" data-open-stylist>Спроси стилиста</a> — подскажем.</p>
        </div>
      </section>
      <script type="application/json" data-tutorials>${JSON.stringify(tut.items.map(({ id, title, channel, poster, video }) => ({ id, title, channel, poster, video })))}</script>`;
  return page({
    title: 'Как сделать укладку текстурайзером — туториалы Тафт',
    description: 'Короткие уроки: укладка за 5 минут, что такое текстурайзер за 30 секунд, как выбрать средство под тип волос и частые ошибки у корней.',
    bodyPage: 'tutorialy',
    script: '/src/js/pages/tutorials.js',
    main,
  });
}

/* ---------- Вопросы и ответы ---------- */
function faqPage(faq) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const main = `      <section class="spread spread--milk page-head">
        <!-- @include decor -->
        <div class="container">
        ${crumbs('Вопросы и ответы')}
        <h1 class="display page-title">вопросы <em>и ответы</em></h1>
        <p class="lead">Коротко и честно: что такое текстурайзер, как наносить, какую фиксацию выбрать и где купить.</p>
        </div>
      </section>

      <section class="spread spread--soft faqp" aria-label="Вопросы">
        <div class="container faqp__grid">
          <div class="faq-list">
            ${faq.items.map((f, i) => `<details class="faq-item" id="${f.id}"${i === 0 ? ' open' : ''}>
              <summary><h2 class="faq-item__q">${esc(f.q)}</h2></summary>
              <p>${esc(f.a)}${f.link ? ` <a href="${f.link[1]}">${esc(f.link[0])} →</a>` : ''}</p>
            </details>`).join('\n            ')}
          </div>
          <aside class="faqp__side">
            <div class="callback card">
              <h2 class="h3">не нашла ответ?</h2>
              <p>Оставь вопрос — ответим письмом или перезвоним в удобное время.</p>
              <form class="callback__form" data-callback novalidate>
                <div class="field"><label for="cb-name">Имя</label><input class="input" id="cb-name" name="name" autocomplete="given-name" required /></div>
                <div class="field"><label for="cb-contact">Телефон или почта</label><input class="input" id="cb-contact" name="contact" autocomplete="tel" required /></div>
                <div class="field"><label for="cb-q">Вопрос</label><textarea class="textarea" id="cb-q" name="q" required></textarea></div>
                <label class="consent"><input type="checkbox" name="ok" required /> Согласна на обработку данных, чтобы со мной связались</label>
                <div class="btn-row">
                  <button class="btn" type="submit">Отправить вопрос</button>
                </div>
                <p class="form-msg" data-form-msg role="status" aria-live="polite"></p>
              </form>
              <p class="callback__or">или <a href="#stylist" data-open-stylist>спроси стилиста в чате</a></p>
            </div>
          </aside>
        </div>
      </section>`;
  return page({
    title: 'Вопросы о средствах для укладки Тафт — как наносить текстурайзер',
    description: 'Что такое текстурайзер и как его наносить, не склеит ли он волосы, что значит цифра фиксации, чем новая упаковка отличается от классики и где купить Тафт.',
    bodyPage: 'faq',
    script: '/src/js/pages/faq.js',
    main,
    extraHead: `\n    <script type="application/ld+json">${JSON.stringify(ld)}</script>`,
  });
}

/* ---------- Новая упаковка ---------- */
function newPackPage(products) {
  const items = products.filter((p) => p.variant).sort((a, b) => a.variant.num.localeCompare(b.variant.num));
  const url = (p) => `/catalog/${p.section}/${p.slug}/`;
  const buy = (p) => `data-buy data-buy-id="${esc(p.id)}" data-buy-name="${esc(p.name)}" data-buy-q="${esc(p.search)}"`;
  const first = items[0];
  const main = `      <section class="spread spread--milk page-head">
        <!-- @include decor -->
        <div class="container">
        ${crumbs('Новая упаковка')}
        <h1 class="display page-title">пять продуктов — <em>пять характеров</em></h1>
        <p class="lead">Ты ещё не видела Тафт таким. Мусс-уход, лак-уход, текстурайзер, флюид 10в1 и сухой шампунь — каждый в своём новом дизайне. А классические банки остаются с тобой.</p>
        </div>
      </section>

      <section class="spread spread--pink np" aria-labelledby="np-title">
        <div class="bubbles-layer" data-bubbles data-count="5"></div>
        <div class="container np__grid">
          <h2 id="np-title" class="visually-hidden">Витрина новой линейки</h2>
          <div class="np__stage">
            <div class="np__bottle" data-np-bottle data-product="${first.variant.key}">
              <img class="np__img" src="${first.variant.cut}" alt="${esc(first.name)}" data-np-fallback />
              <span class="bottle-shadow" aria-hidden="true"></span>
            </div>
            <p class="np__hint hand" aria-hidden="true">нажми — подпрыгнет ✦</p>
          </div>
          <div class="np__info">
            <div class="np__tabs" role="tablist" aria-label="Продукты новой линейки">
              ${items.map((p, i) => `<button type="button" role="tab" class="np__tab" id="np-tab-${p.variant.key}" aria-controls="np-panel-${p.variant.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-np-tab="${p.variant.key}" style="--a:${p.variant.colors[0]};--b:${p.variant.colors[1]}"><span class="np__tabdot" aria-hidden="true"></span>${esc(p.variant.name)}</button>`).join('\n              ')}
            </div>
            ${items.map((p, i) => `<div class="np__panel" role="tabpanel" id="np-panel-${p.variant.key}" aria-labelledby="np-tab-${p.variant.key}" data-np-panel="${p.variant.key}"${i === 0 ? '' : ' hidden'}>
              <p class="kicker">характер ${p.variant.num} · ${esc(p.productName.toLowerCase())} · ${esc(p.volume)}</p>
              <h3 class="np__name">${esc(p.variant.name)} <em>${esc(p.variant.nick)}</em></h3>
              <p class="np__design">${esc(p.variant.design)}</p>
              <dl class="np__facts">
                <div><dt>Продукт</dt><dd>${esc(p.productName)}, ${esc(p.volume)}</dd></div>
                <div><dt>Корпус</dt><dd>${esc(p.variant.body)}</dd></div>
                <div><dt>Крышка</dt><dd>${esc(p.variant.cap)}</dd></div>
                <div><dt>Печать</dt><dd>${esc(p.variant.print)}</dd></div>
              </dl>
              <ul class="swatches" role="list">${p.variant.colors.map((c) => `<li><span class="swatch" style="background:${c}"></span><code>${c}</code></li>`).join('')}</ul>
              <p class="np__why">${esc(p.variant.why)}</p>
              <div class="btn-row">
                <a class="btn" href="${url(p)}">Карточка товара</a>
                <a class="btn btn--ghost" href="/gde-kupit/" ${buy(p)}>Где купить</a>
              </div>
              <figure class="np__video polaroid" style="--rot:-3deg">
                <video muted loop playsinline preload="none" poster="${p.variant.frame}-380.webp" width="1080" height="1350" aria-label="${esc(p.variant.name)} в движении"><source src="${p.variant.video}" type="video/mp4" /></video>
              </figure>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>

      <section class="spread spread--milk np-row" aria-labelledby="row-title">
        <div class="container">
          <h2 id="row-title" class="display">все пять <em>рядом</em></h2>
          <figure class="np-row__photo reveal">
            <img src="/img/pack/five-in-row-1000.webp" srcset="/img/pack/five-in-row-1000.webp 1000w, /img/pack/five-in-row-2000.webp 2000w" sizes="(max-width: 1280px) 100vw, 1200px" width="2000" height="1000" alt="Новая линейка Тафт: ${items.map((p) => `${p.productName.toLowerCase()} ${p.variant.name}`).join(', ')}" loading="lazy" />
            <figcaption>${items.map((p) => `<span>${p.variant.num} · ${esc(p.variant.name)} — ${esc(p.productName.toLowerCase())}</span>`).join('')}</figcaption>
          </figure>
        </div>
      </section>

      <section class="spread spread--soft vend" aria-labelledby="vend-title">
        <div class="container vend__grid">
          <div class="vend__intro">
            <h2 id="vend-title" class="display">автомат <em>новинок</em></h2>
            <p class="lead">Набери номер ячейки — и флакон упадёт в лоток. Бесплатно и без очереди (но только понарошку).</p>
          </div>
          <div class="vend-machine" data-vend>
            <div class="vend-machine__top"><span class="vend-machine__logo">Тафт</span><span class="vend-machine__light" aria-hidden="true"></span></div>
            <div class="vend-machine__body">
              <div class="vend-machine__window" aria-hidden="true">
                ${items.map((p, i) => `<div class="vend-cell" data-cell="${11 + i}"><img src="${p.variant.cut}" alt="" loading="lazy" /><span class="vend-cell__coil"></span><span class="vend-cell__n">${11 + i}</span></div>`).join('\n                ')}
                <div class="vend-cell vend-cell--empty"><span class="vend-cell__soon">скоро</span><span class="vend-cell__coil"></span><span class="vend-cell__n">16</span></div>
              </div>
              <div class="vend-machine__side">
                <p class="vend-machine__screen" data-vend-screen aria-live="polite">выбери ячейку</p>
                <div class="vend-machine__keys" role="group" aria-label="Номер ячейки">
                  ${items.map((p, i) => `<button type="button" class="vend-key" data-vend-key="${11 + i}" data-href="${url(p)}" data-name="${esc(p.productName)} ${esc(p.variant.name)}" aria-label="Ячейка ${11 + i}: ${esc(p.productName)} ${esc(p.variant.name)}">${11 + i}</button>`).join('\n                  ')}
                </div>
              </div>
            </div>
            <div class="vend-machine__tray" data-vend-tray aria-live="polite"><span class="vend-machine__flap" aria-hidden="true"></span></div>
          </div>
        </div>
      </section>`;
  return page({
    title: 'Новая упаковка Тафт — пять продуктов в новых дизайнах',
    description: 'Пять характеров новой линейки Тафт: мусс-уход Glow Call, лак-уход Bordeaux, текстурайзер Chrome Y2K, флюид 10в1 Lime Accent и сухой шампунь Gradient.',
    bodyPage: 'novaya-upakovka',
    script: '/src/js/pages/newpack.js',
    main,
  }).replace('<!-- @include footer -->', '<!-- @include buy-dialog -->\n    <!-- @include footer -->');
}

export function generateContent() {
  const products = read('products.json').products;
  const tut = read('tutorials.json');
  const faq = read('faq.json');
  const w = (dir, html) => { mkdirSync(resolve(root, dir), { recursive: true }); writeFileSync(resolve(root, dir, 'index.html'), html); };
  w('tutorialy', tutorialsPage(tut, products));
  w('faq', faqPage(faq));
  w('novaya-upakovka', newPackPage(products));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  generateContent();
  console.log('Туториалы и FAQ сгенерированы');
}
