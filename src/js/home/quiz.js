// Квиз «Твой тип волос» в виде калькулятора «По моим расчётам…».
// Ответы — кнопки калькулятора, на экране — вопрос и в конце результат; ниже — подборка из каталога.
import data from '../../data/products.json';
import { load, save } from '../storage.js';
import { goal } from '../analytics.js';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const QUESTIONS = [
  { id: 'length', q: 'Какой длины волосы?', a: [['short', 'Короткие'], ['mid', 'До плеч'], ['long', 'Длинные']] },
  { id: 'type', q: 'Какие они на ощупь?', a: [['thin', 'Тонкие'], ['normal', 'Обычные'], ['thick', 'Густые'], ['weak', 'Ослабленные или окрашенные']] },
  { id: 'goal', q: 'Чего хочешь от укладки?', a: [['volume', 'Объём у корней'], ['texture', 'Текстуру и волны'], ['smooth', 'Гладкость и блеск'], ['hold', 'Чтобы держалась весь день']] },
  { id: 'freq', q: 'Как часто делаешь укладку?', a: [['daily', 'Каждый день'], ['week', 'Пару раз в неделю'], ['rare', 'По особым случаям']] },
  { id: 'time', q: 'Сколько времени есть утром?', a: [['5', '5 минут'], ['15', '15 минут'], ['any', 'Сколько нужно']] },
];

const VERDICT = {
  volume: ['мне нужно больше объёма', 'тебе нужно <em>больше объёма</em>'],
  texture: ['мне нужна текстура', 'тебе нужны <em>текстура и лёгкие волны</em>'],
  smooth: ['мне нужна гладкость', 'тебе нужны <em>гладкость и блеск</em>'],
  hold: ['мне нужна укладка на весь день', 'тебе нужна укладка, <em>которая держится</em>'],
};
const GOAL_TAGS = { volume: ['объём', 'густота'], texture: ['текстура', 'волны'], smooth: ['гладкость', 'блеск'], hold: ['фиксация'] };

function score(p, ans) {
  let s = 0;
  const g = p.goals || [];
  const hair = p.hair || [];
  const fix = p.fixation ? parseInt(p.fixation, 10) : 0;
  if (GOAL_TAGS[ans.goal].some((t) => g.includes(t))) s += 5;
  if (ans.type === 'thin' && hair.includes('тонкие')) s += 3;
  if (ans.type === 'weak' && (hair.includes('ослабленные') || hair.includes('повреждённые') || g.includes('уход'))) s += 3;
  if (ans.type === 'thick' && (g.includes('фиксация') || g.includes('гладкость'))) s += 1;
  if (ans.length === 'short' && p.section === 'geli-i-voski') s += 2;
  if (ans.length === 'long' && (p.section === 'sprei-i-teksturajzery' || p.section === 'penki-i-mussy')) s += 1;
  if (ans.freq === 'daily' && fix && fix <= 4) s += 1;
  if (ans.freq === 'rare' && fix >= 5) s += 1;
  if (ans.time === '5' && (g.includes('быстро') || p.id === 'teksturajzer' || p.id === 'suhoj-shampun')) s += 2;
  if (ans.time === 'any' && g.includes('термозащита')) s += 1;
  if (p.hero) s += 1; // текстурайзер — наш главный герой, при равенстве он выше
  return s;
}

