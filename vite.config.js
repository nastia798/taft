import { defineConfig } from 'vite';
import { resolve, relative, dirname } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateCatalog } from './scripts/generate-catalog.mjs';
import { generateContent } from './scripts/generate-content.mjs';

const root = dirname(fileURLToPath(import.meta.url));

// Базовый путь сайта. Для GitHub Pages вида user.github.io/taft/ — BASE_PATH=/taft/
// Для адреса в корне домена — «/» (по умолчанию).
const base = process.env.BASE_PATH || '/';
// Полный адрес сайта после выкладки, например https://user.github.io/taft — нужен для sitemap.xml, canonical и og:url
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

// Страницы каталога собираются из src/data/products.json до того, как Vite ищет входные HTML
generateCatalog();
generateContent();

/** Все index.html (и 404.html) проекта — входные точки многостраничной сборки. */
function collectPages(dir, acc = {}) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'public', 'src', 'scripts', '.git'].includes(name)) continue;
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) collectPages(full, acc);
    else if (name === 'index.html' || (dir === root && name === '404.html')) {
      const key = relative(root, full).replace(/\/?index\.html$/, '').replace(/\.html$/, '') || 'main';
      acc[key] = full;
    }
  }
  return acc;
}

/** Пункты главного меню: адрес → ключ для подсветки активного раздела. */
const NAV_KEYS = ['catalog', 'novaya-upakovka', 'tutorialy', 'o-brende', 'gde-kupit', 'faq'];

/**
 * Плагин «журнальной вёрстки»:
 * 1) подставляет общие куски (<!-- @include header -->) из src/partials;
 * 2) подсвечивает активный раздел меню (aria-current);
 * 3) добавляет base к внутренним ссылкам href="/..." — чтобы сайт работал в подпапке на GitHub Pages.
 */
const SOCIAL_ICONS = {
  telegram: '<path d="M21 4 3 11l6 2 2 6 3-4 5 4 2-15Z"/><path d="m9 13 8-6"/>',
  tiktok: '<path d="M14 3v11a4 4 0 1 1-4-4"/><path d="M14 3c.5 2.5 2.5 4.5 5 5"/>',
  vk: '<rect x="3" y="3" width="18" height="18" rx="6"/><path d="M7 9c.5 3.5 2.5 6 6 6v-3c1.5.2 2.6 1.3 3 3M13 9v3c1.5-.3 2.6-1.6 3-3"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
};

/** Кнопки соцсетей из src/data/site.json — статичный HTML (виден поисковикам и без JS). */
function renderSocials(site) {
  const items = site.socials.map((s) => `
    <li><a class="social" data-social="${s.id}" href="${s.url}" target="_blank" rel="noopener" aria-label="${s.label}: ${s.handle} (откроется в новой вкладке)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOCIAL_ICONS[s.id] || ''}</svg>${s.label}</a></li>`).join('');
  return `<ul class="socials" role="list">${items}</ul>`;
}

function partials() {
  const read = (n) => readFileSync(resolve(root, 'src/partials', `${n}.html`), 'utf8');
  const site = () => JSON.parse(readFileSync(resolve(root, 'src/data/site.json'), 'utf8'));
  return {
    name: 'taft-partials',
    // В режиме разработки перезагружаем страницу при правке шапки/подвала/конфига
    handleHotUpdate({ file, server }) {
      if (/\/src\/data\/(products|tutorials|faq)\.json$/.test(file)) {
        try { generateCatalog(); generateContent(); } catch (e) { console.error('Ошибка в данных:', e.message); }
        server.ws.send({ type: 'full-reload' });
        return [];
      }
      if (file.includes('/src/partials/') || file.endsWith('/src/data/site.json')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
    generateBundle() {
      // Без SITE_URL не знаем адрес сайта: sitemap.xml не создаём (с чужим адресом он только навредит)
      if (!SITE_URL) {
        this.warn('SITE_URL не задан: sitemap.xml, canonical и og:url не созданы. Собери так: SITE_URL=https://адрес-сайта npm run build');
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nAllow: /\n' });
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const urls = Object.keys(collectPages(root))
        .filter((k) => k !== '404')
        .map((k) => (k === 'main' ? '/' : `/${k}/`))
        .sort();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod><priority>${u === '/' ? '1.0' : u.split('/').length <= 3 ? '0.8' : '0.6'}</priority></url>`)
        .join('\n')}\n</urlset>\n`;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        let out = html;
        for (let i = 0; i < 3 && out.includes('<!-- @include'); i++) {
          out = out.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, n) => read(n));
        }
        const s = site();
        out = out
          .replace(/<!--\s*@socials\s*-->/g, renderSocials(s))
          .replace(/<!--\s*@instagram-note\s*-->/g, s.instagramNote)
          .replace(/<!--\s*@concept-note\s*-->/g, s.conceptNote);
        // Open Graph / canonical — из title и description страницы
        const title = (/<title>([\s\S]*?)<\/title>/.exec(out) || [])[1];
        const desc = (/<meta name="description" content="([^"]*)"/.exec(out) || [])[1];
        const pagePath = (ctx.path || '/').replace(/index\.html$/, '').replace(/^(?!\/)/, '/');
        if (title && !/noindex/.test(out)) {
          const img = `${SITE_URL}${base === '/' ? '' : ''}/og.jpg`;
          const tags = [
            SITE_URL && `<link rel="canonical" href="${SITE_URL}${pagePath}" />`,
            `<meta property="og:type" content="website" />`,
            `<meta property="og:locale" content="ru_RU" />`,
            `<meta property="og:site_name" content="Тафт" />`,
            `<meta property="og:title" content="${title}" />`,
            desc && `<meta property="og:description" content="${desc}" />`,
            SITE_URL && `<meta property="og:url" content="${SITE_URL}${pagePath}" />`,
            SITE_URL && `<meta property="og:image" content="${img}" />`,
            `<meta name="twitter:card" content="summary_large_image" />`,
          ].filter(Boolean).join('\n    ');
          out = out.replace('</head>', `    ${tags}\n  </head>`);
        }
        const section = (ctx.path || '/').split('/').filter(Boolean)[0] || '';
        if (NAV_KEYS.includes(section)) {
          out = out.replace(
            new RegExp(`(<a[^>]*data-nav="${section}")`, 'g'),
            '$1 aria-current="page"'
          );
        }
        if (base !== '/') {
          out = out.replace(/(<a\b[^>]*\bhref=")\/(?!\/)/g, `$1${base}`);
          out = out.replace(/(<form\b[^>]*\baction=")\/(?!\/)/g, `$1${base}`);
        }
        return out;
      },
    },
  };
}

/** Предзагрузка шрифтов первого экрана (только в сборке) — меньше «прыжков» текста при подмене шрифта. */
function fontPreload() {
  const want = ['playfair-display-cyrillic-400-normal', 'caveat-cyrillic-600-normal', 'manrope-cyrillic-400-normal', 'manrope-cyrillic-800-normal'];
  return {
    name: 'taft-font-preload',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return;
      return Object.keys(ctx.bundle)
        .filter((f) => f.endsWith('.woff2') && want.some((w) => f.includes(w)))
        .map((f) => ({ tag: 'link', injectTo: 'head', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `${base}${f}` } }));
    },
  };
}

export default defineConfig({
  base,
  appType: 'mpa',
  plugins: [partials(), fontPreload()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 700, // Three.js грузится отдельно, после первого экрана
    rollupOptions: { input: collectPages(root) },
  },
  server: { port: 5173, host: true },
});