function pick(ans) {
  const ranked = data.products.filter((p) => !p.variant)
    .map((p) => ({ p, s: score(p, ans) }))
    .sort((a, b) => b.s - a.s)
    .map((r) => r.p);
  // три средства с лучшим результатом, по возможности из разных разделов
  const out = [];
  for (const p of ranked) if (out.length < 3 && !out.some((o) => o.section === p.section)) out.push(p);
  for (const p of ranked) if (out.length < 3 && !out.includes(p)) out.push(p);
  return out;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const priceText = (p) => {
  if (!p.price || p.price === 'TODO') return '<span class="price price--none">Смотреть цену на маркетплейсе</span>';
  const v = p.price.value;
  const t = (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' ₽';
  return `<span class="price"><span class="price__v">${t}</span><span class="price__n">ориентировочно</span></span>`;
};

const byId = Object.fromEntries(data.products.map((x) => [x.id, x]));
function twinChip(p) {
  const t = p.twinNew && byId[p.twinNew];
  if (!t) return '';
  return `<a class="pcard__twin" href="${BASE}/catalog/${t.section}/${t.slug}/"><span class="swatch" style="background:${t.variant.colors[0]}"></span>есть в новом дизайне ${esc(t.variant.name)}</a>`;
}

function cardHTML(p) {
  const href = `${BASE}/catalog/${p.section}/${p.slug}/`;
  const img = (w) => `${BASE}/img/products/${p.image}-${w}.webp`;
  return `<li class="pcard" data-line="${p.line}">
    <article class="pcard__in">
      <a class="pcard__link" href="${href}">
        <span class="pcard__badge pcard__badge--${p.line}">${esc(p.badge)}</span>
        <span class="pcard__media"><span class="pcard__cloud" aria-hidden="true"></span>
          <img src="${img(300)}" srcset="${img(300)} 300w, ${img(600)} 600w" sizes="(max-width: 600px) 45vw, 260px" width="300" height="400" alt="${esc(p.name)}, ${esc(p.volume)}" loading="lazy" /></span>
        <span class="pcard__meta">${esc(p.type)} · ${esc(p.volume)}${p.fixation ? ` · фиксация ${esc(p.fixation)}` : ''}</span>
        <h4 class="pcard__name">${esc(p.name)}</h4>
      </a>
      ${twinChip(p)}
      <div class="pcard__foot">${priceText(p)}
        <a class="btn btn--sm" href="${BASE}/gde-kupit/" data-buy data-buy-id="${esc(p.id)}" data-buy-name="${esc(p.name)}" data-buy-q="${esc(p.search)}"${p.exactLinks ? ` data-buy-exact="${esc(JSON.stringify(p.exactLinks))}"` : ''}>Где купить</a>
      </div>
    </article>
  </li>`;
}

export function initQuiz() {
  const box = document.querySelector('[data-quiz]');
  if (!box) return;
  const keys = box.querySelector('[data-q-keys]');
  const stepEl = box.querySelector('[data-q-step]');
  const qEl = box.querySelector('[data-q-text]');
  const back = box.querySelector('[data-q-back]');
  const reset = box.querySelector('[data-q-reset]');
  const result = document.querySelector('[data-q-result]');
  const verdictEl = result.querySelector('[data-q-verdict]');
  const cards = result.querySelector('[data-q-cards]');

  let i = 0;
  let ans = {};
  let started = false;

  const render = () => {
    const q = QUESTIONS[i];
    stepEl.textContent = `${i + 1} / ${QUESTIONS.length}`;
    qEl.textContent = q.q;
    keys.innerHTML = q.a.map(([v, label]) => `<button type="button" class="calc__key" data-v="${v}">${label}</button>`).join('');
    back.disabled = i === 0;
  };

  const finish = (scroll = true) => {
    const [screen, title] = VERDICT[ans.goal];
    stepEl.textContent = 'результат';
    qEl.textContent = `${screen} →`;
    keys.innerHTML = '<button type="button" class="calc__key" data-again>Посчитать ещё раз</button>';
    back.disabled = false;
    verdictEl.innerHTML = title;
    cards.innerHTML = pick(ans).map(cardHTML).join('');
    result.hidden = false;
    save('quiz', ans);
    if (scroll) goal('quiz_complete');
    document.dispatchEvent(new CustomEvent('taft:quiz-done'));
    if (scroll) result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  keys.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    b.classList.add('is-hit');
    if (b.hasAttribute('data-again')) { i = 0; ans = {}; started = false; result.hidden = true; render(); keys.querySelector('button')?.focus(); return; }
    if (i === 0 && !started) { started = true; goal('quiz_start'); }
    ans[QUESTIONS[i].id] = b.dataset.v;
    setTimeout(() => {
      if (i < QUESTIONS.length - 1) { i++; render(); keys.querySelector('button')?.focus(); }
      else finish();
    }, 140);
  });
  back.addEventListener('click', () => {
    if (!result.hidden) { result.hidden = true; i = QUESTIONS.length - 1; render(); return; }
    if (i > 0) { i--; render(); }
  });
  reset.addEventListener('click', () => { i = 0; ans = {}; started = false; result.hidden = true; render(); });

  // если квиз уже проходили на этом устройстве — показываем прошлый результат
  const prev = load('quiz', null);
  if (prev && QUESTIONS.every((q) => prev[q.id])) { ans = prev; i = QUESTIONS.length - 1; finish(false); }
  else render();
}
